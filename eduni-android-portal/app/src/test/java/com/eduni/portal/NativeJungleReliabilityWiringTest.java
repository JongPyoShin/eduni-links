package com.eduni.portal;

import org.junit.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.Assert.*;

public class NativeJungleReliabilityWiringTest {
    private String readActivitySource() throws Exception {
        Path path = Paths.get(System.getProperty("user.dir"),
                "app/src/main/java/com/eduni/portal/NativeJungleActivity.java");
        if (!Files.exists(path)) {
            path = Paths.get("../app/src/main/java/com/eduni/portal/NativeJungleActivity.java");
        }
        if (!Files.exists(path)) {
            path = Paths.get("src/main/java/com/eduni/portal/NativeJungleActivity.java");
        }
        return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
    }

    private static String between(String source, String start, String end) {
        int a = source.indexOf(start);
        assertTrue("Missing start marker: " + start, a >= 0);
        int b = source.indexOf(end, a);
        assertTrue("Missing end marker: " + end, b > a);
        return source.substring(a, b);
    }

    private static int count(String text, String needle) {
        int n = 0;
        int at = 0;
        while ((at = text.indexOf(needle, at)) >= 0) {
            n++;
            at += needle.length();
        }
        return n;
    }

    @Test public void activityOwnsQuizRequestGuard() throws Exception {
        String src = readActivitySource();
        assertTrue(src.contains("final JungleQuizRequestGuard quizRequests = new JungleQuizRequestGuard()"));
        assertTrue(src.contains("final JungleQuizRequestGuard.Token requestToken = quizRequests.tryBegin()"));
        assertTrue(src.contains("if (requestToken == null)"));
    }

    @Test public void asyncQuizCallbackConsumesTokenBeforeMutatingQuizState() throws Exception {
        String src = readActivitySource();
        String block = between(src, "final int requestStage = stageIndex;", "Bird nearest()");
        int consume = block.indexOf("quizRequests.completeIfCurrent(requestToken)");
        int mutate = block.indexOf("quiz = loadedQuiz");
        assertTrue("Callback must consume/check token", consume >= 0);
        assertTrue("Guard check must happen before quiz mutation", consume < mutate);
        assertTrue(block.contains("requestStage != stageIndex"));
        assertTrue(block.contains("!running"));
        assertTrue(block.contains("showStageSelect"));
        assertTrue(block.contains("stageCompleteShown"));
    }

    @Test public void resetPauseAndWorldMapInvalidatePendingQuiz() throws Exception {
        String src = readActivitySource();

        String reset = between(src, "void reset()", "boolean eduniWorldMapActiveV20_10()");
        assertTrue(reset.contains("quizRequests.invalidate()"));
        assertTrue(reset.contains("quiz = null"));

        String pause = between(src, "void pause()", "void destroy()");
        assertTrue(pause.contains("running = false"));
        assertTrue(pause.contains("quizRequests.invalidate()"));
        assertTrue(pause.contains("main.removeCallbacks(tick)"));

        String worldMap = between(src, "void eduniOpenWorldMapV20_10()", "void eduniMoveWorldMapStageV20_10");
        assertTrue(worldMap.contains("quizRequests.invalidate()"));
        assertTrue(worldMap.contains("quiz = null"));
    }

    @Test public void stageTransitionsInvalidatePendingQuiz() throws Exception {
        String src = readActivitySource();

        String complete = between(src, "void tickStageProgression()", "void resetBooleanFlags");
        assertTrue(complete.contains("quizRequests.invalidate()"));

        String resetWorld = between(src, "void resetWorldForNextStage()", "boolean isFinalStage()");
        assertTrue(resetWorld.contains("quizRequests.invalidate()"));

        String advance = between(src, "void advanceStage()", "void drawStageBadge");
        assertTrue(advance.contains("quizRequests.invalidate()"));

        String finish = between(src, "void finishFinalStageAndReturn()", "void advanceStage()");
        assertTrue(finish.contains("quizRequests.invalidate()"));
    }

