package com.eduni.portal;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class CampVisualGeometryTest {
    @Test
    public void visibleCampTrailUsesTheSameBluebirdAndSpawnCorridor() {
        assertTrue(CampVisualGeometry.contains(.48f, .16f));
        assertTrue(CampVisualGeometry.contains(.48f, .88f));
        assertTrue(CampVisualGeometry.contains(.84f, .54f));
        assertFalse(CampVisualGeometry.contains(.72f, .16f));
    }

    @Test
    public void pathSegmentsStayWithinNormalizedWorldCoordinates() {
        assertEquals(5, CampVisualGeometry.pathSegments().length);
        for (CampVisualGeometry.Segment segment : CampVisualGeometry.pathSegments()) {
            assertTrue(segment.ax >= 0f && segment.ax <= 1f);
            assertTrue(segment.ay >= 0f && segment.ay <= 1f);
            assertTrue(segment.bx >= 0f && segment.bx <= 1f);
            assertTrue(segment.by >= 0f && segment.by <= 1f);
        }
    }

    @Test
    public void playerScaleCandidatesKeepEightyPixelsAsDefault() {
        assertEquals(72f, CampVisualGeometry.PLAYER_TARGET_72, 0f);
        assertEquals(80f, CampVisualGeometry.DEFAULT_PLAYER_TARGET, 0f);
        assertEquals(88f, CampVisualGeometry.PLAYER_TARGET_88, 0f);
    }
}
