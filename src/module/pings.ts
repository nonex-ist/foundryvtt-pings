/**
 * Foundry VTT Pings — entrypoint.
 *
 * M6 scope: input + render + network + API + radial menu + all 5 ping
 * kinds. Each kind has its own visual, per-kind defaults (duration,
 * color, moveCanvas), and behaviors: rally pans receivers' viewports
 * (role-gated), alert refuses senders below Assistant (red color override,
 * 10s duration), text prompts for input on commit, token-attach finds
 * the token under the press position and follows it for ~4s.
 *
 * Still ahead: M7 audio, M8 settings UI.
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
        // window.prompt is synchronous and renders before any post-gesture
        // pointer cleanup ─ keeps the M6 implementation dialog-free. A
        // styled Foundry DialogV2 lands with the M8 settings UI pass.
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
