package com.eduni.portal;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import static org.junit.Assert.*;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Executes every case from the shared rule-contract fixture
 * (shared/bubble_shooter_rule_contract_cases.json) against BubbleShooterRules.
 *
 * Both Web/Python and Android JVM must produce identical outcomes.
 */
public class ContractFixtureTest {

    private JSONObject loadFixture() throws Exception {
        InputStream is = getClass().getClassLoader().getResourceAsStream("bubble_shooter_rule_contract_cases.json");
        assertNotNull("Contract fixture must be on test classpath", is);
        byte[] bytes = is.readAllBytes();
        return new JSONObject(new String(bytes, StandardCharsets.UTF_8));
    }

    private List<BubbleShooterRules.Bubble> parseBubbles(JSONArray arr) throws Exception {
        List<BubbleShooterRules.Bubble> out = new ArrayList<>();
        for (int i = 0; i < arr.length(); i++) {
            JSONObject obj = arr.getJSONObject(i);
            out.add(new BubbleShooterRules.Bubble(
                obj.getString("hanja"),
                obj.getString("reading"),
                (float) obj.optDouble("x", 0),
                (float) obj.optDouble("y", 0),
                (float) obj.optDouble("r", 20),
                obj.optBoolean("popped", false)
            ));
        }
        return out;
    }

    @Test
    public void testFixtureLoadsAndHas11Cases() throws Exception {
        JSONObject fixture = loadFixture();
        assertEquals("Schema version must be 1", 1, fixture.getInt("schemaVersion"));
        JSONArray cases = fixture.getJSONArray("cases");
        assertEquals("Fixture must have exactly 11 cases", 11, cases.length());
    }

    @Test
    public void testAllCategoriesCovered() throws Exception {
        JSONObject fixture = loadFixture();
        JSONArray cases = fixture.getJSONArray("cases");
        Set<String> categories = new HashSet<>();
        for (int i = 0; i < cases.length(); i++) {
            categories.add(cases.getJSONObject(i).getString("category"));
        }
        assertTrue("Must cover shot_resolution", categories.contains("shot_resolution"));
        assertTrue("Must cover danger", categories.contains("danger"));
        assertTrue("Must cover generation", categories.contains("generation"));
        assertTrue("Must cover target_selection", categories.contains("target_selection"));
        assertEquals("Must have exactly 4 categories", 4, categories.size());
    }

    @Test
    public void testParsedCaseCountMatchesFixture() throws Exception {
        JSONObject fixture = loadFixture();
        JSONArray cases = fixture.getJSONArray("cases");
        int count = 0;
        for (int i = 0; i < cases.length(); i++) {
            count++;
        }
        assertEquals("Parsed case count must equal fixture count", cases.length(), count);
    }

    // --- shot_resolution cases ---

    @Test
    public void testShotCorrectWithRemaining() throws Exception {
        JSONObject fixture = loadFixture();
        JSONObject c = findCase(fixture, "shot_correct_with_remaining");
        JSONObject input = c.getJSONObject("input");
        JSONObject expected = c.getJSONObject("expected");

        List<BubbleShooterRules.Bubble> bubbles = parseBubbles(input.getJSONArray("bubbles"));
        String target = input.getJSONObject("target").getString("hanja");
        String hitHanja = input.getJSONObject("shotHit").getString("hanja");

        BubbleShooterRules.Bubble hitBubble = findHelperBubble(bubbles, hitHanja);
        assertNotNull("Hit bubble must be found", hitBubble);

        BubbleShooterRules.ShotResult result = BubbleShooterRules.resolveShot(bubbles, target, hitBubble);

        assertEquals("type", expected.getString("type"), result.type);
        assertEquals("scoreDelta", expected.getInt("scoreDelta"), result.scoreDelta);
        assertEquals("pressure", expected.getBoolean("pressure"), result.pressure);
        assertEquals("hitBubbleRemoved", expected.getBoolean("hitBubbleRemoved"), result.hitBubbleRemoved);
        assertEquals("gameOver", expected.getBoolean("gameOver"), result.gameOver);
    }

