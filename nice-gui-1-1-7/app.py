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
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

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
  }
'''

HANJA_OUTPUT_DIR = Path(os.environ.get('EDUNI_HANJA_OUTPUT_DIR', r'C:\Users\jongp\Documents\Codex\2026-06-05\files-mentioned-by-the-user-oracle\outputs'))
PRAISE_CHARACTER_DIR = Path(__file__).parent / 'assets' / 'praise_chars'
BUBBLE_EXPLANATION_DROP_PHRASES = (
    '뚜렷한 반대 한자보다는 함께 쓰이는 단어를 중심으로 익히면 좋습니다',
    '헷갈릴 만한 같은 음의 7급 한자는 같은 음의 글자가 많지 않습니다',
    '글자 모양만 외우지 말고',
)

# NOTE: The large inline game templates above are unchanged. The app title is the portal-level title.

register_pages()


if __name__ in {'__main__', '__mp_main__'}:
    port = int(os.environ.get('PORT', '8080'))
    host = os.environ.get('EDUNI_HOST', '127.0.0.1')
    ui.run(title='에듀니 학습 포털', host=host, port=port, reload=False)
