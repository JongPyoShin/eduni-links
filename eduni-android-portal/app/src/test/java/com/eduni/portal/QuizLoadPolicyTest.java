package com.eduni.portal;

import org.junit.Test;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class QuizLoadPolicyTest {
    @Test public void localFallbackIsAvailableWithoutNetworkOrCache() {
        QuizLoadPolicy<String> policy = new QuizLoadPolicy<>();
        assertEquals("local", policy.takeOr("local"));
        assertFalse(policy.hasCachedRemote());
    }
    @Test public void remoteResultIsReservedForTheNextEncounter() {
        QuizLoadPolicy<String> policy = new QuizLoadPolicy<>();
        policy.cacheRemote("remote");
        assertTrue(policy.hasCachedRemote());
        assertEquals("remote", policy.takeOr("local"));
        assertEquals("next-local", policy.takeOr("next-local"));
    }
}
