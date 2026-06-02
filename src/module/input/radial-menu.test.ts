import { describe, expect, it } from 'vitest';

import { pickKindFromDelta } from './radial-menu.js';

const DEADZONE = 25;

describe('pickKindFromDelta', () => {
    it('returns "here" inside the deadzone', () => {
        expect(pickKindFromDelta(0, 0, DEADZONE)).toBe('here');
        expect(pickKindFromDelta(10, 10, DEADZONE)).toBe('here');
        // Exactly on the boundary is outside (dist === deadzone fails dist < deadzone).
        // A point with dist = 25 lies at e.g. (25, 0), which is in the alert quadrant.
        expect(pickKindFromDelta(25, 0, DEADZONE)).toBe('alert');
    });

    it.each([
        ['right (east)', 100, 0, 'alert'],
        ['down (south)', 0, 100, 'text'],
        ['left (west)', -100, 0, 'token-attach'],
        ['up (north)', 0, -100, 'rally'],
    ])('cardinal: %s → %s', (_label, dx, dy, expected) => {
        expect(pickKindFromDelta(dx, dy, DEADZONE)).toBe(expected);
    });

    // Diagonal tie-break: every exact diagonal (-π/4, π/4, 3π/4, -3π/4)
    // resolves to its clockwise neighbor. Interior angles bin into their
    // own quadrant.
    it.each([
        ['NE diagonal (-π/4)', 100, -100, 'alert'],
        ['SE diagonal (π/4)', 100, 100, 'text'],
        ['SW diagonal (3π/4)', -100, 100, 'token-attach'],
        ['NW diagonal (-3π/4)', -100, -100, 'rally'],
        ['ENE interior', 100, -40, 'alert'],
        ['NNE interior', 40, -100, 'rally'],
        ['SSE interior', 40, 100, 'text'],
        ['ESE interior', 100, 40, 'alert'],
    ])('diagonal: %s → %s', (_label, dx, dy, expected) => {
        expect(pickKindFromDelta(dx, dy, DEADZONE)).toBe(expected);
    });

    it('respects a custom deadzone', () => {
        expect(pickKindFromDelta(10, 0, 5)).toBe('alert'); // outside 5px
        expect(pickKindFromDelta(10, 0, 50)).toBe('here'); // inside 50px
    });
});
