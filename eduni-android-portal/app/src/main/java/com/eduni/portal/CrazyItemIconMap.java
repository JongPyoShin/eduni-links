package com.eduni.portal;

/** Rendering-only mapping for the fixed Native Crazy Arcade item contract. */
public final class CrazyItemIconMap {
    private static final String[] DRAWABLE_NAMES = {
            "crazy_item_water_v01",
            "crazy_item_power_v01",
            "crazy_item_roller_v01",
            "crazy_item_glove_v01",
            "crazy_item_dart_v01",
            "crazy_item_needle_v01",
            "crazy_item_timer_v01",
            "crazy_item_shield_v01",
            "crazy_item_turtle_v01",
            "crazy_item_tank_v01",
    };

    private CrazyItemIconMap() {}

    public static String drawableNameFor(int itemKind) {
        return itemKind >= 0 && itemKind < DRAWABLE_NAMES.length ? DRAWABLE_NAMES[itemKind] : null;
    }

    public static int count() {
        return DRAWABLE_NAMES.length;
    }
}
