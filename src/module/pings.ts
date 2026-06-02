/**
 * Foundry VTT Pings — entrypoint.
 *
 * M5 scope: input + render + network + API + radial menu. The hold trigger
 * runs a 4-phase gesture: hold (350ms) → preview (local-only here ping
 * appears) → menu (drag ≥25px opens cardinal selector) → commit. Tap-and-
 * release commits "here"; drag in 4 directions commits rally / alert /
 * text / token-attach via the radial menu.
 *
 * Still ahead: M6 specialized ping kinds (real visuals + behaviors),
 * M7 audio, M8 settings UI.
 */

import { createApi, type ApiBundle, type PingsApi } from './api/index.js';
import {
    DEFAULT_PING_COLOR,
    HOLD_CANCEL_TOLERANCE_PX,
    HOLD_DURATION_MS,
    MENU_SUMMON_PX,
    MODULE_ID,
    RATE_LIMIT_CAPACITY,
    RATE_LIMIT_WINDOW_MS,
} from './constants.js';
import { parseBinding } from './input/binding.js';
import { openRadialMenu } from './input/radial-menu.js';
import { installTrigger } from './input/trigger.js';
import { createRateLimit } from './network/rate-limit.js';
import { installSocket, type SocketHandle } from './network/socket.js';
import type { PingKind, WorldPosition } from './types.js';

let teardownTrigger: (() => void) | null = null;
let socketHandle: SocketHandle | null = null;
let apiBundle: ApiBundle | null = null;

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

function showPreviewPing(position: WorldPosition): () => void {
    const id = apiBundle?.api.showHere(position) ?? null;
    return () => {
        if (id !== null) apiBundle?.api.remove(id, { broadcast: false });
    };
}

function commitPing(kind: PingKind, position: WorldPosition): void {
    // The trigger's reset() disposes the preview *before* invoking commit,
    // so we always need a fresh local display in addition to broadcasting —
    // single path through api.ping for every kind.
    apiBundle?.api.ping(kind, position);
}

function reinstallTrigger(): void {
    teardownTrigger?.();
    teardownTrigger = installTrigger({
        binding: parseBinding('LeftClick'),
        holdDurationMs: HOLD_DURATION_MS,
        holdCancelTolerancePx: HOLD_CANCEL_TOLERANCE_PX,
        menuSummonPx: MENU_SUMMON_PX,
        callbacks: {
            showPreview: showPreviewPing,
            openMenu: (clientPosition) =>
                openRadialMenu({
                    clientX: clientPosition.x,
                    clientY: clientPosition.y,
                    deadzonePx: MENU_SUMMON_PX,
                }),
            commit: commitPing,
        },
    });
}

Hooks.once('init', () => {
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

    apiBundle = createApi({
        version,
        sceneIdProvider: () => canvas.scene?.id ?? null,
        senderIdProvider: () => game.user?.id ?? null,
        senderColorProvider: resolveUserColor,
        canvasSizeProvider: () => canvas.dimensions.size,
        socketProvider: () => socketHandle,
    });

    socketHandle = installSocket({
        handlers: {
            onDisplay: apiBundle.handleInboundDisplay,
            onRemove: apiBundle.handleInboundRemove,
        },
        rateLimit: createRateLimit({
            capacity: RATE_LIMIT_CAPACITY,
            windowMs: RATE_LIMIT_WINDOW_MS,
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