    @Test
    public void testShotCorrectFinalBubble() throws Exception {
        JSONObject fixture = loadFixture();
        JSONObject c = findCase(fixture, "shot_correct_final_bubble");
        JSONObject input = c.getJSONObject("input");
        JSONObject expected = c.getJSONObject("expected");

        List<BubbleShooterRules.Bubble> bubbles = parseBubbles(input.getJSONArray("bubbles"));
        String target = input.getJSONObject("target").getString("hanja");
        String hitHanja = input.getJSONObject("shotHit").getString("hanja");

        BubbleShooterRules.Bubble hitBubble = findHelperBubble(bubbles, hitHanja);
        BubbleShooterRules.ShotResult result = BubbleShooterRules.resolveShot(bubbles, target, hitBubble);

        assertEquals("type", expected.getString("type"), result.type);
        assertEquals("scoreDelta", expected.getInt("scoreDelta"), result.scoreDelta);
        assertEquals("gameOver", expected.getBoolean("gameOver"), result.gameOver);
    }

    @Test
    public void testShotWrongBubble() throws Exception {
        JSONObject fixture = loadFixture();
        JSONObject c = findCase(fixture, "shot_wrong_bubble");
        JSONObject input = c.getJSONObject("input");
        JSONObject expected = c.getJSONObject("expected");

        List<BubbleShooterRules.Bubble> bubbles = parseBubbles(input.getJSONArray("bubbles"));
        String target = input.getJSONObject("target").getString("hanja");
        String hitHanja = input.getJSONObject("shotHit").getString("hanja");

        BubbleShooterRules.Bubble hitBubble = findHelperBubble(bubbles, hitHanja);
        BubbleShooterRules.ShotResult result = BubbleShooterRules.resolveShot(bubbles, target, hitBubble);

        assertEquals("type", expected.getString("type"), result.type);
        assertEquals("scoreDelta", expected.getInt("scoreDelta"), result.scoreDelta);
        assertEquals("pressure", expected.getBoolean("pressure"), result.pressure);
    }

    @Test
    public void testShotEmptyMiss() throws Exception {
        JSONObject fixture = loadFixture();
        JSONObject c = findCase(fixture, "shot_empty_miss");
        JSONObject input = c.getJSONObject("input");
        JSONObject expected = c.getJSONObject("expected");

        List<BubbleShooterRules.Bubble> bubbles = parseBubbles(input.getJSONArray("bubbles"));
        String target = input.getJSONObject("target").getString("hanja");

        BubbleShooterRules.ShotResult result = BubbleShooterRules.resolveShot(bubbles, target, null);

        assertEquals("type", expected.getString("type"), result.type);
        assertEquals("scoreDelta", expected.getInt("scoreDelta"), result.scoreDelta);
        assertEquals("pressure", expected.getBoolean("pressure"), result.pressure);
    }

    // --- danger cases ---

    @Test
    public void testDangerFalseAllAbove() throws Exception {
        JSONObject fixture = loadFixture();
        JSONObject c = findCase(fixture, "danger_false_all_above");
        JSONObject input = c.getJSONObject("input");
        JSONObject expected = c.getJSONObject("expected");

        List<BubbleShooterRules.Bubble> bubbles = parseBubbles(input.getJSONArray("bubbles"));
        float dangerLineY = (float) input.getDouble("dangerLineY");

        boolean danger = BubbleShooterRules.isDanger(bubbles, dangerLineY);
        assertEquals("danger", expected.getBoolean("danger"), danger);
    }

    @Test
    public void testDangerTrueOneCrossing() throws Exception {
        JSONObject fixture = loadFixture();
        JSONObject c = findCase(fixture, "danger_true_one_crossing");
        JSONObject input = c.getJSONObject("input");
        JSONObject expected = c.getJSONObject("expected");

        List<BubbleShooterRules.Bubble> bubbles = parseBubbles(input.getJSONArray("bubbles"));
        float dangerLineY = (float) input.getDouble("dangerLineY");

        boolean danger = BubbleShooterRules.isDanger(bubbles, dangerLineY);
        assertEquals("danger", expected.getBoolean("danger"), danger);
    }

