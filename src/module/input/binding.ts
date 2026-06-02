import type { BindingSpec } from '../types.js';

const BUTTONS: Record<string, 0 | 1 | 2> = {
    leftclick: 0,
    middleclick: 1,
    rightclick: 2,
};

const MODIFIERS: Record<string, keyof Pick<BindingSpec, 'shift' | 'ctrl' | 'alt' | 'meta'>> = {
    shift: 'shift',
    ctrl: 'ctrl',
    control: 'ctrl',
    alt: 'alt',
    option: 'alt',
    meta: 'meta',
    cmd: 'meta',
    command: 'meta',
    super: 'meta',
};

/**
 * Parse a human-authored binding string into a structured spec.
 *
 * Examples: "LeftClick", "Shift + LeftClick", "Ctrl + Alt + MiddleClick".
 * Token order is free; matching is case-insensitive; whitespace around `+` is
 * ignored. The button token is required and must appear exactly once.
 */
export function parseBinding(input: string): BindingSpec {
    if (typeof input !== 'string' || input.trim() === '') {
        throw new Error(`pings: empty binding string`);
    }

    const tokens = input
        .split('+')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

    const spec: BindingSpec = {
        button: 0,
        shift: false,
        ctrl: false,
        alt: false,
        meta: false,
    };

    let buttonSeen = false;
    for (const token of tokens) {
        if (token in BUTTONS) {
            if (buttonSeen) {
                throw new Error(`pings: binding "${input}" contains multiple buttons`);
            }
            spec.button = BUTTONS[token];
            buttonSeen = true;
        } else if (token in MODIFIERS) {
            spec[MODIFIERS[token]] = true;
        } else {
            throw new Error(`pings: unknown binding token "${token}" in "${input}"`);
        }
    }

    if (!buttonSeen) {
        throw new Error(`pings: binding "${input}" has no button`);
    }

    return spec;
}

interface BindingEvent {
    button: number;
    shiftKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    metaKey: boolean;
}

/**
 * Test whether a pointer/mouse event matches the binding. All modifier flags
 * must match exactly — extra modifiers held by the user do NOT match, so
 * "LeftClick" will not fire while the user is holding Shift.
 */
export function eventMatches(event: BindingEvent, spec: BindingSpec): boolean {
    return (
        event.button === spec.button &&
        event.shiftKey === spec.shift &&
        event.ctrlKey === spec.ctrl &&
        event.altKey === spec.alt &&
        event.metaKey === spec.meta
    );
}
