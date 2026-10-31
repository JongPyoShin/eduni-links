/* Shared puzzle rules. No network or child profile data is used. */
const SudokuCore = (() => {
  const LEVELS = {
    starter: { size: 4, boxRows: 2, boxCols: 2, clues: 10 },
    explorer: { size: 4, boxRows: 2, boxCols: 2, clues: 7 },
    challenge: { size: 6, boxRows: 2, boxCols: 3, clues: 19 },
  };
  const range = n => Array.from({ length: n }, (_, i) => i);
  const shuffle = (items, random) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const units = ({ size, boxRows, boxCols }) => {
    const result = [];
    for (let row = 0; row < size; row++) result.push(range(size).map(col => row * size + col));
    for (let col = 0; col < size; col++) result.push(range(size).map(row => row * size + col));
    for (let row = 0; row < size; row += boxRows) {
      for (let col = 0; col < size; col += boxCols) {
        result.push(range(boxRows).flatMap(dr => range(boxCols).map(dc => (row + dr) * size + col + dc)));
      }
    }
    return result;
  };
  const conflicts = (board, config) => {
    const bad = new Set();
    for (const unit of units(config)) {
      const seen = new Map();
      for (const index of unit) {
        const value = board[index];
        if (!value) continue;
        if (seen.has(value)) { bad.add(index); bad.add(seen.get(value)); }
        else seen.set(value, index);
      }
    }
    return [...bad];
  };
  const candidates = (board, index, config) => {
    if (board[index]) return [];
    const used = new Set();
    for (const unit of units(config)) {
      if (unit.includes(index)) for (const cell of unit) used.add(board[cell]);
    }
    return range(config.size).map(i => i + 1).filter(value => !used.has(value));
  };
  const nextHint = (board, config) => {
    if (conflicts(board, config).length) return null;
    for (const index of range(board.length)) {
      const choices = candidates(board, index, config);
      if (choices.length === 1) return { index, value: choices[0], reason: "single" };
    }
    for (const unit of units(config)) {
      for (const value of range(config.size).map(i => i + 1)) {
        if (unit.some(index => board[index] === value)) continue;
        const cells = unit.filter(index => candidates(board, index, config).includes(value));
        if (cells.length === 1) return { index: cells[0], value, reason: "only-place" };
      }
    }
    return null;
  };
  const logicSolvable = (board, config) => {
    const working = [...board];
    while (working.includes(0)) {
      const step = nextHint(working, config);
      if (!step) return false;
      working[step.index] = step.value;
    }
    return conflicts(working, config).length === 0;
  };
  const countSolutions = (board, config, limit = 2) => {
    if (board.length !== config.size ** 2 ||
        board.some(value => !Number.isInteger(value) || value < 0 || value > config.size) ||
        conflicts(board, config).length) return 0;
    const working = [...board];
    const search = () => {
      let best = -1, choices = [];
      for (const index of range(working.length)) {
        if (working[index]) continue;
        const next = candidates(working, index, config);
        if (!next.length) return 0;
        if (best < 0 || next.length < choices.length) { best = index; choices = next; }
      }
      if (best < 0) return 1;
      let found = 0;
      for (const value of choices) {
        working[best] = value;
        found += search();
        if (found >= limit) break;
      }
      working[best] = 0;
      return found;
    };
    return search();
  };
  const solvedBoard = (config, random) => {
    const { size, boxRows, boxCols } = config;
    const digits = shuffle(range(size).map(i => i + 1), random);
    const order = boxSize => shuffle(range(size / boxSize), random)
      .flatMap(group => shuffle(range(boxSize), random).map(offset => group * boxSize + offset));
    const rows = order(boxRows), cols = order(boxCols);
    return rows.flatMap(row => cols.map(col => digits[(row * boxCols + Math.floor(row / boxRows) + col) % size]));
  };
  const generate = (level = "starter", random = Math.random) => {
    const config = LEVELS[level];
    if (!config) throw new Error("Unknown sudoku level");
    let best;
    for (let attempt = 0; attempt < 4; attempt++) {
      const solution = solvedBoard(config, random);
      const puzzle = [...solution];
      for (const index of shuffle(range(puzzle.length), random)) {
        if (puzzle.filter(Boolean).length <= config.clues) break;
        const value = puzzle[index];
        puzzle[index] = 0;
        if (countSolutions(puzzle, config) !== 1 || !logicSolvable(puzzle, config)) puzzle[index] = value;
      }
      if (!best || puzzle.filter(Boolean).length < best.puzzle.filter(Boolean).length) best = { puzzle, solution };
      if (puzzle.filter(Boolean).length <= config.clues) break;
    }
    return { ...best, level };
  };
  const recommend = (level, recent) => {
    const order = Object.keys(LEVELS);
    const index = order.indexOf(level);
    const last = recent.filter(item => item.level === level).slice(-2);
    if (index < 0 || last.length < 2) return level;
    if (last.every(item => item.completed && item.hints <= 1 && item.conflicts <= 2))
      return order[Math.min(index + 1, order.length - 1)];
    if (last.every(item => !item.completed || item.hints >= 3))
      return order[Math.max(index - 1, 0)];
    return level;
  };
  return { LEVELS, conflicts, candidates, nextHint, logicSolvable, countSolutions, generate, recommend };
})();
if (typeof module !== "undefined") module.exports = SudokuCore;
