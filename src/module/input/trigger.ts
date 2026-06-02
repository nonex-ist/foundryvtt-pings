import type { BindingSpec, PingKind, WorldPosition } from '../types.js';
import { eventMatches } from './binding.js';
import type { MenuController } from './radial-menu.js';

export interface PreviewBundle {
    /** Drops the preview ping. Trigger calls this on cancel and hands it to commit for the commit handler to call (or skip). */
    previewDispose: () => void;
    /** Radial menu, opened in passive mode at preview time. Trigger calls `setActive(true)` once the user drags past the menu-summon threshold; destroys it after commit/cancel. */
    menu: MenuController;
}

export interface TriggerCallbacks {
    /**
     * The hold has matured (350ms passed without exceeding the 5px cancel
     * tolerance). Mount the preview ping AND the radial menu (the menu
     * starts in passive mode — visible-but-dim, signaling availability).
     * Returns both as a bundle the trigger drives.
     */
    showPreview(
        worldPosition: WorldPosition,
        clientPosition: { x: number; y: number },
    ): PreviewBundle;

    /**
     * Commit the gesture. Fired on release from preview or menu state;
     * never fired if the gesture was canceled. The menu was already
     * destroyed by the trigger before this fires.
     *
     * `previewDispose` is non-null when the preview ping is still on
     * screen. The handler owns the preview from this point: call the
     * disposer to drop it (replacing with a different kind's visual), or
     * skip it to let the preview live out its natural lifetime — useful
     * when the commit *is* the preview ("here" from preview state).
     */
    commit(
        kind: PingKind,
        position: WorldPosition,
        previewDispose: (() => void) | null,
    ): void;
}

export interface TriggerConfig {
    binding: BindingSpec;
    holdDurationMs: number;
    holdCancelTolerancePx: number;
    menuSummonPx: number;
    callbacks: TriggerCallbacks;
}

type HoldPhase = 'holding' | 'preview' | 'menu';

interface HoldState {
    phase: HoldPhase;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startWorld: WorldPosition;
    timerId: ReturnType<typeof setTimeout> | null;
    previewDispose: (() => void) | null;
    menu: MenuController | null;
}

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
 * State machine:
 *   idle    -- pointerdown matches binding --> holding (350ms timer armed)
 *   holding -- drag >5px / release / cancel --> idle (no commit)
 *   holding -- 350ms timer fires --> preview (showPreview mounts ring +
 *                                              radial menu in passive mode)
 *   preview -- drag ≥25px --> menu (menu.setActive(true), preview kept)
 *   preview -- release --> commit('here', previewDispose), idle
 *   menu    -- pointermove --> menu.onCursorMove (highlight updates)
 *   menu    -- release --> commit(menu.getSelectedKind, previewDispose), idle
 *   any     -- pointercancel --> idle (no commit, everything torn down)
 *
 * Binding to `canvas.app.view` (not window) is the M1 fix for the v14
 * sheet pointer-bleed bug.
 */
export function installTrigger(config: TriggerConfig): () => void {
    const view = canvas.app.view;
    const stage = canvas.app.stage;

    let hold: HoldState | null = null;

    const reset = (): void => {
        if (!hold) return;
        if (hold.timerId !== null) clearTimeout(hold.timerId);
        hold.previewDispose?.();
        hold.menu?.destroy();
        hold = null;
    };

    const onPointerDown = (ev: PointerEvent): void => {
        if (hold) return;
        if (!eventMatches(ev, config.binding)) return;

        const startClientX = ev.clientX;
        const startClientY = ev.clientY;
        const startWorld = clientToWorld(view, stage, startClientX, startClientY);
        const pointerId = ev.pointerId;

        const timerId = setTimeout(() => {
            if (!hold || hold.pointerId !== pointerId || hold.phase !== 'holding') return;

            // At the moment the gesture commits to being a ping, abort
            // any in-flight Foundry interaction on the same pointer (most
            // commonly a token drag started by the press). Foundry's
            // `cancel()` resets the manager to HOVER and snaps any
            // mid-drag target back to its origin, so our preview + menu
            // mount over a stable scene — no visual drag ghost, no
            // snap-back at release. Safe no-op if nothing's in flight.
            try {
                canvas.currentMouseManager?.cancel();
            } catch (err) {
                console.warn('pings | could not cancel native interaction', err);
            }

            hold.phase = 'preview';
            hold.timerId = null;
            const bundle = config.callbacks.showPreview(startWorld, {
                x: startClientX,
                y: startClientY,
            });
            hold.previewDispose = bundle.previewDispose;
            hold.menu = bundle.menu;
        }, config.holdDurationMs);

        hold = {
            phase: 'holding',
            pointerId,
            startClientX,
            startClientY,
            startWorld,
            timerId,
            previewDispose: null,
            menu: null,
        };
    };

    const onPointerMove = (ev: PointerEvent): void => {
        if (!hold || hold.pointerId !== ev.pointerId) return;

        const dx = ev.clientX - hold.startClientX;
        const dy = ev.clientY - hold.startClientY;
        const distSq = dx * dx + dy * dy;

        if (hold.phase === 'holding') {
            if (distSq > config.holdCancelTolerancePx * config.holdCancelTolerancePx) {
                reset();
            }
            return;
        }

        if (hold.phase === 'preview') {
            if (distSq >= config.menuSummonPx * config.menuSummonPx) {
                hold.menu?.setActive(true);
                hold.menu?.onCursorMove(ev.clientX, ev.clientY);
                hold.phase = 'menu';
            }
            return;
        }

        // menu phase — keep highlight tracking
        hold.menu?.onCursorMove(ev.clientX, ev.clientY);
    };

    const onPointerUp = (ev: PointerEvent): void => {
        if (!hold || hold.pointerId !== ev.pointerId) return;

        let commitKind: PingKind | null = null;
        if (hold.phase === 'preview') {
            commitKind = 'here';
        } else if (hold.phase === 'menu' && hold.menu) {
            commitKind = hold.menu.getSelectedKind(ev.clientX, ev.clientY);
        }

        const commitPosition = hold.startWorld;
        // Hand the preview disposer to the commit callback. The trigger
        // destroys the menu unconditionally (it's a transient affordance);
        // the preview's fate is the commit handler's call.
        const previewDispose = hold.previewDispose;
        hold.previewDispose = null;
        reset();
        if (commitKind !== null) {
            config.callbacks.commit(commitKind, commitPosition, previewDispose);
        } else if (previewDispose) {
            previewDispose();
        }
    };

    const onPointerCancel = (ev: PointerEvent): void => {
        if (!hold || hold.pointerId !== ev.pointerId) return;
        reset();
    };

    view.addEventListener('pointerdown', onPointerDown);
    view.addEventListener('pointermove', onPointerMove);
    view.addEventListener('pointerup', onPointerUp);
    view.addEventListener('pointercancel', onPointerCancel);

    return () => {
        reset();
        view.removeEventListener('pointerdown', onPointerDown);
        view.removeEventListener('pointermove', onPointerMove);
        view.removeEventListener('pointerup', onPointerUp);
        view.removeEventListener('pointercancel', onPointerCancel);
    };
}
