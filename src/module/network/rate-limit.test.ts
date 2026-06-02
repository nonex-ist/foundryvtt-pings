import { describe, expect, it } from 'vitest';

import { createRateLimit } from './rate-limit.js';

function fixedClock(start = 0): { now(): number; advance(ms: number): void } {
    let t = start;
    return {
        now: () => t,
        advance: (ms) => {
            t += ms;
        },
    };
}

describe('createRateLimit', () => {
    it('permits events under capacity', () => {
        const rl = createRateLimit({ capacity: 3, windowMs: 5000, now: () => 0 });
        expect(rl.allow('a', false)).toBe(true);
        expect(rl.allow('a', false)).toBe(true);
        expect(rl.allow('a', false)).toBe(true);
    });

    it('blocks the (capacity + 1)th event within the window', () => {
        const clock = fixedClock();
        const rl = createRateLimit({ capacity: 3, windowMs: 5000, now: clock.now });
        rl.allow('a', false);
        rl.allow('a', false);
        rl.allow('a', false);
        expect(rl.allow('a', false)).toBe(false);
    });

    it('releases capacity as old timestamps fall out of the window', () => {
        const clock = fixedClock();
        const rl = createRateLimit({ capacity: 3, windowMs: 5000, now: clock.now });
        rl.allow('a', false);
        clock.advance(1000);
        rl.allow('a', false);
        clock.advance(1000);
        rl.allow('a', false);
        expect(rl.allow('a', false)).toBe(false);

        // First entry was at t=0; window is 5000ms. At t=5001, it should be evicted.
        clock.advance(3001);
        expect(rl.allow('a', false)).toBe(true);
    });

    it('tracks senders independently', () => {
        const rl = createRateLimit({ capacity: 2, windowMs: 5000, now: () => 0 });
        expect(rl.allow('a', false)).toBe(true);
        expect(rl.allow('a', false)).toBe(true);
        expect(rl.allow('a', false)).toBe(false);

        expect(rl.allow('b', false)).toBe(true);
        expect(rl.allow('b', false)).toBe(true);
        expect(rl.allow('b', false)).toBe(false);
    });

    it('bypasses the limit for GMs without recording their events', () => {
        const rl = createRateLimit({ capacity: 1, windowMs: 5000, now: () => 0 });
        expect(rl.allow('gm', true)).toBe(true);
        expect(rl.allow('gm', true)).toBe(true);
        expect(rl.allow('gm', true)).toBe(true);
        // Switching the same sender to non-GM should still have no recorded
        // history, since GM calls don't consume capacity.
        expect(rl.allow('gm', false)).toBe(true);
    });
});
