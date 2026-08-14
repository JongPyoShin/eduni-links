package com.eduni.portal;

/** Keeps the Canvas map wide and supplies a stable player-to-goal framing cue. */
public final class AdventureCameraController {
    public static final class Frame {
        public final float cueX, cueY, landmarkX, landmarkY;
        Frame(float cueX, float cueY, float landmarkX, float landmarkY) {
            this.cueX = cueX; this.cueY = cueY; this.landmarkX = landmarkX; this.landmarkY = landmarkY;
        }
    }

    private float cueX, cueY;
    private boolean initialized;

    public void reset() { initialized = false; cueX = 0f; cueY = 0f; }

    public Frame update(float playerX, float playerY, StageWorldData stage, boolean objectiveComplete) {
        float goalX = objectiveComplete ? stage.landmarkX : stage.birdX;
        float goalY = objectiveComplete ? stage.landmarkY : stage.birdY;
        if (!initialized) {
            cueX = goalX;
            cueY = goalY;
            initialized = true;
        } else {
            cueX += (goalX - cueX) * .12f;
            cueY += (goalY - cueY) * .12f;
        }
        return new Frame(cueX, cueY, stage.landmarkX, stage.landmarkY);
    }
}
