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
import { DEFAULT_PING_COLOR, KIND_DEFAULT_DURATION_MS, MODULE_ID } from './constants.js';
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
 * Token id whose movement is held by the current gesture, if any.
 * Cleared (with an 80ms grace window) on pointerup so Foundry's
 * synchronous drag-commit handler fires while the lock is still in
 * place — preventing press-on-token from running away as a token drag.
 */
let gestureLockedTokenId: string | null = null;
const GESTURE_UNLOCK_GRACE_MS = 80;

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
    const handle = createPing({
        kind: 'here',
        position: worldPosition,
        color: resolveUserColor(),
        size: canvas.dimensions.size,
        durationMs: KIND_DEFAULT_DURATION_MS.here,
    });
    // Open the radial menu in passive mode at the press point — it acts as
    // an "options available" hint during the hold, before the user has
    // committed to either the default here-ping or a menu kind.
    const menu = openRadialMenu({
        clientX: clientPosition.x,
        clientY: clientPosition.y,
        deadzonePx: getMenuSummonPx(),
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
        const text = window.prompt('Pings — text:');
        if (text) apiBundle?.api.ping('text', position, { text });
        return;
    }
    const result = (await dialog.input({
        window: { title: 'Pings — text' },
        content:
            '<div class="form-group"><label>Text</label>' +
            '<input type="text" name="text" autofocus required maxlength="200" />' +
            '</div>',
        ok: { label: 'Ping', icon: 'fa-solid fa-location-crosshairs' },
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

    // "Here" commit from preview state: preview is already on screen with
    // exactly the same visual the commit would render. Keep it (skip the
    // disposer) and broadcast-only so peers see their copy. The preview
    // itself was silent — fire audio here so the user gets a confirmation
    // cue ON RELEASE, matching the "preview = preparing, release = ping"
    // mental model.
    if (kind === 'here' && previewDispose) {
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
            ui?.notifications?.warn('Pings: no token under the cursor.');
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
            onPressMatched: (worldPos) => {
                const tokenId = findTokenIdAt(worldPos);
                if (!tokenId || !apiBundle) return;
                apiBundle.lockTokenMovement(tokenId);
                gestureLockedTokenId = tokenId;
            },
            onReleaseMatched: () => {
                const id = gestureLockedTokenId;
                gestureLockedTokenId = null;
                if (!id) return;
                // Defer the unlock past the current event tick so Foundry's
                // drag-commit `preUpdateToken` (which fires synchronously
                // during pointerup) runs while the token is still locked.
                // If the gesture committed `token-attach`, the attach lock
                // is already in place by the time the grace window expires;
                // for other commits, the gesture lock is the only thing
                // keeping Foundry from yanking the token.
                setTimeout(
                    () => apiBundle?.unlockTokenMovement(id),
                    GESTURE_UNLOCK_GRACE_MS,
                );
            },
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
