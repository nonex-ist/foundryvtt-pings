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
import { DEFAULT_PING_COLOR, MODULE_ID } from './constants.js';
import { parseBinding } from './input/binding.js';
import { openRadialMenu } from './input/radial-menu.js';
import { installTrigger } from './input/trigger.js';
import type { DisplayPingPayload } from './network/messages.js';
import { createRateLimit } from './network/rate-limit.js';
import { installSocket, type SocketHandle } from './network/socket.js';
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

function showPreviewPing(position: WorldPosition): () => void {
    const id = apiBundle?.api.showHere(position) ?? null;
    return () => {
        if (id !== null) apiBundle?.api.remove(id, { broadcast: false });
    };
}

function commitPing(kind: PingKind, position: WorldPosition): void {
    if (!apiBundle) return;

    if (kind === 'text') {
        const text = window.prompt('Pings — text:');
        if (!text) return;
        apiBundle.api.ping('text', position, { text });
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
    const menuPx = getMenuSummonPx();
    teardownTrigger = installTrigger({
        binding,
        holdDurationMs: getHoldDurationMs(),
        holdCancelTolerancePx: getHoldCancelTolerancePx(),
        menuSummonPx: menuPx,
        callbacks: {
            showPreview: showPreviewPing,
            openMenu: (clientPosition) =>
                openRadialMenu({
                    clientX: clientPosition.x,
                    clientY: clientPosition.y,
                    deadzonePx: menuPx,
                }),
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
