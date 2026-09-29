package com.eduni.portal;

import java.util.HashSet;

/** A world-map key press owns one action, regardless of repeat or fallback dispatch. */
final class JungleWorldMapInput {
    private final HashSet<Integer> held = new HashSet<>();
    boolean press(int code, boolean down, int repeats) {
        if (!down) { held.remove(code); return false; }
        boolean first = held.add(code);
        return first && repeats == 0;
    }
    void reset() { held.clear(); }
}
