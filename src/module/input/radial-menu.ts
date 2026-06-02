import type { PingKind } from '../types.js';

/**
 * Cardinal layout. Each entry has the angle (radians, screen space — 0 is
 * right, π/2 is down) the segment's *center* points to, plus a label.
 * Layout (memorize once, never confuse again):
 *
 *   ┌──────────┐
 *   │   Rally  │   12 o'clock — gather-here is up
 *   │Tk  Here  Al   9 — token-attach    3 — alert (urgent right)
 *   │   Text   │   6 — text anchors the bottom
 *   └──────────┘
 */
export const RADIAL_SEGMENTS: ReadonlyArray<{
    kind: Exclude<PingKind, 'here'>;
    angleCenter: number;
    label: string;
}> = [
    { kind: 'rally', angleCenter: -Math.PI / 2, label: 'Rally' },
    { kind: 'alert', angleCenter: 0, label: 'Alert' },
    { kind: 'text', angleCenter: Math.PI / 2, label: 'Text' },
    { kind: 'token-attach', angleCenter: Math.PI, label: 'Token' },
];

/**
 * Hit-test a cursor delta against the radial menu. Inside the deadzone the
 * selection is the implicit "here" default; outside, the angle bins into
 * one of four equal cardinal quadrants centered on the segment angles.
 *
 * Pure function — radial-menu.ts is exercised here without DOM dependencies.
 */
export function pickKindFromDelta(
    deltaX: number,
    deltaY: number,
    deadzonePx: number,
): PingKind {
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (dist < deadzonePx) return 'here';

    const angle = Math.atan2(deltaY, deltaX);
    // Bin into 90° quadrants centered on each cardinal angle.
    if (angle >= -Math.PI / 4 && angle < Math.PI / 4) return 'alert';
    if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) return 'text';
    if (angle >= -(3 * Math.PI) / 4 && angle < -Math.PI / 4) return 'rally';
    return 'token-attach';
}

export interface MenuController {
    /** Update the highlighted segment based on the cursor's client-pixel position. */
    onCursorMove(clientX: number, clientY: number): void;
    /** Resolve the kind to commit on release for the given cursor position. */
    getSelectedKind(clientX: number, clientY: number): PingKind;
    destroy(): void;
}

export interface OpenRadialMenuOptions {
    /** Center of the menu in viewport coordinates — typically the press location. */
    clientX: number;
    clientY: number;
    /** Cursor distance threshold below which the menu commits the "here" default. */
    deadzonePx: number;
}

const SEGMENT_RADIUS_PX = 70;

/**
 * Open the radial menu as a DOM overlay anchored at the press position.
 *
 * The overlay is a fixed-position container with `pointer-events: none` so
 * pointer events still reach the canvas underneath — the trigger remains
 * the single source of truth for cursor tracking and release.
 *
 * Hit-test runs in client (CSS) pixels so the user's drag distance maps
 * directly onto what they see, independent of canvas zoom.
 */
export function openRadialMenu(opts: OpenRadialMenuOptions): MenuController {
    const root = document.createElement('div');
    root.className = 'pings-radial-menu';
    root.style.left = `${opts.clientX}px`;
    root.style.top = `${opts.clientY}px`;

    const center = document.createElement('div');
    center.className = 'pings-radial-segment pings-radial-center';
    center.textContent = 'Here';
    root.appendChild(center);

    const segments = new Map<PingKind, HTMLDivElement>([['here', center]]);

    for (const seg of RADIAL_SEGMENTS) {
        const el = document.createElement('div');
        el.className = 'pings-radial-segment';
        el.textContent = seg.label;
        // Positioning rides on CSS custom properties (--pings-tx / --pings-ty)
        // rather than an inline `transform`, so the .pings-radial-active class
        // can compose the position with a scale() without being overridden by
        // a more-specific inline transform.
        const offsetX = Math.cos(seg.angleCenter) * SEGMENT_RADIUS_PX;
        const offsetY = Math.sin(seg.angleCenter) * SEGMENT_RADIUS_PX;
        el.style.setProperty('--pings-tx', `${offsetX}px`);
        el.style.setProperty('--pings-ty', `${offsetY}px`);
        root.appendChild(el);
        segments.set(seg.kind, el);
    }

    document.body.appendChild(root);

    let currentHighlight: PingKind | null = null;
    const highlight = (kind: PingKind): void => {
        if (currentHighlight === kind) return;
        if (currentHighlight !== null) {
            segments.get(currentHighlight)?.classList.remove('pings-radial-active');
        }
        segments.get(kind)?.classList.add('pings-radial-active');
        currentHighlight = kind;
    };

    highlight('here');

    return {
        onCursorMove(clientX, clientY) {
            highlight(pickKindFromDelta(clientX - opts.clientX, clientY - opts.clientY, opts.deadzonePx));
        },
        getSelectedKind(clientX, clientY) {
            return pickKindFromDelta(clientX - opts.clientX, clientY - opts.clientY, opts.deadzonePx);
        },
        destroy() {
            root.remove();
        },
    };
}
