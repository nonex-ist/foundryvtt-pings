import type { PingKind } from '../types.js';

export interface PingVisual {
    container: PixiContainer;
    update(elapsedMs: number): void;
}

export interface VisualOptions {
    color: number;
    size: number;
    /** Required for the text visual; ignored by others. */
    text?: string;
}

// ── here ──────────────────────────────────────────────────────────

const HERE_RING_COUNT = 3;
const HERE_CYCLE_MS = 2000;
const HERE_LINE_WIDTH = 2;
const HERE_BASE_ALPHA = 0.55;
const HERE_INNER_RATIO = 0.15;

/**
 * "Here" ping: concentric rings contracting inward, fading as they shrink.
 * Subtle and ambient — reads as "look at this spot" without demanding
 * attention. Inverse pair with the rally visual (which expands outward).
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

// ── rally ─────────────────────────────────────────────────────────

const RALLY_RING_COUNT = 3;
const RALLY_CYCLE_MS = 1500;
const RALLY_LINE_WIDTH = 3;
const RALLY_BASE_ALPHA = 0.85;
const RALLY_INNER_RATIO = 0.1;
const RALLY_OUTER_RATIO = 0.85;

/**
 * "Rally" ping: concentric rings expanding outward — visual inverse of
 * "here". Bolder line width, higher alpha, larger footprint to convey
 * active broadcast. Pairs with the receiver-side viewport pan to deliver
 * the "everyone gather here" signal.
 */
function createRallyVisual({ color, size }: VisualOptions): PingVisual {
    const container = new PIXI.Container();
    const outerR = size * RALLY_OUTER_RATIO;
    const innerR = size * RALLY_INNER_RATIO;

    const rings: PixiGraphics[] = [];
    for (let i = 0; i < RALLY_RING_COUNT; i++) {
        const ring = new PIXI.Graphics();
        container.addChild(ring);
        rings.push(ring);
    }

    function update(elapsedMs: number): void {
        for (let i = 0; i < RALLY_RING_COUNT; i++) {
            const phase = ((elapsedMs / RALLY_CYCLE_MS) + i / RALLY_RING_COUNT) % 1;
            const radius = innerR + (outerR - innerR) * phase;
            const alpha = RALLY_BASE_ALPHA * (1 - phase * 0.7);
            const ring = rings[i];
            ring.clear();
            ring.lineStyle(RALLY_LINE_WIDTH, color, alpha);
            ring.drawCircle(0, 0, radius);
        }
    }

    update(0);
    return { container, update };
}

// ── alert ─────────────────────────────────────────────────────────

const ALERT_LINE_WIDTH = 3;
const ALERT_ROTATION_PERIOD_MS = 3000;
const ALERT_PULSE_PERIOD_MS = 250;
const ALERT_PULSE_SCALE = 1.2;

/**
 * "Alert" ping: 4 chevrons pointing outward from the spot, rotating
 * continuously with a sharp 4Hz scale pulse (1.0 ↔ 1.2). Reads as
 * urgent / kinetic. Color is forced by `buildPayload`; the visual draws
 * whatever color it's handed so the override stays the wire payload's
 * responsibility.
 */
function createAlertVisual({ color, size }: VisualOptions): PingVisual {
    const container = new PIXI.Container();
    const chevronDist = size * 0.35;
    const chevronHalfWidth = size * 0.15;
    const chevronDepth = size * 0.15;

    const shape = new PIXI.Graphics();
    shape.lineStyle(ALERT_LINE_WIDTH, color, 1.0);
    // Up chevron (above center, point up).
    shape.moveTo(-chevronHalfWidth, -chevronDist);
    shape.lineTo(0, -chevronDist - chevronDepth);
    shape.lineTo(chevronHalfWidth, -chevronDist);
    // Right chevron (right of center, point right).
    shape.moveTo(chevronDist, -chevronHalfWidth);
    shape.lineTo(chevronDist + chevronDepth, 0);
    shape.lineTo(chevronDist, chevronHalfWidth);
    // Down chevron (below center, point down).
    shape.moveTo(-chevronHalfWidth, chevronDist);
    shape.lineTo(0, chevronDist + chevronDepth);
    shape.lineTo(chevronHalfWidth, chevronDist);
    // Left chevron (left of center, point left).
    shape.moveTo(-chevronDist, -chevronHalfWidth);
    shape.lineTo(-chevronDist - chevronDepth, 0);
    shape.lineTo(-chevronDist, chevronHalfWidth);
    container.addChild(shape);

    function update(elapsedMs: number): void {
        container.rotation = (elapsedMs / ALERT_ROTATION_PERIOD_MS) * Math.PI * 2;
        const pulseCycle = (elapsedMs / ALERT_PULSE_PERIOD_MS) % 2;
        const scale = pulseCycle < 1 ? 1.0 : ALERT_PULSE_SCALE;
        container.scale.x = scale;
        container.scale.y = scale;
    }

    update(0);
    return { container, update };
}

