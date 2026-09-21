package com.eduni.portal;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure/testable Bubble Shooter rule logic shared across platforms.
 * This helper contains no Canvas, MotionEvent, layout, audio, or Activity code.
 */
public class BubbleShooterRules {

    /**
     * Represents a bubble on the board.
     */
    public static class Bubble {
        public final String hanja;
        public final String reading;
        public final float x;
        public final float y;
        public final float r;
        public final boolean popped;

        public Bubble(String hanja, String reading, float x, float y, float r, boolean popped) {
            this.hanja = hanja;
            this.reading = reading;
            this.x = x;
            this.y = y;
            this.r = r;
            this.popped = popped;
        }
    }

    /**
     * Shot resolution result.
     */
    public static class ShotResult {
        public final String type; // "correct", "clear", "miss"
        public final int scoreDelta;
        public final boolean pressure;
        public final boolean hitBubbleRemoved;
        public final boolean gameOver;

        public ShotResult(String type, int scoreDelta, boolean pressure,
                          boolean hitBubbleRemoved, boolean gameOver) {
            this.type = type;
            this.scoreDelta = scoreDelta;
            this.pressure = pressure;
            this.hitBubbleRemoved = hitBubbleRemoved;
            this.gameOver = gameOver;
        }
    }

    /**
     * Resolve a shot against the target.
     *
     * @param bubbles current live bubbles on the board
     * @param target the current target bubble (hanja to match)
     * @param hitBubble the bubble that was hit by the shot, or null for miss
     * @return ShotResult with outcome
     */
    public static ShotResult resolveShot(List<Bubble> bubbles, String target, Bubble hitBubble) {
        if (hitBubble == null) {
            return new ShotResult("miss", 0, true, false, false);
        }
        if (!hitBubble.hanja.equals(target)) {
            return new ShotResult("miss", 0, true, false, false);
        }
        // Correct hit
        int remainingLive = 0;
        for (Bubble b : bubbles) {
            if (!b.popped && !b.equals(hitBubble)) {
                remainingLive++;
            }
        }
        boolean cleared = remainingLive == 0;
        String type = cleared ? "clear" : "correct";
        return new ShotResult(type, 100, false, true, cleared);
    }

    /**
     * Check if any live bubble crosses the danger threshold.
     *
     * @param bubbles current bubbles
     * @param dangerLineY the Y coordinate of the danger line
     * @return true if danger
     */
    public static boolean isDanger(List<Bubble> bubbles, float dangerLineY) {
        for (Bubble b : bubbles) {
            if (b.popped) continue;
            if (b.y + b.r > dangerLineY) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a generation token is still valid.
     *
     * @param expected the generation at callback creation
     * @param actual the current generation
     * @return true if valid (not stale)
     */
    public static boolean isGenerationValid(int expected, int actual) {
        return expected == actual;
    }

    /**
     * Get eligible target bubbles (live, non-popped).
     *
     * @param bubbles all bubbles
     * @return list of eligible bubbles
     */
    public static List<Bubble> getEligibleTargets(List<Bubble> bubbles) {
        List<Bubble> eligible = new ArrayList<>();
        for (Bubble b : bubbles) {
            if (!b.popped) {
                eligible.add(b);
            }
        }
        return eligible;
    }

    /**
     * Get front-row bubbles (within threshold of max Y among live bubbles).
     *
     * @param bubbles all bubbles
     * @param frontRowThreshold max Y distance for front row
     * @return list of front-row bubbles
     */
    public static List<Bubble> getFrontRow(List<Bubble> bubbles, float frontRowThreshold) {
        float maxY = Float.MIN_VALUE;
        for (Bubble b : bubbles) {
            if (!b.popped && b.y > maxY) {
                maxY = b.y;
            }
        }
        List<Bubble> frontRow = new ArrayList<>();
        for (Bubble b : bubbles) {
            if (!b.popped && (maxY - b.y) <= frontRowThreshold) {
                frontRow.add(b);
            }
        }
        return frontRow;
    }

    /**
     * Load canonical questions from assets JSON.
     *
     * @param inputStream the JSON file input stream
     * @return list of [hanja, reading] pairs
     * @throws JSONException if JSON is malformed
     * @throws IllegalArgumentException if schema is invalid
     */
    public static String[][] loadCanonicalQuestions(InputStream inputStream) throws JSONException {
        byte[] bytes;
        try {
            bytes = new byte[inputStream.available()];
            inputStream.read(bytes);
        } catch (Exception e) {
            throw new JSONException("Failed to read stream: " + e.getMessage());
        }
        String json = new String(bytes, StandardCharsets.UTF_8);
        JSONObject root = new JSONObject(json);
        int schemaVersion = root.optInt("schemaVersion", 0);
        if (schemaVersion != 1) {
            throw new IllegalArgumentException("Unsupported schema version: " + schemaVersion);
        }
        JSONArray questions = root.getJSONArray("questions");
        if (questions.length() == 0) {
            throw new IllegalArgumentException("Questions array is empty");
        }
        String[][] result = new String[questions.length()][2];
        for (int i = 0; i < questions.length(); i++) {
            JSONObject q = questions.getJSONObject(i);
            String hanja = q.optString("hanja", "");
            String reading = q.optString("reading", "");
            if (hanja.isEmpty() || reading.isEmpty()) {
                throw new IllegalArgumentException("Entry " + i + " has empty hanja or reading");
            }
            result[i][0] = hanja;
            result[i][1] = reading;
        }
        return result;
    }
}
