import os
import json
import re
import base64
from pathlib import Path

from nicegui import ui

from portal_app.routes import register_pages


GAME_HTML = r'''
<div id="manual-tetris-root">
  <section class="game-shell">
    <header class="top-bar">
      <div>
        <h1>으듀니 테트리스</h1>
        <p id="statusText">가로줄을 완성해 보자</p>
      </div>
      <div class="score-card">
        <span>점수</span>
        <strong id="scoreText">0</strong>
      </div>
    </header>

    <main class="game-layout">
      <div class="board-wrap">
        <div id="board" class="board" aria-label="game board"></div>
      </div>

      <aside class="side-panel">
        <div class="control-row">
          <label for="difficultySelect">난이도</label>
          <select id="difficultySelect">
            <option value="easy">쉬움</option>
            <option value="normal">보통</option>
            <option value="challenge">도전</option>
          </select>
        </div>

        <div class="pieces-row">
          <div class="piece-area current-area">
            <span>지금 블록</span>
            <div id="currentPiece" class="piece-preview" draggable="false" aria-label="current block"></div>
          </div>
          <div class="piece-area next-area">
            <span>다음</span>
            <div id="nextPiece" class="piece-preview small" aria-label="next block"></div>
          </div>
        </div>

        <div class="button-row">
          <button id="rotateToggleButton" type="button" aria-pressed="false">회전 꺼짐</button>
          <button id="rotateButton" type="button">회전</button>
          <button id="soundToggleButton" type="button" aria-pressed="true">효과음 켜짐</button>
          <button id="newGameButton" type="button">새 게임</button>
        </div>
      </aside>
    </main>
  </section>
</div>

<style>
  :root {
    color-scheme: light;
  }

  html,
  body,
  #app,
  .nicegui-content {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  body {
    margin: 0;
    background: #f6f8fb;
    font-family: "Segoe UI", "Malgun Gothic", sans-serif;
    overflow: hidden;
  }

  #manual-tetris-root {
    height: 100dvh;
    padding: 24px;
    box-sizing: border-box;
    color: #172033;
    overflow: hidden;
  }

  .game-shell {
    width: min(1180px, 100%);
    height: 100%;
    margin: 0 auto;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .top-bar {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }

  h1 {
    margin: 0;
    font-size: 34px;
    line-height: 1.15;
    letter-spacing: 0;
  }

  #statusText {
    min-height: 28px;
    margin: 8px 0 0;
    font-size: 19px;
    font-weight: 700;
    color: #475569;
  }

  .score-card {
    min-width: 132px;
    padding: 12px 16px;
    border: 2px solid #d8e0ea;
    border-radius: 8px;
    background: #ffffff;
    text-align: right;
  }

  .score-card span {
    display: block;
    font-size: 15px;
    font-weight: 800;
    color: #64748b;
  }

  .score-card strong {
    display: block;
    font-size: 34px;
    line-height: 1;
    color: #0f172a;
  }

  .game-layout {
    display: grid;
    grid-template-columns: minmax(360px, 1fr) 250px;
    gap: 20px;
    align-items: start;
    min-height: 0;
  }

  .board-wrap {
    display: grid;
    place-items: center;
    min-height: 0;
    padding: 12px;
    border: 2px solid #334155;
    border-radius: 8px;
    background: #334155;
    overflow: hidden;
  }

  .board {
    display: grid;
    gap: 3px;
    width: var(--board-px, auto);
    max-width: 100%;
    height: var(--board-px, min(calc(100vh - 170px), 720px));
    aspect-ratio: var(--board-cols) / var(--board-rows);
    touch-action: none;
    background: #1f2937;
    padding: 3px;
    border-radius: 6px;
  }

  .cell {
    min-width: 0;
    min-height: 0;
    border: 1px solid #475569;
    border-radius: 3px;
    background: #64748b;
    transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease, transform 120ms ease;
  }

  .cell.filled {
    border-color: rgba(15, 23, 42, 0.2);
    background: var(--cell-color);
    box-shadow: inset 0 -4px rgba(15, 23, 42, 0.12);
  }

  .cell.preview {
    border-color: #bfdbfe;
    background: color-mix(in srgb, var(--piece-color) 78%, white);
    box-shadow: 0 0 0 2px rgba(191, 219, 254, 0.62), 0 0 14px rgba(96, 165, 250, 0.42);
  }

  .cell.clear-flash {
    animation: line-clear 520ms ease-out forwards;
    background: #facc15;
    border-color: #ffffff;
    box-shadow: 0 0 18px rgba(250, 204, 21, 0.95);
  }

  @keyframes line-clear {
    0% {
      opacity: 1;
      transform: scale(1);
      filter: brightness(1);
    }
    35% {
      opacity: 1;
      transform: scale(1.08);
      filter: brightness(1.35);
    }
    70% {
      opacity: 0.8;
      transform: scale(0.72) rotate(4deg);
      filter: brightness(1.8);
    }
    100% {
      opacity: 0;
      transform: scale(0.15) rotate(12deg);
      filter: brightness(2);
    }
  }

  .side-panel {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 2px solid #d8e0ea;
    border-radius: 8px;
    background: #ffffff;
    max-height: 100%;
    overflow: hidden;
  }

  .control-row {
    display: grid;
    gap: 6px;
  }

  label,
  .piece-area span {
    font-size: 15px;
    font-weight: 800;
    color: #475569;
  }

  select,
  button {
    min-height: 44px;
    border: 2px solid #cbd5e1;
    border-radius: 8px;
    background: #f8fafc;
    color: #172033;
    font: inherit;
    font-weight: 800;
  }

  select {
    padding: 0 10px;
  }

  button {
    cursor: pointer;
  }

  button:hover,
  select:hover {
    border-color: #2563eb;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .button-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }

  #rotateToggleButton {
    grid-column: 1 / -1;
  }

  #rotateToggleButton[aria-pressed="false"],
  #soundToggleButton[aria-pressed="false"] {
    border-color: #fb7185;
    background: #fff1f2;
  }

  .piece-area {
    display: grid;
    gap: 8px;
  }

  .pieces-row {
    display: grid;
    grid-template-columns: auto auto;
    justify-content: center;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .current-area,
  .next-area {
    justify-items: center;
  }

  .next-area {
    align-self: center;
    gap: 6px;
  }

  .next-area span {
    font-size: 13px;
  }

  .piece-preview {
    --piece-cols: 4;
    --piece-rows: 4;
    display: grid;
    grid-template-columns: repeat(4, 34px);
    grid-template-rows: repeat(4, 34px);
    gap: 4px;
    width: max-content;
    height: max-content;
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    touch-action: none;
    user-select: none;
    transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease, opacity 120ms ease;
  }

  .piece-preview.small {
    grid-template-columns: repeat(4, 24px);
    grid-template-rows: repeat(4, 24px);
    min-height: 0;
  }

  .piece-cell {
    border-radius: 5px;
    background: transparent;
  }

  .piece-cell.filled {
    background: var(--piece-color);
    box-shadow: inset 0 -4px rgba(15, 23, 42, 0.14);
  }

  .piece-preview.dragging {
    box-shadow: none;
    opacity: 0.72;
    transform: scale(0.98);
  }

  .piece-preview.selected {
    box-shadow: none;
    background: transparent;
  }

  .piece-preview.selected .piece-cell.filled {
    outline: 3px solid rgba(37, 99, 235, 0.45);
    outline-offset: 2px;
  }

  .piece-preview.drag-ghost,
  .piece-preview.drag-ghost.selected {
    position: fixed;
    z-index: 20;
    pointer-events: none;
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(1.04);
    border: 0 !important;
    outline: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0;
    min-height: 0;
    grid-template-columns: repeat(4, var(--drag-cell-size, 24px));
    grid-template-rows: repeat(4, var(--drag-cell-size, 24px));
    gap: var(--drag-cell-gap, 3px);
  }

  .piece-preview.drag-ghost .piece-cell {
    box-shadow: none;
  }

  .piece-preview.drag-ghost .piece-cell.filled {
    box-shadow: 0 8px 14px rgba(15, 23, 42, 0.2);
  }

  @media (max-width: 780px) {
    #manual-tetris-root {
      padding: 8px;
    }

    .top-bar {
      align-items: center;
      margin-bottom: 8px;
    }

    h1 {
      font-size: 20px;
    }

    #statusText {
      min-height: 20px;
      margin-top: 2px;
      font-size: 14px;
    }

    .score-card {
      min-width: 74px;
      padding: 7px 9px;
    }

    .score-card span {
      font-size: 12px;
    }

    .score-card strong {
      font-size: 24px;
    }

    .game-layout {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 8px;
      min-height: 0;
    }

    .board-wrap {
      padding: 6px;
    }

    .side-panel {
      grid-template-columns: 1fr 1fr 1.3fr;
      gap: 8px;
      padding: 8px;
      align-items: start;
    }

    .pieces-row {
      grid-column: 1 / -1;
      gap: 14px;
    }

    .piece-preview {
      grid-template-columns: repeat(4, 24px);
      grid-template-rows: repeat(4, 24px);
      min-height: 0;
      padding: 0;
      gap: 3px;
    }

    .piece-preview.small {
      grid-template-columns: repeat(4, 18px);
      grid-template-rows: repeat(4, 18px);
      min-height: 0;
    }

    label,
    .piece-area span {
      font-size: 12px;
    }

    select,
    button {
      min-height: 36px;
      font-size: 13px;
    }
  }

  @media (max-width: 520px) {
    .top-bar {
      display: flex;
    }

    .side-panel {
      grid-template-columns: 1fr 1fr;
    }

    .control-row,
    .pieces-row,
    .button-row {
      grid-column: 1 / -1;
    }

    .button-row {
      grid-template-columns: 1fr 1fr 1fr;
    }

    #rotateToggleButton {
      grid-column: auto;
    }
  }
</style>

<script>
(() => {
  const COLORS = ['#2dd4bf', '#60a5fa', '#f59e0b', '#f472b6', '#a3e635', '#fb7185', '#38bdf8'];

  const TETROMINOES = [
    { name: 'I', shape: [[1, 1, 1, 1]], color: COLORS[0] },
    { name: 'O', shape: [[1, 1], [1, 1]], color: COLORS[1] },
    { name: 'T', shape: [[1, 1, 1], [0, 1, 0]], color: COLORS[2] },
    { name: 'S', shape: [[0, 1, 1], [1, 1, 0]], color: COLORS[3] },
    { name: 'Z', shape: [[1, 1, 0], [0, 1, 1]], color: COLORS[4] },
    { name: 'J', shape: [[1, 0, 0], [1, 1, 1]], color: COLORS[5] },
    { name: 'L', shape: [[0, 0, 1], [1, 1, 1]], color: COLORS[6] },
  ];

  const DIFFICULTIES = {
    easy: { rows: 16, cols: 10, lineScore: 100, placeScore: 5 },
    normal: { rows: 18, cols: 12, lineScore: 120, placeScore: 8 },
    challenge: { rows: 20, cols: 14, lineScore: 150, placeScore: 10 },
  };

  const FINGER_TO_GHOST_X = 28;
  const FINGER_TO_GHOST_Y = 85;

  const boardEl = document.getElementById('board');
  const currentPieceEl = document.getElementById('currentPiece');
  const nextPieceEl = document.getElementById('nextPiece');
  const difficultySelect = document.getElementById('difficultySelect');
  const rotateToggleButton = document.getElementById('rotateToggleButton');
  const rotateButton = document.getElementById('rotateButton');
  const soundToggleButton = document.getElementById('soundToggleButton');
  const newGameButton = document.getElementById('newGameButton');
  const scoreText = document.getElementById('scoreText');
  const statusText = document.getElementById('statusText');

  const state = {
    difficulty: 'easy',
    rows: 8,
    cols: 8,
    board: [],
    current: null,
    next: null,
    score: 0,
    gameOver: false,
    previewCells: [],
    selected: false,
    dragging: false,
    dragGhost: null,
    lastSnap: null,
    suppressClick: false,
    rotationEnabled: false,
    soundEnabled: true,
  };

  let audioContext = null;

  function getAudioContext() {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      audioContext = new AudioCtor();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function playTone(ctx, options) {
    const start = options.start || 0;
    const duration = options.duration || 0.1;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(options.frequency, now + start);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, now + start + duration);
    }

    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(options.volume || 0.08, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now + start);
    oscillator.stop(now + start + duration + 0.03);
  }

  function playSound(kind) {
    if (!state.soundEnabled) return;
    if (kind === 'clear' && speakEffect(kind)) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    if (kind === 'rotate') {
      playTone(ctx, { frequency: 520, endFrequency: 760, duration: 0.09, type: 'triangle', volume: 0.06 });
      playTone(ctx, { start: 0.055, frequency: 760, endFrequency: 980, duration: 0.08, type: 'triangle', volume: 0.045 });
      return;
    }

    if (kind === 'place') {
      playTone(ctx, { frequency: 180, endFrequency: 90, duration: 0.12, type: 'sine', volume: 0.12 });
      playTone(ctx, { start: 0.015, frequency: 420, endFrequency: 260, duration: 0.07, type: 'square', volume: 0.025 });
      return;
    }

    if (kind === 'clear') {
      [660, 880, 1108, 1320].forEach((frequency, index) => {
        playTone(ctx, { start: index * 0.055, frequency, duration: 0.12, type: 'sine', volume: 0.07 });
      });
      playTone(ctx, { start: 0.22, frequency: 440, endFrequency: 1760, duration: 0.18, type: 'triangle', volume: 0.045 });
    }
  }

  function speakEffect(kind) {
    if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) return false;

    const phrases = {
      clear: ['엑설런트!', '좋아!', '최고야!'],
    };
    const list = phrases[kind];
    if (!list) return false;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(list[Math.floor(Math.random() * list.length)]);
    const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
    const koreanVoice = voices.find(voice => voice.lang && voice.lang.toLowerCase().startsWith('ko'));
    if (koreanVoice) {
      utterance.voice = koreanVoice;
    }
    utterance.lang = 'ko-KR';
    utterance.rate = 0.96;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function updateSoundControls() {
    soundToggleButton.setAttribute('aria-pressed', state.soundEnabled ? 'true' : 'false');
    soundToggleButton.textContent = state.soundEnabled ? '효과음 켜짐' : '효과음 꺼짐';
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    updateSoundControls();
    if (state.soundEnabled) {
      playSound('rotate');
    }
  }

  function copyShape(shape) {
    return shape.map(row => row.slice());
  }

  function rotateShape(shape) {
    return shape[0].map((_, col) => shape.map(row => row[col]).reverse());
  }

  function randomizeRotation(piece) {
    const turns = Math.floor(Math.random() * 4);
    for (let i = 0; i < turns; i += 1) {
      piece.shape = rotateShape(piece.shape);
    }
    return piece;
  }

  function pickPiece() {
    const selected = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
    const piece = {
      name: selected.name,
      shape: copyShape(selected.shape),
      color: selected.color,
    };
    return state.rotationEnabled ? piece : randomizeRotation(piece);
  }

  function resetGame() {
    const config = DIFFICULTIES[state.difficulty];
    state.rows = config.rows;
    state.cols = config.cols;
    state.board = Array.from({ length: state.rows }, () => Array.from({ length: state.cols }, () => null));
    state.current = pickPiece();
    state.next = pickPiece();
    state.score = 0;
    state.gameOver = false;
    state.selected = false;
    boardEl.style.setProperty('--board-cols', state.cols);
    boardEl.style.setProperty('--board-rows', state.rows);
    updateRotationControls();
    updateSoundControls();
    statusText.textContent = '가로줄을 완성해 보자';
    renderAll();
    fitBoardToScreen();
  }

  function renderAll() {
    renderBoard();
    renderPiece(currentPieceEl, state.current, false);
    renderPiece(nextPieceEl, state.next, true);
    updateSelectedState();
    scoreText.textContent = state.score.toString();
    requestAnimationFrame(fitBoardToScreen);
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${state.rows}, 1fr)`;

    for (let row = 0; row < state.rows; row += 1) {
      for (let col = 0; col < state.cols; col += 1) {
        const cell = document.createElement('div');
        const color = state.board[row][col];
        cell.className = color ? 'cell filled' : 'cell';
        cell.dataset.row = row.toString();
        cell.dataset.col = col.toString();
        if (color) {
          cell.style.setProperty('--cell-color', color);
        }
        boardEl.appendChild(cell);
      }
    }
  }

  function renderPiece(target, piece, isSmall) {
    target.innerHTML = '';
    if (!piece) return;

    const width = Math.max(...piece.shape.map(row => row.length));
    const height = piece.shape.length;
    const offsetCol = Math.floor((4 - width) / 2);
    const offsetRow = Math.floor((4 - height) / 2);
    target.style.setProperty('--piece-color', piece.color);
    target.classList.toggle('small', isSmall);

    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const shapeRow = row - offsetRow;
        const shapeCol = col - offsetCol;
        const filled =
          shapeRow >= 0 &&
          shapeRow < height &&
          shapeCol >= 0 &&
          shapeCol < width &&
          piece.shape[shapeRow][shapeCol];
        const block = document.createElement('div');
        block.className = filled ? 'piece-cell filled' : 'piece-cell';
        target.appendChild(block);
      }
    }
  }

  function updateSelectedState() {
    currentPieceEl.classList.toggle('selected', state.selected);
  }

  function updateRotationControls() {
    rotateToggleButton.setAttribute('aria-pressed', state.rotationEnabled ? 'true' : 'false');
    rotateToggleButton.textContent = state.rotationEnabled ? '회전 켜짐' : '회전 꺼짐';
    rotateButton.disabled = !state.rotationEnabled;
  }

  function toggleRotationMode() {
    state.rotationEnabled = !state.rotationEnabled;
    updateRotationControls();
    if (!state.rotationEnabled) {
      state.current = randomizeRotation(state.current);
      state.next = randomizeRotation(state.next);
      renderAll();
      statusText.textContent = '블록은 랜덤 방향으로 나와';
    } else {
      statusText.textContent = '회전 버튼을 쓸 수 있어';
    }
  }

  function fitBoardToScreen() {
    const viewport = window.visualViewport || { width: window.innerWidth, height: window.innerHeight };
    const rootStyle = getComputedStyle(document.getElementById('manual-tetris-root'));
    const shellRect = document.querySelector('.game-shell').getBoundingClientRect();
    const topRect = document.querySelector('.top-bar').getBoundingClientRect();
    const sideRect = document.querySelector('.side-panel').getBoundingClientRect();
    const boardWrapStyle = getComputedStyle(document.querySelector('.board-wrap'));
    const boardPaddingX = parseFloat(boardWrapStyle.paddingLeft) + parseFloat(boardWrapStyle.paddingRight);
    const boardPaddingY = parseFloat(boardWrapStyle.paddingTop) + parseFloat(boardWrapStyle.paddingBottom);
    const rootPaddingX = parseFloat(rootStyle.paddingLeft) + parseFloat(rootStyle.paddingRight);
    const rootPaddingY = parseFloat(rootStyle.paddingTop) + parseFloat(rootStyle.paddingBottom);
    const isStacked = viewport.width <= 780;

    const availableWidth = isStacked
      ? viewport.width - rootPaddingX - boardPaddingX
      : shellRect.width - sideRect.width - 20 - boardPaddingX;
    const availableHeight = isStacked
      ? viewport.height - rootPaddingY - topRect.height - sideRect.height - 18 - boardPaddingY
      : viewport.height - rootPaddingY - topRect.height - 18 - boardPaddingY;

    const widthLimitedHeight = availableWidth * (state.rows / state.cols);
    const boardHeight = Math.max(120, Math.min(availableHeight, widthLimitedHeight, 760));
    const boardWidth = boardHeight * (state.cols / state.rows);

    boardEl.style.setProperty('--board-px', `${Math.floor(boardHeight)}px`);
    boardEl.style.width = `${Math.floor(boardWidth)}px`;
  }

  function makeDragImage() {
    const clone = currentPieceEl.cloneNode(true);
    clone.classList.add('drag-ghost');
    clone.classList.remove('selected', 'dragging');
    const rect = boardEl.getBoundingClientRect();
    const cellSize = Math.max(12, Math.floor(Math.min(rect.width / state.cols, rect.height / state.rows) - 3));
    clone.style.setProperty('--drag-cell-size', `${cellSize}px`);
    clone.style.setProperty('--drag-cell-gap', '3px');
    clone.querySelectorAll('.piece-cell:not(.filled)').forEach(cell => {
      cell.style.visibility = 'hidden';
    });
    document.body.appendChild(clone);
    return clone;
  }

  function removeDragGhost() {
    if (state.dragGhost) {
      state.dragGhost.remove();
      state.dragGhost = null;
    }
  }

  function clearPreview() {
    state.previewCells.forEach(cell => cell.classList.remove('preview'));
    state.previewCells = [];
  }

  function showMagneticPreview(startRow, startCol) {
    clearPreview();
    state.current.shape.forEach((shapeRow, row) => {
      shapeRow.forEach((filled, col) => {
        if (!filled) return;
        const cell = cellAt(startRow + row, startCol + col);
        if (!cell) return;
        cell.style.setProperty('--piece-color', state.current.color);
        cell.classList.add('preview');
        state.previewCells.push(cell);
      });
    });
  }

  function pieceSize(piece = state.current) {
    return {
      rows: piece.shape.length,
      cols: Math.max(...piece.shape.map(row => row.length)),
    };
  }

  function snapFromPoint(clientX, clientY) {
    const rect = boardEl.getBoundingClientRect();
    const margin = 90;
    const nearBoard =
      clientX >= rect.left - margin &&
      clientX <= rect.right + margin &&
      clientY >= rect.top - margin &&
      clientY <= rect.bottom + margin;

    if (!nearBoard) return null;

    const cellWidth = rect.width / state.cols;
    const cellHeight = rect.height / state.rows;
    const size = pieceSize();
    const rawCol = Math.round((clientX - rect.left) / cellWidth - size.cols / 2);
    const rawRow = Math.round((clientY - rect.top) / cellHeight - size.rows / 2);
    const maxCol = Math.max(0, state.cols - size.cols);
    const maxRow = Math.max(0, state.rows - size.rows);
    const col = Math.min(maxCol, Math.max(0, rawCol));
    const row = Math.min(maxRow, Math.max(0, rawRow));
    const magnetic = findMagneticPlacement(row, col);

    return {
      row: magnetic ? magnetic.row : row,
      col: magnetic ? magnetic.col : col,
      valid: !!magnetic,
    };
  }

  function findMagneticPlacement(baseRow, baseCol) {
    const candidates = [];
    const radius = 2;

    for (let row = baseRow - radius; row <= baseRow + radius; row += 1) {
      for (let col = baseCol - radius; col <= baseCol + radius; col += 1) {
        if (!canPlace(state.current, row, col)) continue;
        const distance = Math.abs(row - baseRow) + Math.abs(col - baseCol);
        candidates.push({ row, col, distance });
      }
    }

    candidates.sort((a, b) => a.distance - b.distance || a.row - b.row || a.col - b.col);
    return candidates[0] || null;
  }

  function moveDragGhost(event) {
    if (!state.dragGhost) return;
    const ghostX = event.clientX + FINGER_TO_GHOST_X;
    const ghostY = event.clientY - FINGER_TO_GHOST_Y;
    state.dragGhost.style.left = `${ghostX}px`;
    state.dragGhost.style.top = `${ghostY}px`;

    const snap = snapFromPoint(ghostX, ghostY);
    state.lastSnap = snap;
    if (snap && snap.valid) {
      showMagneticPreview(snap.row, snap.col);
    } else {
      clearPreview();
    }
  }

  function startPointerDrag(event) {
    if (state.gameOver || event.button > 0) return;
    event.preventDefault();
    state.dragging = true;
    state.selected = true;
    state.suppressClick = false;
    state.dragGhost = makeDragImage();
    currentPieceEl.classList.add('dragging');
    getAudioContext();
    updateSelectedState();
    currentPieceEl.setPointerCapture(event.pointerId);
    moveDragGhost(event);
  }

  function endPointerDrag(event) {
    if (!state.dragging) return;
    event.preventDefault();
    state.dragging = false;
    state.suppressClick = true;
    currentPieceEl.classList.remove('dragging');
    removeDragGhost();

    const snap = state.lastSnap;
    clearPreview();
    if (snap && snap.valid) {
      placePiece(snap.row, snap.col);
    }
    state.lastSnap = null;
    updateSelectedState();
    setTimeout(() => {
      state.suppressClick = false;
    }, 0);
  }

  function canPlace(piece, startRow, startCol) {
    if (!piece || state.gameOver) return false;
    return canPlaceShape(piece.shape, startRow, startCol);
  }

  function canPlaceShape(shape, startRow, startCol) {
    for (let row = 0; row < shape.length; row += 1) {
      for (let col = 0; col < shape[row].length; col += 1) {
        if (!shape[row][col]) continue;
        const boardRow = startRow + row;
        const boardCol = startCol + col;
        if (boardRow < 0 || boardRow >= state.rows || boardCol < 0 || boardCol >= state.cols) return false;
        if (state.board[boardRow][boardCol]) return false;
      }
    }
    return true;
  }

  function hasAnyMove(piece = state.current) {
    for (let row = 0; row < state.rows; row += 1) {
      for (let col = 0; col < state.cols; col += 1) {
        if (canPlace(piece, row, col)) return true;
      }
    }
    return false;
  }

  function shapeKey(shape) {
    return shape.map(row => row.join('')).join('/');
  }

  function rotatedShapes(shape) {
    const variants = [];
    let current = copyShape(shape);
    for (let i = 0; i < 4; i += 1) {
      const key = shapeKey(current);
      if (!variants.some(item => item.key === key)) {
        variants.push({ key, shape: copyShape(current) });
      }
      current = rotateShape(current);
    }
    return variants.map(item => item.shape);
  }

  function hasAnyStandardPieceMove() {
    for (const template of TETROMINOES) {
      for (const shape of rotatedShapes(template.shape)) {
        for (let row = 0; row < state.rows; row += 1) {
          for (let col = 0; col < state.cols; col += 1) {
            if (canPlaceShape(shape, row, col)) return true;
          }
        }
      }
    }
    return false;
  }

  function preparePlayableCurrentPiece() {
    if (hasAnyMove(state.current)) return true;

    if (hasAnyMove(state.next)) {
      state.current = state.next;
      state.next = pickPiece();
      statusText.textContent = '놓을 수 있는 블럭으로 바꿨어!';
      return true;
    }

    if (!hasAnyStandardPieceMove()) return false;

    for (let i = 0; i < 80; i += 1) {
      const candidate = pickPiece();
      if (hasAnyMove(candidate)) {
        state.current = candidate;
        state.next = pickPiece();
        statusText.textContent = '놓을 수 있는 블럭으로 바꿨어!';
        return true;
      }
    }

    return false;
  }

  function placePiece(startRow, startCol) {
    if (!canPlace(state.current, startRow, startCol)) {
      statusText.textContent = '여기는 놓을 수 없어';
      return;
    }

    state.current.shape.forEach((shapeRow, row) => {
      shapeRow.forEach((filled, col) => {
        if (filled) {
          state.board[startRow + row][startCol + col] = state.current.color;
        }
      });
    });

    playSound('place');
    state.score += DIFFICULTIES[state.difficulty].placeScore;
    renderBoard();
    const completedRows = findCompletedRows();

    if (completedRows.length) {
      window.setTimeout(() => playSound('clear'), 90);
      animateCompletedLines(completedRows, () => {
        removeCompletedLines(completedRows);
        finishTurn(completedRows);
      });
    } else {
      finishTurn([]);
    }
  }

  function findCompletedRows() {
    const completedRows = [];
    state.board.forEach((row, rowIndex) => {
      if (row.every(Boolean)) completedRows.push(rowIndex);
    });
    return completedRows;
  }

  function animateCompletedLines(completedRows, done) {
    completedRows.forEach(rowIndex => {
      for (let col = 0; col < state.cols; col += 1) {
        const cell = cellAt(rowIndex, col);
        if (cell) cell.classList.add('clear-flash');
      }
    });
    statusText.textContent = completedRows.length > 1 ? '와! 여러 줄!' : '한 줄 성공!';
    window.setTimeout(done, 540);
  }

  function removeCompletedLines(completedRows) {
    state.board = state.board.filter((_, rowIndex) => !completedRows.includes(rowIndex));
    while (state.board.length < state.rows) {
      state.board.unshift(Array.from({ length: state.cols }, () => null));
    }
  }

  function finishTurn(completedRows) {
    state.score += completedRows.length * DIFFICULTIES[state.difficulty].lineScore;
    state.current = state.next;
    state.next = pickPiece();
    state.selected = false;
    if (!completedRows.length) {
      statusText.textContent = '좋아!';
    }
    if (!preparePlayableCurrentPiece()) {
      state.gameOver = true;
      statusText.textContent = '게임 끝! 새 게임을 눌러 다시 해보자';
    }
    renderAll();
  }

  function rotateCurrentPiece() {
    if (!state.rotationEnabled || state.gameOver) return;
    state.current.shape = rotateShape(state.current.shape);
    renderPiece(currentPieceEl, state.current, false);
    playSound('rotate');
    statusText.textContent = '빙글!';
    fitBoardToScreen();
  }

  function cellAt(row, col) {
    return boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  }

  currentPieceEl.addEventListener('pointerdown', startPointerDrag);
  currentPieceEl.addEventListener('pointermove', event => {
    if (!state.dragging) return;
    moveDragGhost(event);
  });
  currentPieceEl.addEventListener('pointerup', endPointerDrag);
  currentPieceEl.addEventListener('pointercancel', endPointerDrag);
  document.addEventListener('pointermove', event => {
    if (!state.dragging) return;
    moveDragGhost(event);
  });
  document.addEventListener('pointerup', endPointerDrag);
  document.addEventListener('pointercancel', endPointerDrag);
  document.addEventListener('mouseup', endPointerDrag);
  window.addEventListener('blur', () => {
    state.dragging = false;
    state.lastSnap = null;
    currentPieceEl.classList.remove('dragging');
    removeDragGhost();
    clearPreview();
    updateSelectedState();
  });

  currentPieceEl.addEventListener('click', () => {
    if (state.gameOver) return;
    if (state.suppressClick) return;
    state.selected = !state.selected;
    updateSelectedState();
  });

  boardEl.addEventListener('pointermove', event => {
    if (!state.selected || state.dragging) return;
    const snap = snapFromPoint(event.clientX, event.clientY);
    state.lastSnap = snap;
    if (snap && snap.valid) {
      showMagneticPreview(snap.row, snap.col);
    } else {
      clearPreview();
    }
  });

  boardEl.addEventListener('click', event => {
    const cell = event.target.closest('.cell');
    if (!cell || !state.selected) return;
    clearPreview();
    placePiece(Number(cell.dataset.row), Number(cell.dataset.col));
  });

  rotateButton.addEventListener('click', rotateCurrentPiece);
  rotateToggleButton.addEventListener('click', toggleRotationMode);
  soundToggleButton.addEventListener('click', toggleSound);
  newGameButton.addEventListener('click', resetGame);
  difficultySelect.addEventListener('change', event => {
    state.difficulty = event.target.value;
    resetGame();
  });
  window.addEventListener('resize', fitBoardToScreen);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitBoardToScreen);
  }

  resetGame();
})();
</script>
'''

