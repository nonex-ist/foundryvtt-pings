/**
 * Single source of truth for setting keys + their default values + scopes.
 *
 * Defaults mirror the constants module so unregistered or pre-init reads
 * still produce sensible behaviour.
 */

export const SETTING_KEYS = {
    rateLimitCapacity: 'rateLimitCapacity',
    rateLimitWindowMs: 'rateLimitWindowMs',
    minRallyRole: 'minRallyRole',
    minAlertRole: 'minAlertRole',
    triggerBinding: 'triggerBinding',
    holdDurationMs: 'holdDurationMs',
    holdCancelTolerancePx: 'holdCancelTolerancePx',
    menuSummonPx: 'menuSummonPx',
    audioEnabled: 'audioEnabled',
    audioVolume: 'audioVolume',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const SCENE_FLAG_DISABLED = 'disabled';