// ── text ──────────────────────────────────────────────────────────

const TEXT_PADDING_PX = 8;
const TEXT_CORNER_RADIUS_PX = 6;
const TEXT_FONT_SIZE = 18;
const TEXT_BG_ALPHA = 0.65;
const TEXT_MAX_WIDTH_PX = 320;

/** Distance the tag's bottom edge sits above the world origin. */
const TEXT_OFFSET_Y = 14;

/**
 * "Text" ping: white-on-color rounded tag holding arbitrary text. No
 * rotation, no pulse — the message is the message. The tag is anchored
 * so its bottom edge sits above the world position, leaving the pinned
 * spot itself visible underneath.
 */
function createTextVisual({ color, text }: VisualOptions): PingVisual {
    const container = new PIXI.Container();
    const label = new PIXI.Text(text ?? '', {
        fontFamily: 'Signika, sans-serif',
        fontSize: TEXT_FONT_SIZE,
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 4,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: TEXT_MAX_WIDTH_PX,
    });
    label.anchor.x = 0.5;
    label.anchor.y = 0.5;

    // Shift the tag up so its bottom edge sits TEXT_OFFSET_Y above the
    // world origin — the spot itself stays unobstructed.
    const labelHeight = label.height;
    const tagHalfHeight = labelHeight / 2 + TEXT_PADDING_PX;
    const offsetY = -tagHalfHeight - TEXT_OFFSET_Y;
    label.y = offsetY;

    const bg = new PIXI.Graphics();
    bg.beginFill(color, TEXT_BG_ALPHA);
    bg.drawRoundedRect(
        -label.width / 2 - TEXT_PADDING_PX,
        offsetY - labelHeight / 2 - TEXT_PADDING_PX,
        label.width + TEXT_PADDING_PX * 2,
        labelHeight + TEXT_PADDING_PX * 2,
        TEXT_CORNER_RADIUS_PX,
    );
    bg.endFill();

    container.addChild(bg);
    container.addChild(label);

    function update(_elapsedMs: number): void {
        // No internal motion — the runAnimation alpha tween handles the lifecycle.
    }

    return { container, update };
}

// ── token-attach ──────────────────────────────────────────────────

const TOKEN_BRACKET_LINE_WIDTH = 3;

/**
 * "Token-attach" ping: four corner brackets framing the followed token.
 * The container's x/y is updated each frame by `createPing`'s position
 * provider so the brackets stay locked to the moving token. Static visual
 * (no rotation/pulse) so the underlying token remains the focus.
 */
function createTokenAttachVisual({ color, size }: VisualOptions): PingVisual {
    const container = new PIXI.Container();
    const cornerOffset = size * 0.5;
    const armLength = size * 0.2;

    const brackets = new PIXI.Graphics();
    brackets.lineStyle(TOKEN_BRACKET_LINE_WIDTH, color, 0.95);
    // Top-left.
    brackets.moveTo(-cornerOffset, -cornerOffset + armLength);
    brackets.lineTo(-cornerOffset, -cornerOffset);
    brackets.lineTo(-cornerOffset + armLength, -cornerOffset);
    // Top-right.
    brackets.moveTo(cornerOffset - armLength, -cornerOffset);
    brackets.lineTo(cornerOffset, -cornerOffset);
    brackets.lineTo(cornerOffset, -cornerOffset + armLength);
    // Bottom-right.
    brackets.moveTo(cornerOffset, cornerOffset - armLength);
    brackets.lineTo(cornerOffset, cornerOffset);
    brackets.lineTo(cornerOffset - armLength, cornerOffset);
    // Bottom-left.
    brackets.moveTo(-cornerOffset + armLength, cornerOffset);
    brackets.lineTo(-cornerOffset, cornerOffset);
    brackets.lineTo(-cornerOffset, cornerOffset - armLength);
    container.addChild(brackets);

    function update(_elapsedMs: number): void {
        // Position-follow happens externally via createPing's positionProvider.
    }

    return { container, update };
}

export function createPingVisual(kind: PingKind, opts: VisualOptions): PingVisual {
    switch (kind) {
        case 'here':
            return createHereVisual(opts);
        case 'rally':
            return createRallyVisual(opts);
        case 'alert':
            return createAlertVisual(opts);
        case 'text':
            return createTextVisual(opts);
        case 'token-attach':
            return createTokenAttachVisual(opts);
    }
}