HANJA_OUTPUT_DIR = Path(os.environ.get('EDUNI_HANJA_OUTPUT_DIR', Path(__file__).parent / 'content' / 'questions' / 'hanja'))
PRAISE_CHARACTER_DIR = Path(__file__).parent / 'assets' / 'praise_chars'
BUBBLE_EXPLANATION_DROP_PHRASES = (
    '뚜렷한 반대 한자보다는 함께 쓰이는 단어를 중심으로 익히면 좋습니다',
    '헷갈릴 만한 같은 음의 7급 한자는 같은 음의 글자가 많지 않습니다',
    '글자 모양만 외우지 말고',
)


def clean_bubble_explanation(explanation: str) -> str:
    sentences = re.split(r'(?<=\.)\s+', explanation.strip())
    useful_sentences = [
        sentence
        for sentence in sentences
        if sentence and not any(phrase in sentence for phrase in BUBBLE_EXPLANATION_DROP_PHRASES)
    ]
    return ' '.join(useful_sentences)


def extract_meaning_sound(explanation: str, fallback: str) -> str:
    match = re.search(r"뜻과 음을 함께 쓰면 '([^']+)'", explanation)
    if match:
        return match.group(1)
    meaning = re.search(r"뜻은 '([^']+)'", explanation)
    sound = re.search(r"음은 '([^']+)'", explanation)
    if meaning and sound:
        return f"{meaning.group(1)} {sound.group(1)}"
    return fallback


