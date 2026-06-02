import type { PingKind } from '../types.js';

export interface PingVisual {
    container: PixiContainer;
    update(elapsedMs: number): void;
}

export interface VisualOptions {
    color: number;
    size: number;
}

const HERE_RING_COUNT = 3;
const HERE_CYCLE_MS = 2000;
const HERE_LINE_WIDTH = 2;
const HERE_BASE_ALPHA = 0.55;
const HERE_INNER_RATIO = 0.15;

/**
 * "Here" ping: concentric rings contracting inward, fading as they shrink.
 * Subtle and ambient — reads as "look at this spot" without demanding
 * attention. Inverse pair with the rally visual (which will expand outward).
 */
function createHereVisual({ color, size }: VisualOptions): PingVisual {
    const container = new PIXI.Container();
    const outerR = size / 2;
    const innerR = size * HERE_INNER_RATIO;

    const rings: PixiGraphics[] = [];
    for (let i = 0; i < HERE_RING_COUNT; i++) {
        const ring = new PIXI.Graphics();
        container.addChild(ring);
        rings.push(ring);
    }

    function update(elapsedMs: number): void {
        for (let i = 0; i < HERE_RING_COUNT; i++) {
            const phase = ((elapsedMs / HERE_CYCLE_MS) + i / HERE_RING_COUNT) % 1;
            const radius = outerR + (innerR - outerR) * phase;
            const alpha = HERE_BASE_ALPHA * (1 - phase * 0.85);
            const ring = rings[i];
            ring.clear();
            ring.lineStyle(HERE_LINE_WIDTH, color, alpha);
            ring.drawCircle(0, 0, radius);
        }
    }

    update(0);
    return { container, update };
}

export function createPingVisual(kind: PingKind, opts: VisualOptions): PingVisual {
    switch (kind) {
        case 'here':
            return createHereVisual(opts);
        case 'rally':
        case 'alert':
        case 'text':
        case 'token-attach':
            throw new Error(`pings: visual for "${kind}" not yet implemented`);
    }
}
