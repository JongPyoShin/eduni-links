(() => {
  'use strict';

  const engine = window.EDUNIBadukEngine;
  const boardCanvas = document.getElementById('board');
  const boardWrap = document.querySelector('.board-wrap');
  const sideCard = document.querySelector('.side-card');
  if (!engine || !boardCanvas || !boardWrap || !sideCard) return;

  const logic = window.EDUNIBadukCoachLogic?.create(engine);
  if (!logic) return;
  const {analyzeMove, strongestAiReason} = logic;

  let enabled = true;
  let preview = null;
  let overlayCanvas = null;
  let overlayCtx = null;
  let coachCard = null;
  let miniCanvas = null;
  let toggleButton = null;

  const STYLE = `
    .board-wrap { position: relative; }
    .baduk-coach-overlay { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:3; }
    .baduk-coach-toggle-wrap { grid-column:1 / -1; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 11px; border:1px solid #e5d5ac; border-radius:11px; background:#fff8e7; }
    .baduk-coach-toggle-wrap span { font-size:13px; font-weight:900; color:#60431e; }
    .baduk-coach-toggle { min-height:40px; border:1px solid #caa15f; border-radius:999px; background:#2f5f45; color:white; padding:0 13px; font-weight:900; cursor:pointer; }
    .baduk-coach-toggle[aria-pressed="false"] { background:#fff; color:#60431e; }
    .baduk-coach-card { grid-column:1 / -1; display:none; gap:9px; padding:12px; border-radius:13px; border:2px solid #ebca75; background:#fffdf7; box-shadow:0 10px 24px rgba(86,61,18,.12); }
    .baduk-coach-card.active { display:grid; }
    .baduk-coach-head { display:flex; align-items:flex-start; gap:8px; }
    .baduk-coach-icon { font-size:22px; line-height:1; }
    .baduk-coach-title { margin:0; font-size:16px; font-weight:950; color:#3f2b12; }
    .baduk-coach-summary { margin:3px 0 0; font-size:13px; line-height:1.45; font-weight:800; color:#5a4936; }
    .baduk-coach-badges { display:flex; flex-wrap:wrap; gap:6px; }
    .baduk-coach-badge { padding:4px 8px; border-radius:999px; background:#f2f5f3; border:1px solid #dce6df; color:#355446; font-size:11px; font-weight:900; }
    .baduk-coach-mini { width:100%; max-width:300px; aspect-ratio:5/4; display:block; margin:0 auto; border-radius:9px; background:#d7a85d; border:1px solid #b98542; }
    .baduk-coach-legend { display:flex; justify-content:center; flex-wrap:wrap; gap:8px; color:#6b6256; font-size:10px; font-weight:800; }
    .baduk-coach-actions { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
    .baduk-coach-actions button { min-height:42px; border-radius:10px; border:1px solid #d7dbe2; background:white; color:#24322a; font-weight:900; cursor:pointer; }
    .baduk-coach-actions .confirm { background:#2f5f45; color:white; border-color:#2f5f45; }
    .baduk-coach-actions .confirm:disabled { opacity:.45; cursor:not-allowed; }
    @media (max-width:760px) {
      .baduk-coach-toggle-wrap, .baduk-coach-card { grid-column:1 / -1; }
    }
    @media (max-width:430px) {
      .baduk-coach-card { padding:10px; }
      .baduk-coach-summary { font-size:12px; }
      .baduk-coach-actions { grid-template-columns:1fr; }
    }
  `;

  function injectUi() {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    overlayCanvas = document.createElement('canvas');
    overlayCanvas.className = 'baduk-coach-overlay';
    overlayCanvas.setAttribute('aria-hidden', 'true');
    boardWrap.appendChild(overlayCanvas);
    overlayCtx = overlayCanvas.getContext('2d');

    const toggleWrap = document.createElement('div');
    toggleWrap.className = 'baduk-coach-toggle-wrap';
    toggleWrap.innerHTML = '<span>초보자 코치</span>';
    toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'baduk-coach-toggle';
    toggleButton.setAttribute('aria-pressed', 'true');
    toggleButton.textContent = '코치 ON';
    toggleWrap.appendChild(toggleButton);

    coachCard = document.createElement('section');
    coachCard.className = 'baduk-coach-card';
    coachCard.setAttribute('aria-live', 'polite');
    coachCard.setAttribute('aria-label', '바둑 초보자 코치 설명');

    const buttonGrid = sideCard.querySelector('.button-grid');
    sideCard.insertBefore(toggleWrap, buttonGrid);
    sideCard.insertBefore(coachCard, buttonGrid);

    toggleButton.addEventListener('click', () => {
      enabled = !enabled;
      toggleButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      toggleButton.textContent = enabled ? '코치 ON' : '코치 OFF';
      if (!enabled) clearCoach();
    });

    document.getElementById('newGame')?.addEventListener('click', clearCoach);
    document.getElementById('pass')?.addEventListener('click', clearCoach);
    document.getElementById('resign')?.addEventListener('click', clearCoach);
    document.getElementById('mode')?.addEventListener('change', clearCoach);
    window.addEventListener('resize', () => requestAnimationFrame(() => {
      resizeOverlay();
      drawOverlay();
    }));
    resizeOverlay();
  }

  function resizeOverlay() {
    if (!overlayCanvas || !overlayCtx) return;
    const rect = boardCanvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    overlayCanvas.width = Math.max(1, Math.round(rect.width * ratio));
    overlayCanvas.height = Math.max(1, Math.round(rect.height * ratio));
    overlayCanvas.style.width = `${rect.width}px`;
    overlayCanvas.style.height = `${rect.height}px`;
    overlayCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function boardMetrics() {
    const size = boardCanvas.getBoundingClientRect().width;
    const pad = Math.max(22, size * 0.075);
    const step = (size - pad * 2) / (engine.SIZE - 1);
    return {size, pad, step};
  }

  function drawStone(ctx, x, y, radius, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color === engine.BLACK ? '#111' : '#f8f8f8';
    ctx.strokeStyle = color === engine.BLACK ? '#000' : '#8e8e8e';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawX(ctx, x, y, radius, color = '#d22f27') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, radius * .22);
    ctx.beginPath();
    ctx.moveTo(x - radius, y - radius); ctx.lineTo(x + radius, y + radius);
    ctx.moveTo(x + radius, y - radius); ctx.lineTo(x - radius, y + radius);
    ctx.stroke();
    ctx.restore();
  }

  function clearOverlay() {
    if (!overlayCtx || !overlayCanvas) return;
    const rect = boardCanvas.getBoundingClientRect();
    overlayCtx.clearRect(0, 0, rect.width, rect.height);
  }

  function drawOverlay() {
    clearOverlay();
    if (!preview || !overlayCtx) return;
    const {pad, step} = boardMetrics();
    const analysis = preview.analysis;
    const x = pad + analysis.col * step;
    const y = pad + analysis.row * step;
    const radius = step * .42;

    if (analysis.reasonCode === 'ko') {
      overlayCtx.strokeStyle = '#7e3fb2';
      overlayCtx.lineWidth = 4;
      overlayCtx.beginPath(); overlayCtx.arc(x, y, radius * .8, 0, Math.PI * 2); overlayCtx.stroke();
      drawX(overlayCtx, x, y, radius * .55, '#7e3fb2');
    } else if (preview.kind === 'ai' || preview.kind === 'local') {
      overlayCtx.strokeStyle = '#ffd34e';
      overlayCtx.lineWidth = 4;
      overlayCtx.beginPath(); overlayCtx.arc(x, y, radius * 1.05, 0, Math.PI * 2); overlayCtx.stroke();
    } else if (analysis.beforeBoard[analysis.row]?.[analysis.col] === engine.EMPTY) {
      drawStone(overlayCtx, x, y, radius, analysis.color, .45);
      overlayCtx.strokeStyle = '#ffd34e';
      overlayCtx.lineWidth = 4;
      overlayCtx.beginPath(); overlayCtx.arc(x, y, radius * 1.05, 0, Math.PI * 2); overlayCtx.stroke();
    }

    overlayCtx.fillStyle = '#1aa260';
    for (const [r, c] of analysis.libertyPoints || []) {
      overlayCtx.beginPath();
      overlayCtx.arc(pad + c * step, pad + r * step, Math.max(4, step * .09), 0, Math.PI * 2);
      overlayCtx.fill();
    }

    overlayCtx.strokeStyle = '#ef7f1a';
    overlayCtx.lineWidth = 3;
    for (const [r, c] of analysis.opponentAtariStones || []) {
      overlayCtx.beginPath();
      overlayCtx.arc(pad + c * step, pad + r * step, radius * .78, 0, Math.PI * 2);
      overlayCtx.stroke();
    }

    for (const [r, c] of analysis.capturedStones || []) {
      drawX(overlayCtx, pad + c * step, pad + r * step, radius * .55);
    }
  }

  function drawMiniBoard(analysis) {
    if (!miniCanvas) return;
    const cssWidth = Math.max(230, Math.min(300, miniCanvas.clientWidth || 280));
    const cssHeight = Math.round(cssWidth * .72);
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    miniCanvas.width = Math.round(cssWidth * ratio);
    miniCanvas.height = Math.round(cssHeight * ratio);
    const ctx = miniCanvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = '#d7a85d';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    const half = 2;
    let minR = Math.max(0, analysis.row - half);
    let minC = Math.max(0, analysis.col - half);
    let maxR = Math.min(engine.SIZE - 1, minR + 4);
    let maxC = Math.min(engine.SIZE - 1, minC + 4);
    minR = Math.max(0, maxR - 4);
    minC = Math.max(0, maxC - 4);
    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;
    const pad = 22;
    const stepX = (cssWidth - pad * 2) / Math.max(1, cols - 1);
    const stepY = (cssHeight - pad * 2) / Math.max(1, rows - 1);
    const radius = Math.min(stepX, stepY) * .38;

    ctx.strokeStyle = '#4b3218';
    ctx.lineWidth = 1;
    for (let r = 0; r < rows; r++) {
      const y = pad + r * stepY;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(cssWidth - pad, y); ctx.stroke();
    }
    for (let c = 0; c < cols; c++) {
      const x = pad + c * stepX;
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, cssHeight - pad); ctx.stroke();
    }

    const miniBoard = analysis.legal ? analysis.afterBoard : analysis.beforeBoard;
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const value = miniBoard[r][c];
        if (!value) continue;
        drawStone(ctx, pad + (c - minC) * stepX, pad + (r - minR) * stepY, radius, value, 1);
      }
    }

    const px = pad + (analysis.col - minC) * stepX;
    const py = pad + (analysis.row - minR) * stepY;
    if (!analysis.legal && analysis.beforeBoard[analysis.row]?.[analysis.col] === engine.EMPTY) {
      drawStone(ctx, px, py, radius, analysis.color, .35);
    }
    ctx.strokeStyle = '#ffd34e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, radius * 1.15, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = '#1aa260';
    for (const [r, c] of analysis.libertyPoints || []) {
      if (r < minR || r > maxR || c < minC || c > maxC) continue;
      ctx.beginPath(); ctx.arc(pad + (c - minC) * stepX, pad + (r - minR) * stepY, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#ef7f1a';
    ctx.lineWidth = 2.5;
    for (const [r, c] of analysis.opponentAtariStones || []) {
      if (r < minR || r > maxR || c < minC || c > maxC) continue;
      ctx.beginPath(); ctx.arc(pad + (c - minC) * stepX, pad + (r - minR) * stepY, radius * .82, 0, Math.PI * 2); ctx.stroke();
    }
    for (const [r, c] of analysis.capturedStones || []) {
      if (r < minR || r > maxR || c < minC || c > maxC) continue;
      drawX(ctx, pad + (c - minC) * stepX, pad + (r - minR) * stepY, radius * .55);
    }
    if (analysis.reasonCode === 'ko') drawX(ctx, px, py, radius * .58, '#7e3fb2');
  }

  function renderCard({icon, title, summary, badges = [], analysis = null, confirm = false, closeText = '다른 곳 보기', onConfirm = null}) {
    coachCard.innerHTML = '';
    coachCard.classList.add('active');

    const head = document.createElement('div');
    head.className = 'baduk-coach-head';
    head.innerHTML = `<div class="baduk-coach-icon">${icon}</div><div><h2 class="baduk-coach-title"></h2><p class="baduk-coach-summary"></p></div>`;
    head.querySelector('.baduk-coach-title').textContent = title;
    head.querySelector('.baduk-coach-summary').textContent = summary;
    coachCard.appendChild(head);

    if (badges.length) {
      const wrap = document.createElement('div');
      wrap.className = 'baduk-coach-badges';
      badges.slice(0, 2).forEach(text => {
        const badge = document.createElement('span');
        badge.className = 'baduk-coach-badge';
        badge.textContent = text;
        wrap.appendChild(badge);
      });
      coachCard.appendChild(wrap);
    }

    if (analysis) {
      miniCanvas = document.createElement('canvas');
      miniCanvas.className = 'baduk-coach-mini';
      miniCanvas.setAttribute('aria-label', '선택한 자리 주변 미니 바둑판');
      coachCard.appendChild(miniCanvas);
      const legend = document.createElement('div');
      legend.className = 'baduk-coach-legend';
      legend.innerHTML = '<span>🟢 활로</span><span>🔴 잡힘/위험</span><span>🟡 선택한 자리</span>';
      coachCard.appendChild(legend);
      requestAnimationFrame(() => drawMiniBoard(analysis));
    }

    const actions = document.createElement('div');
    actions.className = 'baduk-coach-actions';
    if (confirm) {
      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = 'confirm';
      confirmButton.textContent = '여기에 두기';
      confirmButton.addEventListener('click', () => onConfirm?.());
      actions.appendChild(confirmButton);
    }
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = closeText;
    closeButton.addEventListener('click', clearCoach);
    actions.appendChild(closeButton);
    coachCard.appendChild(actions);
  }

  function previewMove(point, state, runtimeEngine) {
    if (!enabled || !state || state.gameOver || state.aiThinking) return;
    const analysis = analyzeMove(state.board, point.row, point.col, state.currentPlayer, state.previousPosition);
    preview = {analysis};
    resizeOverlay();
    drawOverlay();
    renderCard({
      icon: analysis.legal ? (analysis.selfAtariRisk ? '⚠️' : '✅') : '🚫',
      title: analysis.title,
      summary: analysis.summary,
      badges: analysis.badges,
      analysis,
      confirm: analysis.legal,
      onConfirm: () => {
        const liveState = runtimeEngine.getState?.();
        if (!liveState || liveState.gameOver || liveState.aiThinking) return clearCoach();
        const fresh = analyzeMove(liveState.board, analysis.row, analysis.col, liveState.currentPlayer, liveState.previousPosition);
        if (!fresh.legal) {
          preview = {analysis: fresh};
          drawOverlay();
          renderCard({icon:'🚫', title:fresh.title, summary:fresh.summary, badges:fresh.badges, analysis:fresh});
          return;
        }
        clearCoach();
        runtimeEngine.playHumanMove?.(analysis.row, analysis.col);
      },
    });
  }

  function showAiMove(move, payload) {
    if (!enabled || !move || !payload?.beforeBoard) return;
    const analysis = analyzeMove(payload.beforeBoard, move.row, move.col, engine.WHITE, payload.koState);
    preview = {analysis, kind: 'ai'};
    resizeOverlay();
    drawOverlay();
    const components = move.aiAnalysis?.components || {};
    const badges = [];
    if ((components.capture || 0) > 0) badges.push(`포획 +${components.capture.toFixed(1)}`);
    else if ((components.atari || 0) > 0) badges.push(`단수 압박 +${components.atari.toFixed(1)}`);
    if ((components.liberties || 0) > 0) badges.push(`활로 평가 +${components.liberties.toFixed(1)}`);
    renderCard({
      icon: '💡',
      title: 'AI는 왜 여기에 뒀을까?',
      summary: strongestAiReason(move),
      badges,
      analysis,
      confirm: false,
      closeText: '알겠어요',
    });
  }

  function afterHumanMove(payload) {
    if (!enabled || payload?.mode !== 'local' || !payload.beforeBoard) return;
    const analysis = analyzeMove(payload.beforeBoard, payload.row, payload.col, payload.color, payload.koState);
    preview = {analysis, kind: 'local'};
    resizeOverlay();
    drawOverlay();
    let summary = analysis.summary;
    if (!analysis.captured && !analysis.opponentAtariGroups.length && !analysis.rescuedOwnGroups && analysis.connectedOwnGroups < 2) {
      summary = `이 수로 잡힌 돌은 없어요. 놓은 돌의 활로는 ${analysis.ownLibertiesAfter}개예요.`;
    }
    renderCard({
      icon: '🔎',
      title: '이 수로 바뀐 점',
      summary,
      badges: analysis.badges,
      analysis,
      closeText: '계속 두기',
    });
  }

  function clearCoach() {
    preview = null;
    clearOverlay();
    if (coachCard) {
      coachCard.classList.remove('active');
      coachCard.innerHTML = '';
    }
    miniCanvas = null;
  }

  injectUi();

  window.EDUNIBadukCoach = {
    isEnabled: () => enabled,
    previewMove,
    showAiMove,
    afterHumanMove,
    clear: clearCoach,
    analyzeMove,
  };
})();
