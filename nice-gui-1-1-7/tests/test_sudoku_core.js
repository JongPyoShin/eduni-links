const assert = require("node:assert/strict");
const test = require("node:test");
const core = require("../portal_app/static_games/eduni_sudoku_core.js");

const seeded = seed => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

test("each child level makes unique, logic-solvable puzzles", () => {
  for (const level of Object.keys(core.LEVELS)) {
    const config = core.LEVELS[level];
    for (let seed = 1; seed <= 12; seed++) {
      const { puzzle, solution } = core.generate(level, seeded(seed));
      assert.equal(puzzle.length, config.size ** 2);
      assert.equal(core.countSolutions(puzzle, config), 1, `${level} seed ${seed}`);
      assert.equal(core.logicSolvable(puzzle, config), true, `${level} seed ${seed}`);
      assert.deepEqual(core.conflicts(solution, config), []);
      assert.ok(core.nextHint(puzzle, config));
    }
  }
});

test("duplicates and out-of-range values cannot be accepted as solutions", () => {
  const config = core.LEVELS.starter;
  const { solution } = core.generate("starter", seeded(7));
  const duplicate = [...solution];
  duplicate[1] = duplicate[0];
  assert.equal(core.countSolutions(duplicate, config), 0);
  assert.equal(core.nextHint(duplicate, config), null);
  const invalid = [...solution];
  invalid[1] = 8;
  assert.equal(core.countSolutions(invalid, config), 0);
});

test("recommendation uses only the level being completed", () => {
  const easy = { level:"starter", completed:true, hints:0, conflicts:0 };
  const hard = { level:"challenge", completed:true, hints:0, conflicts:0 };
  assert.equal(core.recommend("starter", [easy, hard]), "starter");
  assert.equal(core.recommend("starter", [easy, easy]), "explorer");
  assert.equal(core.recommend("challenge", [
    { level:"challenge", completed:true, hints:3, conflicts:0 },
    { level:"challenge", completed:true, hints:4, conflicts:0 },
  ]), "explorer");
});
