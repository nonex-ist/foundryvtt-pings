import type { BindingSpec, PingKind, WorldPosition } from '../types.js';
import { eventMatches } from './binding.js';
import type { MenuController } from './radial-menu.js';

export interface TriggerCallbacks {
    /**
     * The hold has matured (350ms passed without exceeding the 5px cancel
     * tolerance). Render a local-only "here" preview at the position so
     * the user gets immediate feedback. Returns a disposer the trigger
     * calls when the preview should end (menu summoned, or canceled
     * without commit).
     */
    showPreview(position: WorldPosition): () => void;

    /**
     * The user dragged past the menu-summon threshold after the preview
     * appeared. Build the menu overlay anchored at the *original* press
     * position (both client and world coords are supplied). Returns a
     * controller the trigger drives during subsequent pointer moves.
     */
    openMenu(clientPosition: { x: number; y: number }, worldPosition: WorldPosition): MenuController;

    /**
     * Commit the gesture. Fired on release in either preview or menu
     * state; never fired if the gesture was canceled. The preview
     * disposer (if any) has already been called; the menu controller (if
     * any) has already been destroyed.
     */
    commit(kind: PingKind, position: WorldPosition): void;
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
 *   idle -- pointerdown matching binding -->  holding (350ms timer armed)
 *   holding -- drag >5px / release / cancel --> idle (no commit)
 *   holding -- 350ms timer fires --> preview (callbacks.showPreview)
 *   preview -- drag >25px --> menu (preview dispose, callbacks.openMenu)
 *   preview -- release --> commit('here'), idle
 *   menu -- pointermove --> menu.onCursorMove (highlight updates)
 *   menu -- release --> commit(menu.getSelectedKind), idle
 *   any -- pointercancel --> idle (no commit)
 *
 * Binding to `canvas.app.view` (not window) is the M1 fix for the v14
 * sheet pointer-bleed bug. Sheets are stacked above the canvas DOM
 * element, so pointer events that originate inside a sheet never reach
 * this listener.
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
            hold.phase = 'preview';
            hold.timerId = null;
            hold.previewDispose = config.callbacks.showPreview(startWorld);
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
                hold.previewDispose?.();
                hold.previewDispose = null;
                hold.menu = config.callbacks.openMenu(
                    { x: hold.startClientX, y: hold.startClientY },
                    hold.startWorld,
                );
                hold.phase = 'menu';
                hold.menu.onCursorMove(ev.clientX, ev.clientY);
            }
            return;
        }

        // menu phase
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
        reset();
        if (commitKind !== null) config.callbacks.commit(commitKind, commitPosition);
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
