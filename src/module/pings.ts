/**
 * Foundry VTT Pings — entrypoint.
 *
 * M1 scope: input layer only. A hold of the configured binding (default
 * left-click, 350ms) on the canvas DOM element emits a `PingIntent` which
 * for now is just console-logged. No network, no render, no API surface
 * beyond `window.NonexIst.Pings`.
 */

import { HOLD_CANCEL_TOLERANCE_PX, HOLD_DURATION_MS, MODULE_ID } from './constants.js';
import { parseBinding } from './input/binding.js';
import { installTrigger } from './input/trigger.js';
import type { PingIntent } from './types.js';

interface PingsApi {
    readonly version: string;
}

let teardownTrigger: (() => void) | null = null;

function reinstallTrigger(): void {
    teardownTrigger?.();
    teardownTrigger = installTrigger({
        binding: parseBinding('LeftClick'),
        holdDurationMs: HOLD_DURATION_MS,
        holdCancelTolerancePx: HOLD_CANCEL_TOLERANCE_PX,
        onIntent: (intent: PingIntent) => {
            console.log(`${MODULE_ID} | intent`, intent);
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
    const api: PingsApi = { version };

    const globals = window as typeof window & { NonexIst?: Record<string, unknown> };
    globals.NonexIst = globals.NonexIst ?? {};
    globals.NonexIst.Pings = api;

    Hooks.callAll('pingsReady', api);
    console.log(`${MODULE_ID} | ready`);
});
