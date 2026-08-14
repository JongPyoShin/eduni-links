package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

public class CrazyItemIconMapTest {
    @Test public void preservesTheTenNativeItemIndexes() {
        assertEquals(10, CrazyItemIconMap.count());
        assertEquals("crazy_item_water_v01", CrazyItemIconMap.drawableNameFor(0));
        assertEquals("crazy_item_power_v01", CrazyItemIconMap.drawableNameFor(1));
        assertEquals("crazy_item_roller_v01", CrazyItemIconMap.drawableNameFor(2));
        assertEquals("crazy_item_glove_v01", CrazyItemIconMap.drawableNameFor(3));
        assertEquals("crazy_item_dart_v01", CrazyItemIconMap.drawableNameFor(4));
        assertEquals("crazy_item_needle_v01", CrazyItemIconMap.drawableNameFor(5));
        assertEquals("crazy_item_timer_v01", CrazyItemIconMap.drawableNameFor(6));
        assertEquals("crazy_item_shield_v01", CrazyItemIconMap.drawableNameFor(7));
        assertEquals("crazy_item_turtle_v01", CrazyItemIconMap.drawableNameFor(8));
        assertEquals("crazy_item_tank_v01", CrazyItemIconMap.drawableNameFor(9));
    }

    @Test public void rejectsUnknownItemIndexes() {
        assertNull(CrazyItemIconMap.drawableNameFor(-1));
        assertNull(CrazyItemIconMap.drawableNameFor(10));
    }
}
