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
    /**
     * Toggle between passive (discovery hint) and active (interactive)
     * modes. Passive: dimmer + smaller + no highlight tracking; signals
     * "menu is available, drag to select". Active: full opacity +
     * highlight follows cursor; signals "you're picking a segment".
     */
    setActive(active: boolean): void;
    /** Update the highlighted segment based on the cursor's client-pixel position. No-op while passive. */
    onCursorMove(clientX: number, clientY: number): void;
    /**
     * Resolve the kind to commit on release for the given cursor
     * position. Passive menu always commits "here" (the user never
     * armed the menu).
     */
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
 * Opens in **passive** mode by default — chips visible but dimmer and
 * smaller, with no highlight tracking. The trigger calls `setActive(true)`
 * once the user has dragged past the menu-summon threshold; until then,
 * the menu reads as a discovery hint ("you can drag toward one of these")
 * rather than as a UI element actively responding to input.
 *
 * The overlay is fixed-position with `pointer-events: none` so the canvas
 * underneath keeps receiving the gesture. Hit-test runs in client (CSS)
 * pixels so drag distance maps directly to what the user sees,
 * independent of canvas zoom.
 */
export function openRadialMenu(opts: OpenRadialMenuOptions): MenuController {
    const root = document.createElement('div');
    root.className = 'pings-radial-menu pings-radial-menu--passive';
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

    let active = false;
    let currentHighlight: PingKind | null = null;

    const clearHighlight = (): void => {
        if (currentHighlight !== null) {
            segments.get(currentHighlight)?.classList.remove('pings-radial-active');
            currentHighlight = null;
        }
    };

    const highlight = (kind: PingKind): void => {
        if (!active) return;
        if (currentHighlight === kind) return;
        clearHighlight();
        segments.get(kind)?.classList.add('pings-radial-active');
        currentHighlight = kind;
    };

    return {
        setActive(value) {
            if (active === value) return;
            active = value;
            if (active) {
                root.classList.remove('pings-radial-menu--passive');
            } else {
                root.classList.add('pings-radial-menu--passive');
                clearHighlight();
            }
        },
        onCursorMove(clientX, clientY) {
            if (!active) return;
            highlight(
                pickKindFromDelta(clientX - opts.clientX, clientY - opts.clientY, opts.deadzonePx),
            );
        },
        getSelectedKind(clientX, clientY) {
            if (!active) return 'here';
            return pickKindFromDelta(
                clientX - opts.clientX,
                clientY - opts.clientY,
                opts.deadzonePx,
            );
        },
        destroy() {
            root.remove();
        },
    };
}
