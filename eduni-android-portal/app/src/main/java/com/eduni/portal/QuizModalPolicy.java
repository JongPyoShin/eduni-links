package com.eduni.portal;

/** Defines the small, exclusive set of actions allowed while a quiz is open. */
public final class QuizModalPolicy {
    public enum Decision { NONE, NAVIGATE, ANSWER, REQUEST_EXIT, IGNORE }

    public Decision decide(InputActionMapper.Action action, boolean keyDown) {
        if (action == InputActionMapper.Action.MOVE_LEFT || action == InputActionMapper.Action.MOVE_RIGHT
                || action == InputActionMapper.Action.MOVE_UP || action == InputActionMapper.Action.MOVE_DOWN) {
            return keyDown ? Decision.NAVIGATE : Decision.NONE;
        }
        if (!keyDown) return Decision.NONE;
        if (action == InputActionMapper.Action.CONFIRM) return Decision.ANSWER;
        if (action == InputActionMapper.Action.BACK) return Decision.REQUEST_EXIT;
        return Decision.IGNORE;
    }
}
