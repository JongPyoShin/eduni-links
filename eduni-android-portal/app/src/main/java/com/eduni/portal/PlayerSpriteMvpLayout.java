package com.eduni.portal;

/** Source-sheet pivot contract for 192x256 player frames. */
public final class PlayerSpriteMvpLayout {
    public static final float SOURCE_WIDTH = 192f;
    public static final float SOURCE_HEIGHT = 256f;
    public static final float PIVOT_X = 96f;
    public static final float PIVOT_Y = 232f;

    public float heightForWidth(float width) { return width * SOURCE_HEIGHT / SOURCE_WIDTH; }
    public float topForFoot(float footY, float width) { return footY - heightForWidth(width) * PIVOT_Y / SOURCE_HEIGHT; }
    public float leftForFoot(float footX, float width) { return footX - width * PIVOT_X / SOURCE_WIDTH; }
}