def load_praise_character_data_urls() -> list[str]:
    if not PRAISE_CHARACTER_DIR.exists():
        return []
    data_urls: list[str] = []
    for path in sorted(PRAISE_CHARACTER_DIR.glob('char*.png')):
        encoded = base64.b64encode(path.read_bytes()).decode('ascii')
        data_urls.append(f'data:image/png;base64,{encoded}')
    return data_urls


def load_bubble_questions() -> list[dict[str, object]]:
    questions: list[dict[str, object]] = []
    for path in sorted(HANJA_OUTPUT_DIR.glob('hanja_quiz_set_*.json')):
        data = json.loads(path.read_text(encoding='utf-8-sig'))
        for question in data.get('questions', []):
            choices = question.get('choices', [])
            answer = int(question.get('answer', 0))
            if not question.get('target_char') or not isinstance(choices, list) or not 1 <= answer <= len(choices):
                continue
            questions.append(
                {
                    'target': question.get('target_char', ''),
                    'prompt': question.get('question', ''),
                    'choices': choices,
                    'answerIndex': answer - 1,
                    'answerLabel': choices[answer - 1],
                    'meaningSound': extract_meaning_sound(
                        question.get('explanation', ''),
                        choices[answer - 1],
                    ),
                    'explanation': clean_bubble_explanation(question.get('explanation', '')),
                }
            )
    return questions



