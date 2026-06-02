import { AUDIO_ENABLED_DEFAULT, AUDIO_PATH_PREFIX, AUDIO_VOLUME_DEFAULT, MODULE_ID } from '../constants.js';
import type { PingKind } from '../types.js';

export interface AudioController {
    play(kind: PingKind): void;
    setEnabled(enabled: boolean): void;
    setVolume(volume: number): void;
}

/**
 * One short Ogg per kind, lazily fetched by the browser and cached at the
 * URL layer. A fresh `Audio` per play call lets concurrent pings layer
 * naturally — restarting a single element would cut the previous off.
 *
 * Browsers will sometimes block playback until the user has interacted
 * with the page; we swallow those rejections silently because they'd
 * otherwise produce noisy console errors on every ping until the player
 * clicks once.
 */
export function createAudioController(): AudioController {
    let enabled = AUDIO_ENABLED_DEFAULT;
    let volume = AUDIO_VOLUME_DEFAULT;

    return {
        play(kind) {
            if (!enabled) return;
            try {
                const audio = new Audio(`${AUDIO_PATH_PREFIX}/${kind}.ogg`);
                audio.volume = volume;
                const result = audio.play();
                if (result instanceof Promise) {
                    result.catch(() => {
                        // Autoplay/permission block — silent on purpose.
                    });
                }
            } catch (err) {
                console.warn(`${MODULE_ID} | audio playback failed for kind=${kind}`, err);
            }
        },
        setEnabled(value) {
            enabled = value;
        },
        setVolume(value) {
            volume = Math.max(0, Math.min(1, value));
        },
    };
}
