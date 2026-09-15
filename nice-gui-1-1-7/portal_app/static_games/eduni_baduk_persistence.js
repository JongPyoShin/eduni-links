((root) => {
  'use strict';

  const STORAGE_KEY = 'eduni.baduk.v1';
  const SCHEMA_VERSION = 1;
  const VALID_LEVELS = new Set(['beginner', 'intermediate', 'standard']);
  const VALID_MODES = new Set(['ai', 'local']);
  const LEVEL_SIZES = {beginner: 9, intermediate: 13, standard: 19};
  const VALID_STONES = new Set([0, 1, 2]);

  function storageAvailable() {
    try {
      const s = root.localStorage;
      const k = '__eduni_baduk_test__';
      s.setItem(k, '1');
      s.removeItem(k);
      return true;
    } catch (_) {
      return false;
    }
  }

  function safeGetItem() {
    if (!storageAvailable()) return null;
    try {
      return root.localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }

  function safeSetItem(json) {
    if (!storageAvailable()) return false;
    try {
      root.localStorage.setItem(STORAGE_KEY, json);
      return true;
    } catch (_) {
      return false;
    }
  }

  function safeRemoveItem() {
    if (!storageAvailable()) return;
    try {
      root.localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function validateState(state) {
    if (!state || typeof state !== 'object') return false;
    if (state.version !== SCHEMA_VERSION) return false;
    if (!VALID_LEVELS.has(state.levelId)) return false;
    if (typeof state.boardSize !== 'number' || state.boardSize < 9 || state.boardSize > 19) return false;
    if (LEVEL_SIZES[state.levelId] !== state.boardSize) return false;
    if (!VALID_MODES.has(state.mode)) return false;
    if (!Array.isArray(state.board) || state.board.length !== state.boardSize) return false;
    for (const row of state.board) {
      if (!Array.isArray(row) || row.length !== state.boardSize) return false;
      for (const v of row) {
        if (!VALID_STONES.has(v)) return false;
      }
    }
    if (state.currentPlayer !== 1 && state.currentPlayer !== 2) return false;
    if (!state.captures || typeof state.captures !== 'object') return false;
    if (typeof state.captures['1'] !== 'number' || !Number.isFinite(state.captures['1']) || state.captures['1'] < 0) return false;
    if (typeof state.captures['2'] !== 'number' || !Number.isFinite(state.captures['2']) || state.captures['2'] < 0) return false;
    if (typeof state.moveCount !== 'number' || !Number.isFinite(state.moveCount) || state.moveCount < 0) return false;
    if (typeof state.consecutivePasses !== 'number' || !Number.isFinite(state.consecutivePasses) || state.consecutivePasses < 0) return false;
    if (state.lastMove !== null) {
      if (typeof state.lastMove !== 'object') return false;
      if (typeof state.lastMove.row !== 'number' || typeof state.lastMove.col !== 'number') return false;
      if (state.lastMove.row < 0 || state.lastMove.row >= state.boardSize) return false;
      if (state.lastMove.col < 0 || state.lastMove.col >= state.boardSize) return false;
      if (state.lastMove.color !== 1 && state.lastMove.color !== 2) return false;
    }
    return true;
  }

  function serialize(state) {
    return JSON.stringify({
      version: SCHEMA_VERSION,
      savedAt: Date.now(),
      levelId: state.levelId,
      boardSize: state.boardSize,
      mode: state.mode,
      board: state.board,
      currentPlayer: state.currentPlayer,
      previousPosition: state.previousPosition || null,
      captures: {...state.captures},
      moveCount: state.moveCount,
      consecutivePasses: state.consecutivePasses,
      lastMove: state.lastMove ? {...state.lastMove} : null,
      gameOver: !!state.gameOver,
      coachEnabled: !!state.coachEnabled,
    });
  }

  function deserialize(json) {
    if (typeof json !== 'string') return null;
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (_) {
      return null;
    }
    if (!validateState(parsed)) return null;
    return parsed;
  }

  function save(state) {
    const json = serialize(state);
    return safeSetItem(json);
  }

  function load() {
    const json = safeGetItem();
    if (!json) return null;
    return deserialize(json);
  }

  function clear() {
    safeRemoveItem();
  }

  root.EDUNIBadukPersistence = {
    STORAGE_KEY,
    SCHEMA_VERSION,
    serialize,
    deserialize,
    validateState,
    save,
    load,
    clear,
    storageAvailable,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
