package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class PlayerSpriteMvpLayoutTest {
    @Test public void sixtyFourPixelSpriteKeepsFootCenterAtItsWorldAnchor() {
        PlayerSpriteMvpLayout layout = new PlayerSpriteMvpLayout();
        float width = 64f, footX = 300f, footY = 500f;
        float height = layout.heightForWidth(width);
        assertEquals(85.3333f, height, .001f);
        assertEquals(footX, layout.leftForFoot(footX, width) + width * PlayerSpriteMvpLayout.PIVOT_X / PlayerSpriteMvpLayout.SOURCE_WIDTH, .001f);
        assertEquals(footY, layout.topForFoot(footY, width) + height * PlayerSpriteMvpLayout.PIVOT_Y / PlayerSpriteMvpLayout.SOURCE_HEIGHT, .001f);
    }
}
