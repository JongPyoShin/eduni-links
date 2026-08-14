package com.eduni.portal;

import org.junit.Test;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class QuizExitControllerTest {
    @Test public void defaultChoiceContinuesTheSameQuiz() {
        QuizExitController exit = new QuizExitController();
        exit.requestExit();
        assertTrue(exit.isConfirming());
        assertEquals(QuizExitController.Decision.CONTINUE, exit.confirm(false));
        assertFalse(exit.isConfirming());
    }
    @Test public void explicitQuitIsTheOnlyExitDecision() {
        QuizExitController exit = new QuizExitController();
        assertEquals(QuizExitController.Decision.NONE, exit.confirm(true));
        exit.requestExit();
        assertEquals(QuizExitController.Decision.QUIT, exit.confirm(true));
    }
}
