package com.eduni.portal;

/** Time-based, deterministic movement for the normalized Canvas world. */
public final class PlayerLocomotionController {
    public static final float ENGINE_EQUIVALENT_SPEED = 3.6f;
    public static final float NORMALIZED_SPEED_PER_SECOND = 0.36f;
    public static final float ACCELERATION_SECONDS = 0.14f;
    public static final float DECELERATION_SECONDS = 0.19f;
    public static final float FACING_SETTLE_SECONDS = 0.15f;

    private float vx, vy;
    private float facingX = 0f, facingY = 1f;

    public Step update(float dtSeconds, float inputX, float inputY) {
        float length = (float) Math.hypot(inputX, inputY);
        if (length > 1f) { inputX /= length; inputY /= length; }
        boolean moving = length > 0.001f;
        float desiredX = moving ? inputX * NORMALIZED_SPEED_PER_SECOND : 0f;
        float desiredY = moving ? inputY * NORMALIZED_SPEED_PER_SECOND : 0f;
        float response = Math.max(.001f, moving ? ACCELERATION_SECONDS : DECELERATION_SECONDS);
        float blend = Math.min(1f, dtSeconds / response);
        vx += (desiredX - vx) * blend;
        vy += (desiredY - vy) * blend;
        if (moving) {
            float facingBlend = Math.min(1f, dtSeconds / FACING_SETTLE_SECONDS);
            facingX += (inputX - facingX) * facingBlend;
            facingY += (inputY - facingY) * facingBlend;
            float facingLength = (float) Math.hypot(facingX, facingY);
            if (facingLength > .001f) { facingX /= facingLength; facingY /= facingLength; }
        }
        return new Step(vx * dtSeconds, vy * dtSeconds, facingX, facingY, moving || Math.hypot(vx, vy) > .002f);
    }

    public void stop() { vx = 0f; vy = 0f; }

    public static final class Step {
        public final float dx, dy, facingX, facingY;
        public final boolean moving;
        Step(float dx, float dy, float facingX, float facingY, boolean moving) {
            this.dx = dx; this.dy = dy; this.facingX = facingX; this.facingY = facingY; this.moving = moving;
        }
    }
}
