import {
    AUDIO_ENABLED_DEFAULT,
    AUDIO_VOLUME_DEFAULT,
    HOLD_CANCEL_TOLERANCE_PX,
    HOLD_DURATION_MS,
    MENU_SUMMON_PX,
    MIN_ALERT_ROLE,
    MIN_RALLY_ROLE,
    MODULE_ID,
    RATE_LIMIT_CAPACITY,
    RATE_LIMIT_WINDOW_MS,
} from '../constants.js';
import { SETTING_KEYS } from './keys.js';

export interface SettingsReactivity {
    onTriggerChanged(): void;
    onAudioEnabledChanged(enabled: boolean): void;
    onAudioVolumeChanged(volume: number): void;
}

const ROLE_CHOICES: Record<string, string> = {
    '0': 'NONE',
    '1': 'PLAYER',
    '2': 'TRUSTED',
    '3': 'ASSISTANT',
    '4': 'GAMEMASTER',
};

/**
 * Register all module settings. Trigger and audio settings reconfigure
 * live via the supplied reactivity callbacks; rate-limit and role
 * settings reload the world on change because their values are snapshot
 * into long-lived state (the rate-limit's sliding window, the role
 * checks baked into providers).
 */
export function registerSettings(reactivity: SettingsReactivity): void {
    if (!game.settings) return;
    const s = game.settings;

    const triggerReinstall = (): void => reactivity.onTriggerChanged();

    s.register<number>(MODULE_ID, SETTING_KEYS.rateLimitCapacity, {
        name: `${MODULE_ID}.settings.rateLimitCapacity.name`,
        hint: `${MODULE_ID}.settings.rateLimitCapacity.hint`,
        scope: 'world',
        config: true,
        type: Number,
        default: RATE_LIMIT_CAPACITY,
        range: { min: 1, max: 100, step: 1 },
        requiresReload: true,
    });

    s.register<number>(MODULE_ID, SETTING_KEYS.rateLimitWindowMs, {
        name: `${MODULE_ID}.settings.rateLimitWindowMs.name`,
        hint: `${MODULE_ID}.settings.rateLimitWindowMs.hint`,
        scope: 'world',
        config: true,
        type: Number,
        default: RATE_LIMIT_WINDOW_MS,
        range: { min: 1000, max: 60000, step: 500 },
        requiresReload: true,
    });

    s.register<number>(MODULE_ID, SETTING_KEYS.minRallyRole, {
        name: `${MODULE_ID}.settings.minRallyRole.name`,
        hint: `${MODULE_ID}.settings.minRallyRole.hint`,
        scope: 'world',
        config: true,
        type: Number,
        default: MIN_RALLY_ROLE,
        choices: ROLE_CHOICES,
        requiresReload: false,
    });

    s.register<number>(MODULE_ID, SETTING_KEYS.minAlertRole, {
        name: `${MODULE_ID}.settings.minAlertRole.name`,
        hint: `${MODULE_ID}.settings.minAlertRole.hint`,
        scope: 'world',
        config: true,
        type: Number,
        default: MIN_ALERT_ROLE,
        choices: ROLE_CHOICES,
        requiresReload: false,
    });

    s.register<string>(MODULE_ID, SETTING_KEYS.triggerBinding, {
        name: `${MODULE_ID}.settings.triggerBinding.name`,
        hint: `${MODULE_ID}.settings.triggerBinding.hint`,
        scope: 'client',
        config: true,
        type: String,
        default: 'LeftClick',
        onChange: triggerReinstall,
    });

    s.register<number>(MODULE_ID, SETTING_KEYS.holdDurationMs, {
        name: `${MODULE_ID}.settings.holdDurationMs.name`,
        hint: `${MODULE_ID}.settings.holdDurationMs.hint`,
        scope: 'client',
        config: true,
        type: Number,
        default: HOLD_DURATION_MS,
        range: { min: 100, max: 2000, step: 50 },
        onChange: triggerReinstall,
    });

    s.register<number>(MODULE_ID, SETTING_KEYS.holdCancelTolerancePx, {
        name: `${MODULE_ID}.settings.holdCancelTolerancePx.name`,
        hint: `${MODULE_ID}.settings.holdCancelTolerancePx.hint`,
        scope: 'client',
        config: true,
        type: Number,
        default: HOLD_CANCEL_TOLERANCE_PX,
        range: { min: 1, max: 50, step: 1 },
        onChange: triggerReinstall,
    });

    s.register<number>(MODULE_ID, SETTING_KEYS.menuSummonPx, {
        name: `${MODULE_ID}.settings.menuSummonPx.name`,
        hint: `${MODULE_ID}.settings.menuSummonPx.hint`,
        scope: 'client',
        config: true,
        type: Number,
        default: MENU_SUMMON_PX,
        range: { min: 5, max: 200, step: 5 },
        onChange: triggerReinstall,
    });

    s.register<boolean>(MODULE_ID, SETTING_KEYS.audioEnabled, {
        name: `${MODULE_ID}.settings.audioEnabled.name`,
        hint: `${MODULE_ID}.settings.audioEnabled.hint`,
        scope: 'client',
        config: true,
        type: Boolean,
        default: AUDIO_ENABLED_DEFAULT,
        onChange: (value) => reactivity.onAudioEnabledChanged(value),
    });

    s.register<number>(MODULE_ID, SETTING_KEYS.audioVolume, {
        name: `${MODULE_ID}.settings.audioVolume.name`,
        hint: `${MODULE_ID}.settings.audioVolume.hint`,
        scope: 'client',
        config: true,
        type: Number,
        default: AUDIO_VOLUME_DEFAULT,
        range: { min: 0, max: 1, step: 0.05 },
        onChange: (value) => reactivity.onAudioVolumeChanged(value),
    });
}

function getOr<T>(key: string, fallback: T): T {
    if (!game.settings) return fallback;
    try {
        const value = game.settings.get<T>(MODULE_ID, key);
        return value === undefined || value === null ? fallback : value;
    } catch {
        return fallback;
    }
}

export function getRateLimitCapacity(): number {
    return getOr(SETTING_KEYS.rateLimitCapacity, RATE_LIMIT_CAPACITY);
}

export function getRateLimitWindowMs(): number {
    return getOr(SETTING_KEYS.rateLimitWindowMs, RATE_LIMIT_WINDOW_MS);
}

export function getMinRallyRole(): number {
    return getOr(SETTING_KEYS.minRallyRole, MIN_RALLY_ROLE);
}

export function getMinAlertRole(): number {
    return getOr(SETTING_KEYS.minAlertRole, MIN_ALERT_ROLE);
}

export function getTriggerBinding(): string {
    return getOr(SETTING_KEYS.triggerBinding, 'LeftClick');
}

export function getHoldDurationMs(): number {
    return getOr(SETTING_KEYS.holdDurationMs, HOLD_DURATION_MS);
}

export function getHoldCancelTolerancePx(): number {
    return getOr(SETTING_KEYS.holdCancelTolerancePx, HOLD_CANCEL_TOLERANCE_PX);
}

export function getMenuSummonPx(): number {
    return getOr(SETTING_KEYS.menuSummonPx, MENU_SUMMON_PX);
}

export function getAudioEnabled(): boolean {
    return getOr(SETTING_KEYS.audioEnabled, AUDIO_ENABLED_DEFAULT);
}

export function getAudioVolume(): number {
    return getOr(SETTING_KEYS.audioVolume, AUDIO_VOLUME_DEFAULT);
}
