package com.eduni.portal;

import android.view.KeyEvent;

/** Maps physical keys, sticks, and touch affordances to the same game intent. */
public final class InputActionMapper {
    public static final float TOUCH_DEAD_ZONE = 0.12f;

    public enum Action { NONE, MOVE_LEFT, MOVE_RIGHT, MOVE_UP, MOVE_DOWN, CONFIRM, BACK, MISSION, CLOSET, PAUSE }
    public enum InputMode { TOUCH, CONTROLLER }

    private boolean left, right, up, down;
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
        return action == Action.MOVE_LEFT || action == Action.MOVE_RIGHT
                || action == Action.MOVE_UP || action == Action.MOVE_DOWN;
    }

    public void setKey(Action action, boolean pressed) {
        inputMode = InputMode.CONTROLLER;
        if (action == Action.MOVE_LEFT) left = pressed;
        else if (action == Action.MOVE_RIGHT) right = pressed;
        else if (action == Action.MOVE_UP) up = pressed;
        else if (action == Action.MOVE_DOWN) down = pressed;
    }

    public void setAnalog(float x, float y) {
        inputMode = InputMode.CONTROLLER;
        analogX = deadZone(x);
        analogY = deadZone(y);
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

    public float moveX() { return inputMode == InputMode.TOUCH ? touchX : analogX + (left ? -1f : 0f) + (right ? 1f : 0f); }
    public float moveY() { return inputMode == InputMode.TOUCH ? touchY : analogY + (up ? -1f : 0f) + (down ? 1f : 0f); }

    public static float deadZone(float value) {
        return Math.abs(value) < TOUCH_DEAD_ZONE ? 0f : value;
    }
}
