package com.eduni.portal;

import org.junit.Test;
import static org.junit.Assert.*;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * Runtime-wiring tests for NativeBubbleShooterActivity.
 * Verifies that the Activity delegates to BubbleShooterRules.
 * No emulator required.
 */
public class NativeBubbleShooterWiringTest {

    private String readActivitySource() throws Exception {
        java.nio.file.Path path = java.nio.file.Paths.get(System.getProperty("user.dir"),
            "app/src/main/java/com/eduni/portal/NativeBubbleShooterActivity.java");
        if (!java.nio.file.Files.exists(path)) {
            path = java.nio.file.Paths.get("../app/src/main/java/com/eduni/portal/NativeBubbleShooterActivity.java");
        }
        if (!java.nio.file.Files.exists(path)) {
            path = java.nio.file.Paths.get("src/main/java/com/eduni/portal/NativeBubbleShooterActivity.java");
        }
        byte[] bytes = java.nio.file.Files.readAllBytes(path);
        return new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
    }

    @Test
    public void testActivityImportsBubbleShooterRules() throws Exception {
        String src = readActivitySource();
        assertTrue("Activity must import BubbleShooterRules",
            src.contains("import com.eduni.portal.BubbleShooterRules")
            || src.contains("BubbleShooterRules."));
    }

    @Test
    public void testActivityDelegatesShotResolution() throws Exception {
        String src = readActivitySource();
        assertTrue("handleHit must call BubbleShooterRules.resolveShot",
            src.contains("BubbleShooterRules.resolveShot"));
    }

    @Test
    public void testActivityDelegatesDangerEvaluation() throws Exception {
        String src = readActivitySource();
        assertTrue("isDanger must call BubbleShooterRules.isDanger",
            src.contains("BubbleShooterRules.isDanger"));
    }

    @Test
    public void testActivityUsesGenerationGuard() throws Exception {
        String src = readActivitySource();
        assertTrue("handleHit must use BubbleShooterRules.isGenerationValid",
            src.contains("BubbleShooterRules.isGenerationValid"));
    }

    @Test
    public void testActivityLoadsCanonicalDeck() throws Exception {
        String src = readActivitySource();
        assertTrue("reset must call loadCanonicalDeck",
            src.contains("loadCanonicalDeck"));
        assertTrue("loadCanonicalDeck must call BubbleShooterRules.loadCanonicalQuestions",
            src.contains("BubbleShooterRules.loadCanonicalQuestions"));
    }

    @Test
    public void testActivityIncrementsGenerationOnReset() throws Exception {
        String src = readActivitySource();
        assertTrue("reset must increment generation",
            src.contains("generation += 1") || src.contains("generation++"));
    }

    @Test
    public void testActivityCapturesGenerationInDelayedCallback() throws Exception {
        String src = readActivitySource();
        assertTrue("handleHit must capture generation token",
            src.contains("final int gen = generation"));
    }

    @Test
    public void testHardcodedPairsRemoved() throws Exception {
        String src = readActivitySource();
        assertFalse("Hardcoded pairs array must be removed",
            src.contains("final String[][] pairs"));
    }

    @Test
    public void testCanonicalDatasetHas122Entries() throws Exception {
        InputStream is = getClass().getClassLoader().getResourceAsStream("bubble_shooter_questions.json");
        if (is == null) {
            is = new java.io.FileInputStream("src/main/assets/bubble_shooter_questions.json");
        }
        String[][] questions = BubbleShooterRules.loadCanonicalQuestions(is);
        assertEquals("Canonical dataset must have 122 entries", 122, questions.length);
    }

    @Test
    public void testGenerationGuardRejectsStaleCallback() {
        assertFalse("Generation 5 should be stale when current is 6",
            BubbleShooterRules.isGenerationValid(5, 6));
        assertTrue("Generation 6 should be valid when current is 6",
            BubbleShooterRules.isGenerationValid(6, 6));
    }
}
