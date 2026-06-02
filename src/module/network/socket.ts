import { MODULE_ID } from '../constants.js';
import {
    parseSocketMessage,
    SOCKET_NAME,
    type DisplayPingPayload,
    type PingsSocketMessage,
    type RemovePingPayload,
} from './messages.js';
import type { RateLimit } from './rate-limit.js';

export interface SocketHandlers {
    onDisplay(payload: DisplayPingPayload): void;
    onRemove(payload: RemovePingPayload): void;
}

export interface InstallSocketConfig {
    handlers: SocketHandlers;
    rateLimit: RateLimit;
    /** Returns the current scene id, or null if no scene is active. */
    sceneIdProvider(): string | null;
    /** Returns true if the *local* user is a GM (for sender-side bypass). */
    selfIsGM(): boolean;
}

export interface SocketHandle {
    /**
     * Broadcast a message to peers. For `displayPing`, the local rate-limit
     * is enforced first; if blocked, returns false and the message is not
     * emitted. `removePing` always sends.
     */
    broadcast(message: PingsSocketMessage): boolean;
    teardown(): void;
}

/**
 * Install the socket layer.
 *
 * - Inbound: parses raw payloads (drops malformed), filters by scene,
 *   then enforces the rate-limit against the *sender's* id (so a peer
 *   cannot exceed our capacity even if their own client lets them).
 * - Outbound: enforces the rate-limit against the *local* user so we
 *   never wire-emit messages we'd just reject on receipt.
 *
 * Foundry sockets are peer-to-peer relays through the websocket server,
 * so "server-validated" throttling actually means every receiver enforces
 * the limit on its own end. Both sides matter.
 */
export function installSocket(config: InstallSocketConfig): SocketHandle {
    const socket = game.socket;
    const { handlers, rateLimit, sceneIdProvider, selfIsGM } = config;

    const onMessage = (raw: unknown): void => {
        const message = parseSocketMessage(raw);
        if (!message) {
            console.warn(`${MODULE_ID} | dropped malformed socket payload`);
            return;
        }

        const currentSceneId = sceneIdProvider();
        if (currentSceneId === null || message.payload.sceneId !== currentSceneId) {
            return;
        }

        if (message.type === 'displayPing') {
            if (!rateLimit.allow(message.payload.senderId, false)) {
                console.warn(
                    `${MODULE_ID} | rate-limited inbound displayPing from ${message.payload.senderId}`,
                );
                return;
            }
            handlers.onDisplay(message.payload);
        } else {
            handlers.onRemove(message.payload);
        }
    };

    socket?.on(SOCKET_NAME, onMessage);

    return {
        broadcast(message) {
            if (message.type === 'displayPing') {
                if (!rateLimit.allow(message.payload.senderId, selfIsGM())) {
                    return false;
                }
            }
            socket?.emit(SOCKET_NAME, message);
            return true;
        },
        teardown() {
            socket?.off(SOCKET_NAME, onMessage);
        },
    };
}
