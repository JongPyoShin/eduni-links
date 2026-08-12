package com.eduni.portal;

/** The first JNG-001 slice deliberately has one authored Camp objective. */
public final class StageWorldData {
    public final String id, objective, landmark;
    public final float birdX, birdY, landmarkX, landmarkY;

    private StageWorldData(String id, String objective, String landmark, float birdX, float birdY, float landmarkX, float landmarkY) {
        this.id = id; this.objective = objective; this.landmark = landmark;
        this.birdX = birdX; this.birdY = birdY; this.landmarkX = landmarkX; this.landmarkY = landmarkY;
    }

    public static StageWorldData camp() {
        return new StageWorldData("camp", "Follow the lantern path to the robin", "Camp lantern", .48f, .16f, .48f, .28f);
    }
}
