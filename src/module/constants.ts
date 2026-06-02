import type { PingKind } from './types.js';

export const MODULE_ID = 'nonex-ist-pings';

export const HOLD_DURATION_MS = 350;
export const HOLD_CANCEL_TOLERANCE_PX = 5;
/** Drag distance past which a held trigger summons the radial menu. Doubles as the menu's center-deadzone radius on release. */
export const MENU_SUMMON_PX = 25;

export const FADE_IN_MS = 500;
export const FADE_OUT_MS = 500;
export const DEFAULT_PING_COLOR = 0xaaaaaa;

/**
 * Per-kind default visible duration. Alert is shorter than here despite
 * commanding more attention — its rotation + pulse compounds wear, so 5s
 * does the same "look right now" work that here needs 6s to do. Token-
 * attach is shorter still so the visual doesn't obscure the token it
 * follows.
 */
export const KIND_DEFAULT_DURATION_MS: Record<PingKind, number> = {
    here: 6000,
    rally: 6000,
    alert: 5000,
    text: 6000,
    'token-attach': 4000,
};

/** Alert pings always use this color regardless of the sender's user color. */
export const ALERT_COLOR = 0xff3333;
/** Rally pings always use this color regardless of the sender's user color — gold reads as "beacon / waypoint" cross-cultural shorthand. */
export const RALLY_COLOR = 0xffc640;

/**
 * Role thresholds (M8 will promote these to game settings). Values follow
 * `CONST.USER_ROLES`: NONE=0, PLAYER=1, TRUSTED=2, ASSISTANT=3, GM=4.
 */
export const MIN_RALLY_ROLE = 2; // TRUSTED — receivers below this ignore rally's viewport pan
export const MIN_ALERT_ROLE = 3; // ASSISTANT — sender role gate for alert pings

export const RATE_LIMIT_CAPACITY = 3;
export const RATE_LIMIT_WINDOW_MS = 5000;

/** Audio defaults — M8 will promote to client settings. */
export const AUDIO_ENABLED_DEFAULT = true;
export const AUDIO_VOLUME_DEFAULT = 0.5;
/** Path is relative to Foundry's data root once the module is installed. */
export const AUDIO_PATH_PREFIX = `modules/${MODULE_ID}/sounds`;
