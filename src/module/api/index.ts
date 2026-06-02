import { ALERT_COLOR, KIND_DEFAULT_DURATION_MS, MODULE_ID, RALLY_COLOR } from '../constants.js';
import { SCENE_FLAG_DISABLED } from '../settings/keys.js';
import { getMinAlertRole, getMinRallyRole } from '../settings/register.js';
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
    /** True if pings are suppressed on the current scene (scene flag). */
    isSceneDisabled(): boolean;
    /** Toggle the per-scene disable flag (GM-only; no enforcement here — Foundry rejects setFlag for non-owners). */
    setSceneDisabled(disabled: boolean): Promise<void>;
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

function i18n(key: string, fallback: string, data?: Record<string, unknown>): string {
    const localized = game.i18n?.localize(key, data);
    if (!localized || localized === key) {
        if (!data) return fallback;
        // Apply the same {key}-style interpolation the fallback string uses.
        return fallback.replace(/\{(\w+)\}/g, (_, k) => String(data[k] ?? ''));
    }
    return localized;
}

function isCurrentSceneDisabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, SCENE_FLAG_DISABLED) === true;
}

export function createApi(config: CreateApiConfig): ApiBundle {
    const registry = new Map<string, PingHandle>();

    // Reference count per token id — a token may have multiple concurrent
    // attach pings (e.g. two players ping the same token within seconds);
    // we only release the move-lock when the last ping fades.
    const attachedTokens = new Map<string, number>();
    const trackAttach = (tokenId: string): void => {
        attachedTokens.set(tokenId, (attachedTokens.get(tokenId) ?? 0) + 1);
    };
    const untrackAttach = (tokenId: string): void => {
        const next = (attachedTokens.get(tokenId) ?? 0) - 1;
        if (next <= 0) attachedTokens.delete(tokenId);
        else attachedTokens.set(tokenId, next);
    };

    // Block movement (x / y / rotation) of any token currently flagged
    // as attached. Returning false from preUpdateToken cancels the update
    // on the requester's client before it goes to the server.
    Hooks.on('preUpdateToken', (...args: unknown[]) => {
        const tokenDoc = args[0] as { id?: string; name?: string } | undefined;
        const changes = args[1] as
            | { x?: number; y?: number; rotation?: number }
            | undefined;
        if (!tokenDoc?.id || !changes) return undefined;
        const moves =
            changes.x !== undefined || changes.y !== undefined || changes.rotation !== undefined;
        if (!moves) return undefined;
        if (!attachedTokens.has(tokenDoc.id)) return undefined;
        ui.notifications?.warn(
            i18n(
                'nonex-ist-pings.notifications.tokenMovementBlocked',
                'Pings: {name} is marked — movement blocked until the marker fades.',
                { name: tokenDoc.name ?? 'token' },
            ),
        );
        return false;
    });

    function displayLocally(payload: DisplayPingPayload): PingHandle | null {
        // token-attach: rebuild position each frame from the followed token.
        let positionProvider: (() => WorldPosition) | undefined;
        if (payload.kind === 'token-attach' && payload.tokenId) {
            const tokenId = payload.tokenId;
            const fallback = payload.position;
            positionProvider = () => canvas.tokens?.get(tokenId)?.center ?? fallback;
            trackAttach(tokenId);
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
                if (payload.kind === 'token-attach' && payload.tokenId) {
                    untrackAttach(payload.tokenId);
                }
            },
        });

        // rally: pan recipients into view if their role allows it.
        if (
            payload.kind === 'rally' &&
            payload.moveCanvas &&
            config.userRoleProvider() >= getMinRallyRole()
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
        Hooks.callAll('nonex-ist-pings.display', handle, payload);
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
        } else if (kind === 'rally') {
            color = RALLY_COLOR;
        } else {
            color = config.senderColorProvider();
        }

        const durationMs =
            opts?.durationMs !== undefined
                ? assertPositiveInt(opts.durationMs, 'durationMs')
                : KIND_DEFAULT_DURATION_MS[kind];

        let moveCanvas: boolean;
        if (opts?.moveCanvas !== undefined) {
            if (typeof opts.moveCanvas !== 'boolean') {
                throw new TypeError('pings: moveCanvas must be a boolean');
            }
            moveCanvas = opts.moveCanvas;
        } else {
            moveCanvas = kind === 'rally';
        }

        if (opts?.text !== undefined && typeof opts.text !== 'string') {
            throw new TypeError('pings: text must be a string');
        }
        if (opts?.tokenId !== undefined && (typeof opts.tokenId !== 'string' || opts.tokenId.length === 0)) {
            throw new TypeError('pings: tokenId must be a non-empty string');
        }

        // Required-options check per kind: text needs a non-empty string,
        // token-attach needs a tokenId — otherwise the resulting ping is
        // either a blank tag or a stationary "attached" ping going nowhere.
        if (kind === 'text' && (opts?.text === undefined || opts.text.length === 0)) {
            throw new TypeError("pings: kind 'text' requires a non-empty `text` option");
        }
        if (kind === 'token-attach' && opts?.tokenId === undefined) {
            throw new TypeError("pings: kind 'token-attach' requires a `tokenId` option");
        }

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
        if (opts?.text !== undefined) payload.text = opts.text;
        if (opts?.tokenId !== undefined) payload.tokenId = opts.tokenId;
        return payload;
    }

    /** Sender-side role gate: refuses to emit alert pings below the configured threshold. */
    function checkSenderRole(kind: PingKind): boolean {
        if (kind === 'alert' && config.userRoleProvider() < getMinAlertRole()) {
            warnUser(
                i18n(
                    'nonex-ist-pings.notifications.alertRoleRequired',
                    'Alert pings require Assistant role or higher.',
                ),
            );
            return false;
        }
        return true;
    }

    function ping(kind: PingKind, position: WorldPosition, opts: PingOptions | undefined): string | null {
        if (isCurrentSceneDisabled()) return null;
        if (!checkSenderRole(kind)) return null;
        const payload = buildPayload(kind, position, opts);
        if (!payload) return null;
        if (!Hooks.call('nonex-ist-pings.preDisplay', payload)) return null;
        if (!config.socketProvider()?.broadcast({ type: 'displayPing', payload })) return null;
        displayLocally(payload);
        return payload.id;
    }

    function showPing(kind: PingKind, position: WorldPosition, opts: PingOptions | undefined): string | null {
        if (isCurrentSceneDisabled()) return null;
        if (!checkSenderRole(kind)) return null;
        const payload = buildPayload(kind, position, opts);
        if (!payload) return null;
        if (!Hooks.call('nonex-ist-pings.preDisplay', payload)) return null;
        displayLocally(payload);
        return payload.id;
    }

    function sendPing(kind: PingKind, position: WorldPosition, opts: PingOptions | undefined): string | null {
        if (isCurrentSceneDisabled()) return null;
        if (!checkSenderRole(kind)) return null;
        const payload = buildPayload(kind, position, opts);
        if (!payload) return null;
        if (!Hooks.call('nonex-ist-pings.preDisplay', payload)) return null;
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

            isSceneDisabled: isCurrentSceneDisabled,
            async setSceneDisabled(disabled) {
                if (!canvas.scene) return;
                await canvas.scene.setFlag(MODULE_ID, SCENE_FLAG_DISABLED, disabled);
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
            if (isCurrentSceneDisabled()) return;
            if (!Hooks.call('nonex-ist-pings.preDisplay', payload)) return;
            displayLocally(payload);
        },

        handleInboundRemove(payload) {
            const handle = registry.get(payload.id);
            registry.delete(payload.id);
            handle?.destroy();
        },
    };
}
