package com.eduni.portal;

/** Main-thread loop ownership, with a terminal destroy state. */
final class JungleLoopGuard {
    private boolean active, destroyed;
    boolean resume() {
        if (active || destroyed) return false;
        active = true;
        return true;
    }
    void pause() { active = false; }
    void destroy() { pause(); destroyed = true; }
    boolean active() { return active; }
}