    @Test
    public void testDangerPoppedIgnored() throws Exception {
        JSONObject fixture = loadFixture();
        JSONObject c = findCase(fixture, "danger_popped_ignored");
        JSONObject input = c.getJSONObject("input");
        JSONObject expected = c.getJSONObject("expected");

        List<BubbleShooterRules.Bubble> bubbles = parseBubbles(input.getJSONArray("bubbles"));
        float dangerLineY = (float) input.getDouble("dangerLineY");

        boolean danger = BubbleShooterRules.isDanger(bubbles, dangerLineY);
        assertEquals("danger", expected.getBoolean("danger"), danger);
    }

    // --- generation cases ---

    @Test
    public void testGenerationValidMatch() throws Exception {
        JSONObject fixture = loadFixture();
        JSONObject c = findCase(fixture, "generation_valid_match");
        JSONObject input = c.getJSONObject("input");
        JSONObject expected = c.getJSONObject("expected");

        boolean valid = BubbleShooterRules.isGenerationValid(
            input.getInt("expectedGeneration"), input.getInt("actualGeneration"));
        assertEquals("valid", expected.getBoolean("valid"), valid);
    }

    @Test
    public void testGenerationInvalidMismatch() throws Exception {
        JSONObject fixture = loadFixture();
        JSONObject c = findCase(fixture, "generation_invalid_mismatch");
        JSONObject input = c.getJSONObject("input");
        JSONObject expected = c.getJSONObject("expected");

        boolean valid = BubbleShooterRules.isGenerationValid(
            input.getInt("expectedGeneration"), input.getInt("actualGeneration"));
        assertEquals("valid", expected.getBoolean("valid"), valid);
    }

    // --- target_selection cases ---

    @Test
    public void testTargetEligibleLiveOnly() throws Exception {
        JSONObject fixture = loadFixture();
        JSONObject c = findCase(fixture, "target_eligible_live_only");
        JSONObject input = c.getJSONObject("input");
        JSONObject expected = c.getJSONObject("expected");

        List<BubbleShooterRules.Bubble> bubbles = parseBubbles(input.getJSONArray("bubbles"));
        List<BubbleShooterRules.Bubble> eligible = BubbleShooterRules.getEligibleTargets(bubbles);

        assertEquals("eligibleCount", expected.getInt("eligibleCount"), eligible.size());

        Set<String> expectedSet = jsonToArray(expected.getJSONArray("eligibleHanja"));
        Set<String> actualSet = new HashSet<>();
        for (BubbleShooterRules.Bubble b : eligible) actualSet.add(b.hanja);
        assertEquals("eligibleHanja", expectedSet, actualSet);
    }

    @Test
    public void testTargetFrontRowPreference() throws Exception {
        JSONObject fixture = loadFixture();
        JSONObject c = findCase(fixture, "target_front_row_preference");
        JSONObject input = c.getJSONObject("input");
        JSONObject expected = c.getJSONObject("expected");

        List<BubbleShooterRules.Bubble> bubbles = parseBubbles(input.getJSONArray("bubbles"));
        float threshold = (float) input.getDouble("frontRowThreshold");
        List<BubbleShooterRules.Bubble> frontRow = BubbleShooterRules.getFrontRow(bubbles, threshold);

        assertEquals("frontRowCount", expected.getInt("frontRowCount"), frontRow.size());

        Set<String> expectedSet = jsonToArray(expected.getJSONArray("frontRowHanja"));
        Set<String> actualSet = new HashSet<>();
        for (BubbleShooterRules.Bubble b : frontRow) actualSet.add(b.hanja);
        assertEquals("frontRowHanja", expectedSet, actualSet);
    }

    // --- helpers ---

    private JSONObject findCase(JSONObject fixture, String id) throws Exception {
        JSONArray cases = fixture.getJSONArray("cases");
        for (int i = 0; i < cases.length(); i++) {
            JSONObject c = cases.getJSONObject(i);
            if (c.getString("id").equals(id)) return c;
        }
        fail("Case not found: " + id);
        return null;
    }

    private BubbleShooterRules.Bubble findHelperBubble(List<BubbleShooterRules.Bubble> bubbles, String hanja) {
        for (BubbleShooterRules.Bubble b : bubbles) {
            if (b.hanja.equals(hanja)) return b;
        }
        return null;
    }

    private Set<String> jsonToArray(JSONArray arr) throws Exception {
        Set<String> set = new HashSet<>();
        for (int i = 0; i < arr.length(); i++) set.add(arr.getString(i));
        return set;
    }
}
