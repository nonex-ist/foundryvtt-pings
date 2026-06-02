import { describe, expect, it } from 'vitest';

import { eventMatches, parseBinding } from './binding.js';

describe('parseBinding', () => {
    it('parses a bare button', () => {
        expect(parseBinding('LeftClick')).toEqual({
            button: 0,
            shift: false,
            ctrl: false,
            alt: false,
            meta: false,
        });
    });

    it('parses modifiers in any order', () => {
        expect(parseBinding('Shift + Alt + RightClick')).toEqual({
            button: 2,
            shift: true,
            ctrl: false,
            alt: true,
            meta: false,
        });
        expect(parseBinding('RightClick + Alt + Shift')).toEqual({
            button: 2,
            shift: true,
            ctrl: false,
            alt: true,
            meta: false,
        });
    });

    it('is case-insensitive and tolerates whitespace', () => {
        expect(parseBinding('  ctrl+MIDDLECLICK  ')).toEqual({
            button: 1,
            shift: false,
            ctrl: true,
            alt: false,
            meta: false,
        });
    });

    it('accepts modifier aliases', () => {
        expect(parseBinding('Control + LeftClick').ctrl).toBe(true);
        expect(parseBinding('Option + LeftClick').alt).toBe(true);
        expect(parseBinding('Cmd + LeftClick').meta).toBe(true);
        expect(parseBinding('Command + LeftClick').meta).toBe(true);
        expect(parseBinding('Super + LeftClick').meta).toBe(true);
    });

    it('rejects empty input', () => {
        expect(() => parseBinding('')).toThrow();
        expect(() => parseBinding('   ')).toThrow();
    });

    it('rejects unknown tokens', () => {
        expect(() => parseBinding('Hyper + LeftClick')).toThrow(/unknown binding token/);
    });

    it('rejects missing button', () => {
        expect(() => parseBinding('Shift + Ctrl')).toThrow(/no button/);
    });

    it('rejects multiple buttons', () => {
        expect(() => parseBinding('LeftClick + RightClick')).toThrow(/multiple buttons/);
    });
});

describe('eventMatches', () => {
    const leftClickShift = parseBinding('Shift + LeftClick');

    it('matches when button and modifiers all match', () => {
        expect(
            eventMatches(
                { button: 0, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false },
                leftClickShift,
            ),
        ).toBe(true);
    });

    it('rejects when an extra modifier is held', () => {
        expect(
            eventMatches(
                { button: 0, shiftKey: true, ctrlKey: true, altKey: false, metaKey: false },
                leftClickShift,
            ),
        ).toBe(false);
    });

    it('rejects when the configured modifier is missing', () => {
        expect(
            eventMatches(
                { button: 0, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false },
                leftClickShift,
            ),
        ).toBe(false);
    });

    it('rejects when the button is different', () => {
        expect(
            eventMatches(
                { button: 2, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false },
                leftClickShift,
            ),
        ).toBe(false);
    });
});
