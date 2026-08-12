package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.assertTrue;
import static org.junit.Assert.assertEquals;

public class PlayerLocomotionControllerTest {
    @Test public void acceleratesThenDeceleratesWithoutInstantStop() {
        PlayerLocomotionController player = new PlayerLocomotionController();
        PlayerLocomotionController.Step first = player.update(.016f, 1f, 0f);
        PlayerLocomotionController.Step settled = player.update(.14f, 1f, 0f);
        PlayerLocomotionController.Step released = player.update(.016f, 0f, 0f);
        assertTrue(first.dx > 0f);
        assertTrue(settled.dx > first.dx);
        assertTrue(released.dx > 0f);
        assertTrue(released.dx < settled.dx);
    }

    @Test public void facingSettlesTowardLatestIntent() {
        PlayerLocomotionController player = new PlayerLocomotionController();
        PlayerLocomotionController.Step step = player.update(.15f, -1f, 0f);
        assertTrue(step.facingX < -.9f);
    }

    @Test public void oneDigitalTapChangesFacingBeforeVelocitySettles() {
        PlayerLocomotionController player = new PlayerLocomotionController();
        player.faceImmediately(-1f, 0f);
        PlayerLocomotionController.Step step = player.update(.016f, 0f, 0f);
        assertEquals(-1f, step.facingX, .0001f);
        assertEquals(0f, step.facingY, .0001f);
        assertTrue(Math.abs(step.dx) < .0001f);
    }

    @Test public void rapidDigitalDirectionChangeIsImmediateWhileVelocityStaysSmooth() {
        PlayerLocomotionController player = new PlayerLocomotionController();
        player.update(.016f, -1f, 0f);
        player.faceImmediately(1f, 0f);
        PlayerLocomotionController.Step step = player.update(.016f, 0f, 0f);
        assertEquals(1f, step.facingX, .0001f);
        assertTrue(step.dx < 0f);
    }

    @Test public void digitalDpadMovesAtFullSpeedAndStopsWithoutSliding() {
        PlayerLocomotionController player = new PlayerLocomotionController();
        PlayerLocomotionController.Step moving = player.updateDigital(.016f, 1f, 0f);
        PlayerLocomotionController.Step released = player.updateDigital(.016f, 0f, 0f);
        assertEquals(PlayerLocomotionController.NORMALIZED_SPEED_PER_SECOND * .016f, moving.dx, .0001f);
        assertEquals(0f, released.dx, .0001f);
        assertEquals(0f, released.dy, .0001f);
    }

    @Test public void digitalReversalHasNoPreviousVelocityCarryOver() {
        PlayerLocomotionController player = new PlayerLocomotionController();
        player.updateDigital(.016f, -1f, 0f);
        PlayerLocomotionController.Step reversed = player.updateDigital(.016f, 1f, 0f);
        assertTrue(reversed.dx > 0f);
        assertEquals(1f, reversed.facingX, .0001f);
    }
}
