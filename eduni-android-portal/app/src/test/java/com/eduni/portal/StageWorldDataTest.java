package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

public class StageWorldDataTest {
    @Test public void campAndWaterfallKeepIndependentAuthoredContentAndRewards() {
        StageWorldData camp = StageWorldData.forStageIndex(0);
        StageWorldData waterfall = StageWorldData.forStageIndex(1);
        assertNotNull(camp);
        assertNotNull(waterfall);
        assertEquals("waterfall_kingfisher", waterfall.birdId);
        assertEquals("주황색", waterfall.quizAnswer);
        assertEquals("collection_waterfall_kingfisher", waterfall.collectionKey);
        assertFalse(camp.collectionKey.equals(waterfall.collectionKey));
        assertFalse(camp.rewardTitle.equals(waterfall.rewardTitle));
    }

    @Test public void onlyTheTwoAuthoredStagesResolveWorldData() {
        assertNull(StageWorldData.forStageIndex(-1));
        assertNull(StageWorldData.forStageIndex(2));
    }
}
