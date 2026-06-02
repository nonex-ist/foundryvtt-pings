import { ALERT_COLOR, KIND_DEFAULT_DURATION_MS, MIN_ALERT_ROLE, MIN_RALLY_ROLE, MODULE_ID } from '../constants.js';
import type { DisplayPingPayload, RemovePingPayload } from '../network/messages.js';
import type { SocketHandle } from '../network/socket.js';
import { createPing, type PingHandle } from '../render/ping.js';
import type { PingKind, WorldPosition } from '../types.js';
import {
    assertColor,
    assertId,
    assertKind,
    assertPosition,
    assertPositiveInt,
} from './validators.js';

export interface PingOptions {
    color?: number;
    durationMs?: number;
    /** Required for the `text` kind, ignored otherwise. */
    text?: string;
    /** Required for the `token-attach` kind, ignored otherwise. */
    tokenId?: string;
    /** Override the kind's default — rally defaults true, others false. */
    moveCanvas?: boolean;
}

/** Backwards-compatible alias for the `here`-family options shape. */
export type HereOptions = PingOptions;

export interface RemoveOptions {
    /** If true, also broadcasts a removePing message to peers. Defaults to true. */
    broadcast?: boolean;
}

export interface PingsApi {
    readonly version: string;
    ping(kind: PingKind, position: WorldPosition, opts?: PingOptions): string | null;
    showPing(kind: PingKind, position: WorldPosition, opts?: PingOptions): string | null;
    sendPing(kind: PingKind, position: WorldPosition, opts?: PingOptions): string | null;
    here(position: WorldPosition, opts?: HereOptions): string | null;
    showHere(position: WorldPosition, opts?: HereOptions): string | null;
    sendHere(position: WorldPosition, opts?: HereOptions): string | null;
    remove(id: string, opts?: RemoveOptions): void;
}

export interface CreateApiConfig {
    version: string;
    sceneIdProvider(): string | null;
    senderIdProvider(): string | null;
    senderColorProvider(): number;
    /** Local user's role (CONST.USER_ROLES value). Used for alert sender gate + rally pan gate. */
    userRoleProvider(): number;
    canvasSizeProvider(): number;
    socketProvider(): SocketHandle | null;
}

export interface ApiBundle {
    api: PingsApi;
    handleInboundDisplay(payload: DisplayPingPayload): void;
    handleInboundRemove(payload: RemovePingPayload): void;
}

function warnUser(message: string): void {
    if (typeof ui !== 'undefined' && ui?.notifications) {
        ui.notifications.warn(message);
    } else {
        console.warn(`${MODULE_ID} | ${message}`);
    }
}

