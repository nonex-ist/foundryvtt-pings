import type { PingKind } from '../types.js';

/**
 * Cardinal layout. Each entry has the angle (radians, screen space — 0 is
 * right, π/2 is down) the segment's *center* points to, plus the i18n
 * key for the label (with an English fallback baked in).
 * Layout (memorize once, never confuse again):
 *
 *   ┌──────────┐
 *   │   Rally  │   12 o'clock — gather-here is up
 *   │Tk  Ping  Al   9 — token-attach    3 — alert (urgent right)
 *   │   Text   │   6 — text anchors the bottom
 *   └──────────┘
 */
export const RADIAL_SEGMENTS: ReadonlyArray<{
    kind: Exclude<PingKind, 'here'>;
    angleCenter: number;
    i18n: string;
    fallback: string;
}> = [
    { kind: 'rally', angleCenter: -Math.PI / 2, i18n: 'pings.radial.rally', fallback: 'Rally' },
    { kind: 'alert', angleCenter: 0, i18n: 'pings.radial.alert', fallback: 'Alert' },
    { kind: 'text', angleCenter: Math.PI / 2, i18n: 'pings.radial.text', fallback: 'Text' },
    { kind: 'token-attach', angleCenter: Math.PI, i18n: 'pings.radial.token', fallback: 'Token' },
];

function tr(key: string, fallback: string): string {
    const out = game.i18n?.localize(key);
    return out && out !== key ? out : fallback;
}

/** Convert a 24-bit integer color (0xRRGGBB) into a CSS hex string. */
function colorToHex(value: number): string {
    return `#${Math.max(0, Math.min(0xffffff, value)).toString(16).padStart(6, '0')}`;
}

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
    /** The local user's color (0xRRGGBB). Used to tint chips whose outcome ping is user-colored (here / text / token-attach). */
    userColor: number;
    /**
     * Kinds that are unavailable in the current context (e.g. token-attach
     * with no token at the press point). Disabled segments are visually
     * greyed-out; cursor-over them highlights the center "Ping" instead;
     * release on them falls back to "here". The kind itself is never
     * returned from `getSelectedKind`.
     */
    disabledKinds?: ReadonlyArray<PingKind>;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const INNER_RADIUS_PX = 32;
const OUTER_RADIUS_PX = 108;
const CENTER_RADIUS_PX = 28;
const LABEL_RADIUS_PX = (INNER_RADIUS_PX + OUTER_RADIUS_PX) / 2;
const SVG_HALF_SIZE_PX = OUTER_RADIUS_PX + 12;
const SVG_SIZE_PX = SVG_HALF_SIZE_PX * 2;

/**
 * Build a donut-wedge SVG path: from inner radius to outer radius,
 * spanning [startAngle, endAngle] radians. Angles use screen space
 * (0 = right, π/2 = down). Assumes each wedge spans < 180°.
 */