BUBBLE_HTML_TEMPLATE = r'''
<div id="bubble-root">
  <section class="bubble-shell">
    <header class="bubble-top">
      <div>
        <h1>으듀니 버블팝</h1>
        <p id="bubbleStatus">정답 버블을 톡 터뜨려 보자</p>
      </div>
      <div class="bubble-score">
        <span id="roundText">1 / 10</span>
        <strong id="starText">☆ ☆ ☆</strong>
      </div>
    </header>

    <main class="bubble-stage">
      <section class="prompt-panel">
        <span id="topicText">한자</span>
        <h2 id="questionText"></h2>
      </section>
      <div id="bubbleField" class="bubble-field" aria-label="answer bubbles"></div>
      <section id="feedbackPanel" class="feedback-panel" aria-live="polite"></section>
    </main>

    <footer class="bubble-actions">
      <button id="soundButton" type="button" aria-pressed="true">효과음 켜짐</button>
      <button id="restartButton" type="button">다시 시작</button>
    </footer>

    <div id="resultOverlay" class="result-overlay hidden">
      <div class="result-box">
        <span>완료</span>
        <h2 id="resultTitle"></h2>
        <p id="resultDetail"></p>
        <button id="resultRestartButton" type="button">한 번 더</button>
      </div>
    </div>

    <div id="answerOverlay" class="result-overlay hidden">
      <div class="result-box answer-box">
        <span id="answerPraise">좋아!</span>
        <h2>정답</h2>
        <div id="answerExplanation"></div>
        <button id="answerNextButton" type="button">확인</button>
      </div>
    </div>
  </section>
</div>

<style>
  html, body, #app, .nicegui-content {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  body {
    margin: 0;
    background: #f7fbff;
    font-family: "Segoe UI", "Malgun Gothic", sans-serif;
  }

  #bubble-root {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 16px;
    background:
      radial-gradient(circle at 18% 18%, rgba(125, 211, 252, 0.35), transparent 24%),
      linear-gradient(135deg, #f8fbff 0%, #eef8f6 52%, #fff8ed 100%);
    color: #172033;
  }

  .bubble-shell {
    width: min(980px, 100%);
    height: min(720px, calc(100dvh - 32px));
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 12px;
  }

  .bubble-top,
  .bubble-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  h1, h2, p {
    margin: 0;
  }

  .bubble-top h1 {
    font-size: clamp(26px, 6vw, 44px);
    letter-spacing: 0;
    color: #123047;
  }

  .bubble-top p {
    margin-top: 4px;
    color: #527081;
    font-weight: 800;
    font-size: clamp(14px, 3vw, 18px);
  }

  .bubble-score {
    min-width: 116px;
    display: grid;
    gap: 4px;
    justify-items: end;
    font-weight: 900;
  }

  #roundText {
    color: #0f766e;
    font-size: 18px;
  }

  #starText {
    color: #f59e0b;
    font-size: 24px;
    white-space: nowrap;
  }

  .bubble-stage {
    position: relative;
    min-height: 0;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 12px;
    overflow: hidden;
  }

  .prompt-panel {
    min-height: 118px;
    padding: 18px;
    border: 2px solid #d6e7ee;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.9);
    display: grid;
    align-content: center;
    gap: 8px;
    box-shadow: 0 10px 26px rgba(42, 69, 92, 0.08);
  }

  #topicText {
    width: fit-content;
    padding: 5px 10px;
    border-radius: 999px;
    background: #dff7ef;
    color: #047857;
    font-size: 14px;
    font-weight: 900;
  }

  #questionText {
    font-size: clamp(22px, 5vw, 36px);
    line-height: 1.22;
    color: #13293a;
    letter-spacing: 0;
  }

  .bubble-field {
    position: relative;
    min-height: 260px;
    border: 2px solid #cfe6ef;
    border-radius: 8px;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(225, 247, 255, 0.76), rgba(241, 253, 246, 0.82)),
      repeating-linear-gradient(0deg, transparent 0 42px, rgba(255,255,255,0.45) 42px 44px);
  }

  .answer-bubble {
    position: absolute;
    width: clamp(104px, 21vw, 152px);
    aspect-ratio: 1;
    border: 0;
    border-radius: 999px;
    display: grid;
    place-items: center;
    padding: 14px;
    color: #123047;
    font-size: clamp(17px, 4vw, 24px);
    font-weight: 950;
    line-height: 1.18;
    text-align: center;
    letter-spacing: 0;
    background:
      radial-gradient(circle at 32% 25%, rgba(255,255,255,0.98) 0 18%, transparent 19%),
      radial-gradient(circle at 64% 68%, rgba(255,255,255,0.34), transparent 32%),
      var(--bubble-color, #a7f3d0);
    box-shadow: inset -10px -14px 22px rgba(32, 73, 92, 0.14), 0 14px 28px rgba(20, 58, 82, 0.18);
    touch-action: manipulation;
    transform: translate(var(--x), var(--y));
    animation: floaty var(--speed, 4.2s) ease-in-out infinite alternate;
  }

  .answer-bubble.correct {
    animation: pop 420ms ease-out forwards;
  }

  .answer-bubble.wrong {
    animation: shake 360ms ease-in-out;
  }

  .feedback-panel {
    min-height: 56px;
    padding: 12px 14px;
    border-radius: 8px;
    background: rgba(255,255,255,0.82);
    color: #3d5565;
    font-weight: 850;
    line-height: 1.35;
    overflow: hidden;
  }

  .bubble-actions button,
  .result-box button {
    min-height: 46px;
    border: 0;
    border-radius: 8px;
    padding: 0 18px;
    background: #123047;
    color: #fff;
    font-size: 16px;
    font-weight: 900;
  }

  .bubble-actions button:first-child {
    background: #0f766e;
  }

  .result-overlay {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(12, 28, 42, 0.38);
    padding: 18px;
  }

  .result-overlay.hidden {
    display: none;
  }

  .result-box {
    width: min(420px, 100%);
    padding: 24px;
    border-radius: 8px;
    background: #fff;
    display: grid;
    gap: 12px;
    text-align: center;
    box-shadow: 0 24px 60px rgba(17, 40, 59, 0.22);
  }

  .result-box span {
    color: #0f766e;
    font-weight: 950;
  }

  .result-box h2 {
    font-size: 32px;
  }

  .answer-box {
    text-align: left;
  }

  .answer-box span,
  .answer-box h2 {
    text-align: center;
  }

  #answerExplanation {
    max-height: min(42dvh, 260px);
    overflow: auto;
    color: #3d5565;
    font-weight: 850;
    line-height: 1.5;
  }

  .explanation-lead {
    margin: 0 0 10px;
    color: #123047;
    font-size: 20px;
    font-weight: 950;
    line-height: 1.45;
  }

  .explanation-line {
    margin: 8px 0 0;
    padding: 10px 12px;
    border-radius: 8px;
    background: #f5f9fc;
    font-size: 16px;
  }

  .explanation-focus {
    border: 2px solid #fbbf24;
    background: #fffbeb;
    color: #7c2d12;
    font-size: 18px;
    font-weight: 950;
  }

  @keyframes floaty {
    from { translate: 0 0; }
    to { translate: 0 -14px; }
  }

  @keyframes pop {
    0% { scale: 1; opacity: 1; }
    70% { scale: 1.24; opacity: 0.82; }
    100% { scale: 0.2; opacity: 0; }
  }

  @keyframes shake {
    0%, 100% { translate: 0 0; }
    25% { translate: -8px 0; }
    50% { translate: 8px 0; }
    75% { translate: -5px 0; }
  }

  @media (max-width: 640px) {
    #bubble-root { padding: 10px; }
    .bubble-shell { height: calc(100dvh - 20px); gap: 8px; }
    .bubble-top { align-items: start; }
    .prompt-panel { min-height: 104px; padding: 14px; }
    .bubble-field { min-height: 0; }
    .feedback-panel { min-height: 48px; font-size: 14px; }
    .bubble-actions button { flex: 1; padding: 0 10px; }
  }
</style>

<script>
(() => {
  const questions = __QUESTIONS_JSON__;
  const totalRounds = 10;
  const colors = ['#9ee7ff', '#a7f3d0', '#fde68a', '#fecdd3', '#ddd6fe', '#bfdbfe'];
  const praise = ['좋아!', '그뤠잇!', '엑설런트!', '잘했어!'];
  const field = document.getElementById('bubbleField');
  const questionText = document.getElementById('questionText');
  const roundText = document.getElementById('roundText');
  const starText = document.getElementById('starText');
  const feedbackPanel = document.getElementById('feedbackPanel');
  const soundButton = document.getElementById('soundButton');
  const restartButton = document.getElementById('restartButton');
  const resultOverlay = document.getElementById('resultOverlay');
  const resultTitle = document.getElementById('resultTitle');
  const resultDetail = document.getElementById('resultDetail');
  const resultRestartButton = document.getElementById('resultRestartButton');
  const answerOverlay = document.getElementById('answerOverlay');
  const answerPraise = document.getElementById('answerPraise');
  const answerExplanation = document.getElementById('answerExplanation');
  const answerNextButton = document.getElementById('answerNextButton');

  let deck = [];
  let index = 0;
  let correctCount = 0;
  let locked = false;
  let soundEnabled = true;

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function tone(freq, duration, type = 'sine') {
    if (!soundEnabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  function speak(text) {
    if (!soundEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.98;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  }

  function updateStars() {
    const ratio = correctCount / Math.max(1, index);
    if (index === 0) {
      starText.textContent = '☆ ☆ ☆';
    } else if (ratio >= 0.9) {
      starText.textContent = '★ ★ ★';
    } else if (ratio >= 0.65) {
      starText.textContent = '★ ★ ☆';
    } else {
      starText.textContent = '★ ☆ ☆';
    }
  }

  function bubblePositions(count) {
    const rect = field.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(260, rect.height);
    const size = Math.min(152, Math.max(104, width * 0.21));
    const slots = [
      [0.08, 0.08], [0.55, 0.11], [0.28, 0.43],
      [0.68, 0.48], [0.08, 0.63], [0.47, 0.68],
    ];
    return slots.slice(0, count).map(([x, y]) => ({
      x: Math.round(Math.min(width - size - 12, Math.max(8, width * x))),
      y: Math.round(Math.min(height - size - 12, Math.max(8, height * y))),
    }));
  }

  function renderQuestion() {
    locked = false;
    field.innerHTML = '';
    resultOverlay.classList.add('hidden');
    answerOverlay.classList.add('hidden');
    const question = deck[index];
    roundText.textContent = `${index + 1} / ${totalRounds}`;
    questionText.textContent = question.prompt;
    feedbackPanel.textContent = '정답이라고 생각하는 버블을 터치해봐.';
    updateStars();

    const positions = bubblePositions(question.choices.length);
    question.choices.forEach((choice, choiceIndex) => {
      const button = document.createElement('button');
      const pos = positions[choiceIndex] || positions[0];
      button.type = 'button';
      button.className = 'answer-bubble';
      button.textContent = choice;
      button.style.setProperty('--x', `${pos.x}px`);
      button.style.setProperty('--y', `${pos.y}px`);
      button.style.setProperty('--speed', `${3.6 + choiceIndex * 0.32}s`);
      button.style.setProperty('--bubble-color', colors[choiceIndex % colors.length]);
      button.addEventListener('click', () => chooseAnswer(button, choiceIndex));
      field.appendChild(button);
    });
  }

  function chooseAnswer(button, choiceIndex) {
    if (locked) return;
    const question = deck[index];
    if (choiceIndex === question.answerIndex) {
      locked = true;
      correctCount += 1;
      button.classList.add('correct');
      tone(660, 0.12, 'triangle');
      setTimeout(() => tone(880, 0.14, 'triangle'), 80);
      const say = praise[Math.floor(Math.random() * praise.length)];
      feedbackPanel.textContent = `${say} 해설을 확인해보자.`;
      if ((index + correctCount) % 3 === 0) speak(say);
      window.setTimeout(() => showAnswerExplanation(say, question.explanation), 420);
    } else {
      button.classList.remove('wrong');
      void button.offsetWidth;
      button.classList.add('wrong');
      tone(180, 0.12, 'sine');
      feedbackPanel.textContent = '괜찮아. 다시 골라보자.';
    }
  }

  function showAnswerExplanation(say, explanation) {
    answerPraise.textContent = say;
    renderAnswerExplanation(explanation || '잘했어. 정답을 골랐어.');
    answerOverlay.classList.remove('hidden');
    answerNextButton.focus({ preventScroll: true });
  }

  function renderAnswerExplanation(explanation) {
    answerExplanation.innerHTML = '';
    const sentences = explanation.split(/(?<=\.)\s+/).filter(Boolean);
    const lead = sentences.slice(0, 3).join(' ');
    const details = sentences.slice(3);
    const leadEl = document.createElement('p');
    leadEl.className = 'explanation-lead';
    leadEl.textContent = lead || explanation;
    answerExplanation.appendChild(leadEl);

    details.forEach(sentence => {
      const line = document.createElement('p');
      const shouldFocus = /예시|비슷|반대|짝|같은 음/.test(sentence);
      line.className = shouldFocus ? 'explanation-line explanation-focus' : 'explanation-line';
      line.textContent = sentence;
      answerExplanation.appendChild(line);
    });
  }

  function nextQuestion() {
    answerOverlay.classList.add('hidden');
    index += 1;
    if (index >= totalRounds) {
      showResult();
    } else {
      renderQuestion();
    }
  }

  function showResult() {
    updateStars();
    const stars = correctCount >= 9 ? 3 : correctCount >= 7 ? 2 : 1;
    resultTitle.textContent = `${starText.textContent} ${correctCount}개 맞혔어`;
    resultDetail.textContent = stars === 3 ? '오늘 한자 버블 실력이 아주 좋아.' : '다시 하면 별을 더 모을 수 있어.';
    resultOverlay.classList.remove('hidden');
    if (stars === 3) speak('엑설런트!');
  }

  function startGame() {
    deck = shuffle(questions).slice(0, totalRounds);
    index = 0;
    correctCount = 0;
    renderQuestion();
  }

  soundButton.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundButton.textContent = soundEnabled ? '효과음 켜짐' : '효과음 꺼짐';
    soundButton.setAttribute('aria-pressed', String(soundEnabled));
  });
  restartButton.addEventListener('click', startGame);
  resultRestartButton.addEventListener('click', startGame);
  answerNextButton.addEventListener('click', nextQuestion);
  window.addEventListener('resize', () => {
    if (!resultOverlay.classList.contains('hidden')) return;
    if (!answerOverlay.classList.contains('hidden')) return;
    renderQuestion();
  });

  startGame();
})();
</script>
'''


