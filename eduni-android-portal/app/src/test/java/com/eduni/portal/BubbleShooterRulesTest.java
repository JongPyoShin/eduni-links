package com.eduni.portal;

import org.junit.Test;
import org.junit.Before;
import static org.junit.Assert.*;

import java.util.ArrayList;
import java.util.List;

/**
 * JVM tests for BubbleShooterRules — verifies cross-platform rule contract.
 * No emulator required.
 */
public class BubbleShooterRulesTest {

    private BubbleShooterRules.Bubble makeBubble(String hanja, String reading, float x, float y, float r, boolean popped) {
        return new BubbleShooterRules.Bubble(hanja, reading, x, y, r, popped);
    }

    // === Shot Resolution ===

    @Test
    public void testCorrectHitWithRemaining() {
        List<BubbleShooterRules.Bubble> bubbles = new ArrayList<>();
        bubbles.add(makeBubble("家", "가", 100, 50, 20, false));
        bubbles.add(makeBubble("工", "공", 150, 50, 20, false));

        BubbleShooterRules.ShotResult result = BubbleShooterRules.resolveShot(
            bubbles, "家", bubbles.get(0));

        assertEquals("correct", result.type);
        assertEquals(100, result.scoreDelta);
        assertFalse(result.pressure);
        assertTrue(result.hitBubbleRemoved);
        assertFalse(result.gameOver);
    }

    @Test
    public void testCorrectHitFinalBubble() {
        List<BubbleShooterRules.Bubble> bubbles = new ArrayList<>();
        bubbles.add(makeBubble("家", "가", 100, 50, 20, false));

        BubbleShooterRules.ShotResult result = BubbleShooterRules.resolveShot(
            bubbles, "家", bubbles.get(0));

        assertEquals("clear", result.type);
        assertEquals(100, result.scoreDelta);
        assertFalse(result.pressure);
        assertTrue(result.hitBubbleRemoved);
        assertTrue(result.gameOver);
    }

    @Test
    public void testWrongBubbleHit() {
        List<BubbleShooterRules.Bubble> bubbles = new ArrayList<>();
        bubbles.add(makeBubble("家", "가", 100, 50, 20, false));
        bubbles.add(makeBubble("工", "공", 150, 50, 20, false));

        BubbleShooterRules.ShotResult result = BubbleShooterRules.resolveShot(
            bubbles, "家", bubbles.get(1));

        assertEquals("miss", result.type);
        assertEquals(0, result.scoreDelta);
        assertTrue(result.pressure);
        assertFalse(result.hitBubbleRemoved);
        assertFalse(result.gameOver);
    }

    @Test
    public void testEmptyMiss() {
        List<BubbleShooterRules.Bubble> bubbles = new ArrayList<>();
        bubbles.add(makeBubble("家", "가", 100, 50, 20, false));

        BubbleShooterRules.ShotResult result = BubbleShooterRules.resolveShot(
            bubbles, "家", null);

        assertEquals("miss", result.type);
        assertEquals(0, result.scoreDelta);
        assertTrue(result.pressure);
        assertFalse(result.hitBubbleRemoved);
        assertFalse(result.gameOver);
    }

    // === Danger ===

    @Test
    public void testDangerFalseAllAbove() {
        List<BubbleShooterRules.Bubble> bubbles = new ArrayList<>();
        bubbles.add(makeBubble("家", "가", 100, 50, 20, false));
        bubbles.add(makeBubble("工", "공", 150, 50, 20, false));

        assertFalse(BubbleShooterRules.isDanger(bubbles, 500));
    }

    @Test
    public void testDangerTrueOneCrossing() {
        List<BubbleShooterRules.Bubble> bubbles = new ArrayList<>();
        bubbles.add(makeBubble("家", "가", 100, 50, 20, false));
        bubbles.add(makeBubble("工", "공", 150, 485, 20, false));

        assertTrue(BubbleShooterRules.isDanger(bubbles, 500));
    }

    @Test
    public void testDangerPoppedIgnored() {
        List<BubbleShooterRules.Bubble> bubbles = new ArrayList<>();
        bubbles.add(makeBubble("家", "가", 100, 50, 20, false));
        bubbles.add(makeBubble("工", "공", 150, 490, 20, true));

        assertFalse(BubbleShooterRules.isDanger(bubbles, 500));
    }

    // === Generation ===

    @Test
    public void testGenerationValidMatch() {
        assertTrue(BubbleShooterRules.isGenerationValid(5, 5));
    }

    @Test
    public void testGenerationInvalidMismatch() {
        assertFalse(BubbleShooterRules.isGenerationValid(5, 3));
    }

    // === Target Selection ===

    @Test
    public void testTargetEligibleLiveOnly() {
        List<BubbleShooterRules.Bubble> bubbles = new ArrayList<>();
        bubbles.add(makeBubble("家", "가", 100, 50, 20, false));
        bubbles.add(makeBubble("工", "공", 150, 50, 20, true));
        bubbles.add(makeBubble("歌", "가", 200, 50, 20, false));

        List<BubbleShooterRules.Bubble> eligible = BubbleShooterRules.getEligibleTargets(bubbles);
        assertEquals(2, eligible.size());
        assertEquals("家", eligible.get(0).hanja);
        assertEquals("歌", eligible.get(1).hanja);
    }

    @Test
    public void testTargetFrontRowPreference() {
        List<BubbleShooterRules.Bubble> bubbles = new ArrayList<>();
        // Front row: y=100 and y=95 (within threshold of 10 from maxY=100)
        // Back row: y=50 (more than 10 from maxY)
        bubbles.add(makeBubble("家", "가", 100, 100, 20, false));
        bubbles.add(makeBubble("工", "공", 150, 95, 20, false));
        bubbles.add(makeBubble("歌", "가", 200, 50, 20, false));

        List<BubbleShooterRules.Bubble> frontRow = BubbleShooterRules.getFrontRow(bubbles, 10);
        assertEquals(2, frontRow.size());
        assertEquals("家", frontRow.get(0).hanja);
        assertEquals("工", frontRow.get(1).hanja);
    }

    // === Canonical Data Loading ===

    @Test
    public void testLoadCanonicalQuestions() throws Exception {
        java.io.InputStream is = getClass().getClassLoader().getResourceAsStream("bubble_shooter_questions.json");
        if (is == null) {
            // Try from assets path
            is = new java.io.FileInputStream("src/main/assets/bubble_shooter_questions.json");
        }
        String[][] questions = BubbleShooterRules.loadCanonicalQuestions(is);
        assertTrue("Canonical dataset should have entries", questions.length > 0);
        assertNotNull("First entry hanja", questions[0][0]);
        assertNotNull("First entry reading", questions[0][1]);
        assertFalse("First entry hanja not empty", questions[0][0].isEmpty());
        assertFalse("First entry reading not empty", questions[0][1].isEmpty());
    }
}
