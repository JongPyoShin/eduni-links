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

    @Test
    public void testActivityDelegatesTargetSelection() throws Exception {
        String src = readActivitySource();
        assertTrue("chooseCurrent must call BubbleShooterRules.getEligibleTargets",
            src.contains("BubbleShooterRules.getEligibleTargets"));
        assertTrue("chooseCurrent must call BubbleShooterRules.getFrontRow",
            src.contains("BubbleShooterRules.getFrontRow"));
    }

    @Test
    public void testActivityRemovesDuplicateFrontRowLogic() throws Exception {
        String src = readActivitySource();
        assertFalse("Duplicate selectTargetFromHelper method must be removed",
            src.contains("selectTargetFromHelper"));
    }

    @Test
    public void testActivityHasAdapterMethods() throws Exception {
        String src = readActivitySource();
        assertTrue("Activity must have toHelperBubbles adapter",
            src.contains("toHelperBubbles"));
        assertTrue("Activity must have findNativeByHelper mapper",
            src.contains("findNativeByHelper"));
    }

    @Test
    public void testTargetSelectionPoppedExcluded() {
        java.util.List<BubbleShooterRules.Bubble> all = new java.util.ArrayList<>();
        all.add(new BubbleShooterRules.Bubble("水", "물", 100, 300, 20, false));
        all.add(new BubbleShooterRules.Bubble("火", "불", 200, 300, 20, true));

        java.util.List<BubbleShooterRules.Bubble> eligible = BubbleShooterRules.getEligibleTargets(all);
        assertEquals("Popped bubble excluded from eligible", 1, eligible.size());
        assertEquals("Remaining is the non-popped bubble", "水", eligible.get(0).hanja);
    }

    @Test
    public void testTargetSelectionFrontRowExcludesRear() {
        java.util.List<BubbleShooterRules.Bubble> all = new java.util.ArrayList<>();
        all.add(new BubbleShooterRules.Bubble("水", "물", 100, 300, 20, false));
        all.add(new BubbleShooterRules.Bubble("火", "불", 200, 100, 20, false));

        java.util.List<BubbleShooterRules.Bubble> frontRow = BubbleShooterRules.getFrontRow(all, 20 * 0.8f);
        assertEquals("Rear bubble excluded from front row", 1, frontRow.size());
        assertEquals("Front row is the high-Y bubble", "水", frontRow.get(0).hanja);
    }

    @Test
    public void testTargetSelectionFrontRowCandidatesRetained() {
        java.util.List<BubbleShooterRules.Bubble> all = new java.util.ArrayList<>();
        all.add(new BubbleShooterRules.Bubble("水", "물", 100, 300, 20, false));
        all.add(new BubbleShooterRules.Bubble("火", "불", 200, 295, 20, false));
        all.add(new BubbleShooterRules.Bubble("木", "나무", 300, 100, 20, false));

        java.util.List<BubbleShooterRules.Bubble> frontRow = BubbleShooterRules.getFrontRow(all, 20 * 0.8f);
        assertEquals("Two bubbles in front row", 2, frontRow.size());
    }

    @Test
    public void testTargetSelectionEligibleAndFrontRowPipeline() {
        java.util.List<BubbleShooterRules.Bubble> all = new java.util.ArrayList<>();
        all.add(new BubbleShooterRules.Bubble("水", "물", 100, 300, 20, false));
        all.add(new BubbleShooterRules.Bubble("火", "불", 200, 300, 20, false));
        all.add(new BubbleShooterRules.Bubble("金", "금", 300, 295, 20, false));
        all.add(new BubbleShooterRules.Bubble("木", "나무", 400, 100, 20, false));
        all.add(new BubbleShooterRules.Bubble("土", "흙", 500, 300, 20, true));

        java.util.List<BubbleShooterRules.Bubble> eligible = BubbleShooterRules.getEligibleTargets(all);
        assertEquals("4 eligible (1 popped)", 4, eligible.size());

        java.util.List<BubbleShooterRules.Bubble> frontRow = BubbleShooterRules.getFrontRow(eligible, 20 * 0.8f);
        assertEquals("3 in front row (within threshold of max Y=300)", 3, frontRow.size());

        for (BubbleShooterRules.Bubble b : frontRow) {
            assertTrue("All front-row candidates must be eligible",
                b.hanja.equals("水") || b.hanja.equals("火") || b.hanja.equals("金"));
        }
    }
}
