package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.*;

public class JungleQuizRequestGuardTest {
    @Test public void acceptsOnlyOneInFlightRequest() {
        JungleQuizRequestGuard guard = new JungleQuizRequestGuard();
        JungleQuizRequestGuard.Token first = guard.tryBegin();
        assertNotNull(first);
        assertTrue(guard.hasInFlight());
        assertNull("Repeated A while loading must not start another request", guard.tryBegin());
        assertTrue(guard.completeIfCurrent(first));
        assertFalse(guard.hasInFlight());
    }

    @Test public void completionIsExactlyOnce() {
        JungleQuizRequestGuard guard = new JungleQuizRequestGuard();
        JungleQuizRequestGuard.Token token = guard.tryBegin();
        assertTrue(guard.completeIfCurrent(token));
        assertFalse("Duplicate callback must be rejected", guard.completeIfCurrent(token));
    }

    @Test public void invalidateRejectsOldResponse() {
        JungleQuizRequestGuard guard = new JungleQuizRequestGuard();
        JungleQuizRequestGuard.Token token = guard.tryBegin();
        long before = guard.epoch();
        guard.invalidate();
        assertTrue(guard.epoch() > before);
        assertFalse(guard.hasInFlight());
        assertFalse("Response from pre-reset request must be stale", guard.completeIfCurrent(token));
    }

    @Test public void oldResponseCannotClearNewerRequest() {
        JungleQuizRequestGuard guard = new JungleQuizRequestGuard();
        JungleQuizRequestGuard.Token old = guard.tryBegin();
        guard.invalidate();

        JungleQuizRequestGuard.Token current = guard.tryBegin();
        assertNotNull(current);
        assertFalse(guard.completeIfCurrent(old));
        assertTrue("Stale completion must leave newer request owned", guard.hasInFlight());
        assertTrue(guard.isCurrent(current));
        assertTrue(guard.completeIfCurrent(current));
        assertFalse(guard.hasInFlight());
    }

    @Test public void repeatedInvalidateIsIdempotent() {
        JungleQuizRequestGuard guard = new JungleQuizRequestGuard();
        JungleQuizRequestGuard.Token old = guard.tryBegin();
        guard.invalidate();
        guard.invalidate();
        guard.invalidate();
        assertFalse(guard.completeIfCurrent(old));
        assertFalse(guard.hasInFlight());
        assertNotNull(guard.tryBegin());
    }

    @Test public void nullTokenNeverCompletes() {
        JungleQuizRequestGuard guard = new JungleQuizRequestGuard();
        assertFalse(guard.completeIfCurrent(null));
        assertFalse(guard.isCurrent(null));
    }

    @Test public void deterministicFiveHundredTransitionStress() {
        JungleQuizRequestGuard guard = new JungleQuizRequestGuard();
        int acceptedResponses = 0;
        int staleResponses = 0;

        for (int i = 0; i < 500; i++) {
            JungleQuizRequestGuard.Token token = guard.tryBegin();
            assertNotNull("Iteration " + i + " must acquire request ownership", token);
            assertNull("Iteration " + i + " duplicate start must be rejected", guard.tryBegin());

            if (i % 4 == 0) {
                guard.invalidate();
                assertFalse("Invalidated response must be stale at iteration " + i,
                        guard.completeIfCurrent(token));
                staleResponses++;

                JungleQuizRequestGuard.Token newer = guard.tryBegin();
                assertNotNull(newer);
                assertFalse("Old response must not clear newer request at iteration " + i,
                        guard.completeIfCurrent(token));
                staleResponses++;
                assertTrue(guard.hasInFlight());
                assertTrue(guard.completeIfCurrent(newer));
                acceptedResponses++;
            } else if (i % 4 == 1) {
                assertTrue(guard.completeIfCurrent(token));
                acceptedResponses++;
                assertFalse("Duplicate completion must fail at iteration " + i,
                        guard.completeIfCurrent(token));
                staleResponses++;
            } else if (i % 4 == 2) {
                guard.invalidate();
                guard.invalidate();
                assertFalse(guard.completeIfCurrent(token));
                staleResponses++;
            } else {
                assertTrue(guard.isCurrent(token));
                assertTrue(guard.completeIfCurrent(token));
                acceptedResponses++;
            }

            assertFalse("No request ownership may leak between iterations " + i,
                    guard.hasInFlight());
        }

        assertEquals(375, acceptedResponses);
        assertEquals(500, staleResponses);
    }
}
