export interface AnimationConfig {
    /** Time spent at full opacity, between fade-in and fade-out. */
    durationMs: number;
    fadeInMs: number;
    fadeOutMs: number;
    /** Called every frame with elapsed time since animation start. */
    update(elapsedMs: number): void;
    /** Called once when the animation finishes naturally. Not called on cancel. */
    onComplete(): void;
}

/**
 * Drive a container's lifecycle: fade-in → main → fade-out → onComplete.
 *
 * The container's `alpha` is tweened by this function; the visual's own
 * `update` callback handles internal motion (ring contraction, rotation,
 * pulse, etc.) and is called every frame with elapsed time.
 *
 * Returns a cancel function that detaches from the ticker without firing
 * onComplete — use when the ping needs to be torn down externally.
 */
export function runAnimation(container: PixiContainer, config: AnimationConfig): () => void {
    const { durationMs, fadeInMs, fadeOutMs, update, onComplete } = config;
    const ticker = canvas.app.ticker;
    const startMs = performance.now();
    const totalMs = fadeInMs + durationMs + fadeOutMs;
    let canceled = false;

    const tick = (): void => {
        if (canceled) return;
        const elapsed = performance.now() - startMs;

        let alpha = 1;
        if (elapsed < fadeInMs) {
            alpha = elapsed / fadeInMs;
        } else if (elapsed > fadeInMs + durationMs) {
            const fadeOutElapsed = elapsed - fadeInMs - durationMs;
            alpha = Math.max(0, 1 - fadeOutElapsed / fadeOutMs);
        }
        container.alpha = alpha;

        update(elapsed);

        if (elapsed >= totalMs) {
            canceled = true;
            ticker.remove(tick);
            onComplete();
        }
    };

    ticker.add(tick);

    return () => {
        if (canceled) return;
        canceled = true;
        ticker.remove(tick);
    };
}
