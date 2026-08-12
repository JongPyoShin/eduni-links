package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.assertTrue;

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
}
