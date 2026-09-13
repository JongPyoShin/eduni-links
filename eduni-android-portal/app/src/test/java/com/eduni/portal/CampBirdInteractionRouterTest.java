package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class CampBirdInteractionRouterTest {
    @Test public void authoredBluebirdUsesTheAuthoredRoute() {
        CampBirdInteractionRouter router = new CampBirdInteractionRouter();
        assertEquals(CampBirdInteractionRouter.Route.AUTHORED_CAMP_BIRD, router.route(true, 0, false));
    }

    @Test public void anotherVisibleCampBirdKeepsTheLegacyRoute() {
        CampBirdInteractionRouter router = new CampBirdInteractionRouter();
        assertEquals(CampBirdInteractionRouter.Route.LEGACY_BIRD, router.route(true, 2, false));
    }

    @Test public void noNearbyBirdDoesNotRouteAnInteraction() {
        CampBirdInteractionRouter router = new CampBirdInteractionRouter();
        assertEquals(CampBirdInteractionRouter.Route.NONE, router.route(true, -1, false));
    }
}
