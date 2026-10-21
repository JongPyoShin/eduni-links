package com.eduni.portal;

/** Rendering-only mapping for the authored Waterfall encounter. */
public final class WaterfallKingfisherVisualState {
    public enum Frame { IDLE, ATTENTION, OBSERVE, REWARD }

    public static final float SOURCE_PIVOT_X = 64f;
    public static final float SOURCE_PIVOT_Y = 111f;
    public static final float RECOMMENDED_SCALE = .65f;

    private WaterfallKingfisherVisualState() {}

    public static Frame forEncounter(EncounterDirector.State state) {
        if (state == EncounterDirector.State.NOTICE || state == EncounterDirector.State.READY) return Frame.ATTENTION;
        if (state == EncounterDirector.State.LEARNING) return Frame.OBSERVE;
        if (state == EncounterDirector.State.CELEBRATE || state == EncounterDirector.State.COMPLETE) return Frame.REWARD;
        return Frame.IDLE;
    }
}
