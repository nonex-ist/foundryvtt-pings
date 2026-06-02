import { describe, expect, it } from 'vitest';

import {
    parseSocketMessage,
    type DisplayPingPayload,
    type RemovePingPayload,
} from './messages.js';

const validDisplay: DisplayPingPayload = {
    id: 'abc',
    sceneId: 'scene1',
    senderId: 'user1',
    kind: 'here',
    position: { x: 100, y: 200 },
    color: 0xff00ff,
    moveCanvas: false,
};

const validRemove: RemovePingPayload = {
    id: 'abc',
    sceneId: 'scene1',
};

describe('parseSocketMessage', () => {
    describe('valid messages', () => {
        it('accepts a well-formed displayPing', () => {
            const result = parseSocketMessage({ type: 'displayPing', payload: validDisplay });
            expect(result).toEqual({ type: 'displayPing', payload: validDisplay });
        });

        it('accepts a displayPing with optional text and tokenId', () => {
            const payload = { ...validDisplay, text: 'hello', tokenId: 'tok1' };
            const result = parseSocketMessage({ type: 'displayPing', payload });
            expect(result).toEqual({ type: 'displayPing', payload });
        });

        it('accepts a well-formed removePing', () => {
            const result = parseSocketMessage({ type: 'removePing', payload: validRemove });
            expect(result).toEqual({ type: 'removePing', payload: validRemove });
        });

        it('accepts all valid ping kinds', () => {
            const kinds = ['here', 'rally', 'alert', 'text', 'token-attach'] as const;
            for (const kind of kinds) {
                const payload = { ...validDisplay, kind };
                expect(parseSocketMessage({ type: 'displayPing', payload })).not.toBeNull();
            }
        });
    });

    describe('malformed wrappers', () => {
        it.each([
            ['null', null],
            ['undefined', undefined],
            ['string', 'displayPing'],
            ['array', ['displayPing', validDisplay]],
            ['empty object', {}],
            ['unknown type', { type: 'unknown', payload: validDisplay }],
            ['missing payload', { type: 'displayPing' }],
            ['payload not object', { type: 'displayPing', payload: 'string' }],
        ])('rejects %s', (_label, input) => {
            expect(parseSocketMessage(input)).toBeNull();
        });
    });

    describe('displayPing payload validation', () => {
        const requiredKeys: Array<keyof DisplayPingPayload> = [
            'id',
            'sceneId',
            'senderId',
            'kind',
            'position',
            'color',
            'moveCanvas',
        ];

        it.each(requiredKeys)('rejects when %s is missing', (key) => {
            const payload: Record<string, unknown> = { ...validDisplay };
            delete payload[key];
            expect(parseSocketMessage({ type: 'displayPing', payload })).toBeNull();
        });

        it('rejects an unknown kind', () => {
            const payload = { ...validDisplay, kind: 'rocket' };
            expect(parseSocketMessage({ type: 'displayPing', payload })).toBeNull();
        });

        it.each([
            ['NaN x', { ...validDisplay, position: { x: NaN, y: 0 } }],
            ['NaN y', { ...validDisplay, position: { x: 0, y: NaN } }],
            ['Infinity x', { ...validDisplay, position: { x: Infinity, y: 0 } }],
            ['-Infinity y', { ...validDisplay, position: { x: 0, y: -Infinity } }],
            ['string x', { ...validDisplay, position: { x: '0', y: 0 } }],
            ['position null', { ...validDisplay, position: null }],
        ])('rejects %s', (_label, payload) => {
            expect(parseSocketMessage({ type: 'displayPing', payload })).toBeNull();
        });

        it.each([
            ['NaN color', { ...validDisplay, color: NaN }],
            ['Infinity color', { ...validDisplay, color: Infinity }],
            ['string color', { ...validDisplay, color: '#ff00ff' }],
        ])('rejects %s', (_label, payload) => {
            expect(parseSocketMessage({ type: 'displayPing', payload })).toBeNull();
        });

        it('rejects non-boolean moveCanvas', () => {
            const payload = { ...validDisplay, moveCanvas: 1 };
            expect(parseSocketMessage({ type: 'displayPing', payload })).toBeNull();
        });

        it.each([
            ['non-string text', { ...validDisplay, text: 42 }],
            ['non-string tokenId', { ...validDisplay, tokenId: false }],
        ])('rejects %s', (_label, payload) => {
            expect(parseSocketMessage({ type: 'displayPing', payload })).toBeNull();
        });
    });

    describe('removePing payload validation', () => {
        it.each([
            ['missing id', { sceneId: 'scene1' }],
            ['missing sceneId', { id: 'abc' }],
            ['id not string', { id: 1, sceneId: 'scene1' }],
            ['sceneId not string', { id: 'abc', sceneId: 1 }],
        ])('rejects %s', (_label, payload) => {
            expect(parseSocketMessage({ type: 'removePing', payload })).toBeNull();
        });
    });
});
