package com.eduni.portal;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class EncounterDirectorTest {
    @Test public void campEncounterRequiresApproachAndKeepsWrongAnswerInLearning() {
        EncounterDirector director = new EncounterDirector();
        director.observeDistance(.20f);
        assertEquals(EncounterDirector.State.NOTICE, director.state());
        assertFalse(director.canInteract());
        director.observeDistance(.08f);
        assertTrue(director.canInteract());
        director.beginLearning();
        director.answer(false);
        assertEquals(EncounterDirector.State.LEARNING, director.state());
        director.answer(true);
        assertEquals(EncounterDirector.State.CELEBRATE, director.state());
        director.finishCelebration();
        assertEquals(EncounterDirector.State.COMPLETE, director.state());
    }
}
