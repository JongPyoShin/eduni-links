package com.eduni.portal;

/** Pure frame selection for the temporary 20-frame Native Canvas MVP. */
public final class PlayerSpriteMvpState {
    public enum Facing { FRONT, BACK, LEFT, RIGHT }

    public Facing facingFor(float facingX, float facingY) {
        if (Math.abs(facingY) >= Math.abs(facingX)) return facingY < 0f ? Facing.BACK : Facing.FRONT;
        return facingX < 0f ? Facing.LEFT : Facing.RIGHT;
    }

    public int frameFor(boolean walking, long nowMs) {
        return walking ? (int) ((nowMs / 135L) % 4L) : 0;
    }
}
