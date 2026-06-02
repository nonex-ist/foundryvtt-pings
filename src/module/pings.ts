/**
 * Foundry VTT Pings — entrypoint.
 *
 * v0.1 surface: input + render + network + API + radial menu + 5 ping
 * kinds + audio + game settings. All thresholds, role gates, and the
 * audio toggle are exposed via Foundry's Module Configuration UI. The
 * trigger and audio reconfigure live on change; rate-limit and role
 * settings require a reload (their values are snapshot into long-lived
 * state).
 */

import { createApi, type ApiBundle, type PingsApi } from './api/index.js';
import { createAudioController } from './audio/play.js';
import {
    DEFAULT_PING_COLOR,
    FADE_IN_MS,
    FADE_OUT_MS,
    KIND_DEFAULT_DURATION_MS,
    MODULE_ID,
} from './constants.js';
import { parseBinding } from './input/binding.js';
import { openRadialMenu } from './input/radial-menu.js';
import { installTrigger } from './input/trigger.js';
import { suppressNativeLongPress } from './native-ping.js';
import type { DisplayPingPayload } from './network/messages.js';
import { createRateLimit } from './network/rate-limit.js';
import { installSocket, type SocketHandle } from './network/socket.js';
import { createPing } from './render/ping.js';
import {
    getAudioEnabled,
    getAudioVolume,
    getHoldCancelTolerancePx,
    getHoldDurationMs,
    getMenuSummonPx,
    getRateLimitCapacity,
    getRateLimitWindowMs,
    getTriggerBinding,
    registerSettings,
} from './settings/register.js';
import type { PingKind, WorldPosition } from './types.js';

let teardownTrigger: (() => void) | null = null;
let socketHandle: SocketHandle | null = null;
let apiBundle: ApiBundle | null = null;
let audio: ReturnType<typeof createAudioController> | null = null;
/**
 * Wall-clock time after which the current preview has self-disposed
 * (fadeIn + duration + fadeOut). Used by the commit handler to decide
 * whether to keep + broadcast (preview alive) or render fresh (preview
 * already ended) — guards against the silent-no-ping case when the
 * user holds longer than the preview's natural lifetime.
 */
let previewExpiresAt = 0;

/** Foundry's i18n returns the key itself when no translation exists, so a `??` fallback never fires; explicitly compare against the key. */
function tr(key: string, fallback: string): string {
    const out = game.i18n?.localize(key);
    return out && out !== key ? out : fallback;
}

/** Escape user-facing strings before interpolating into Dialog HTML so a localized translation containing `<` / `&` / `"` doesn't get rendered as markup. */
function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (c) => {
        switch (c) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return c;
        }
    });
}

function resolveUserColor(): number {
    const c = game.user?.color;
    if (typeof c === 'number') return c;
    if (typeof c === 'string') {
        const hex = c.startsWith('#') ? c.slice(1) : c;
        const n = parseInt(hex, 16);
        return Number.isNaN(n) ? DEFAULT_PING_COLOR : n;
    }
    if (c && typeof c.valueOf === 'function') {
        const n = c.valueOf();
        return typeof n === 'number' ? n : DEFAULT_PING_COLOR;
    }
    return DEFAULT_PING_COLOR;
}

function findTokenIdAt(position: WorldPosition): string | null {
    const placeables = canvas.tokens?.placeables ?? [];
    for (const token of placeables) {
        if (token.bounds.contains(position.x, position.y)) return token.id;
    }
    return null;
}

function showPreviewBundle(
    worldPosition: WorldPosition,
    clientPosition: { x: number; y: number },
): { previewDispose: () => void; menu: ReturnType<typeof openRadialMenu> } {
    // Bypass the API on purpose: the preview is a visual-only indicator
    // ("you're about to ping"), not a committed ping, so it must NOT fire
    // the `pings.display` hook (which would trigger audio + any other
    // listeners) and must NOT be registered for removal. Direct createPing
    // gives us the visual without the ceremony. Audio + hooks fire on the
    // commit path instead.
    const previewDurationMs = KIND_DEFAULT_DURATION_MS.here;
    const handle = createPing({
        kind: 'here',
        position: worldPosition,
        color: resolveUserColor(),
        size: canvas.dimensions.size,
        durationMs: previewDurationMs,
    });
    // FADE_IN_MS + main duration + FADE_OUT_MS = total wall-clock lifetime.
    // The commit handler checks this to know if the preview is still on
    // screen at release time (long holds can outlive it).
    previewExpiresAt = Date.now() + previewDurationMs + FADE_IN_MS + FADE_OUT_MS;
    // Token segment is unavailable when there's no token at the press
    // point — the menu greys it out and falls back to 'here' on release.
    const disabledKinds: PingKind[] = findTokenIdAt(worldPosition)
        ? []
        : ['token-attach'];

    // Open the radial menu in passive mode at the press point — it acts as
    // an "options available" hint during the hold, before the user has
    // committed to either the default here-ping or a menu kind.
    const menu = openRadialMenu({
        clientX: clientPosition.x,
        clientY: clientPosition.y,
        deadzonePx: getMenuSummonPx(),
        userColor: resolveUserColor(),
        disabledKinds,
    });
    return {
        previewDispose: () => handle.destroy(),
        menu,
    };
}

