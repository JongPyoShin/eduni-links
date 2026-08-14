package com.eduni.portal;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class OmokVisualBindingTest {
    @Test
    public void stoneMappingKeepsColorAndLastMoveSemantics() {
        assertEquals("omok_stone_black_normal_v01", OmokVisualBinding.stoneDrawableName(1, false));
        assertEquals("omok_stone_black_last_move_v01", OmokVisualBinding.stoneDrawableName(1, true));
        assertEquals("omok_stone_white_normal_v01", OmokVisualBinding.stoneDrawableName(2, false));
        assertEquals("omok_stone_white_last_move_v01", OmokVisualBinding.stoneDrawableName(2, true));
        assertNull(OmokVisualBinding.stoneDrawableName(0, false));
    }

    @Test
    public void cursorMappingKeepsExistingPlacementMeaning() {
        assertEquals(OmokVisualBinding.CursorState.VALID, OmokVisualBinding.cursorState(false, true));
        assertEquals(OmokVisualBinding.CursorState.OCCUPIED, OmokVisualBinding.cursorState(true, true));
        assertEquals(OmokVisualBinding.CursorState.NORMAL, OmokVisualBinding.cursorState(false, false));
    }

    @Test
    public void anchorsAndFootprintsScaleAcrossSupportedBoards() {
        for (int boardSize : new int[]{15, 19, 25}) {
            float cell = 720f / (boardSize - 1);
            float stone = OmokVisualBinding.stoneFootprint(cell);
            float cursor = OmokVisualBinding.cursorFootprint(cell);
            assertEquals(cell * .68f, stone, .0001f);
            assertEquals(cell * .88f, cursor, .0001f);
            assertEquals(200f - stone * .5f,
                    OmokVisualBinding.anchoredLeft(200f, 128f, 64f, stone), .0001f);
            assertEquals(300f - cursor * .5f,
                    OmokVisualBinding.anchoredTop(300f, 150f, 75f, cursor), .0001f);
        }
    }

    @Test
    public void hintRequiresAnInBoundsEmptyIntersection() {
        assertTrue(OmokVisualBinding.isHintVisible(7, 9, 15, 0));
        assertFalse(OmokVisualBinding.isHintVisible(7, 9, 15, 1));
        assertFalse(OmokVisualBinding.isHintVisible(-1, 9, 15, 0));
        assertFalse(OmokVisualBinding.isHintVisible(15, 9, 15, 0));
    }
}
