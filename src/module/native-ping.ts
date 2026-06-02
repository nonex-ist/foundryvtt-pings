import { MODULE_ID } from './constants.js';

let restore: (() => void) | null = null;

/**
 * Suppress Foundry v14's built-in long-press canvas ping.
 *
 * v14 wires `ControlsLayer.prototype._onLongPress` into the canvas
 * `MouseInteractionManager` at a hardcoded 500ms; the body lives at
 * `foundry.mjs:180131` and calls `canvas.ping(origin)`. There is no
 * setting, hook, or config flag to disable it.
 *
 * Without this patch, both the native ping (500ms) and our gesture
 * (350ms hold → preview → optional menu) fire on the same hold —
 * the user sees overlapping pings and the native broadcast leaks
 * through alongside ours. Overriding the prototype method with a
 * no-op at init (before any ControlsLayer instance is constructed)
 * cleanly removes the conflict.
 *
 * Idempotent. Stores the original so it can be restored if we ever
 * need to (e.g. on module teardown — currently unused).
 */
export function suppressNativeLongPress(): void {
    if (restore) return;
    const proto = foundry.canvas?.layers?.ControlsLayer?.prototype;
    if (!proto || typeof proto._onLongPress !== 'function') {
        console.warn(
            `${MODULE_ID} | could not locate ControlsLayer._onLongPress — native long-press ping may still fire`,
        );
        return;
    }
    const original = proto._onLongPress;
    proto._onLongPress = function noop(): void {
        /* suppressed by pings module to avoid double-pings */
    };
    restore = () => {
        proto._onLongPress = original;
    };
}

export function restoreNativeLongPress(): void {
    restore?.();
    restore = null;
}