export function createApi(config: CreateApiConfig): ApiBundle {
    const registry = new Map<string, PingHandle>();

    function displayLocally(payload: DisplayPingPayload): PingHandle | null {
        // token-attach: rebuild position each frame from the followed token.
        let positionProvider: (() => WorldPosition) | undefined;
        if (payload.kind === 'token-attach' && payload.tokenId) {
            const tokenId = payload.tokenId;
            const fallback = payload.position;
            positionProvider = () => canvas.tokens?.get(tokenId)?.center ?? fallback;
        }

        const handle = createPing({
            kind: payload.kind,
            position: payload.position,
            color: payload.color,
            size: config.canvasSizeProvider(),
            durationMs: payload.durationMs ?? KIND_DEFAULT_DURATION_MS[payload.kind],
            text: payload.text,
            positionProvider,
            onDispose: () => {
                registry.delete(payload.id);
            },
        });

        // rally: pan recipients into view if their role allows it.
        if (
            payload.kind === 'rally' &&
            payload.moveCanvas &&
            config.userRoleProvider() >= MIN_RALLY_ROLE
        ) {
            void canvas.animatePan({ x: payload.position.x, y: payload.position.y, duration: 250 });
        }

        // Offscreen arrow indicator — rally is exempt because it already pans
        // the camera; other kinds may land off-viewport and need the hint.
        if (payload.kind !== 'rally' && canvas.controls?.drawOffscreenPing) {
            try {
                canvas.controls.drawOffscreenPing(payload.position, {
                    color: payload.color,
                    duration: payload.durationMs ?? KIND_DEFAULT_DURATION_MS[payload.kind],
                });
            } catch (err) {
                console.warn(`${MODULE_ID} | drawOffscreenPing failed`, err);
            }
        }

        registry.set(payload.id, handle);
        Hooks.callAll('pings.display', handle, payload);
        return handle;
    }

    function buildPayload(
        kind: PingKind,
        position: WorldPosition,
        opts: PingOptions | undefined,
    ): DisplayPingPayload | null {
        assertKind(kind);
        assertPosition(position);

        let color: number;
        if (opts?.color !== undefined) {
            color = assertColor(opts.color);
        } else if (kind === 'alert') {
            color = ALERT_COLOR;
        } else {
            color = config.senderColorProvider();
        }

        const durationMs =
            opts?.durationMs !== undefined
                ? assertPositiveInt(opts.durationMs, 'durationMs')
                : KIND_DEFAULT_DURATION_MS[kind];

        const moveCanvas = opts?.moveCanvas !== undefined ? opts.moveCanvas : kind === 'rally';

        const sceneId = config.sceneIdProvider();
        const senderId = config.senderIdProvider();
        if (!sceneId || !senderId) return null;

        const payload: DisplayPingPayload = {
            id: foundry.utils.randomID(),
            sceneId,
            senderId,
            kind,
            position,
            color,
            durationMs,
            moveCanvas,
        };
        if (opts?.text !== undefined) {
            if (typeof opts.text !== 'string') {
                throw new TypeError('pings: text must be a string');
            }
            payload.text = opts.text;
        }
        if (opts?.tokenId !== undefined) {
            if (typeof opts.tokenId !== 'string' || opts.tokenId.length === 0) {
                throw new TypeError('pings: tokenId must be a non-empty string');
            }
            payload.tokenId = opts.tokenId;
        }
        return payload;
    }

    /** Sender-side role gate: refuses to emit alert pings below Assistant. */
    function checkSenderRole(kind: PingKind): boolean {
        if (kind === 'alert' && config.userRoleProvider() < MIN_ALERT_ROLE) {
            warnUser('Alert pings require Assistant role or higher.');
            return false;
        }
        return true;
    }

    function ping(kind: PingKind, position: WorldPosition, opts: PingOptions | undefined): string | null {
        if (!checkSenderRole(kind)) return null;
        const payload = buildPayload(kind, position, opts);
        if (!payload) return null;
        if (!Hooks.call('pings.preDisplay', payload)) return null;
        if (!config.socketProvider()?.broadcast({ type: 'displayPing', payload })) return null;
        displayLocally(payload);
        return payload.id;
    }

    function showPing(kind: PingKind, position: WorldPosition, opts: PingOptions | undefined): string | null {
        if (!checkSenderRole(kind)) return null;
        const payload = buildPayload(kind, position, opts);
        if (!payload) return null;
        if (!Hooks.call('pings.preDisplay', payload)) return null;
        displayLocally(payload);
        return payload.id;
    }

    function sendPing(kind: PingKind, position: WorldPosition, opts: PingOptions | undefined): string | null {
        if (!checkSenderRole(kind)) return null;
        const payload = buildPayload(kind, position, opts);
        if (!payload) return null;
        if (!Hooks.call('pings.preDisplay', payload)) return null;
        if (!config.socketProvider()?.broadcast({ type: 'displayPing', payload })) return null;
        return payload.id;
    }

    return {
        api: {
            version: config.version,
            ping,
            showPing,
            sendPing,
            here: (position, opts) => ping('here', position, opts),
            showHere: (position, opts) => showPing('here', position, opts),
            sendHere: (position, opts) => sendPing('here', position, opts),

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
