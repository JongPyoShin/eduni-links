package com.eduni.portal;

/** Separates the authored Camp bird from nearby legacy birds without making them inert. */
public final class CampBirdInteractionRouter {
    public enum Route { NONE, AUTHORED_CAMP_BIRD, LEGACY_BIRD }

    public Route route(boolean isCampStage, int nearestBirdIndex, boolean authoredBirdCaught) {
        if (nearestBirdIndex < 0) return Route.NONE;
        if (isCampStage && nearestBirdIndex == 0 && !authoredBirdCaught) return Route.AUTHORED_CAMP_BIRD;
        return Route.LEGACY_BIRD;
    }
}
