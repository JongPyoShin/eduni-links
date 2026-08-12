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
}
