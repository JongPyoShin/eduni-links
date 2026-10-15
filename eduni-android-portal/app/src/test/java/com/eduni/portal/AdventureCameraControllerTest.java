package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class AdventureCameraControllerTest {
    @Test public void framesBirdBeforeCompletionAndLandmarkAfterward() {
        AdventureCameraController camera = new AdventureCameraController();
        StageWorldData camp = StageWorldData.camp();
        AdventureCameraController.Frame bird = camera.update(.48f,.88f,camp,false);
        assertTrue(bird.cueY < .88f);
        AdventureCameraController.Frame landmark = camera.update(.48f,.20f,camp,true);
        assertEquals(camp.landmarkX, landmark.landmarkX, .0001f);
        assertEquals(camp.landmarkY, landmark.landmarkY, .0001f);
    }

    @Test public void campIdentityIsACompleteSingleSourceOfTruth() {
        StageWorldData camp = StageWorldData.camp();
        assertEquals("camp_bluebird", camp.birdId);
        assertEquals("파랑새", camp.birdDisplayName);
        assertEquals("파란색", camp.quizAnswer);
        assertEquals("파란색", camp.quizOptions[0]);
        assertEquals("collection_camp_bluebird", camp.collectionKey);
    }

    @Test public void waterfallUsesDistinctDataAndTheSameCameraContract() {
        StageWorldData camp = StageWorldData.camp();
        StageWorldData waterfall = StageWorldData.waterfall();
        AdventureCameraController camera = new AdventureCameraController();
        AdventureCameraController.Frame frame = camera.update(.16f, .78f, waterfall, false);
        assertEquals("waterfall", waterfall.id);
        assertEquals("waterfall_kingfisher", waterfall.birdId);
        assertTrue(!camp.collectionKey.equals(waterfall.collectionKey));
        assertEquals(waterfall.birdX, frame.cueX, .0001f);
        assertEquals(waterfall.birdY, frame.cueY, .0001f);
    }

    @Test public void resetDropsThePreviousStageCueBeforeWaterfallStarts() {
        AdventureCameraController camera = new AdventureCameraController();
        camera.update(.48f, .16f, StageWorldData.camp(), false);
        camera.reset();
        AdventureCameraController.Frame waterfall = camera.update(.16f, .78f, StageWorldData.waterfall(), false);
        assertEquals(StageWorldData.waterfall().birdX, waterfall.cueX, .0001f);
        assertEquals(StageWorldData.waterfall().birdY, waterfall.cueY, .0001f);
    }
}
