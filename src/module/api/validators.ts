import type { WorldPosition } from '../types.js';

const MAX_COLOR = 0xffffff;

/**
 * Defensive validators for the public API surface. They throw on invalid
 * input so misuse from third-party modules fails loudly at the call site
 * rather than silently producing broken pings.
 */

export function assertPosition(value: unknown, name = 'position'): WorldPosition {
    if (
        value === null ||
        typeof value !== 'object' ||
        !Number.isFinite((value as { x: unknown }).x) ||
        !Number.isFinite((value as { y: unknown }).y)
    ) {
        throw new TypeError(`pings: ${name} must be { x: number, y: number } with finite values`);
    }
    return value as WorldPosition;
}

export function assertColor(value: unknown, name = 'color'): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_COLOR) {
        throw new TypeError(
            `pings: ${name} must be a finite number between 0x000000 and 0xffffff`,
        );
    }
    return value;
}

export function assertId(value: unknown, name = 'id'): string {
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(`pings: ${name} must be a non-empty string`);
    }
    return value;
}

export function assertPositiveInt(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
        throw new TypeError(`pings: ${name} must be a positive integer`);
    }
    return value;
}
