import type { BindingSpec, PingIntent, WorldPosition } from '../types.js';
import { eventMatches } from './binding.js';

export interface TriggerConfig {
    binding: BindingSpec;
    holdDurationMs: number;
    holdCancelTolerancePx: number;
    onIntent: (intent: PingIntent) => void;
}

interface HoldState {
    pointerId: number;
    startClientX: number;
    startClientY: number;
    timerId: ReturnType<typeof setTimeout>;
    committed: boolean;
}

/**
 * Convert a viewport-relative pointer position into canvas world coordinates.
 *
 * Steps: viewport pixel → canvas-element-local pixel (subtract bounding rect)
 * → world (apply inverse of PIXI stage's worldTransform).
 *
 * `canvas.stage.worldTransform` bakes in the stage scale, so we divide by the
 * stage scale separately. This mirrors how Foundry's own interaction code
 * resolves pointer positions.
 */
function clientToWorld(
    view: HTMLCanvasElement,
    stage: { worldTransform: { tx: number; ty: number }; scale: { x: number; y: number } },
    clientX: number,
    clientY: number,
): WorldPosition {
    const rect = view.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const { worldTransform: t, scale } = stage;
    return {
        x: (localX - t.tx) / scale.x,
        y: (localY - t.ty) / scale.y,
    };
}

/**
 * Install the input trigger listener.
 *
 * Binds to `canvas.app.view` rather than `window`. This is intentional and
 * is the core fix for the v14 "sheet pointer bleed" bug: sheets are stacked
 * above the canvas DOM element, so pointer events that originate inside a
 * sheet never reach this listener.
 *
 * Returns a teardown function that removes the listeners and cancels any
 * in-flight hold.
 */
export function installTrigger(config: TriggerConfig): () => void {
    const view = canvas.app.view;
    const stage = canvas.app.stage;

    let hold: HoldState | null = null;

    const cancelHold = (): void => {
        if (hold) {
            clearTimeout(hold.timerId);
            hold = null;
        }
    };

    const onPointerDown = (ev: PointerEvent): void => {
        if (hold) return;
        if (!eventMatches(ev, config.binding)) return;

        const pointerId = ev.pointerId;
        const startClientX = ev.clientX;
        const startClientY = ev.clientY;

        const timerId = setTimeout(() => {
            if (!hold || hold.pointerId !== pointerId) return;
            hold.committed = true;
            const position = clientToWorld(view, stage, startClientX, startClientY);
            config.onIntent({ kind: 'here', position });
        }, config.holdDurationMs);

        hold = {
            pointerId,
            startClientX,
            startClientY,
            timerId,
            committed: false,
        };
    };

    const onPointerMove = (ev: PointerEvent): void => {
        if (!hold || hold.pointerId !== ev.pointerId) return;
        if (hold.committed) return;
        const dx = ev.clientX - hold.startClientX;
        const dy = ev.clientY - hold.startClientY;
        if (dx * dx + dy * dy > config.holdCancelTolerancePx * config.holdCancelTolerancePx) {
            cancelHold();
        }
    };

    const onPointerUp = (ev: PointerEvent): void => {
        if (!hold || hold.pointerId !== ev.pointerId) return;
        cancelHold();
    };

    const onPointerCancel = (ev: PointerEvent): void => {
        if (!hold || hold.pointerId !== ev.pointerId) return;
        cancelHold();
    };

    view.addEventListener('pointerdown', onPointerDown);
    view.addEventListener('pointermove', onPointerMove);
    view.addEventListener('pointerup', onPointerUp);
    view.addEventListener('pointercancel', onPointerCancel);

    return () => {
        cancelHold();
        view.removeEventListener('pointerdown', onPointerDown);
        view.removeEventListener('pointermove', onPointerMove);
        view.removeEventListener('pointerup', onPointerUp);
        view.removeEventListener('pointercancel', onPointerCancel);
    };
}
