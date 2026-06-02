import type { PingKind, WorldPosition } from '../types.js';

export const SOCKET_NAME = 'module.pings';

export interface DisplayPingPayload {
    id: string;
    sceneId: string;
    senderId: string;
    kind: PingKind;
    position: WorldPosition;
    color: number;
    text?: string;
    tokenId?: string;
    moveCanvas: boolean;
}

export interface RemovePingPayload {
    id: string;
    sceneId: string;
}

export type PingsSocketMessage =
    | { type: 'displayPing'; payload: DisplayPingPayload }
    | { type: 'removePing'; payload: RemovePingPayload };

const KINDS: ReadonlySet<PingKind> = new Set<PingKind>([
    'here',
    'rally',
    'alert',
    'text',
    'token-attach',
]);

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isWorldPosition(value: unknown): value is WorldPosition {
    return isObject(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
}

function isDisplayPayload(value: unknown): value is DisplayPingPayload {
    if (!isObject(value)) return false;
    return (
        typeof value.id === 'string' &&
        typeof value.sceneId === 'string' &&
        typeof value.senderId === 'string' &&
        typeof value.kind === 'string' &&
        KINDS.has(value.kind as PingKind) &&
        isWorldPosition(value.position) &&
        typeof value.color === 'number' &&
        Number.isFinite(value.color) &&
        typeof value.moveCanvas === 'boolean' &&
        (value.text === undefined || typeof value.text === 'string') &&
        (value.tokenId === undefined || typeof value.tokenId === 'string')
    );
}

function isRemovePayload(value: unknown): value is RemovePingPayload {
    return (
        isObject(value) && typeof value.id === 'string' && typeof value.sceneId === 'string'
    );
}

/**
 * Validate an inbound socket payload. Returns the message on success or null
 * if the shape is malformed — defensive against a misbehaving peer.
 */
export function parseSocketMessage(raw: unknown): PingsSocketMessage | null {
    if (!isObject(raw)) return null;
    if (raw.type === 'displayPing' && isDisplayPayload(raw.payload)) {
        return { type: 'displayPing', payload: raw.payload };
    }
    if (raw.type === 'removePing' && isRemovePayload(raw.payload)) {
        return { type: 'removePing', payload: raw.payload };
    }
    return null;
}
