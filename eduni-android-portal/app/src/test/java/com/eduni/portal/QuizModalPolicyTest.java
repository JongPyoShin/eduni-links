package com.eduni.portal;

import org.junit.Test;
import static org.junit.Assert.assertEquals;

public class QuizModalPolicyTest {
    private final QuizModalPolicy policy = new QuizModalPolicy();

    @Test public void quizBlocksMissionClosetAndPause() {
        assertEquals(QuizModalPolicy.Decision.IGNORE, policy.decide(InputActionMapper.Action.MISSION, true));
        assertEquals(QuizModalPolicy.Decision.IGNORE, policy.decide(InputActionMapper.Action.CLOSET, true));
        assertEquals(QuizModalPolicy.Decision.IGNORE, policy.decide(InputActionMapper.Action.PAUSE, true));
    }

    @Test public void quizAllowsOnlyNavigationAnswerAndExitRequest() {
        assertEquals(QuizModalPolicy.Decision.NAVIGATE, policy.decide(InputActionMapper.Action.MOVE_LEFT, true));
        assertEquals(QuizModalPolicy.Decision.ANSWER, policy.decide(InputActionMapper.Action.CONFIRM, true));
        assertEquals(QuizModalPolicy.Decision.REQUEST_EXIT, policy.decide(InputActionMapper.Action.BACK, true));
        assertEquals(QuizModalPolicy.Decision.NONE, policy.decide(InputActionMapper.Action.BACK, false));
    }
}
