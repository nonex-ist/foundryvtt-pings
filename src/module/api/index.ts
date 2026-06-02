import { DEFAULT_PING_DURATION_MS } from '../constants.js';
import type { DisplayPingPayload, RemovePingPayload } from '../network/messages.js';
import type { SocketHandle } from '../network/socket.js';
import { createPing, type PingHandle } from '../render/ping.js';
import type { WorldPosition } from '../types.js';
import { assertColor, assertId, assertPosition, assertPositiveInt } from './validators.js';

export interface HereOptions {
    color?: number;
    durationMs?: number;
}

export interface RemoveOptions {
    /** If true, also broadcasts a removePing message to peers. Defaults to true. */
    broadcast?: boolean;
}

export interface PingsApi {
    readonly version: string;

    /** Display a "here" ping locally and broadcast it. Returns the ping id, or null if rate-limited / canceled by `pings.preDisplay`. */
    here(position: WorldPosition, opts?: HereOptions): string | null;

    /** Display a "here" ping locally only — no broadcast. */
    showHere(position: WorldPosition, opts?: HereOptions): string | null;

    /** Broadcast a "here" ping to peers without displaying locally. */
    sendHere(position: WorldPosition, opts?: HereOptions): string | null;

    /** Remove a ping by id locally; broadcasts the removal to peers by default. */
    remove(id: string, opts?: RemoveOptions): void;
}

export interface CreateApiConfig {
    version: string;
    sceneIdProvider(): string | null;
    senderIdProvider(): string | null;
    senderColorProvider(): number;
    canvasSizeProvider(): number;
    /**
     * Provider rather than a value so the API can be constructed before
     * the socket layer is installed (init-time order constraint with the
     * socket installer that references the API's inbound handlers).
     */
    socketProvider(): SocketHandle | null;
}

export interface ApiBundle {
    api: PingsApi;
    /** Display a peer's ping locally after the socket layer has validated it. */
    handleInboundDisplay(payload: DisplayPingPayload): void;
    /** Remove a peer-requested ping locally. */
    handleInboundRemove(payload: RemovePingPayload): void;
}

/**
 * Build the public API along with its inbound-socket handlers. Both share a
 * single registry so `api.remove(id)` and peer-driven removals operate on
 * the same set of live pings.
 *
 * `pings.preDisplay(payload)` fires before any user-visible side-effect (local
 * render or broadcast). Returning `false` cancels everything for that payload
 * — the integration seam systems like OD6S use to suppress pings on
 * cutscene scenes etc.
 *
 * `pings.display(handle, payload)` fires once the local render starts. Use it
 * for audio cues, logging, sticky overlays, etc.
 */
export function createApi(config: CreateApiConfig): ApiBundle {
    const registry = new Map<string, PingHandle>();

    function displayLocally(payload: DisplayPingPayload): PingHandle | null {
        const handle = createPing({
            kind: payload.kind,
            position: payload.position,
            color: payload.color,
            size: config.canvasSizeProvider(),
            durationMs: DEFAULT_PING_DURATION_MS,
            onDispose: () => {
                registry.delete(payload.id);
            },
        });
        registry.set(payload.id, handle);
        Hooks.callAll('pings.display', handle, payload);
        return handle;
    }

    function buildHerePayload(position: WorldPosition, opts: HereOptions | undefined): DisplayPingPayload | null {
        assertPosition(position);
        const color = opts?.color !== undefined ? assertColor(opts.color) : config.senderColorProvider();
        if (opts?.durationMs !== undefined) assertPositiveInt(opts.durationMs, 'durationMs');

        const sceneId = config.sceneIdProvider();
        const senderId = config.senderIdProvider();
        if (!sceneId || !senderId) return null;

        return {
            id: foundry.utils.randomID(),
            sceneId,
            senderId,
            kind: 'here',
            position,
            color,
            moveCanvas: false,
        };
    }

    return {
        api: {
            version: config.version,

            here(position, opts) {
                const payload = buildHerePayload(position, opts);
                if (!payload) return null;
                if (!Hooks.call('pings.preDisplay', payload)) return null;
                if (!config.socketProvider()?.broadcast({ type: 'displayPing', payload })) return null;
                displayLocally(payload);
                return payload.id;
            },

            showHere(position, opts) {
                const payload = buildHerePayload(position, opts);
                if (!payload) return null;
                if (!Hooks.call('pings.preDisplay', payload)) return null;
                displayLocally(payload);
                return payload.id;
            },

            sendHere(position, opts) {
                const payload = buildHerePayload(position, opts);
                if (!payload) return null;
                if (!Hooks.call('pings.preDisplay', payload)) return null;
                if (!config.socketProvider()?.broadcast({ type: 'displayPing', payload })) return null;
                return payload.id;
            },

            remove(id, opts) {
                assertId(id);
                const handle = registry.get(id);
                registry.delete(id);
                handle?.destroy();

                if (opts?.broadcast !== false) {
                    const sceneId = config.sceneIdProvider();
                    const socket = config.socketProvider();
                    if (sceneId && socket) {
                        socket.broadcast({
                            type: 'removePing',
                            payload: { id, sceneId },
                        });
                    }
                }
            },
        },

        handleInboundDisplay(payload) {
            if (!Hooks.call('pings.preDisplay', payload)) return;
            displayLocally(payload);
        },

        handleInboundRemove(payload) {
            const handle = registry.get(payload.id);
            registry.delete(payload.id);
            handle?.destroy();
        },
    };
}
