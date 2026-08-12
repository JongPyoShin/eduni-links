package com.eduni.portal;

/** Owns the small Camp bird encounter state machine; it has no rendering dependency. */
public final class EncounterDirector {
    public enum State { EXPLORE, NOTICE, READY, LEARNING, CELEBRATE, COMPLETE }
    private State state = State.EXPLORE;

    public void reset() { state = State.EXPLORE; }
    public State state() { return state; }
    public void observeDistance(float distance) {
        if (state == State.EXPLORE && distance < .24f) state = State.NOTICE;
        if ((state == State.EXPLORE || state == State.NOTICE) && distance < .095f) state = State.READY;
    }
    public boolean canInteract() { return state == State.READY; }
    public void beginLearning() { if (canInteract()) state = State.LEARNING; }
    public void answer(boolean correct) { if (state == State.LEARNING) state = correct ? State.CELEBRATE : State.LEARNING; }
    public void finishCelebration() { if (state == State.CELEBRATE) state = State.COMPLETE; }
}
