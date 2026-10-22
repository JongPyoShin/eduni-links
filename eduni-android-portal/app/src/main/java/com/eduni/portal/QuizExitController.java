package com.eduni.portal;

/** Small state machine for a quiz exit confirmation without changing quiz progress. */
public final class QuizExitController {
    public enum Decision { NONE, CONTINUE, QUIT }
    private boolean confirming;

    public void requestExit() { confirming = true; }
    public boolean isConfirming() { return confirming; }
    public Decision confirm(boolean quit) {
        if (!confirming) return Decision.NONE;
        confirming = false;
        return quit ? Decision.QUIT : Decision.CONTINUE;
    }
    public void reset() { confirming = false; }
}
