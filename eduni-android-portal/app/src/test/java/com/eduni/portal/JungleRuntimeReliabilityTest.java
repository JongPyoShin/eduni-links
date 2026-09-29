package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.*;

/** Deterministic contract and stress coverage for the Native Jungle guards. */
public class JungleRuntimeReliabilityTest {
    @Test public void quizGuardRejectsDuplicatesAndStaleResponses() {
        JungleQuizRequestGuard guard = new JungleQuizRequestGuard();
        long previous = 0;
        int accepted = 0;
        for (int i = 0; i < 500; i++) {
            long token = guard.begin();
            assertTrue(token != 0);
            assertEquals(0, guard.begin());
            if ((i % 3) == 0) {
                guard.invalidate();
                assertFalse(guard.complete(token));
                assertFalse(guard.inFlight());
            } else {
                assertTrue(guard.complete(token));
                accepted++;
                assertFalse(guard.complete(token));
                assertFalse(guard.inFlight());
            }
            if (previous != 0) assertFalse(guard.complete(previous));
            previous = token;
        }
        assertEquals(333, accepted);
        guard.invalidate();
        guard.invalidate();
        assertFalse(guard.inFlight());
    }

    @Test public void loopGuardOwnsAtMostOneLoopAcrossStressSequences() {
        JungleLoopGuard guard = new JungleLoopGuard();
        int owned = 0;
        for (int i = 0; i < 200; i++) {
            assertTrue(guard.resume());
            owned++;
            assertFalse(guard.resume());
            assertTrue(guard.active());
            if ((i & 1) == 0) guard.pause();
            else { guard.pause(); guard.pause(); }
            assertFalse(guard.active());
        }
        assertEquals(200, owned);
        guard.destroy();
        guard.destroy();
        assertFalse(guard.active());
        assertFalse(guard.resume());
    }

    @Test public void worldMapPressReleaseIsExactlyOnce() {
        JungleWorldMapInput input = new JungleWorldMapInput();
        int moves = 0;
        for (int i = 0; i < 100; i++) {
            int code = 19 + (i % 4);
            assertTrue(input.press(code, true, 0));
            moves++;
            assertFalse(input.press(code, true, 0));
            assertFalse(input.press(code, true, 1));
            assertFalse(input.press(code, false, 0));
            assertTrue(input.press(code, true, 0));
            moves++;
            assertFalse(input.press(code, false, 0));
        }
        assertEquals(200, moves);
        input.reset();
        assertTrue(input.press(19, true, 0));
    }
}
