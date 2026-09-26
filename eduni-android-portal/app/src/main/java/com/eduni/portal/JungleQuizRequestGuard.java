package com.eduni.portal;

/**
 * Owns one Native Jungle quiz acquisition at a time.
 *
 * The guard is intentionally independent of Android so request/session races can
 * be tested on the JVM. A token is valid only while it is the current in-flight
 * request. invalidate() makes every previously issued token stale without
 * allowing an old completion to clear a newer request.
 */
public final class JungleQuizRequestGuard {
    public static final class Token {
        private final long epoch;
        private final long requestId;

        private Token(long epoch, long requestId) {
            this.epoch = epoch;
            this.requestId = requestId;
        }

        long epoch() { return epoch; }
        long requestId() { return requestId; }
    }

    private long epoch = 1L;
    private long nextRequestId = 1L;
    private Token inFlight;

    /**
     * Starts a request only when no request is already in flight.
     * Returns null when a duplicate start should be ignored.
     */
    public synchronized Token tryBegin() {
        if (inFlight != null) return null;
        inFlight = new Token(epoch, nextRequestId++);
        return inFlight;
    }

    /** Returns whether token still owns the current request. */
    public synchronized boolean isCurrent(Token token) {
        return matches(token);
    }

    /**
     * Consumes the current request exactly once.
     * A stale/duplicate completion returns false and cannot clear a newer request.
     */
    public synchronized boolean completeIfCurrent(Token token) {
        if (!matches(token)) return false;
        inFlight = null;
        return true;
    }

    /**
     * Invalidates every token issued before this call and clears current ownership.
     * Safe to call repeatedly.
     */
    public synchronized void invalidate() {
        epoch++;
        inFlight = null;
    }

    public synchronized boolean hasInFlight() {
        return inFlight != null;
    }

    public synchronized long epoch() {
        return epoch;
    }

    private boolean matches(Token token) {
        return token != null
                && inFlight != null
                && token.epoch == epoch
                && token.requestId == inFlight.requestId
                && token.epoch == inFlight.epoch;
    }
}
