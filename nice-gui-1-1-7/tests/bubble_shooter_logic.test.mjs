/**
 * Bubble Shooter Logic — unit tests (Node).
 * Covers the canonical game contract from PROMPT 14.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Load the logic module (it attaches to globalThis)
await import('../portal_app/static_games/eduni_bubble_shooter_logic.js');
const L = globalThis.EDUNIBubbleShooterLogic;

function makeBubble(target, row, col) {
  return { target, x: col * 40, y: row * 35, r: 18, popped: false, slotIndex: row * 10 + col };
}

// ─── resolveShot ───

describe('resolveShot', () => {
  it('correct hit removes target, +100, no pressure', () => {
    const b1 = makeBubble('冬', 0, 0);
    const b2 = makeBubble('夏', 0, 1);
    const result = L.resolveShot({
      shot: { target: '冬' },
      hitBubble: b1,
      bubbles: [b1, b2],
      shotTarget: '冬',
    });
    assert.equal(result.type, 'correct');
    assert.equal(result.scoreDelta, 100);
    assert.equal(result.addPressure, false);
    assert.equal(result.bubbles.length, 1);
    assert.equal(result.bubbles[0].target, '夏');
    assert.equal(result.gameOver, false);
  });

  it('correct hit on last bubble triggers clear', () => {
    const b1 = makeBubble('冬', 0, 0);
    const result = L.resolveShot({
      shot: { target: '冬' },
      hitBubble: b1,
      bubbles: [b1],
      shotTarget: '冬',
    });
    assert.equal(result.type, 'clear');
    assert.equal(result.scoreDelta, 100);
    assert.equal(result.addPressure, false);
    assert.equal(result.cleared, true);
    assert.equal(result.gameOver, true);
  });

  it('wrong bubble hit is a miss with pressure', () => {
    const b1 = makeBubble('冬', 0, 0);
    const b2 = makeBubble('夏', 0, 1);
    const result = L.resolveShot({
      shot: { target: '冬' },
      hitBubble: b2,
      bubbles: [b1, b2],
      shotTarget: '冬',
    });
    assert.equal(result.type, 'miss');
    assert.equal(result.scoreDelta, 0);
    assert.equal(result.addPressure, true);
    assert.equal(result.bubbles.length, 2);
  });

  it('top-edge miss (no hit bubble) is a miss with pressure', () => {
    const b1 = makeBubble('冬', 0, 0);
    const result = L.resolveShot({
      shot: { target: '冬' },
      hitBubble: null,
      bubbles: [b1],
      shotTarget: '冬',
    });
    assert.equal(result.type, 'miss');
    assert.equal(result.scoreDelta, 0);
    assert.equal(result.addPressure, true);
  });

  it('no shot returns miss with no pressure', () => {
    const result = L.resolveShot({
      shot: null,
      hitBubble: null,
      bubbles: [],
      shotTarget: '冬',
    });
    assert.equal(result.type, 'miss');
    assert.equal(result.addPressure, false);
  });

  it('turn result cannot double-apply (immutability)', () => {
    const b1 = makeBubble('冬', 0, 0);
    const b2 = makeBubble('夏', 0, 1);
    const r1 = L.resolveShot({ shot: { target: '冬' }, hitBubble: b1, bubbles: [b1, b2], shotTarget: '冬' });
    const r2 = L.resolveShot({ shot: { target: '冬' }, hitBubble: b1, bubbles: [b1, b2], shotTarget: '冬' });
    assert.equal(r1.bubbles.length, 1);
    assert.equal(r2.bubbles.length, 1);
    assert.notEqual(r1.bubbles, r2.bubbles);
  });
});

// ─── selectTarget ───

describe('selectTarget', () => {
  it('selects from live bubbles only', () => {
    const b1 = makeBubble('冬', 0, 0);
    b1.popped = true;
    const b2 = makeBubble('夏', 0, 1);
    const selected = L.selectTarget([b1, b2], 18);
    assert.equal(selected.target, '夏');
  });

  it('returns null when all bubbles popped', () => {
    const b1 = makeBubble('冬', 0, 0);
    b1.popped = true;
    assert.equal(L.selectTarget([b1], 18), null);
  });

  it('returns null for empty array', () => {
    assert.equal(L.selectTarget([], 18), null);
  });

  it('prefers front-row bubbles', () => {
    const back = makeBubble('冬', 0, 0);
    const front = makeBubble('夏', 3, 0);
    // Run multiple times to check front is always selected
    for (let i = 0; i < 20; i++) {
      const s = L.selectTarget([back, front], 18);
      assert.equal(s.target, '夏');
    }
  });
});

// ─── isDanger ───

describe('isDanger', () => {
  it('returns false when all bubbles above line', () => {
    const b1 = makeBubble('冬', 0, 0);
    b1.y = 100; b1.r = 18;
    assert.equal(L.isDanger([b1], 300), false);
  });

  it('returns true when a bubble crosses the line', () => {
    const b1 = makeBubble('冬', 0, 0);
    b1.y = 290; b1.r = 18;
    assert.equal(L.isDanger([b1], 300), true);
  });

  it('ignores popped bubbles', () => {
    const b1 = makeBubble('冬', 0, 0);
    b1.y = 290; b1.r = 18; b1.popped = true;
    assert.equal(L.isDanger([b1], 300), false);
  });
});

// ─── pointerToCss / cssToLogical ───

describe('coordinate conversion', () => {
  it('pointerToCss converts client coords to canvas-local', () => {
    const rect = { left: 100, top: 50 };
    const event = { clientX: 150, clientY: 80 };
    const pt = L.pointerToCss(event, rect);
    assert.equal(pt.x, 50);
    assert.equal(pt.y, 30);
  });

  it('cssToLogical is passthrough (DPR handled by setTransform)', () => {
    const pt = L.cssToLogical({ x: 50, y: 30 }, 2);
    assert.equal(pt.x, 50);
    assert.equal(pt.y, 30);
  });

  it('cssToLogical does not alter coordinates for any DPR', () => {
    for (const dpr of [1, 1.5, 2, 3]) {
      const pt = L.cssToLogical({ x: 100, y: 200 }, dpr);
      assert.equal(pt.x, 100);
      assert.equal(pt.y, 200);
    }
  });
});

// ─── isGenerationValid ───

describe('isGenerationValid', () => {
  it('returns true for matching generation', () => {
    assert.equal(L.isGenerationValid(3, 3), true);
  });

  it('returns false for stale generation', () => {
    assert.equal(L.isGenerationValid(3, 2), false);
  });

  it('blocks stale delayed continuation after restart', () => {
    let gen = 1;
    const callbacks = [];
    function schedulePraise() {
      const savedGen = gen;
      callbacks.push(() => {
        if (!L.isGenerationValid(savedGen, gen)) return 'stale';
        return 'valid';
      });
    }
    schedulePraise();
    gen = 2; // restart
    assert.equal(callbacks[0](), 'stale');
  });
});
