export interface RateLimit {
    /**
     * Test whether the sender may emit one more ping. Returns true on
     * approval (recording the timestamp), false on rejection. GMs always
     * pass without recording.
     */
    allow(senderId: string, isGM: boolean): boolean;
}

export interface RateLimitConfig {
    capacity: number;
    windowMs: number;
    /** Injectable clock for deterministic tests; defaults to performance.now. */
    now?(): number;
}

/**
 * Sliding-window rate limiter. Each sender has at most `capacity` events
 * permitted in any rolling `windowMs` interval. GM bypass is enforced by
 * the per-call `isGM` flag rather than caller convention so the policy
 * is colocated with the check.
 */
export function createRateLimit(config: RateLimitConfig): RateLimit {
    const { capacity, windowMs } = config;
    const clock = config.now ?? (() => performance.now());
    const log = new Map<string, number[]>();

    return {
        allow(senderId, isGM) {
            if (isGM) return true;

            const now = clock();
            const cutoff = now - windowMs;
            const prior = log.get(senderId);
            const fresh = prior ? prior.filter((t) => t > cutoff) : [];

            if (fresh.length >= capacity) {
                if (fresh !== prior) log.set(senderId, fresh);
                return false;
            }

            fresh.push(now);
            log.set(senderId, fresh);
            return true;
        },
    };
}
