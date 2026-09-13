package com.eduni.portal;

/** Deterministic two-speed policy for digital D-pad movement; it never carries velocity. */
public final class DigitalMovementPolicy {
    public enum Phase { PRECISION, CRUISE }

    public static final long PRECISION_WINDOW_MS = 100L;
    public static final float PRECISION_SPEED_RATIO = .55f;

    public Phase phaseForHeldMs(long heldMs) {
        return heldMs < PRECISION_WINDOW_MS ? Phase.PRECISION : Phase.CRUISE;
    }

    public float speedRatioForHeldMs(long heldMs) {
        return phaseForHeldMs(heldMs) == Phase.PRECISION ? PRECISION_SPEED_RATIO : 1f;
    }
}
