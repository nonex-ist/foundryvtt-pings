/**
 * Foundry VTT Pings — entrypoint.
 *
 * M2 scope: input + render. A hold of the configured binding (default
 * left-click, 350ms) on the canvas DOM element produces a local-only
 * "here" ping that animates and self-destructs. No network yet.
 */

import {
    DEFAULT_PING_COLOR,
    DEFAULT_PING_DURATION_MS,
    HOLD_CANCEL_TOLERANCE_PX,
    HOLD_DURATION_MS,
    MODULE_ID,
} from './constants.js';
import { parseBinding } from './input/binding.js';
import { installTrigger } from './input/trigger.js';
import { createPing } from './render/ping.js';
import type { PingIntent } from './types.js';

interface PingsApi {
    readonly version: string;
}

let teardownTrigger: (() => void) | null = null;

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

function onIntent(intent: PingIntent): void {
    createPing({
        kind: intent.kind,
        position: intent.position,
        color: resolveUserColor(),
        size: canvas.dimensions.size,
        durationMs: DEFAULT_PING_DURATION_MS,
    });
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
    const version = game.modules?.get(MODULE_ID)?.version ?? '0.0.0';
    const api: PingsApi = { version };

    const globals = window as typeof window & { NonexIst?: Record<string, unknown> };
    globals.NonexIst = globals.NonexIst ?? {};
    globals.NonexIst.Pings = api;

    Hooks.callAll('pingsReady', api);
    console.log(`${MODULE_ID} | ready`);
});
