package com.eduni.portal;

import android.view.KeyEvent;

/** Maps physical keys, sticks, and touch affordances to game intents. */
public final class InputActionMapper {
    public static final float TOUCH_DEAD_ZONE = 0.12f;

    public enum Action { NONE, MOVE_LEFT, MOVE_RIGHT, MOVE_UP, MOVE_DOWN, CONFIRM, BACK, MISSION, CLOSET, PAUSE }
    public enum InputMode { TOUCH, CONTROLLER }

    private boolean left, right, up, down;
    private boolean keyDpadObserved;
    private Action lastDigitalDirection = Action.NONE;
    private Action hatDigitalDirection = Action.NONE;
    private float analogX, analogY;
    private float touchX, touchY;
    private InputMode inputMode = InputMode.CONTROLLER;

    public Action mapKeyCode(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_LEFT: return Action.MOVE_LEFT;
            case KeyEvent.KEYCODE_DPAD_RIGHT: return Action.MOVE_RIGHT;
            case KeyEvent.KEYCODE_DPAD_UP: return Action.MOVE_UP;
            case KeyEvent.KEYCODE_DPAD_DOWN: return Action.MOVE_DOWN;
            case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_SPACE: case KeyEvent.KEYCODE_BUTTON_A: return Action.CONFIRM;
            case KeyEvent.KEYCODE_BACK: case KeyEvent.KEYCODE_ESCAPE: case KeyEvent.KEYCODE_BUTTON_B: return Action.BACK;
            case KeyEvent.KEYCODE_BUTTON_X: return Action.MISSION;
            case KeyEvent.KEYCODE_BUTTON_Y: return Action.CLOSET;
            case KeyEvent.KEYCODE_BUTTON_START: return Action.PAUSE;
            default: return Action.NONE;
        }
    }

    public boolean isMovement(Action action) {
        return action == Action.MOVE_LEFT || action == Action.MOVE_RIGHT || action == Action.MOVE_UP || action == Action.MOVE_DOWN;
    }

    public void setKey(Action action, boolean pressed) {
        inputMode = InputMode.CONTROLLER;
        if (action == Action.MOVE_LEFT) left = pressed;
        else if (action == Action.MOVE_RIGHT) right = pressed;
        else if (action == Action.MOVE_UP) up = pressed;
        else if (action == Action.MOVE_DOWN) down = pressed;
        else return;

        keyDpadObserved = true;

        if (pressed) {
            // A D-pad is a four-way control: the most recently pressed direction is authoritative.
            lastDigitalDirection = action;
            analogX = 0f;
            analogY = 0f;
        } else if (lastDigitalDirection == action) {
            lastDigitalDirection = latestHeldDirection();
        }
        if (keyDpadObserved) hatDigitalDirection = Action.NONE;
    }

    public void setAnalog(float x, float y) {
        inputMode = InputMode.CONTROLLER;
        if (hasDigitalDpadIntent()) return;
        analogX = deadZone(x);
        analogY = deadZone(y);
    }

    /** Handles controllers that emit HAT events instead of D-pad KeyEvents. */
    public void setHat(float x, float y) {
        if (keyDpadObserved) return;
        if (Math.abs(x) < TOUCH_DEAD_ZONE && Math.abs(y) < TOUCH_DEAD_ZONE) hatDigitalDirection = Action.NONE;
        else if (Math.abs(x) >= Math.abs(y)) hatDigitalDirection = x < 0f ? Action.MOVE_LEFT : Action.MOVE_RIGHT;
        else hatDigitalDirection = y < 0f ? Action.MOVE_UP : Action.MOVE_DOWN;
    }

    public void useTouch() { inputMode = InputMode.TOUCH; }
    public void useController() { inputMode = InputMode.CONTROLLER; }
    public InputMode inputMode() { return inputMode; }

    public void setTouchVector(float x, float y) {
        inputMode = InputMode.TOUCH;
        float length = (float) Math.hypot(x, y);
        if (length > 1f) { x /= length; y /= length; }
        touchX = deadZone(x);
        touchY = deadZone(y);
    }

    /** Releases only touch movement after a cancel or interrupted gesture. */
    public void releaseTouch() { touchX = 0f; touchY = 0f; }

    /** Clears every movement source before a new stage/session starts. */
    public void reset() { clearMovement(); }

    public void clearMovement() {
        left = false; right = false; up = false; down = false;
        lastDigitalDirection = Action.NONE;
        hatDigitalDirection = Action.NONE;
        keyDpadObserved = false;
        analogX = 0f; analogY = 0f;
        releaseTouch();
    }

    public boolean hasDigitalDpadIntent() { return activeDigitalDirection() != Action.NONE; }
    public boolean hasKeyDpadIntent() { return lastDigitalDirection != Action.NONE; }

    public float moveX() {
        if (inputMode == InputMode.TOUCH) return touchX;
        Action digital = activeDigitalDirection();
        if (digital != Action.NONE) return digital == Action.MOVE_LEFT ? -1f : digital == Action.MOVE_RIGHT ? 1f : 0f;
        return analogX;
    }

    public float moveY() {
        if (inputMode == InputMode.TOUCH) return touchY;
        Action digital = activeDigitalDirection();
        if (digital != Action.NONE) return digital == Action.MOVE_UP ? -1f : digital == Action.MOVE_DOWN ? 1f : 0f;
        return analogY;
    }

    private Action latestHeldDirection() {
        if (left) return Action.MOVE_LEFT;
        if (right) return Action.MOVE_RIGHT;
        if (up) return Action.MOVE_UP;
        if (down) return Action.MOVE_DOWN;
        return Action.NONE;
    }

    private Action activeDigitalDirection() {
        return lastDigitalDirection != Action.NONE ? lastDigitalDirection : hatDigitalDirection;
    }

    public static float deadZone(float value) { return Math.abs(value) < TOUCH_DEAD_ZONE ? 0f : value; }
}