def bubble_html() -> str:
    questions = load_bubble_questions()
    if not questions:
        questions = [
            {
                'target': '冬',
                'prompt': "한자 '冬'의 뜻과 음으로 알맞은 것은?",
                'choices': ['겨울 동', '여름 하', '봄 춘', '가을 추'],
                'answerIndex': 0,
                'answerLabel': '겨울 동',
                'explanation': "정답은 冬입니다. 冬은 겨울 동입니다.",
            }
        ]
    return BUBBLE_HTML_TEMPLATE.replace('__QUESTIONS_JSON__', json.dumps(questions, ensure_ascii=False))


SHOOTER_HTML_TEMPLATE = r'''
<div id="hanja-shooter-root">
  <section class="shooter-shell">
    <header class="shooter-top">
      <div>
        <h1>으듀니 한자 슈터</h1>
        <p id="shooterStatus">뜻음 버블을 맞는 한자에 쏴 보자</p>
      </div>
      <div class="shooter-score">
        <span>점수</span>
        <strong id="shooterScore">0</strong>
      </div>
    </header>

    <main class="shooter-stage">
      <canvas id="shooterCanvas" aria-label="hanja bubble shooter"></canvas>
      <div id="shooterPraisePop" class="praise-pop hidden" aria-live="polite">
        <img id="praiseCharacterImage" class="praise-character" alt="">
        <strong id="praisePopText">좋아!</strong>
      </div>
    </main>

    <footer class="shooter-actions">
      <button id="shooterSoundButton" type="button" aria-pressed="true">효과음 켜짐</button>
      <button id="shooterRestartButton" type="button">다시 시작</button>
    </footer>

    <div id="shooterAnswerOverlay" class="shooter-overlay hidden">
      <div class="shooter-dialog">
        <span id="shooterPraise">좋아!</span>
        <h2 id="shooterAnswerTitle">정답</h2>
        <div id="shooterExplanation"></div>
        <button id="shooterNextButton" type="button">확인</button>
      </div>
    </div>
  </section>
</div>

<style>
  html, body, #app, .nicegui-content {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  body {
    margin: 0;
    background: #f4f8fb;
    font-family: "Segoe UI", "Malgun Gothic", sans-serif;
  }

  #hanja-shooter-root {
    height: 100dvh;
    display: grid;
    place-items: center;
    padding: 12px;
    box-sizing: border-box;
    color: #172033;
    background:
      linear-gradient(180deg, #edf7ff 0%, #f7fbf8 54%, #fff8ed 100%);
  }

  .shooter-shell {
    width: min(720px, 100%);
    height: min(860px, calc(100dvh - 24px));
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 10px;
  }

  .shooter-top,
  .shooter-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .shooter-top h1,
  .shooter-top p {
    margin: 0;
  }

  .shooter-top h1 {
    font-size: clamp(24px, 6vw, 38px);
    line-height: 1.15;
    letter-spacing: 0;
  }

  .shooter-top p {
    min-height: 24px;
    margin-top: 4px;
    color: #527081;
    font-size: clamp(14px, 3vw, 17px);
    font-weight: 850;
  }

  .shooter-score {
    min-width: 86px;
    padding: 9px 12px;
    border: 2px solid #cfe0e8;
    border-radius: 8px;
    background: rgba(255,255,255,0.9);
    text-align: right;
  }

  .shooter-score span {
    display: block;
    color: #64748b;
    font-size: 13px;
    font-weight: 900;
  }

  .shooter-score strong {
    display: block;
    color: #0f172a;
    font-size: 28px;
    line-height: 1;
  }

  .shooter-stage {
    position: relative;
    min-height: 0;
    border: 2px solid #2d5f73;
    border-radius: 8px;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(32, 89, 116, 0.28), rgba(255,255,255,0.04)),
      repeating-linear-gradient(0deg, rgba(74, 37, 96, 0.16) 0 36px, rgba(255,255,255,0.08) 36px 38px),
      repeating-linear-gradient(90deg, rgba(74, 37, 96, 0.18) 0 36px, rgba(255,255,255,0.08) 36px 38px),
      #2f2d63;
  }

  #shooterCanvas {
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
  }

  .praise-pop {
    position: absolute;
    left: 50%;
    top: 54%;
    transform: translate(-50%, -50%) scale(1);
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 18px 38px rgba(17, 40, 59, 0.28);
    pointer-events: none;
    animation: praise-float 980ms ease-out forwards;
    z-index: 3;
  }

  .praise-pop.hidden {
    display: none;
  }

  .praise-character {
    width: 132px;
    height: 132px;
    object-fit: contain;
    filter: drop-shadow(0 12px 18px rgba(17, 40, 59, 0.28));
  }

  .praise-pop strong {
    color: #123047;
    font-size: 22px;
    font-weight: 950;
    white-space: nowrap;
  }

  .shooter-actions button,
  .shooter-dialog button {
    min-height: 44px;
    border: 0;
    border-radius: 8px;
    padding: 0 16px;
    background: #123047;
    color: #fff;
    font-size: 16px;
    font-weight: 900;
  }

  .shooter-actions button:first-child {
    background: #0f766e;
  }

  .shooter-overlay {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 18px;
    background: rgba(12, 28, 42, 0.44);
  }

  .shooter-overlay.hidden {
    display: none;
  }

  .shooter-dialog {
    width: min(430px, 100%);
    display: grid;
    gap: 12px;
    padding: 24px;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 24px 60px rgba(17, 40, 59, 0.25);
  }

  .shooter-dialog span,
  .shooter-dialog h2 {
    text-align: center;
  }

  .shooter-dialog span {
    color: #0f766e;
    font-weight: 950;
  }

  .shooter-dialog h2 {
    margin: 0;
    color: #123047;
    font-size: 30px;
  }

  #shooterExplanation {
    max-height: min(42dvh, 260px);
    overflow: auto;
  }

  .shooter-lead {
    margin: 0 0 10px;
    color: #123047;
    font-size: 20px;
    font-weight: 950;
    line-height: 1.45;
  }

  .shooter-line {
    margin: 8px 0 0;
    padding: 10px 12px;
    border-radius: 8px;
    background: #f5f9fc;
    color: #3d5565;
    font-size: 16px;
    font-weight: 850;
    line-height: 1.45;
  }

  .shooter-focus {
    border: 2px solid #fbbf24;
    background: #fffbeb;
    color: #7c2d12;
    font-size: 18px;
    font-weight: 950;
  }

  @keyframes praise-float {
    0% {
      opacity: 0;
      transform: translate(-50%, -35%) scale(0.78);
    }
    18% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.04);
    }
    72% {
      opacity: 1;
      transform: translate(-50%, -56%) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -74%) scale(0.92);
    }
  }

  @media (max-width: 560px) {
    #hanja-shooter-root { padding: 8px; }
    .shooter-shell { height: calc(100dvh - 16px); gap: 8px; }
    .shooter-actions button { flex: 1; padding: 0 10px; font-size: 14px; }
    .shooter-score { min-width: 74px; }
  }
</style>

<script>
(() => {
  const sourceQuestions = __QUESTIONS_JSON__.filter(q => q.target && q.answerLabel);
  const praiseCharacterImages = __PRAISE_CHARACTERS_JSON__;
  const canvas = document.getElementById('shooterCanvas');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('shooterStatus');
  const scoreEl = document.getElementById('shooterScore');
  const restartButton = document.getElementById('shooterRestartButton');
  const soundButton = document.getElementById('shooterSoundButton');
  const overlay = document.getElementById('shooterAnswerOverlay');
  const praiseEl = document.getElementById('shooterPraise');
  const titleEl = document.getElementById('shooterAnswerTitle');
  const explanationEl = document.getElementById('shooterExplanation');
  const nextButton = document.getElementById('shooterNextButton');
  const praisePop = document.getElementById('shooterPraisePop');
  const praisePopText = document.getElementById('praisePopText');
  const praiseCharacterImage = document.getElementById('praiseCharacterImage');

  const praise = ['좋아!', '그뤠잇!', '엑설런트!', '잘했어!'];
  const colors = ['#f87171', '#facc15', '#38bdf8', '#4ade80', '#a78bfa', '#fb7185'];
  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    radius: 24,
    baseX: 0,
    baseY: 0,
    aimX: 0,
    aimY: 0,
    aiming: false,
    bubbles: [],
    current: null,
    shot: null,
    score: 0,
    turn: 0,
    waiting: false,
    gameOver: false,
    soundEnabled: true,
    deck: [],
    nextIndex: 0,
  };

  function currentCols() {
    const byWidth = Math.floor((state.width - state.radius * 1.6) / (state.radius * 2.06));
    return Math.max(7, Math.min(14, byWidth));
  }

  function initialRows() {
    const usableHeight = Math.max(0, state.baseY - state.radius * 4.2);
    const rowsByHeight = Math.floor(usableHeight / (state.radius * 1.76));
    return Math.max(2, Math.min(5, rowsByHeight));
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    state.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    state.width = Math.max(320, rect.width);
    state.height = Math.max(480, rect.height);
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    const sizeBasis = Math.min(state.width, state.height * 0.78);
    state.radius = Math.max(18, Math.min(29, sizeBasis / 18));
    state.baseX = state.width / 2;
    state.baseY = state.height - state.radius - 38;
    state.aimX = state.baseX;
    state.aimY = state.baseY - 120;
    layoutBubbles();
  }

  function layoutBubbles() {
    if (!state.bubbles.length) return;
    const cols = currentCols();
    const gapX = state.radius * 2.06;
    const gapY = state.radius * 1.76;
    const top = state.radius + 16;
    state.bubbles.forEach((bubble) => {
      const slot = bubble.slotIndex ?? 0;
      const row = Math.floor(slot / cols);
      const col = slot % cols;
      const rowWidth = (cols - 1) * gapX;
      const startX = (state.width - rowWidth) / 2 + (row % 2 ? state.radius * 0.55 : 0);
      bubble.x = Math.min(state.width - state.radius - 8, Math.max(state.radius + 8, startX + col * gapX));
      bubble.y = top + row * gapY;
      bubble.r = state.radius;
    });
  }

  function makeBubble(question, index) {
    return {
      ...question,
      color: colors[index % colors.length],
      slotIndex: index,
      x: 0,
      y: 0,
      r: state.radius,
    };
  }

  function chooseCurrent() {
    const live = state.bubbles.filter(b => !b.popped);
    if (!live.length) {
      finishGame(true);
      return;
    }
    const frontY = Math.max(...live.map(b => b.y));
    const front = live.filter(b => Math.abs(b.y - frontY) < state.radius * 0.8);
    state.current = front[Math.floor(Math.random() * front.length)];
    statusEl.textContent = `'${state.current.meaningSound || state.current.answerLabel}' 버블을 맞는 한자에 쏘자`;
  }

  function startGame() {
    state.deck = shuffle(sourceQuestions).slice(0, 64);
    state.bubbles = [];
    state.nextIndex = 0;
    state.score = 0;
    state.turn = 0;
    state.shot = null;
    state.waiting = false;
    state.gameOver = false;
    overlay.classList.add('hidden');
    scoreEl.textContent = '0';
    resizeCanvas();
    seedInitialBubbles();
    chooseCurrent();
  }

  function seedInitialBubbles() {
    const cols = currentCols();
    const initialCount = Math.min(cols * initialRows(), state.deck.length);
    state.bubbles = state.deck.slice(0, initialCount).map((question, index) => {
      const bubble = makeBubble(question, index);
      bubble.slotIndex = index;
      return bubble;
    });
    state.nextIndex = initialCount;
    layoutBubbles();
  }

  function drawBubble(bubble, label, isMeaning = false) {
    const parts = isMeaning ? String(label).trim().split(/\s+/) : [];
    const meaningText = isMeaning && parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
    const soundText = isMeaning && parts.length > 1 ? parts[parts.length - 1] : label;
    ctx.save();
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(bubble.x - bubble.r * 0.35, bubble.y - bubble.r * 0.38, bubble.r * 0.1, bubble.x, bubble.y, bubble.r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.22, isMeaning ? '#ecfeff' : '#f8fafc');
    grad.addColorStop(1, bubble.color || '#93c5fd');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isMeaning ? '#0f766e' : 'rgba(15, 23, 42, 0.25)';
    ctx.stroke();
    ctx.fillStyle = '#102033';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = isMeaning ? `950 ${Math.max(18, bubble.r * 0.72)}px "Malgun Gothic", sans-serif` : `950 ${bubble.r * 0.92}px "Malgun Gothic", sans-serif`;
    wrapText(soundText, bubble.x, bubble.y, bubble.r * 1.55, isMeaning ? bubble.r * 0.62 : bubble.r);
    if (meaningText) {
      ctx.font = `900 ${Math.max(13, bubble.r * 0.42)}px "Malgun Gothic", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.strokeText(meaningText, bubble.x, bubble.y + bubble.r + Math.max(14, bubble.r * 0.42));
      ctx.fillText(meaningText, bubble.x, bubble.y + bubble.r + Math.max(14, bubble.r * 0.42));
    }
    ctx.restore();
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const chars = String(text).split('');
    let lines = [''];
    chars.forEach(char => {
      const test = lines[lines.length - 1] + char;
      if (ctx.measureText(test).width > maxWidth && lines[lines.length - 1]) {
        lines.push(char);
      } else {
        lines[lines.length - 1] = test;
      }
    });
    if (lines.length > 2) {
      lines = [String(text).slice(0, 3), String(text).slice(3, 6)];
    }
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => ctx.fillText(line, x, startY + index * lineHeight));
  }

  function traceAimPath() {
    const segments = [];
    let x = state.baseX;
    let y = state.baseY;
    let vx = Math.cos(aimAngle());
    let vy = Math.sin(aimAngle());
    const shotRadius = state.radius * 1.04;
    const maxSegments = 4;

    for (let segment = 0; segment < maxSegments; segment += 1) {
      let nearestT = Infinity;
      let endX = x;
      let endY = y;
      let hitWall = false;

      if (vx < 0) {
        const t = (shotRadius - x) / vx;
        if (t > 0 && t < nearestT) {
          nearestT = t;
          endX = shotRadius;
          endY = y + vy * t;
          hitWall = true;
        }
      } else if (vx > 0) {
        const t = (state.width - shotRadius - x) / vx;
        if (t > 0 && t < nearestT) {
          nearestT = t;
          endX = state.width - shotRadius;
          endY = y + vy * t;
          hitWall = true;
        }
      }

      if (vy < 0) {
        const t = (shotRadius - y) / vy;
        if (t > 0 && t < nearestT) {
          nearestT = t;
          endX = x + vx * t;
          endY = shotRadius;
          hitWall = false;
        }
      }

      state.bubbles.filter(b => !b.popped).forEach((bubble) => {
        const hitRadius = shotRadius + bubble.r * 0.82;
        const dx = x - bubble.x;
        const dy = y - bubble.y;
        const b = 2 * (vx * dx + vy * dy);
        const c = dx * dx + dy * dy - hitRadius * hitRadius;
        const discriminant = b * b - 4 * c;
        if (discriminant < 0) return;
        const t = (-b - Math.sqrt(discriminant)) / 2;
        if (t > 0 && t < nearestT) {
          nearestT = t;
          endX = x + vx * t;
          endY = y + vy * t;
          hitWall = false;
        }
      });

      if (!Number.isFinite(nearestT)) break;
      segments.push({ x1: x, y1: y, x2: endX, y2: endY });
      if (!hitWall) break;
      x = endX;
      y = endY;
      vx *= -1;
    }

    return segments;
  }

  function drawAim() {
    if (!state.current || state.waiting || state.shot || state.gameOver) return;
    const segments = traceAimPath();
    if (!segments.length) return;
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.84)';
    ctx.beginPath();
    segments.forEach((segment) => {
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
    });
    ctx.stroke();
    ctx.restore();
  }

  function drawCannon() {
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(state.baseX, state.baseY + state.radius * 0.26, state.radius * 1.35, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    if (state.current && !state.shot && !state.gameOver) {
      drawBubble({ x: state.baseX, y: state.baseY, r: state.radius * 1.18, color: '#a7f3d0' }, state.current.meaningSound || state.current.answerLabel, true);
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, state.width, state.height);
    state.bubbles.forEach(bubble => drawBubble(bubble, bubble.target));
    drawAim();
    if (state.shot) drawBubble(state.shot, state.shot.meaningSound || state.shot.answerLabel, true);
    drawCannon();
  }

  function aimAngle() {
    let angle = Math.atan2(state.aimY - state.baseY, state.aimX - state.baseX);
    const min = -Math.PI + 0.22;
    const max = -0.22;
    if (angle > max) angle = max;
    if (angle < min) angle = min;
    return angle;
  }

  function pointerPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startAim(event) {
    if (state.waiting || state.shot || state.gameOver) return;
    state.aiming = true;
    const point = pointerPoint(event);
    state.aimX = point.x;
    state.aimY = point.y;
  }

  function moveAim(event) {
    if (!state.aiming || state.waiting || state.shot || state.gameOver) return;
    const point = pointerPoint(event);
    state.aimX = point.x;
    state.aimY = point.y;
  }

  function releaseAim() {
    if (!state.aiming || state.waiting || state.shot || state.gameOver || !state.current) return;
    state.aiming = false;
    const angle = aimAngle();
    const speed = Math.max(8, Math.min(11, state.height / 65));
    state.shot = {
      ...state.current,
      x: state.baseX,
      y: state.baseY,
      r: state.radius * 1.04,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: '#a7f3d0',
    };
    playTone(520, 0.08, 'triangle');
  }

  function tick() {
    if (state.shot && !state.waiting) {
      state.shot.x += state.shot.vx;
      state.shot.y += state.shot.vy;
      if (state.shot.x < state.shot.r || state.shot.x > state.width - state.shot.r) {
        state.shot.vx *= -1;
        state.shot.x = Math.max(state.shot.r, Math.min(state.width - state.shot.r, state.shot.x));
        playTone(260, 0.04, 'sine');
      }
      if (state.shot.y < state.shot.r) {
        missShot();
      } else {
        const hit = state.bubbles.find(b => distance(state.shot, b) < state.shot.r + b.r * 0.82);
        if (hit) handleHit(hit);
      }
    }
    draw();
    requestAnimationFrame(tick);
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function handleHit(hit) {
    if (!state.shot) return;
    if (hit.target === state.shot.target) {
      state.waiting = true;
      state.score += 100;
      scoreEl.textContent = String(state.score);
      state.bubbles = state.bubbles.filter(b => b !== hit);
      const say = praise[Math.floor(Math.random() * praise.length)];
      statusEl.textContent = `${say} 정답 버블을 터뜨렸어`;
      playTone(780, 0.11, 'triangle');
      setTimeout(() => playTone(980, 0.12, 'triangle'), 80);
      setTimeout(() => showPraise(hit, say), 220);
    } else {
      statusEl.textContent = '아까워. 맞는 한자 버블을 다시 찾아보자';
      missShot();
    }
  }

  function missShot() {
    playTone(180, 0.1, 'sine');
    state.shot = null;
    afterTurn();
  }

  function afterTurn() {
    addBackRowBubble();
    layoutBubbles();
    if (state.bubbles.some(b => b.y + b.r > state.baseY - state.radius * 2.2)) {
      finishGame(false);
      return;
    }
    chooseCurrent();
  }

  function addBackRowBubble() {
    if (state.nextIndex >= state.deck.length) return;
    const cols = currentCols();
    const occupied = new Set(state.bubbles.map(b => b.slotIndex));
    const topSlots = Array.from({ length: cols }, (_, index) => index).filter(slot => !occupied.has(slot));
    if (!topSlots.length || state.nextIndex >= state.deck.length) return;
    const slotIndex = topSlots[0];
    const bubble = makeBubble(state.deck[state.nextIndex], slotIndex);
    bubble.slotIndex = slotIndex;
    state.nextIndex += 1;
    state.bubbles.push(bubble);
    const topFull = Array.from({ length: cols }, (_, index) => index).every(slot =>
      state.bubbles.some(b => b.slotIndex === slot)
    );
    if (topFull) {
      state.bubbles.forEach(b => {
        b.slotIndex += cols;
      });
      state.turn += 1;
    }
    layoutBubbles();
  }

  function showPraise(question, say) {
    state.shot = null;
    if (praiseCharacterImages.length) {
      praiseCharacterImage.src = praiseCharacterImages[Math.floor(Math.random() * praiseCharacterImages.length)];
    }
    praisePopText.textContent = `${say} ${question.target}!`;
    praisePop.classList.remove('hidden');
    void praisePop.offsetWidth;
    praisePop.style.animation = 'none';
    void praisePop.offsetWidth;
    praisePop.style.animation = '';
    window.setTimeout(() => {
      praisePop.classList.add('hidden');
      state.waiting = false;
      afterTurn();
    }, 980);
  }

  function renderExplanation(explanation) {
    explanationEl.innerHTML = '';
    const sentences = explanation.split(/(?<=\.)\s+/).filter(Boolean);
    const lead = sentences.slice(0, 3).join(' ');
    const details = sentences.slice(3);
    const leadEl = document.createElement('p');
    leadEl.className = 'shooter-lead';
    leadEl.textContent = lead || explanation;
    explanationEl.appendChild(leadEl);
    details.forEach(sentence => {
      const line = document.createElement('p');
      line.className = /예시|비슷|반대|짝|같은 음/.test(sentence) ? 'shooter-line shooter-focus' : 'shooter-line';
      line.textContent = sentence;
      explanationEl.appendChild(line);
    });
  }

  function finishGame(clear) {
    state.gameOver = true;
    state.waiting = true;
    praiseEl.textContent = clear ? '성공!' : '게임 끝';
    titleEl.textContent = clear ? '모든 버블을 터뜨렸어' : '다시 도전해보자';
    renderExplanation(clear ? '오늘 한자 슈터 실력이 아주 좋아.' : '버블이 아래까지 내려왔어. 다시 시작을 눌러 한 번 더 해보자.');
    nextButton.style.display = '';
    overlay.classList.remove('hidden');
    nextButton.textContent = '다시 시작';
  }

  function continueGame() {
    overlay.classList.add('hidden');
    if (state.gameOver) {
      nextButton.textContent = '확인';
      startGame();
      return;
    }
    state.waiting = false;
    afterTurn();
  }

  function playTone(freq, duration, type) {
    if (!state.soundEnabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration + 0.02);
  }

  canvas.addEventListener('pointerdown', event => {
    canvas.setPointerCapture(event.pointerId);
    startAim(event);
  });
  canvas.addEventListener('pointermove', moveAim);
  canvas.addEventListener('pointerup', releaseAim);
  canvas.addEventListener('pointercancel', () => { state.aiming = false; });
  restartButton.addEventListener('click', startGame);
  nextButton.addEventListener('click', continueGame);
  soundButton.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    soundButton.textContent = state.soundEnabled ? '효과음 켜짐' : '효과음 꺼짐';
    soundButton.setAttribute('aria-pressed', String(state.soundEnabled));
  });
  window.addEventListener('resize', resizeCanvas);

  startGame();
  tick();
})();
</script>
'''


