import { describe, expect, it } from 'vitest';

import {
    assertColor,
    assertId,
    assertPosition,
    assertPositiveInt,
} from './validators.js';

describe('assertPosition', () => {
    it('accepts valid finite x, y', () => {
        expect(assertPosition({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
        expect(assertPosition({ x: -100.5, y: 200.25 })).toEqual({ x: -100.5, y: 200.25 });
    });

    it.each([
        ['null', null],
        ['undefined', undefined],
        ['number', 42],
        ['string', '0,0'],
        ['array', [0, 0]],
        ['missing y', { x: 0 }],
        ['NaN x', { x: NaN, y: 0 }],
        ['Infinity y', { x: 0, y: Infinity }],
        ['string x', { x: '0', y: 0 }],
    ])('rejects %s', (_label, value) => {
        expect(() => assertPosition(value)).toThrow(TypeError);
    });

    it('uses the provided name in the error message', () => {
        expect(() => assertPosition(null, 'target')).toThrow(/target/);
    });
});

describe('assertColor', () => {
    it('accepts valid hex range', () => {
        expect(assertColor(0)).toBe(0);
        expect(assertColor(0xffffff)).toBe(0xffffff);
        expect(assertColor(0x123456)).toBe(0x123456);
    });

    it.each([
        ['NaN', NaN],
        ['Infinity', Infinity],
        ['negative', -1],
        ['too large', 0x1000000],
        ['float', 0.5],
        ['integer-valued float with fractional part', 1.0000001],
        ['string', '#ff00ff'],
        ['null', null],
    ])('rejects %s', (_label, value) => {
        expect(() => assertColor(value)).toThrow(TypeError);
    });
});

describe('assertId', () => {
    it('accepts non-empty strings', () => {
        expect(assertId('abc')).toBe('abc');
    });

    it.each([
        ['empty string', ''],
        ['number', 42],
        ['null', null],
    ])('rejects %s', (_label, value) => {
        expect(() => assertId(value)).toThrow(TypeError);
    });
});

describe('assertPositiveInt', () => {
    it('accepts positive integers', () => {
        expect(assertPositiveInt(1, 'n')).toBe(1);
        expect(assertPositiveInt(1000, 'n')).toBe(1000);
    });

    it.each([
        ['zero', 0],
        ['negative', -1],
        ['float', 1.5],
        ['NaN', NaN],
        ['string', '5'],
    ])('rejects %s', (_label, value) => {
        expect(() => assertPositiveInt(value, 'n')).toThrow(TypeError);
    });
});
