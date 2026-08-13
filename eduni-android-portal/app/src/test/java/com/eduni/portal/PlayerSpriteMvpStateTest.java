package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class PlayerSpriteMvpStateTest {
    private final PlayerSpriteMvpState state = new PlayerSpriteMvpState();

    @Test public void fourFacingDirectionsAreUnambiguous() {
        assertEquals(PlayerSpriteMvpState.Facing.FRONT, state.facingFor(0f, 1f));
        assertEquals(PlayerSpriteMvpState.Facing.BACK, state.facingFor(0f, -1f));
        assertEquals(PlayerSpriteMvpState.Facing.LEFT, state.facingFor(-1f, 0f));
        assertEquals(PlayerSpriteMvpState.Facing.RIGHT, state.facingFor(1f, 0f));
    }

    @Test public void idleUsesOnlyFrameZeroAndWalkLoopsFourFrames() {
        assertEquals(0, state.frameFor(false, 999L));
        assertEquals(0, state.frameFor(true, 0L));
        assertEquals(1, state.frameFor(true, 135L));
        assertEquals(3, state.frameFor(true, 405L));
        assertEquals(0, state.frameFor(true, 540L));
    }
}
