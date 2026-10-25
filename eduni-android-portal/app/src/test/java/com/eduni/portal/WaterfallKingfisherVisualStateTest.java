package com.eduni.portal;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class WaterfallKingfisherVisualStateTest {
    @Test public void encounterStatesMapToRenderingOnlyFrames() {
        assertEquals(WaterfallKingfisherVisualState.Frame.IDLE, WaterfallKingfisherVisualState.forEncounter(EncounterDirector.State.EXPLORE));
        assertEquals(WaterfallKingfisherVisualState.Frame.ATTENTION, WaterfallKingfisherVisualState.forEncounter(EncounterDirector.State.NOTICE));
        assertEquals(WaterfallKingfisherVisualState.Frame.ATTENTION, WaterfallKingfisherVisualState.forEncounter(EncounterDirector.State.READY));
        assertEquals(WaterfallKingfisherVisualState.Frame.OBSERVE, WaterfallKingfisherVisualState.forEncounter(EncounterDirector.State.LEARNING));
        assertEquals(WaterfallKingfisherVisualState.Frame.REWARD, WaterfallKingfisherVisualState.forEncounter(EncounterDirector.State.CELEBRATE));
        assertEquals(WaterfallKingfisherVisualState.Frame.REWARD, WaterfallKingfisherVisualState.forEncounter(EncounterDirector.State.COMPLETE));
    }

    @Test public void manifestPivotAndScaleStayFixed() {
        assertEquals(64f, WaterfallKingfisherVisualState.SOURCE_PIVOT_X, 0f);
        assertEquals(111f, WaterfallKingfisherVisualState.SOURCE_PIVOT_Y, 0f);
        assertEquals(.65f, WaterfallKingfisherVisualState.RECOMMENDED_SCALE, 0f);
    }
}
