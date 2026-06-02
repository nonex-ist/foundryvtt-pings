import { FADE_IN_MS, FADE_OUT_MS } from '../constants.js';
import type { PingKind, WorldPosition } from '../types.js';
import { runAnimation } from './animation.js';
import { createPingVisual } from './graphics.js';

export interface PingOptions {
    kind: PingKind;
    position: WorldPosition;
    color: number;
    size: number;
    durationMs: number;
}

export interface PingHandle {
    destroy(): void;
}

/**
 * Build a ping, mount it into `canvas.controls.pings`, run its lifecycle
 * animation, and clean up when the animation completes. Returns a handle
 * whose `destroy` aborts the animation early (e.g. for network-driven
 * removal once that lands).
 */
export function createPing(opts: PingOptions): PingHandle {
    const parent = canvas.controls.pings;
    const visual = createPingVisual(opts.kind, { color: opts.color, size: opts.size });

    visual.container.x = opts.position.x;
    visual.container.y = opts.position.y;
    visual.container.alpha = 0;
    parent.addChild(visual.container);

    const cleanup = (): void => {
        parent.removeChild(visual.container);
        visual.container.destroy({ children: true });
    };

    const cancel = runAnimation(visual.container, {
        durationMs: opts.durationMs,
        fadeInMs: FADE_IN_MS,
        fadeOutMs: FADE_OUT_MS,
        update: visual.update,
        onComplete: cleanup,
    });

    let destroyed = false;
    return {
        destroy(): void {
            if (destroyed) return;
            destroyed = true;
            cancel();
            cleanup();
        },
    };
}
