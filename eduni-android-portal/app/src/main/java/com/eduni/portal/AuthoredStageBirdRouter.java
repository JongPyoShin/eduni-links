package com.eduni.portal;

/** Routes the stage-authored bird without making nearby legacy birds inert. */
public final class AuthoredStageBirdRouter {
    public enum Route { NONE, AUTHORED, LEGACY }

    public Route route(StageWorldData world, int nearestBirdIndex, boolean authoredBirdCaught) {
        if (nearestBirdIndex < 0) return Route.NONE;
        if (world != null && nearestBirdIndex == 0 && !authoredBirdCaught) return Route.AUTHORED;
        return Route.LEGACY;
    }
}
