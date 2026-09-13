package com.eduni.portal;

/** Small, Android-free mapping and anchor rules for the optional Omok bitmap skin. */
public final class OmokVisualBinding {
    public static final int EMPTY = 0;
    public static final int BLACK = 1;
    public static final int WHITE = 2;

    public static final float STONE_SOURCE_SIZE = 128f;
    public static final float STONE_PIVOT_X = 64f;
    public static final float STONE_PIVOT_Y = 97f;
    public static final float STONE_FOOTPRINT_RATIO = .68f;

    public static final float CURSOR_SOURCE_SIZE = 150f;
    public static final float CURSOR_PIVOT_X = 75f;
    public static final float CURSOR_PIVOT_Y = 75f;
    public static final float CURSOR_FOOTPRINT_RATIO = .88f;

    public enum CursorState { NORMAL, VALID, OCCUPIED }

    private OmokVisualBinding() { }

    public static String stoneDrawableName(int color, boolean lastMove) {
        if (color == BLACK) return lastMove
                ? "omok_stone_black_last_move_v01" : "omok_stone_black_normal_v01";
        if (color == WHITE) return lastMove
                ? "omok_stone_white_last_move_v01" : "omok_stone_white_normal_v01";
        return null;
    }

    public static String cursorDrawableName(CursorState state) {
        if (state == CursorState.VALID) return "omok_cursor_valid_v01";
        if (state == CursorState.OCCUPIED) return "omok_cursor_occupied_v01";
        return "omok_cursor_normal_v01";
    }

    public static CursorState cursorState(boolean occupied, boolean placeable) {
        if (occupied) return CursorState.OCCUPIED;
        return placeable ? CursorState.VALID : CursorState.NORMAL;
    }

    public static boolean isHintVisible(int hintRow, int hintCol, int boardSize, int boardValue) {
        return hintRow >= 0 && hintCol >= 0
                && hintRow < boardSize && hintCol < boardSize && boardValue == EMPTY;
    }

    public static float stoneFootprint(float cell) {
        return cell * STONE_FOOTPRINT_RATIO;
    }

    public static float cursorFootprint(float cell) {
        return cell * CURSOR_FOOTPRINT_RATIO;
    }

    public static float anchoredLeft(float anchor, float sourceSize, float pivot, float targetWidth) {
        return anchor - pivot * targetWidth / sourceSize;
    }

    public static float anchoredTop(float anchor, float sourceSize, float pivot, float targetWidth) {
        return anchor - pivot * targetWidth / sourceSize;
    }
}