    @Test public void lifecycleHasSingleLoopAndDestroyCleanup() throws Exception {
        String src = readActivitySource();

        String resume = between(src, "void resume()", "void pause()");
        assertTrue(resume.contains("main.removeCallbacks(tick)"));
        assertTrue(resume.contains("main.post(tick)"));
        assertTrue("remove-before-post keeps resume idempotent",
                resume.indexOf("main.removeCallbacks(tick)") < resume.indexOf("main.post(tick)"));

        String destroy = between(src, "void destroy()", "void reset()");
        assertTrue(destroy.contains("running = false"));
        assertTrue(destroy.contains("quizRequests.invalidate()"));
        assertTrue(destroy.contains("main.removeCallbacksAndMessages(null)"));

        assertTrue(src.contains("@Override protected void onDestroy() { if (game != null) game.destroy(); super.onDestroy(); }"));
    }

    @Test public void deadRecursiveStageSelectionMethodIsRemoved() throws Exception {
        String src = readActivitySource();
        assertFalse("Dead self-recursive world-map method must stay removed",
                src.contains("boolean stageSelectMoveFromKey("));
    }

    @Test public void navHasExactlyOneWorldMapBranch() throws Exception {
        String src = readActivitySource();
        String nav = between(src, "void nav(int dx, int dy)", "int count()");
        assertEquals("Only one showStageSelect route should own nav()", 1,
                count(nav, "if(showStageSelect)"));
        assertTrue(nav.contains("eduniMoveWorldMapStageV20_8"));
    }

    @Test public void quizRequestStillUsesExistingFallbackAndUiContract() throws Exception {
        String src = readActivitySource();
        String block = between(src, "void catchBird()", "Bird nearest()");
        assertTrue(block.contains("Quiz q = fetchQuiz()"));
        assertTrue(block.contains("if (q == null) q = localQuiz()"));
        assertTrue(block.contains("mode = QUIZ"));
        assertTrue(block.contains("방향키로 정답 선택, A 확인"));
    }

    @Test public void asyncProgressPayloadSnapshotsMutableStateBeforeThread() throws Exception {
        String src = readActivitySource();
        String block = between(src, "void postProgress(String eventType,String detail)", "Quiz fetchQuiz()");
        int thread = block.indexOf("new Thread(() ->");
        assertTrue(thread > 0);
        assertTrue(block.indexOf("final int screenSnapshot = mode;") < thread);
        assertTrue(block.indexOf("final int starsSnapshot = foundStars;") < thread);
        assertTrue(block.indexOf("final float playerXSnapshot = px;") < thread);
        assertFalse(block.substring(thread).contains("payload.put(\"screen\", mode)"));
        assertFalse(block.substring(thread).contains("payload.put(\"stars\", foundStars)"));
        assertFalse(block.substring(thread).contains("payload.put(\"player_x\", px)"));
    }

    @Test public void quizAttemptPayloadSnapshotsQuizSelectionAndStageBeforeThread() throws Exception {
        String src = readActivitySource();
        String block = between(src, "void postQuizAttemptDetailed(boolean correct)", "static class Dot");
        int thread = block.indexOf("new Thread(() ->");
        assertTrue(thread > 0);
        assertTrue(block.indexOf("final Object quizSnapshot = quiz;") < thread);
        assertTrue(block.indexOf("final int selectedIndexSnapshot = select;") < thread);
        assertTrue(block.indexOf("final int stageSnapshot = stageIndex + 1;") < thread);
        assertTrue(block.indexOf("final String selectedSnapshot = eduniSelectedOptionText(quizSnapshot, selectedIndexSnapshot);") < thread);
        assertFalse(block.substring(thread).contains("Object qz = quiz"));
        assertFalse(block.substring(thread).contains("payload.put(\"selected_index\", select)"));
        assertFalse(block.substring(thread).contains("payload.put(\"stage\", stageIndex + 1)"));
    }
}