async function promptForTextPing(position: WorldPosition): Promise<void> {
    const dialog = foundry.applications?.api?.DialogV2;
    if (!dialog) {
        // Fallback for environments without DialogV2 — shouldn't happen on
        // v14, but the graceful degradation keeps text-pings working if
        // Foundry ever moves the dialog API again.
        const text = window.prompt(tr('pings.dialog.textPrompt', 'Ping text:'));
        if (text) apiBundle?.api.ping('text', position, { text });
        return;
    }
    const title = tr('pings.dialog.textTitle', 'Pings — text');
    const label = tr('pings.dialog.textLabel', 'Text');
    const confirm = tr('pings.dialog.textConfirm', 'Ping');
    const result = (await dialog.input({
        window: { title },
        content:
            `<div class="form-group"><label>${escapeHtml(label)}</label>` +
            '<input type="text" name="text" autofocus required maxlength="200" />' +
            '</div>',
        ok: { label: confirm, icon: 'fa-solid fa-location-crosshairs' },
    })) as { text?: string } | null;

    const text = result?.text?.trim();
    if (!text) return;
    apiBundle?.api.ping('text', position, { text });
}

function commitPing(
    kind: PingKind,
    position: WorldPosition,
    previewDispose: (() => void) | null,
): void {
    if (!apiBundle) {
        previewDispose?.();
        return;
    }

    // "Here" commit from preview state: if the preview is still on screen,
    // keep it (skip the disposer) and broadcast-only so peers see their
    // copy. The preview itself was silent — fire audio here so the user
    // gets a confirmation cue ON RELEASE, matching the "preview =
    // preparing, release = ping" mental model.
    //
    // If the preview has already self-disposed (long hold past the
    // preview's natural lifetime), fall through to the full render path
    // so the local user still sees a ping on release.
    const previewAlive = previewDispose !== null && Date.now() < previewExpiresAt;
    if (kind === 'here' && previewAlive) {
        audio?.play('here');
        apiBundle.api.sendHere(position);
        return;
    }

    // Any other path: preview (if any) is being replaced by a different
    // kind, or was already disposed when the menu opened. Drop preview
    // and render the chosen kind fresh.
    previewDispose?.();

    if (kind === 'text') {
        // Fire-and-forget the dialog; the outer commit is sync because
        // the trigger doesn't await it. The dialog opens after the
        // gesture has fully cleared, so cancellation just no-ops.
        void promptForTextPing(position);
        return;
    }

    if (kind === 'token-attach') {
        const tokenId = findTokenIdAt(position);
        if (!tokenId) {
            ui?.notifications?.warn(
                tr('pings.notifications.noTokenUnderCursor', 'Pings: no token under the cursor.'),
            );
            return;
        }
        apiBundle.api.ping('token-attach', position, { tokenId });
        return;
    }

    apiBundle.api.ping(kind, position);
}

function reinstallTrigger(): void {
    teardownTrigger?.();
    if (!canvas.app?.view) return;
    let binding;
    try {
        binding = parseBinding(getTriggerBinding());
    } catch (err) {
        console.warn(`${MODULE_ID} | invalid trigger binding, falling back to LeftClick`, err);
        binding = parseBinding('LeftClick');
    }
    teardownTrigger = installTrigger({
        binding,
        holdDurationMs: getHoldDurationMs(),
        holdCancelTolerancePx: getHoldCancelTolerancePx(),
        menuSummonPx: getMenuSummonPx(),
        callbacks: {
            showPreview: showPreviewBundle,
            commit: commitPing,
        },
    });
}

Hooks.once('init', () => {
    registerSettings({
        onTriggerChanged: () => {
            if (canvas.ready) reinstallTrigger();
        },
        onAudioEnabledChanged: (enabled) => audio?.setEnabled(enabled),
        onAudioVolumeChanged: (volume) => audio?.setVolume(volume),
    });
    // Override Foundry's native long-press ping so it doesn't fire
    // alongside ours. Must happen before any ControlsLayer instance is
    // constructed — init is well before canvasInit.
    suppressNativeLongPress();
    console.log(`${MODULE_ID} | init`);
});

Hooks.on('canvasReady', () => {
    reinstallTrigger();
});

Hooks.on('canvasTearDown', () => {
    teardownTrigger?.();
    teardownTrigger = null;
});

Hooks.once('ready', () => {
    const version = game.modules?.get(MODULE_ID)?.version ?? '0.0.0';

    audio = createAudioController();
    audio.setEnabled(getAudioEnabled());
    audio.setVolume(getAudioVolume());

    Hooks.on('pings.display', (_handle: unknown, payload: unknown) => {
        const kind = (payload as DisplayPingPayload | undefined)?.kind;
        if (kind) audio?.play(kind);
    });

    apiBundle = createApi({
        version,
        sceneIdProvider: () => canvas.scene?.id ?? null,
        senderIdProvider: () => game.user?.id ?? null,
        senderColorProvider: resolveUserColor,
        userRoleProvider: () => game.user?.role ?? 0,
        canvasSizeProvider: () => canvas.dimensions.size,
        socketProvider: () => socketHandle,
    });

    socketHandle = installSocket({
        handlers: {
            onDisplay: apiBundle.handleInboundDisplay,
            onRemove: apiBundle.handleInboundRemove,
        },
        rateLimit: createRateLimit({
            capacity: getRateLimitCapacity(),
            windowMs: getRateLimitWindowMs(),
        }),
        sceneIdProvider: () => canvas.scene?.id ?? null,
        isUserGM: (userId) => game.users?.get(userId)?.isGM ?? false,
    });

    const api: PingsApi = apiBundle.api;

    const moduleEntry = game.modules?.get(MODULE_ID);
    if (moduleEntry) {
        (moduleEntry as { api?: PingsApi }).api = api;
    }

    const globals = window as typeof window & { NonexIst?: Record<string, unknown> };
    globals.NonexIst = globals.NonexIst ?? {};
    globals.NonexIst.Pings = api;

    Hooks.callAll('pingsReady', api);
    console.log(`${MODULE_ID} | ready`);
});
