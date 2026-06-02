import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runAnimation } from './animation.js';

interface FakeTicker {
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    tick(): void;
}

interface MutableContainer {
    alpha: number;
}

function setupFakeCanvas(): { ticker: FakeTicker; restore(): void } {
    const callbacks = new Set<() => void>();
    const ticker = {
        add: vi.fn((fn: () => void) => {
            callbacks.add(fn);
            return ticker;
        }),
        remove: vi.fn((fn: () => void) => {
            callbacks.delete(fn);
            return ticker;
        }),
        tick: () => {
            for (const fn of [...callbacks]) fn();
        },
    } as FakeTicker;

    const globals = globalThis as typeof globalThis & { canvas?: unknown };
    const prev = globals.canvas;
    globals.canvas = { app: { ticker } };
    return {
        ticker,
        restore() {
            globals.canvas = prev;
        },
    };
}

describe('runAnimation', () => {
    let restoreCanvas: () => void;
    let ticker: FakeTicker;
    let nowMs = 0;

    beforeEach(() => {
        nowMs = 0;
        vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
        const setup = setupFakeCanvas();
        ticker = setup.ticker;
        restoreCanvas = setup.restore;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        restoreCanvas();
    });

    const makeContainer = (): MutableContainer => ({ alpha: -1 });
    const cast = (c: MutableContainer): PixiContainer => c as unknown as PixiContainer;

    it('ramps alpha 0 → 1 during fade-in', () => {
        const c = makeContainer();
        runAnimation(cast(c), {
            durationMs: 1000,
            fadeInMs: 500,
            fadeOutMs: 500,
            update: vi.fn(),
            onComplete: vi.fn(),
        });

        nowMs = 0;
        ticker.tick();
        expect(c.alpha).toBe(0);

        nowMs = 250;
        ticker.tick();
        expect(c.alpha).toBeCloseTo(0.5);

        nowMs = 500;
        ticker.tick();
        expect(c.alpha).toBe(1);
    });

    it('ramps alpha 1 → 0 during fade-out', () => {
        const c = makeContainer();
        runAnimation(cast(c), {
            durationMs: 1000,
            fadeInMs: 500,
            fadeOutMs: 500,
            update: vi.fn(),
            onComplete: vi.fn(),
        });

        nowMs = 1500;
        ticker.tick();
        expect(c.alpha).toBe(1);

        nowMs = 1750;
        ticker.tick();
        expect(c.alpha).toBeCloseTo(0.5);

        nowMs = 2000;
        ticker.tick();
        expect(c.alpha).toBe(0);
    });

    it('fires onComplete exactly once on natural completion and detaches from ticker', () => {
        const c = makeContainer();
        const onComplete = vi.fn();
        runAnimation(cast(c), {
            durationMs: 1000,
            fadeInMs: 500,
            fadeOutMs: 500,
            update: vi.fn(),
            onComplete,
        });

        nowMs = 2000;
        ticker.tick();

        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(ticker.remove).toHaveBeenCalledTimes(1);

        nowMs = 3000;
        ticker.tick();
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('cancel detaches from ticker without firing onComplete', () => {
        const c = makeContainer();
        const onComplete = vi.fn();
        const cancel = runAnimation(cast(c), {
            durationMs: 1000,
            fadeInMs: 500,
            fadeOutMs: 500,
            update: vi.fn(),
            onComplete,
        });

        nowMs = 100;
        ticker.tick();
        cancel();
        expect(ticker.remove).toHaveBeenCalledTimes(1);

        nowMs = 2000;
        ticker.tick();
        expect(onComplete).not.toHaveBeenCalled();
    });

    it('cancel called twice is a no-op the second time', () => {
        const cancel = runAnimation(cast(makeContainer()), {
            durationMs: 1000,
            fadeInMs: 500,
            fadeOutMs: 500,
            update: vi.fn(),
            onComplete: vi.fn(),
        });

        cancel();
        cancel();
        expect(ticker.remove).toHaveBeenCalledTimes(1);
    });

    it('passes elapsed time to the visual update callback each frame', () => {
        const update = vi.fn();
        runAnimation(cast(makeContainer()), {
            durationMs: 1000,
            fadeInMs: 500,
            fadeOutMs: 500,
            update,
            onComplete: vi.fn(),
        });

        nowMs = 100;
        ticker.tick();
        nowMs = 200;
        ticker.tick();

        expect(update).toHaveBeenNthCalledWith(1, 100);
        expect(update).toHaveBeenNthCalledWith(2, 200);
    });
});