function arcPath(
    innerR: number,
    outerR: number,
    startAngle: number,
    endAngle: number,
): string {
    const x1i = innerR * Math.cos(startAngle);
    const y1i = innerR * Math.sin(startAngle);
    const x1o = outerR * Math.cos(startAngle);
    const y1o = outerR * Math.sin(startAngle);
    const x2o = outerR * Math.cos(endAngle);
    const y2o = outerR * Math.sin(endAngle);
    const x2i = innerR * Math.cos(endAngle);
    const y2i = innerR * Math.sin(endAngle);
    return (
        `M ${x1i} ${y1i}` +
        ` L ${x1o} ${y1o}` +
        ` A ${outerR} ${outerR} 0 0 1 ${x2o} ${y2o}` +
        ` L ${x2i} ${y2i}` +
        ` A ${innerR} ${innerR} 0 0 0 ${x1i} ${y1i}` +
        ` Z`
    );
}

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
    // Single CSS variable for the user-colored chips (here / text / token).
    // Rally + alert hardcode their fixed colors in the stylesheet so the
    // visual mirrors what the resulting ping will look like.
    root.style.setProperty('--pings-user-color', colorToHex(opts.userColor));

    const disabledKinds = new Set<PingKind>(opts.disabledKinds ?? []);

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'pings-radial-svg');
    svg.setAttribute('width', `${SVG_SIZE_PX}`);
    svg.setAttribute('height', `${SVG_SIZE_PX}`);
    svg.setAttribute(
        'viewBox',
        `${-SVG_HALF_SIZE_PX} ${-SVG_HALF_SIZE_PX} ${SVG_SIZE_PX} ${SVG_SIZE_PX}`,
    );
    root.appendChild(svg);

    const segments = new Map<PingKind, SVGElement>();

    // Build the four ring wedges first (so the center circle renders on top
    // and the labels can sit on top of everything).
    for (const seg of RADIAL_SEGMENTS) {
        const path = document.createElementNS(SVG_NS, 'path');
        let className = 'pings-radial-segment';
        if (disabledKinds.has(seg.kind)) className += ' pings-radial-disabled';
        path.setAttribute('class', className);
        path.dataset.kind = seg.kind;
        const half = Math.PI / 4;
        path.setAttribute(
            'd',
            arcPath(
                INNER_RADIUS_PX,
                OUTER_RADIUS_PX,
                seg.angleCenter - half,
                seg.angleCenter + half,
            ),
        );
        svg.appendChild(path);
        segments.set(seg.kind, path);
    }

    // Center circle ("Ping" / here-default).
    const center = document.createElementNS(SVG_NS, 'circle');
    center.setAttribute('class', 'pings-radial-segment pings-radial-center');
    center.dataset.kind = 'here';
    center.setAttribute('cx', '0');
    center.setAttribute('cy', '0');
    center.setAttribute('r', `${CENTER_RADIUS_PX}`);
    svg.appendChild(center);
    segments.set('here', center);

    // Thin decorative ring just outside the center chip — visually
    // separates the deadzone from the wedge ring without competing.
    const centerRing = document.createElementNS(SVG_NS, 'circle');
    centerRing.setAttribute('class', 'pings-radial-center-ring');
    centerRing.setAttribute('cx', '0');
    centerRing.setAttribute('cy', '0');
    centerRing.setAttribute('r', `${CENTER_RADIUS_PX + 3.5}`);
    svg.appendChild(centerRing);

    // Outer hairline ring polishes the ring's silhouette.
    const outerRing = document.createElementNS(SVG_NS, 'circle');
    outerRing.setAttribute('class', 'pings-radial-outer-ring');
    outerRing.setAttribute('cx', '0');
    outerRing.setAttribute('cy', '0');
    outerRing.setAttribute('r', `${OUTER_RADIUS_PX + 0.5}`);
    svg.appendChild(outerRing);

    // Labels go last so they're not clipped by sibling fills.
    for (const seg of RADIAL_SEGMENTS) {
        const label = document.createElementNS(SVG_NS, 'text');
        let labelClass = 'pings-radial-label';
        if (disabledKinds.has(seg.kind)) labelClass += ' pings-radial-disabled';
        label.setAttribute('class', labelClass);
        label.setAttribute('x', `${LABEL_RADIUS_PX * Math.cos(seg.angleCenter)}`);
        label.setAttribute('y', `${LABEL_RADIUS_PX * Math.sin(seg.angleCenter)}`);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.textContent = tr(seg.i18n, seg.fallback);
        svg.appendChild(label);
    }
    const centerLabel = document.createElementNS(SVG_NS, 'text');
    centerLabel.setAttribute('class', 'pings-radial-label pings-radial-center-label');
    centerLabel.setAttribute('x', '0');
    centerLabel.setAttribute('y', '0');
    centerLabel.setAttribute('text-anchor', 'middle');
    centerLabel.setAttribute('dominant-baseline', 'middle');
    centerLabel.textContent = tr('pings.radial.ping', 'Ping');
    svg.appendChild(centerLabel);

    document.body.appendChild(root);

    let active = false;
    let currentHighlight: PingKind | null = null;

    const clearHighlight = (): void => {
        if (currentHighlight !== null) {
            const el = segments.get(currentHighlight);
            if (el) el.classList.remove('pings-radial-active');
            currentHighlight = null;
        }
    };

    const highlight = (kind: PingKind): void => {
        if (!active) return;
        // Cursor over a disabled segment lights the center instead — the
        // user sees the fallback they'd actually commit on release.
        const effective: PingKind = disabledKinds.has(kind) ? 'here' : kind;
        if (currentHighlight === effective) return;
        clearHighlight();
        const el = segments.get(effective);
        if (el) el.classList.add('pings-radial-active');
        currentHighlight = effective;
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
            const picked = pickKindFromDelta(
                clientX - opts.clientX,
                clientY - opts.clientY,
                opts.deadzonePx,
            );
            return disabledKinds.has(picked) ? 'here' : picked;
        },
        destroy() {
            root.remove();
        },
    };
}
