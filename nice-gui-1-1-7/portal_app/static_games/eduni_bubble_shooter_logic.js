/**
 * EDUNI Bubble Shooter — shared pure-logic module (Phase 1).
 *
 * This module contains testable game rules separated from DOM/canvas drawing.
 * The web template and potential future implementations import or reference
 * these contracts for consistent behavior.
 */
((root) => {
  'use strict';

  /**
   * Resolve a shot outcome.
   * @param {object} params
   * @param {object|null} params.shot - current shot state
   * @param {object} params.hitBubble - the bubble that was hit (or null if miss/top)
   * @param {Array} params.bubbles - current live bubble array (will not be mutated)
   * @param {string} params.shotTarget - the target hanja character
   * @returns {{type:'correct'|'miss'|'clear'|'gameover', scoreDelta:number, addPressure:boolean, bubbles:Array, gameOver:boolean, cleared:boolean}}
   */
  function resolveShot({ shot, hitBubble, bubbles, shotTarget }) {
    if (!shot) return { type: 'miss', scoreDelta: 0, addPressure: false, bubbles, gameOver: false, cleared: false };

    const live = bubbles.filter(b => !b.popped);

    // Top-edge miss (shot flew off screen)
    if (!hitBubble) {
      return { type: 'miss', scoreDelta: 0, addPressure: true, bubbles, gameOver: false, cleared: false };
    }

    if (hitBubble.target === shotTarget) {
      // Correct hit: remove the bubble, +100, no pressure
      const remaining = bubbles.filter(b => b !== hitBubble);
      const stillLive = remaining.filter(b => !b.popped);
      if (stillLive.length === 0) {
        return { type: 'clear', scoreDelta: 100, addPressure: false, bubbles: remaining, gameOver: true, cleared: true };
      }
      return { type: 'correct', scoreDelta: 100, addPressure: false, bubbles: remaining, gameOver: false, cleared: false };
    }

    // Wrong bubble hit
    return { type: 'miss', scoreDelta: 0, addPressure: true, bubbles, gameOver: false, cleared: false };
  }

  /**
   * Check whether any live bubble has crossed the danger line.
   * @param {Array} bubbles
   * @param {number} dangerY - the y threshold (baseY - radius * 2.2)
   * @returns {boolean}
   */
  function isDanger(bubbles, dangerY) {
    return bubbles.some(b => !b.popped && b.y + b.r > dangerY);
  }

  /**
   * Select the next target from live bubbles.
   * Prefers front-row (highest y) bubbles.
   * @param {Array} bubbles
   * @param {number} radius - bubble radius for front-row tolerance
   * @returns {object|null} the selected bubble or null if none live
   */
  function selectTarget(bubbles, radius) {
    const live = bubbles.filter(b => !b.popped);
    if (!live.length) return null;
    const frontY = Math.max(...live.map(b => b.y));
    const front = live.filter(b => Math.abs(b.y - frontY) < radius * 0.8);
    return front[Math.floor(Math.random() * front.length)] || null;
  }

  /**
   * Compute CSS-pixel coordinates from a pointer event relative to a canvas.
   * @param {PointerEvent} event
   * @param {DOMRect} rect - canvas bounding rect
   * @returns {{x:number, y:number}}
   */
  function pointerToCss(event, rect) {
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  /**
   * Compute logical game coordinates from CSS-pixel coordinates.
   * When canvas backing store is scaled by DPR and ctx.setTransform(dpr,...)
   * is applied, CSS-pixel coords == logical game coords. This function exists
   * as an explicit contract and future-proofing.
   * @param {{x:number, y:number}} cssPoint
   * @param {number} dpr - device pixel ratio
   * @returns {{x:number, y:number}}
   */
  function cssToLogical(cssPoint, dpr) {
    // With setTransform(dpr,...), drawing in CSS coords maps correctly.
    // This is a passthrough but documents the contract.
    return { x: cssPoint.x, y: cssPoint.y };
  }

  /**
   * Check whether a generation token is still valid.
   * Used to prevent stale delayed callbacks from mutating a restarted game.
   * @param {number} expected
   * @param {number} actual
   * @returns {boolean}
   */
  function isGenerationValid(expected, actual) {
    return expected === actual;
  }

  root.EDUNIBubbleShooterLogic = Object.freeze({
    resolveShot,
    isDanger,
    selectTarget,
    pointerToCss,
    cssToLogical,
    isGenerationValid,
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
