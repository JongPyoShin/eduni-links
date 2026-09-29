package com.eduni.portal;

/** Main-thread-only ownership of one acquisition; workers carry tokens, never this state. */
final class JungleQuizRequestGuard {
    private long generation;
    private long pending;

    long begin() {
        if (pending != 0) return 0;
        pending = ++generation;
        return pending;
    }

    boolean complete(long token) {
        if (token == 0 || token != pending) return false;
        pending = 0;
        return true;
    }

    void invalidate() { pending = 0; ++generation; }
    boolean inFlight() { return pending != 0; }
}
