package com.eduni.portal;

/**
 * Camp's visible trail is projected directly from this immutable world geometry.
 * Coordinates remain normalized world coordinates; this class has no input or movement policy.
 */
public final class CampVisualGeometry {
    public static final float WALKABLE_RADIUS = .070f;
    public static final float PLAYER_TARGET_72 = 72f;
    public static final float PLAYER_TARGET_80 = 80f;
    public static final float PLAYER_TARGET_88 = 88f;
    public static final float DEFAULT_PLAYER_TARGET = PLAYER_TARGET_80;

    public static final class Segment {
        public final float ax, ay, bx, by;
        Segment(float ax, float ay, float bx, float by) {
            this.ax = ax; this.ay = ay; this.bx = bx; this.by = by;
        }
    }

    private static final Segment[] PATH_SEGMENTS = {
            new Segment(.13f, .78f, .13f, .30f),
            new Segment(.13f, .30f, .48f, .28f),
            new Segment(.48f, .12f, .48f, .92f),
            new Segment(.13f, .54f, .84f, .54f),
            new Segment(.84f, .35f, .84f, .58f),
    };

    private CampVisualGeometry() { }

    public static Segment[] pathSegments() { return PATH_SEGMENTS; }

    public static boolean contains(float x, float y) {
        for (Segment segment : PATH_SEGMENTS) {
            if (distanceToSegment(x, y, segment) < WALKABLE_RADIUS) return true;
        }
        return false;
    }

    public static float distanceToSegment(float px, float py, Segment segment) {
        float vx = segment.bx - segment.ax;
        float vy = segment.by - segment.ay;
        float wx = px - segment.ax;
        float wy = py - segment.ay;
        float lengthSquared = vx * vx + vy * vy;
        float t = lengthSquared <= .0001f ? 0f : (wx * vx + wy * vy) / lengthSquared;
        t = Math.max(0f, Math.min(1f, t));
        return (float) Math.hypot(px - (segment.ax + vx * t), py - (segment.ay + vy * t));
    }
}
