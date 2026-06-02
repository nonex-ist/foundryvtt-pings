/**
 * Foundry VTT Pings — entrypoint.
 *
 * M3 scope: input + render + network. A hold of the configured binding
 * (default left-click, 350ms) on the canvas produces a "here" ping that
 * is broadcast to every peer in the same scene. Inbound pings from peers
 * render locally with the sender's color. The rate-limit (3 per 5s, GM
 * bypass) is enforced on both sides.
 *
 * Still ahead: M4 public API, M5 radial menu, M6 specialized ping kinds,
 * M7 audio, M8 settings UI.
 */

import {
    DEFAULT_PING_COLOR,
    DEFAULT_PING_DURATION_MS,
    HOLD_CANCEL_TOLERANCE_PX,
    HOLD_DURATION_MS,
    MODULE_ID,
    RATE_LIMIT_CAPACITY,
    RATE_LIMIT_WINDOW_MS,
} from './constants.js';
import { parseBinding } from './input/binding.js';
import { installTrigger } from './input/trigger.js';
import type { DisplayPingPayload } from './network/messages.js';
import { createRateLimit } from './network/rate-limit.js';
import { installSocket, type SocketHandle } from './network/socket.js';
import { createPing } from './render/ping.js';
import type { PingIntent } from './types.js';

interface PingsApi {
    readonly version: string;
}

let teardownTrigger: (() => void) | null = null;
let socketHandle: SocketHandle | null = null;

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

function displayPingFromPayload(payload: DisplayPingPayload): void {
    createPing({
        kind: payload.kind,
        position: payload.position,
        color: payload.color,
        size: canvas.dimensions.size,
        durationMs: DEFAULT_PING_DURATION_MS,
    });
}

function onIntent(intent: PingIntent): void {
    const sceneId = canvas.scene?.id;
    const senderId = game.user?.id;
    if (!sceneId || !senderId || !socketHandle) return;

    const payload: DisplayPingPayload = {
        id: foundry.utils.randomID(),
        sceneId,
        senderId,
        kind: intent.kind,
        position: intent.position,
        color: resolveUserColor(),
        moveCanvas: false,
    };

    // Local display only happens if the broadcast passes the rate-limit,
    // so users get a single, consistent "I am rate-limited" signal (no
    // ping at all) rather than seeing a local ping that nobody else does.
    const sent = socketHandle.broadcast({ type: 'displayPing', payload });
    if (sent) displayPingFromPayload(payload);
}

function reinstallTrigger(): void {
    teardownTrigger?.();
    teardownTrigger = installTrigger({
        binding: parseBinding('LeftClick'),
        holdDurationMs: HOLD_DURATION_MS,
        holdCancelTolerancePx: HOLD_CANCEL_TOLERANCE_PX,
        onIntent,
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
    socketHandle = installSocket({
        handlers: {
            onDisplay: displayPingFromPayload,
            onRemove: () => {
                // M4 will route this to a registry; M3 has no live pings to remove.
            },
        },
        rateLimit: createRateLimit({
            capacity: RATE_LIMIT_CAPACITY,
            windowMs: RATE_LIMIT_WINDOW_MS,
        }),
        sceneIdProvider: () => canvas.scene?.id ?? null,
        isUserGM: (userId) => game.users?.get(userId)?.isGM ?? false,
    });

    const version = game.modules?.get(MODULE_ID)?.version ?? '0.0.0';
    const api: PingsApi = { version };

    const globals = window as typeof window & { NonexIst?: Record<string, unknown> };
    globals.NonexIst = globals.NonexIst ?? {};
    globals.NonexIst.Pings = api;

    Hooks.callAll('pingsReady', api);
    console.log(`${MODULE_ID} | ready`);
});
