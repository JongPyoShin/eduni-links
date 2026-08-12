package com.eduni.portal;

import android.view.KeyEvent;
import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class InputActionMapperTest {
    @Test public void mapsCanonicalControllerActions() {
        InputActionMapper mapper = new InputActionMapper();
        assertEquals(InputActionMapper.Action.MOVE_LEFT, mapper.mapKeyCode(KeyEvent.KEYCODE_DPAD_LEFT));
        assertEquals(InputActionMapper.Action.CONFIRM, mapper.mapKeyCode(KeyEvent.KEYCODE_BUTTON_A));
        assertEquals(InputActionMapper.Action.BACK, mapper.mapKeyCode(KeyEvent.KEYCODE_BUTTON_B));
        assertEquals(InputActionMapper.Action.MISSION, mapper.mapKeyCode(KeyEvent.KEYCODE_BUTTON_X));
        assertEquals(InputActionMapper.Action.CLOSET, mapper.mapKeyCode(KeyEvent.KEYCODE_BUTTON_Y));
        assertEquals(InputActionMapper.Action.PAUSE, mapper.mapKeyCode(KeyEvent.KEYCODE_BUTTON_START));
    }

    @Test public void touchDeadZoneAndModeAreDeterministic() {
        InputActionMapper mapper = new InputActionMapper();
        mapper.setTouchVector(.05f, -.05f);
        assertEquals(InputActionMapper.InputMode.TOUCH, mapper.inputMode());
        assertEquals(0f, mapper.moveX(), .0001f);
        assertEquals(0f, mapper.moveY(), .0001f);
        mapper.setAnalog(.5f, 0f);
        assertEquals(InputActionMapper.InputMode.CONTROLLER, mapper.inputMode());
        assertEquals(.5f, mapper.moveX(), .0001f);
    }

    @Test public void releaseTouchAndResetClearStaleMovement() {
        InputActionMapper mapper = new InputActionMapper();
        mapper.setTouchVector(.7f, -.6f);
        mapper.releaseTouch();
        assertEquals(0f, mapper.moveX(), .0001f);
        assertEquals(0f, mapper.moveY(), .0001f);
        mapper.setTouchVector(-.7f, .6f);
        mapper.reset();
        assertEquals(0f, mapper.moveX(), .0001f);
        assertEquals(0f, mapper.moveY(), .0001f);
    }
}
