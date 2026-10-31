/* Browser UI; all game decisions are delegated to the pure rule engine. */
(() => {
  'use strict';
  const E = window.Playfacto, app = document.getElementById('app');
  const colors = {yellow: '#e7b329', pink: '#e66e9e', blue: '#18a1b9'};
  const colorNames = {yellow: '노랑', pink: '분홍', blue: '청록'};
  const symbols = {rock: '✊', paper: '✋', scissors: '✌️'};
  const signNames = {rock: '바위', paper: '보', scissors: '가위'};
  const tgColors = ['#ef9660', '#f1bd54', '#61b7d4', '#73c69d', '#e47eac', '#9291db', '#4aa7a0'];
  const pieceNames = {L1: '큰 삼각형 1', L2: '큰 삼각형 2', M: '중간 삼각형', S1: '작은 삼각형 1', S2: '작은 삼각형 2', Q: '정사각형', P: '평행사변형'};
  let screen = 'home', ten = E.newTen(), pixel = E.newPixel(), finger = E.newFinger(), tangram = E.newTangram();
  let pixelHint = null, fingerSelected = null, setupPlayer = 0, lastDie = null;
  let tgSelected = ['L1', 'L1'], tgDraft = [{angle: 0, flip: false}, {angle: 0, flip: false}], drag = null, skipClickUntil = 0;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const disabled = condition => condition ? ' disabled' : '';
  const btn = (label, action, data = '', off = false, cls = '') => `<button class="btn ${cls}" data-action="${action}" ${data}${disabled(off)}>${label}</button>`;
  const rules = lines => `<details class="rules"><summary>📖 놀이 규칙</summary><ol>${lines.map(line => `<li>${line}</li>`).join('')}</ol></details>`;
  function heading(title, subtitle) { return `<div class="game-heading"><button class="back" data-action="home">← 게임 선택</button><h1>${title}</h1></div><p class="subtitle">${subtitle}</p>`; }
  function winner(title, detail) { return `<section class="winner" role="status"><h2>🏆 ${esc(title)}</h2><p>${esc(detail)}</p></section>`; }
  function message(text, success = false) { return `<div class="message ${success ? 'success' : ''}" role="status" aria-live="polite">${esc(text)}</div>`; }
  function gameArt(kind) {
    if (kind === 'pixel') return '<svg viewBox="0 0 110 120" aria-hidden="true"><rect x="5" y="10" width="100" height="100" rx="12" fill="#4c6178"/><path d="M12 17h42v43H12z" fill="#e66e9e"/><path d="M59 17h39v43H59z" fill="#18a1b9"/><path d="M12 65h86v38H12z" fill="#e7b329"/><text x="25" y="45" font-size="22" fill="white">4</text><text x="70" y="45" font-size="22" fill="white">4</text><text x="47" y="92" font-size="22" fill="white">4</text></svg>';
    if (kind === 'ten') return '<svg viewBox="0 0 110 120" aria-hidden="true"><g fill="#fff9e8" stroke="#efc372" stroke-width="3"><circle cx="32" cy="38" r="24"/><circle cx="77" cy="43" r="24"/><circle cx="55" cy="87" r="24"/></g><g fill="#c98326" font-size="25" font-weight="900" text-anchor="middle"><text x="32" y="47">7</text><text x="77" y="52">3</text><text x="55" y="96">10</text></g></svg>';
    if (kind === 'tangram') return '<svg viewBox="0 0 110 120" aria-hidden="true"><path d="M8 17h90L53 62z" fill="#ef9660"/><path d="M8 17l45 45L8 107z" fill="#e47eac"/><path d="M8 107h45l22-23H30z" fill="#4aa7a0"/><path d="M53 62l22-23 23 23-23 22z" fill="#9291db"/><path d="M98 17v45L75 39z" fill="#73c69d"/><path d="M53 62l22 22H30z" fill="#f1bd54"/><path d="M98 62v45H53z" fill="#61b7d4"/></svg>';
    return '✊ ✌️';
  }
  function home() {
    const games = [
      ['pixel', '01 · 혼자 생각하기', 'Pixel · 픽셀', '색깔과 숫자를 단서로, 투명 블록을 골라 5×5 카드를 채워요.', '1인 · 사각형 퍼즐'],
      ['ten', '02 · 함께 계산하기', 'Ten-Twenty · 1020', '뒤집힌 숫자 두세 개! 합이 10이나 20이면 먼저 종을 쳐요.', '2인 · 스피드 1020'],
      ['finger', '03 · 한 수 앞서 보기', 'Finger Chess · 핑거 체스', '주사위만큼 이동하고 가위바위보로 상대 말을 잡아요.', '2인 · 같은 그림 4개 모으기'],
      ['tangram', '04 · 모양으로 겨루기', 'Tangram Battle · 탱그램 배틀', '일곱 조각을 돌리고 옮겨, 같은 실루엣을 먼저 완성해요.', '2인 모양 배틀 · 혼자 연습']
    ];
    return `<section class="hero"><div class="eyebrow">EDUNI · FAMILY BOARD GAMES</div><h1>규칙을 알면 더 재미있는<br>우리 가족의 보드게임</h1><p>숫자, 도형, 전략을 손끝으로.<br>혼자 생각하고, 함께 한 판 즐겨요.</p></section><div class="section-title"><h2>어떤 게임을 해 볼까요?</h2><span>게임마다 놀이 규칙을 읽고 시작해요</span></div><div class="cards">${games.map(([id, tag, name, desc, label]) => `<button class="game-card" data-action="open" data-game="${id}"><div class="card-art art-${id}">${gameArt(id)}</div><div class="card-content"><small>${tag}</small><h3>${name}</h3><p>${desc}</p><strong>${label} →</strong></div></button>`).join('')}</div>`;
  }

  function renderTen() {
    const hidden = ten.chips.filter(c => c.owner === null && !c.up).length, exposed = ten.chips.filter(c => c.up && c.owner === null).length;
    const sum = ten.selected.reduce((n, id) => n + ten.chips.find(c => c.id === id).value, 0);
    return heading('🔔 Ten-Twenty', '스피드 1020 · 한 기기에서 두 사람이 번갈아 숫자칩을 뒤집고, 먼저 종을 쳐요.') +
      (ten.finished ? winner(ten.message, `1번 ${ten.piles[0].length}개 · 2번 ${ten.piles[1].length}개`) : '') +
      `<div class="toolbar"><span class="pill">뒷면 ${hidden}개 · 공개 ${exposed}개</span>${btn('새 게임', 'restart')}</div><div class="layout"><section class="panel"><div class="scoreboard">${[0, 1].map(p => `<div class="score p${p + 1} ${ten.turn === p && !ten.finished ? 'active' : ''}">${p + 1}번 모은 칩<strong>${ten.piles[p].length}</strong></div>`).join('')}</div><div class="chip-grid" aria-label="숫자칩 100개">${ten.chips.map((c, i) => `<button class="chip ${c.up ? 'faceup' : ''} ${c.owner !== null ? 'collected' : ''} ${ten.selected.includes(c.id) ? 'selected' : ''}" data-action="ten-chip" data-id="${c.id}" aria-label="${c.owner !== null ? '획득한 칩' : c.up ? `공개 숫자 ${c.value}, 자리 ${i + 1}` : `뒤집지 않은 칩 ${i + 1}`}" aria-pressed="${ten.selected.includes(c.id)}"${disabled(ten.finished || c.owner !== null || (ten.claimant === null ? c.up : !c.up))}>${c.up ? c.value : '?'}</button>`).join('')}</div></section><aside class="panel"><h2>${ten.claimant === null ? `🎲 ${ten.turn + 1}번이 뒤집을 차례` : `🔔 ${ten.claimant + 1}번의 종 판정`}</h2><div class="bell-row">${btn('🔔 1번 종', 'ten-ring', 'data-player="0"', ten.finished || ten.claimant !== null || exposed < 2, 'blue')}${btn('🔔 2번 종', 'ten-ring', 'data-player="1"', ten.finished || ten.claimant !== null || exposed < 2, 'pink')}</div>${ten.claimant !== null ? `<div class="claim-sum">${ten.selected.map(id => ten.chips.find(c => c.id === id).value).join(' + ') || '칩을 선택해요'}${ten.selected.length ? ` = ${sum}` : ''}</div>${btn('선택한 칩 판정', 'ten-judge', '', ten.finished, 'teal')}<p class="help">정확히 2개 또는 3개를 고르세요. 합은 반올림하지 않고 그대로 더해요.</p>` : '<p class="help">공개된 숫자 중 두세 개의 합이 10 또는 20이면, 차례와 관계없이 내 종을 누르세요.</p>'}${message(ten.message, ten.finished)}${hidden === 0 && !ten.finished ? `${btn('마지막 조합 확인 후 결과 보기', 'ten-finish', '', ten.claimant !== null)}<p class="help">더 뒤집을 칩이 없어요. 마지막으로 종을 칠 기회를 가진 뒤 두 사람이 결과 보기를 눌러요.</p>` : ''}${rules(['자기 차례에 뒷면 칩 하나를 뒤집고 차례를 넘깁니다.', '누구든 공개된 두세 칩의 합이 10 또는 20이면 자기 종을 누릅니다.', '종을 친 사람이 칩을 고릅니다. 맞으면 선택한 칩을 모두 가져가고, 틀리면 모은 칩 하나를 뒷면으로 돌려놓습니다.', '모은 칩이 없으면 반납은 없습니다. 동시 종은 화면에 먼저 들어온 입력으로 판정합니다.', '뒤집을 칩이 없어지면 마지막 종 판정 후 결과를 봅니다. 칩을 더 많이 모으면 승리, 같으면 무승부입니다.'])}</aside></div>`;
  }

  function miniBlock(p, rot = 0) {
    const w = rot % 2 ? p.h : p.w, h = rot % 2 ? p.w : p.h;
    return `<span class="mini-block" style="grid-template-columns:repeat(${w},1fr);--pc:${colors[p.color]}">${Array.from({length: w * h}, () => '<i></i>').join('')}</span>`;
  }
  function renderPixel() {
    const card = E.pixelCards[pixel.card], board = E.pixelBoard(pixel), selected = E.pixelPieces.find(p => p.id === pixel.selected);
    return heading('🟨 Pixel · 픽셀', '사각형 퍼즐 · 숫자는 블록의 칸 수, 숫자의 색은 블록의 색이에요. 블록 하나가 숫자 하나만 덮어야 해요.') +
      (pixel.finished ? winner('픽셀 카드 완성!', '겹치거나 빈칸 없이, 모든 색과 숫자 조건을 지켰어요.') : '') +
      `<div class="toolbar"><label>문제 <select id="pixel-card">${E.pixelCards.map((_, i) => `<option value="${i}"${i === pixel.card ? ' selected' : ''}>새 문제 ${i + 1}</option>`).join('')}</select></label>${btn('이 카드 다시하기', 'restart')}</div><div class="layout"><section class="panel"><h2>카드 ${pixel.card + 1} <span class="pill">${board.filter(Boolean).length} / 25칸</span></h2><div class="board5" aria-label="픽셀 5 곱하기 5 카드">${board.map((id, i) => {
        const r = Math.floor(i / 5), c = i % 5, clue = card.clues.find(v => v.r === r && v.c === c), piece = E.pixelPieces.find(p => p.id === id);
        return `<button class="pixel-cell ${clue ? 'clue-' + clue.color : ''} ${id ? 'placed' : ''} ${pixelHint && pixelHint.r === r && pixelHint.c === c ? 'hinted' : ''}" data-action="pixel-cell" data-row="${r}" data-col="${c}" style="${piece ? `background:${colors[piece.color]}66` : ''}" aria-label="${r + 1}행 ${c + 1}열 ${clue ? colorNames[clue.color] + ' 숫자 ' + clue.size : '빈 칸'}${id ? ' 배치됨' : ''}"${disabled(pixel.finished)}>${clue ? clue.size : ''}</button>`;
      }).join('')}</div>${message(pixel.message, pixel.finished)}</section><aside class="panel"><h2>투명 블록 10개</h2><div class="piece-tray">${E.pixelPieces.map(p => `<button class="pixel-piece ${pixel.selected === p.id ? 'selected' : ''} ${pixel.poses[p.id] ? 'used' : ''}" data-action="pixel-piece" data-id="${p.id}" aria-label="${colorNames[p.color]} ${p.w * p.h}칸 블록 ${p.id}${pixel.poses[p.id] ? ', 배치됨' : ''}" aria-pressed="${pixel.selected === p.id}"${disabled(pixel.finished)}>${miniBlock(p, pixel.selected === p.id ? pixel.rot : 0)}<span>${colorNames[p.color]} ${p.w * p.h}칸${pixel.poses[p.id] ? ' ✓' : ''}</span></button>`).join('')}</div><p class="help">선택: ${colorNames[selected.color]} ${selected.w * selected.h}칸 · ${pixel.rot ? '90' : '0'}°<br>블록의 <b>왼쪽 위 칸</b>이 놓일 카드 칸을 누르세요. 사용하지 않는 블록도 있습니다.</p><div class="btn-row">${btn('↻ 90° 회전', 'pixel-rotate', '', pixel.finished, 'blue')}${btn('↶ 되돌리기', 'pixel-undo', '', pixel.finished || !pixel.history.length, 'soft')}${btn('💡 다음 자리', 'pixel-hint', '', pixel.finished, 'soft')}</div>${rules(['숫자의 색과 같은 색 블록 중, 숫자와 칸 수가 같은 블록을 고릅니다.', '블록 하나는 숫자 하나만 덮어야 합니다. 다른 숫자까지 함께 덮으면 놓을 수 없어요.', '카드 밖으로 나가거나 블록끼리 겹칠 수 없습니다.', '모든 칸을 채우면 완성! 카드에 따라 남는 블록이 있습니다.', '블록을 잘못 놓았으면 되돌리기 또는 이미 놓인 블록을 선택해 다른 곳으로 옮겨 보세요.'])}</aside></div>`;
  }

  function renderFinger() {
    const moves = fingerSelected === null ? [] : E.fingerMoves(finger, fingerSelected);
    const setup = finger.phase === 'setup', finished = finger.phase === 'finished';
    return heading('✊ Finger Chess · 핑거 체스', '두 사람이 말을 움직이는 전략 게임 · 같은 그림의 상대 말 4개를 먼저 모으면 이겨요.') +
      (finished ? winner(finger.message, '가위는 보, 보는 바위, 바위는 가위를 잡아요.') : '') +
      `<div class="toolbar"><span class="pill">주사위 1 · 2 · 3 (각 2면)</span>${btn('새 게임', 'restart')}</div><div class="layout"><section class="panel"><div class="finger-board" aria-label="핑거 체스 6 곱하기 6 판">${finger.board.map((p, i) => `<button class="finger-cell ${(Math.floor(i / 6) + i % 6) % 2 ? 'dark' : ''} ${fingerSelected === i ? 'selected' : ''} ${moves.includes(i) ? 'legal' : ''}" data-action="finger-cell" data-index="${i}" aria-label="${Math.floor(i / 6) + 1}행 ${i % 6 + 1}열 ${p ? `${p.player + 1}번 ${signNames[p.sign]}` : '빈칸'}${moves.includes(i) ? ', 이동 가능' : ''}"${disabled(finished)}>${p ? `<span class="token p${p.player + 1}">${symbols[p.sign]}</span>` : moves.includes(i) ? '●' : ''}</button>`).join('')}</div><div class="legend"><b>✊ 바위 → ✌️ 가위 → ✋ 보 → ✊ 바위</b><span>초록 칸: 이동 가능한 도착점</span></div></section><aside class="panel">${setup ? `<h2>말 자유 배치</h2><div class="btn-row">${[0, 1].map(p => btn(`${p + 1}번 배치${finger.ready[p] ? ' ✓' : ''}`, 'finger-setup-player', `data-player="${p}"`, finger.ready[p], p === 0 ? 'blue' : 'pink')).join('')}</div><p class="help">${setupPlayer + 1}번의 앞 두 줄에서 말 두 개를 차례로 누르면 자리를 바꿔요. 준비가 끝나면 해당 플레이어의 준비 버튼을 누르세요.</p><div class="btn-row">${[0, 1].map(p => btn(`${p + 1}번 준비 완료`, 'finger-ready', `data-player="${p}"`, finger.ready[p], p === 0 ? 'blue' : 'pink')).join('')}</div>` : `<h2>${finger.turn + 1}번 차례</h2><div><span class="die" aria-label="마지막 주사위 ${lastDie || '없음'}">${lastDie || '?'}</span>${btn('🎲 주사위 굴리기', 'finger-roll', '', finished || finger.die !== null, finger.turn === 0 ? 'blue' : 'pink')}</div><p class="help">${finger.die ? `정확히 ${finger.die}칸 이동하세요. 움직일 말을 먼저 누르고 도착 칸을 누르세요.` : '한 번 굴린 수는 이동 또는 이동 불가 판정까지 유지됩니다.'}</p>`}${message(finger.message, finished)}<h3>모은 상대 말</h3>${[0, 1].map(p => `<div class="capture-line">${p + 1}번: ${E.signs.map(sign => `<span>${symbols[sign]} ${finger.captures[p][sign]} / 4</span>`).join('')}</div>`).join('')}${rules(['각자 가위·바위·보를 4개씩, 총 12개를 자신의 앞 두 줄에 자유롭게 놓고 준비합니다.', '주사위를 굴려 자신의 말 하나를 정확히 그 수만큼 가로·세로·대각선 직선으로 움직입니다.', '다른 말을 뛰어넘을 수 없습니다. 빈칸 또는 가위바위보로 이길 수 있는 상대 말의 자리로만 이동합니다.', '상대 말을 잡으면 그 자리에 내 말을 놓고 상대 말을 모읍니다.', '굴린 수만큼 움직일 말이 전혀 없으면 자동으로 차례를 넘깁니다.', '같은 그림의 상대 말 4개를 먼저 모으면 승리합니다. 서로 다른 그림 4개로는 승리하지 않아요.'])}</aside></div>`;
  }

  const points = polygon => polygon.map(p => p.join(',')).join(' ');
  function selectedPose(player) { const id = tgSelected[player]; return tangram.poses[player][id] || {x: 210, y: 205, ...tgDraft[player]}; }
  function renderTangram() {
    const puzzle = E.tangramPuzzles[tangram.puzzle], players = tangram.practice ? [0] : [0, 1];
    return heading('🔺 Tangram Battle · 탱그램 배틀', '모양 배틀 · 표준 탱그램 7조각을 모두 사용해, 분할선 없는 같은 실루엣을 먼저 완성해요.') +
      (tangram.finished ? winner(tangram.message, '일곱 조각이 겹치지 않고 목표 모양을 빈틈없이 채웠어요.') : '') +
      `<div class="toolbar"><label>놀이 <select id="tg-mode"><option value="battle"${!tangram.practice ? ' selected' : ''}>한 화면 2인 모양 배틀</option><option value="practice"${tangram.practice ? ' selected' : ''}>혼자 연습</option></select></label><label>모양 <select id="tg-puzzle">${E.tangramPuzzles.map((p, i) => `<option value="${i}"${tangram.puzzle === i ? ' selected' : ''}>${i + 1}. ${p.title}</option>`).join('')}</select></label>${btn('같은 모양 다시하기', 'restart')}${!tangram.started ? btn('두 사람 준비! 시작', 'tg-start', '', false, 'teal') : ''}</div>${message(tangram.message, tangram.finished)}<div class="tg-boards ${tangram.practice ? 'practice' : ''}">${players.map(player => {
        const id = tgSelected[player], selected = E.tangramPieces.find(p => p.id === id), pose = selectedPose(player);
        return `<section class="panel tg-panel"><div class="player-label"><h2>${player + 1}번 ${player === 0 ? '🔵' : '🩷'}</h2><span class="pill">${Object.keys(tangram.poses[player]).length} / 7 조각</span></div><p class="help">${tangram.started ? '조각 선택 → 실루엣 위를 누르거나, 놓인 조각을 끌어 옮겨요.' : '시작 버튼을 누르면 두 사람 모두 놓을 수 있어요.'}</p><svg class="tg-board" data-tg-player="${player}" viewBox="0 0 420 420" tabindex="0" role="img" aria-label="${player + 1}번 탱그램 실루엣과 조각"><g fill="#d3dbe7" stroke="none">${puzzle.parts.map(p => `<polygon points="${points(p.polygon)}"/>`).join('')}</g>${tangram.practice && tangram.hint[player] ? `<g fill="none" stroke="#8497b0" stroke-width="1.3" stroke-dasharray="4 4">${puzzle.parts.map(p => `<polygon points="${points(p.polygon)}"/>`).join('')}</g>` : ''}${E.tangramPieces.filter(p => tangram.poses[player][p.id]).map(p => `<polygon class="${id === p.id ? 'chosen' : ''}" data-piece="${p.id}" fill="${tgColors[E.tangramPieces.indexOf(p)]}e8" points="${points(E.tangramPolygon(puzzle, p.id, tangram.poses[player][p.id]))}"/>`).join('')}</svg><div class="tg-tray">${E.tangramPieces.map((p, i) => `<button class="tg-piece ${id === p.id ? 'selected' : ''} ${tangram.poses[player][p.id] ? 'placed' : ''}" data-action="tg-select" data-player="${player}" data-id="${p.id}" aria-label="${player + 1}번 ${pieceNames[p.id]} 선택" aria-pressed="${id === p.id}"${disabled(!tangram.started || tangram.finished)}><svg viewBox="-2.2 -2.2 4.4 4.4" aria-hidden="true"><polygon fill="${tgColors[i]}" points="${points(p.p)}"/></svg></button>`).join('')}</div><div class="small">선택: ${pieceNames[id]} · ${pose.angle}°${pose.flip ? ' · 뒤집힘' : ''}</div><div class="tg-controls">${btn('↻ 45°', 'tg-rotate', `data-player="${player}"`, !tangram.started || tangram.finished, 'blue')}${btn('↔ 뒤집기', 'tg-flip', `data-player="${player}"`, !tangram.started || tangram.finished || selected.kind !== 'para', 'soft')}${[['←', -1, 0], ['↑', 0, -1], ['↓', 0, 1], ['→', 1, 0]].map(([label, x, y]) => btn(label, 'tg-move', `data-player="${player}" data-x="${x}" data-y="${y}" aria-label="${player + 1}번 선택 조각 ${label} 이동"`, !tangram.started || tangram.finished, 'soft')).join('')}${btn('조각 꺼내기', 'tg-remove', `data-player="${player}"`, !tangram.started || tangram.finished || !tangram.poses[player][id], 'soft')}${tangram.practice ? btn(tangram.hint[player] ? '분할선 숨기기' : '연습용 분할선 보기', 'tg-hint', `data-player="${player}"`, tangram.finished, 'soft') : ''}</div></section>`;
      }).join('')}</div><p class="help">가까운 정답 위치에서는 조각이 살짝 맞춰집니다. 방향·뒤집기를 먼저 맞추세요. 화살표 버튼과 키보드 방향키로 5px씩 움직일 수도 있어요. 한 화면에서는 입력된 순서대로 동작합니다.</p>${rules(['두 사람은 큰 삼각형 2개, 중간 삼각형 1개, 작은 삼각형 2개, 정사각형 1개, 평행사변형 1개를 각각 사용합니다.', '같은 실루엣을 보고 7조각을 모두 사용합니다. 조각을 회전하고, 평행사변형은 뒤집을 수도 있어요.', '조각이 서로 겹치거나 실루엣 밖으로 나가면 완성으로 인정하지 않습니다.', '먼저 모양을 완성한 사람이 이깁니다. 경기에서는 분할선을 볼 수 없습니다.', '혼자 연습에서는 분할선을 볼 수 있어요. 주사위로 조각을 고르는 도형 배틀은 이 페이지의 선택 모드에 포함하지 않습니다.'])}`;
  }

  function render() {
    drag = null;
    app.innerHTML = screen === 'home' ? home() : screen === 'ten' ? renderTen() : screen === 'pixel' ? renderPixel() : screen === 'finger' ? renderFinger() : renderTangram();
  }
  function resetTangram(puzzle = tangram.puzzle, practice = tangram.practice) { tangram = E.newTangram(puzzle, practice); tgSelected = ['L1', 'L1']; tgDraft = [{angle: 0, flip: false}, {angle: 0, flip: false}]; }
  function resetGame() {
    if (screen === 'ten') ten = E.newTen();
    if (screen === 'pixel') { pixel = E.newPixel(pixel.card); pixelHint = null; }
    if (screen === 'finger') { finger = E.newFinger(); fingerSelected = null; setupPlayer = 0; lastDie = null; }
    if (screen === 'tangram') resetTangram();
  }
  function selectTangram(player, id) { tgSelected[player] = id; const pose = tangram.poses[player][id]; tgDraft[player] = pose ? {angle: pose.angle, flip: pose.flip} : {angle: 0, flip: false}; }
  function tgEdit(player, edit) {
    if (!tangram.started || tangram.finished) return;
    const id = tgSelected[player], pose = {...selectedPose(player)}; edit(pose); tgDraft[player] = {angle: pose.angle, flip: pose.flip};
    if (tangram.poses[player][id] || edit.move) E.tangramPlace(tangram, player, id, pose);
  }
  function fingerCell(index) {
    if (finger.phase === 'finished') return;
    const p = finger.board[index];
    if (finger.phase === 'setup') {
      if (!p || p.player !== setupPlayer || finger.ready[setupPlayer]) return;
      if (fingerSelected !== null && finger.board[fingerSelected]?.player === setupPlayer) { E.fingerSwap(finger, setupPlayer, fingerSelected, index); fingerSelected = null; }
      else fingerSelected = index;
    } else if (p && p.player === finger.turn) {
      if (finger.die === null) { finger.message = '먼저 주사위를 굴리세요.'; return; }
      fingerSelected = index;
    } else if (fingerSelected !== null) { if (E.fingerMove(finger, fingerSelected, index)) fingerSelected = null; }
  }
  function svgPoint(svg, event) { const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY; return point.matrixTransform(svg.getScreenCTM().inverse()); }
  document.addEventListener('click', event => {
    const board = event.target.closest('svg[data-tg-player]');
    if (board && screen === 'tangram') {
      if (performance.now() < skipClickUntil || !tangram.started || tangram.finished) return;
      const player = Number(board.dataset.tgPlayer), piece = event.target.closest('[data-piece]');
      if (piece) selectTangram(player, piece.dataset.piece);
      else { const p = svgPoint(board, event); E.tangramPlace(tangram, player, tgSelected[player], {x: p.x, y: p.y, ...tgDraft[player]}); }
      render(); return;
    }
    const el = event.target.closest('[data-action]'); if (!el || el.disabled) return;
    const action = el.dataset.action, player = Number(el.dataset.player), id = el.dataset.id;
    if (action === 'home') { screen = 'home'; render(); window.scrollTo({top: 0}); return; }
    if (action === 'open') { screen = el.dataset.game; render(); window.scrollTo({top: 0}); return; }
    if (action === 'restart') resetGame();
    else if (action === 'ten-chip') { if (ten.claimant === null) E.tenFlip(ten, Number(id)); else E.tenSelect(ten, Number(id)); }
    else if (action === 'ten-ring') E.tenRing(ten, player);
    else if (action === 'ten-judge') E.tenJudge(ten);
    else if (action === 'ten-finish') E.tenFinish(ten);
    else if (action === 'pixel-piece') { pixel.selected = id; pixel.rot = pixel.poses[id]?.rot || 0; pixelHint = null; }
    else if (action === 'pixel-rotate') { pixel.rot = 1 - pixel.rot; pixelHint = null; }
    else if (action === 'pixel-cell') { E.pixelPlace(pixel, pixel.selected, Number(el.dataset.row), Number(el.dataset.col)); pixelHint = null; }
    else if (action === 'pixel-undo') { E.pixelUndo(pixel); pixelHint = null; }
    else if (action === 'pixel-hint') { pixelHint = E.pixelHint(pixel); if (pixelHint) { pixel.selected = pixelHint.id; pixel.rot = pixelHint.rot; pixel.message = `힌트: 선택된 ${colorNames[E.pixelPieces.find(p => p.id === pixelHint.id).color]} 블록을 ${pixelHint.r + 1}행 ${pixelHint.c + 1}열의 표시 칸에서 시작해 보세요.`; } else pixel.message = '현재 배치에서는 완성할 수 없어요. 한 수씩 되돌려 보세요.'; }
    else if (action === 'finger-cell') fingerCell(Number(el.dataset.index));
    else if (action === 'finger-setup-player') { setupPlayer = player; fingerSelected = null; }
    else if (action === 'finger-ready') { E.fingerReady(finger, player); fingerSelected = null; if (!finger.ready[1 - player]) setupPlayer = 1 - player; }
    else if (action === 'finger-roll') { lastDie = [1, 2, 3, 1, 2, 3][Math.floor(Math.random() * 6)]; E.fingerRoll(finger, lastDie); fingerSelected = null; }
    else if (action === 'tg-start') { tangram.started = true; tangram.message = '시작! 7조각을 모두 사용해 같은 실루엣을 먼저 완성하세요.'; }
    else if (action === 'tg-select') selectTangram(player, id);
    else if (action === 'tg-rotate') tgEdit(player, pose => pose.angle = (pose.angle + 45) % 360);
    else if (action === 'tg-flip') tgEdit(player, pose => pose.flip = !pose.flip);
    else if (action === 'tg-move') { const move = pose => { pose.x += Number(el.dataset.x) * 5; pose.y += Number(el.dataset.y) * 5; }; move.move = true; tgEdit(player, move); }
    else if (action === 'tg-remove') { delete tangram.poses[player][tgSelected[player]]; tangram.message = '선택 조각을 꺼냈어요. 다시 놓아 보세요.'; }
    else if (action === 'tg-hint' && tangram.practice) tangram.hint[player] = !tangram.hint[player];
    render();
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'pixel-card') { pixel = E.newPixel(Number(event.target.value)); pixelHint = null; }
    else if (event.target.id === 'tg-mode') resetTangram(tangram.puzzle, event.target.value === 'practice');
    else if (event.target.id === 'tg-puzzle') resetTangram(Number(event.target.value), tangram.practice);
    render();
  });
  document.addEventListener('pointerdown', event => {
    const polygon = event.target.closest('polygon[data-piece]'), svg = polygon?.closest('svg[data-tg-player]');
    if (!svg || screen !== 'tangram' || !tangram.started || tangram.finished || drag) return;
    const player = Number(svg.dataset.tgPlayer), id = polygon.dataset.piece;
    selectTangram(player, id); const p = svgPoint(svg, event);
    drag = {pointer: event.pointerId, svg, polygon, player, id, start: p, pose: {...tangram.poses[player][id]}, next: {...tangram.poses[player][id]}};
    svg.setPointerCapture(event.pointerId); event.preventDefault();
  });
  document.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const p = svgPoint(drag.svg, event);
    drag.next = {...drag.pose, x: drag.pose.x + p.x - drag.start.x, y: drag.pose.y + p.y - drag.start.y};
    drag.polygon.setAttribute('points', points(E.tangramPolygon(E.tangramPuzzles[tangram.puzzle], drag.id, drag.next)));
  });
  document.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const ended = drag; drag = null; skipClickUntil = performance.now() + 250;
    E.tangramPlace(tangram, ended.player, ended.id, ended.next); render();
  });
  document.addEventListener('pointercancel', event => { if (drag && event.pointerId === drag.pointer) { drag = null; render(); } });
  document.addEventListener('keydown', event => {
    const svg = event.target.closest('svg[data-tg-player]'); if (!svg || screen !== 'tangram') return;
    const delta = {ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5]}[event.key];
    if (!delta) return; event.preventDefault(); const player = Number(svg.dataset.tgPlayer);
    const move = pose => { pose.x += delta[0]; pose.y += delta[1]; }; move.move = true; tgEdit(player, move); render();
    app.querySelector(`svg[data-tg-player="${player}"]`)?.focus();
  });
  render();
})();
