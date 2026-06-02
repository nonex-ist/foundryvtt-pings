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

const RALLY_ARROW_COUNT = 4;
const RALLY_CYCLE_MS = 1100;
const RALLY_LINE_WIDTH = 4;
const RALLY_BASE_ALPHA = 0.95;
const RALLY_OUTER_RATIO = 0.85;
const RALLY_INNER_RATIO = 0.1;
const RALLY_ARROW_HALF_SPAN = 0.18;

/**
 * "Rally" ping: four chevrons converging on the spot from N/E/S/W,
 * continuously sliding inward and fading as they reach the center. The
 * inward-collapse motion conveys "gather here" much more directly than
 * concentric rings (which were too easily confused with the here-ping).
 * Pairs with the receiver-side viewport pan.
 */
function createRallyVisual({ color, size }: VisualOptions): PingVisual {
    const container = new PIXI.Container();
    const outerR = size * RALLY_OUTER_RATIO;
    const innerR = size * RALLY_INNER_RATIO;
    const armLen = size * RALLY_ARROW_HALF_SPAN;

    // Four chevrons, each rotated to its cardinal direction. The chevron
    // itself is drawn pointing toward the negative-X axis (i.e. inward
    // toward (0,0) when at +X). Rotation places each arrow at N/E/S/W
    // pointing toward center.
    const arrows: PixiGraphics[] = [];
    for (let i = 0; i < RALLY_ARROW_COUNT; i++) {
        const g = new PIXI.Graphics();
        g.rotation = (i / RALLY_ARROW_COUNT) * Math.PI * 2;
        container.addChild(g);
        arrows.push(g);
    }

    function update(elapsedMs: number): void {
        for (let i = 0; i < RALLY_ARROW_COUNT; i++) {
            // Stagger so the four arrows aren't in lockstep — looks more
            // organic and you can always see at least one mid-travel.
            const phase = ((elapsedMs / RALLY_CYCLE_MS) + i / RALLY_ARROW_COUNT) % 1;
            const radius = outerR - (outerR - innerR) * phase;
            // Clamp the arm so the tip (radius - armLen) never crosses
            // past the menu center as the chevron approaches innerR.
            // Without this, arm overshoots when radius < armLen and the
            // chevron visibly inverts.
            const safeArm = Math.min(armLen, radius * 0.85);
            // Fade in fast, hold, then fade as it reaches the center.
            const fade = phase < 0.15 ? phase / 0.15 : 1 - (phase - 0.15) / 0.85;
            const alpha = RALLY_BASE_ALPHA * fade;
            const g = arrows[i];
            g.clear();
            g.lineStyle(RALLY_LINE_WIDTH, color, alpha);
            // Chevron tip points inward (toward -X), back at +X radius.
            g.moveTo(radius, -safeArm);
            g.lineTo(radius - safeArm, 0);
            g.lineTo(radius, safeArm);
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

const TOKEN_FRAME_COUNT = 3;
const TOKEN_CYCLE_MS = 1400;
const TOKEN_LINE_WIDTH = 3;
const TOKEN_BASE_ALPHA = 0.95;
const TOKEN_OUTER_RATIO = 0.55;
const TOKEN_INNER_RATIO = 0.22;
const TOKEN_ARM_RATIO = 0.18;

/**
 * "Token-attach" ping: four corner brackets framing the followed token,
 * continuously contracting inward like a closing reticle. Three
 * staggered frames sweep from the outer corner-offset to the inner
 * offset and fade, so at any moment at least one frame is mid-travel —
 * the eye reads "marked / locked, hands off". Movement of the token is
 * blocked while the ping is active (handled by the api layer).
 *
 * The container's x/y is updated each frame by `createPing`'s position
 * provider so the brackets stay locked to the moving token even
 * mid-animation.
 */
function createTokenAttachVisual({ color, size }: VisualOptions): PingVisual {
    const container = new PIXI.Container();
    const outerOffset = size * TOKEN_OUTER_RATIO;
    const innerOffset = size * TOKEN_INNER_RATIO;
    const baseArmLen = size * TOKEN_ARM_RATIO;

    const frames: PixiGraphics[] = [];
    for (let i = 0; i < TOKEN_FRAME_COUNT; i++) {
        const g = new PIXI.Graphics();
        container.addChild(g);
        frames.push(g);
    }

    function drawFrame(g: PixiGraphics, offset: number, alpha: number): void {
        // Clamp arm length so it never overshoots the bracket's own
        // corner — keeps the shape readable as the frame contracts.
        const armLen = Math.min(baseArmLen, offset * 0.7);
        g.clear();
        g.lineStyle(TOKEN_LINE_WIDTH, color, alpha);
        // Top-left
        g.moveTo(-offset, -offset + armLen);
        g.lineTo(-offset, -offset);
        g.lineTo(-offset + armLen, -offset);
        // Top-right
        g.moveTo(offset - armLen, -offset);
        g.lineTo(offset, -offset);
        g.lineTo(offset, -offset + armLen);
        // Bottom-right
        g.moveTo(offset, offset - armLen);
        g.lineTo(offset, offset);
        g.lineTo(offset - armLen, offset);
        // Bottom-left
        g.moveTo(-offset + armLen, offset);
        g.lineTo(-offset, offset);
        g.lineTo(-offset, offset - armLen);
    }

    function update(elapsedMs: number): void {
        for (let i = 0; i < TOKEN_FRAME_COUNT; i++) {
            const phase = ((elapsedMs / TOKEN_CYCLE_MS) + i / TOKEN_FRAME_COUNT) % 1;
            const offset = outerOffset - (outerOffset - innerOffset) * phase;
            // Quick fade-in (0–15%), fade out across remainder.
            const fade = phase < 0.15 ? phase / 0.15 : 1 - (phase - 0.15) / 0.85;
            const alpha = TOKEN_BASE_ALPHA * fade;
            drawFrame(frames[i], offset, alpha);
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
            return createRallyVisual(opts);
        case 'alert':
            return createAlertVisual(opts);
        case 'text':
            return createTextVisual(opts);
        case 'token-attach':
            return createTokenAttachVisual(opts);
    }
}