def shooter_html() -> str:
    questions = load_bubble_questions()
    if not questions:
        questions = [
            {
                'target': '冬',
                'answerLabel': '겨울 동',
                'meaningSound': '겨울 동',
                'explanation': '정답은 冬입니다. 冬은 겨울 동입니다. 예시 단어는 冬至(동지), 冬眠(동면)입니다.',
            }
        ]
    return (
        SHOOTER_HTML_TEMPLATE
        .replace('__QUESTIONS_JSON__', json.dumps(questions, ensure_ascii=False))
        .replace('__PRAISE_CHARACTERS_JSON__', json.dumps(load_praise_character_data_urls()))
    )


@ui.page('/')
def index() -> None:
    ui.add_head_html(
        '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">'
    )
    ui.add_body_html(GAME_HTML)


@ui.page('/bubble')
def bubble() -> None:
    ui.add_head_html(
        '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">'
    )
    ui.add_body_html(bubble_html())


@ui.page('/bubble-shooter')
def bubble_shooter() -> None:
    ui.add_head_html(
        '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">'
    )
    ui.add_body_html(shooter_html())


register_pages()


if __name__ in {'__main__', '__mp_main__'}:
    port = int(os.environ.get('PORT', '8080'))
    host = os.environ.get('EDUNI_HOST', '127.0.0.1')
    ui.run(title='으듀니 테트리스', host=host, port=port, reload=False)
