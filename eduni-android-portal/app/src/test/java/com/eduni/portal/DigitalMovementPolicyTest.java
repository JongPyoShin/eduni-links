package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class DigitalMovementPolicyTest {
    private final DigitalMovementPolicy policy = new DigitalMovementPolicy();

    @Test public void shortTapUsesPrecisionSpeed() {
        assertEquals(DigitalMovementPolicy.Phase.PRECISION, policy.phaseForHeldMs(99));
        assertEquals(.55f, policy.speedRatioForHeldMs(50), .0001f);
    }

    @Test public void holdTransitionsDirectlyToCruiseSpeed() {
        assertEquals(DigitalMovementPolicy.Phase.CRUISE, policy.phaseForHeldMs(100));
        assertEquals(1f, policy.speedRatioForHeldMs(100), .0001f);
    }
}
