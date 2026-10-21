package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class AuthoredStageBirdRouterTest {
    private final AuthoredStageBirdRouter router = new AuthoredStageBirdRouter();

    @Test public void campAndWaterfallFirstBirdUseTheAuthoredLoop() {
        assertEquals(AuthoredStageBirdRouter.Route.AUTHORED, router.route(StageWorldData.camp(), 0, false));
        assertEquals(AuthoredStageBirdRouter.Route.AUTHORED, router.route(StageWorldData.waterfall(), 0, false));
    }

    @Test public void visibleNonAuthoredBirdsRetainLegacyInteraction() {
        assertEquals(AuthoredStageBirdRouter.Route.LEGACY, router.route(StageWorldData.camp(), 2, false));
        assertEquals(AuthoredStageBirdRouter.Route.LEGACY, router.route(StageWorldData.waterfall(), 3, false));
    }

    @Test public void noNearbyBirdHasNoRoute() {
        assertEquals(AuthoredStageBirdRouter.Route.NONE, router.route(StageWorldData.waterfall(), -1, false));
    }
}
