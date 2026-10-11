/* 마주치지 마! v0.2 — jungle chase adventure; offline/browser-only */
(() => {
  "use strict";
  const L = window.SurvivalLogic;
  if (!L) {
    document.body.textContent = "게임 규칙을 불러올 수 없습니다. 다시 접속해 주세요.";
    return;
  }
  const $ = (id) => document.getElementById(id);
  const canvas = $("gameCanvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) { $("setupScreen").insertAdjacentText("beforeend", "이 브라우저는 Canvas를 지원하지 않습니다."); return; }
  const setup = $("setupScreen"), game = $("gameScreen");
  const range = $("livesRange"), preview = $("livesPreview"), difficulty = $("difficultyPreview");
  const pauseOverlay = $("pauseOverlay"), resultOverlay = $("resultOverlay");
  const heldKeys = new Set();
  const pointerDirections = new Map();
  let character = "explorer";
  let selectedMode = "thrill";
  let state = null;
  let lastFrame = 0;

  const directions = {
    arrowup: "up", w: "up", arrowleft: "left", a: "left",
    arrowdown: "down", s: "down", arrowright: "right", d: "right",
  };

  function setStatus(message) { $("liveStatus").textContent = message; }
  function clearInput() {
    heldKeys.clear();
    pointerDirections.clear();
    document.querySelectorAll(".dir").forEach((b) => b.classList.remove("active"));
  }
  function updateLifeChoice() {
    range.value = String(L.selectLives(range.value));
    const count = Number(range.value);
    preview.textContent = "❤️ × " + count;
    difficulty.textContent = "점수 ×" + L.scoreMultiplier(count) + " · " +
      (count <= 3 ? "극한 도전" : count <= 7 ? "기본 모험" : count <= 15 ? "여유 모험" : "자유 연습");
    document.querySelectorAll("[data-lives]").forEach((button) =>
      button.setAttribute("aria-pressed", String(Number(button.dataset.lives) === count)));
  }
  range.addEventListener("input", updateLifeChoice);
  document.querySelectorAll("[data-lives]").forEach((button) => button.addEventListener("click", () => {
    range.value = button.dataset.lives;
    updateLifeChoice();
  }));
  document.querySelectorAll("[data-character]").forEach((button) => button.addEventListener("click", () => {
    character = button.dataset.character;
    document.querySelectorAll("[data-character]").forEach((candidate) =>
      candidate.setAttribute("aria-pressed", String(candidate === button)));
  }));


  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
    selectedMode = button.dataset.mode === "explore" ? "explore" : "thrill";
    document.querySelectorAll("[data-mode]").forEach((candidate) =>
      candidate.setAttribute("aria-pressed", String(candidate.dataset.mode === selectedMode)));
    $("modeHint").textContent = selectedMode === "thrill"
      ? "⏱ 110초 · 빠른 재규어 · 보너스 점수"
      : "🌿 190초 · 느린 재규어 · 연습에 좋아요";
  }));
  function updateDash() {
    if (!state) return;
    const dash = $("dashButton");
    const ready = state.phase === "playing" && state.dashCooldown <= 0;
    dash.disabled = !ready;
    dash.textContent = state.dashRemaining > 0 ? "⚡ 질주 중!" :
      ready ? "⚡ 긴급 질주" : "⚡ " + Math.ceil(state.dashCooldown) + "초 뒤";
  }
  function triggerDash() {
    if (!state || state.phase !== "playing" || state.dashCooldown > 0) return;
    const input = getInput();
    if (!input.dx && !input.dy) { setStatus("방향 버튼을 누른 채 ⚡ 긴급 질주를 눌러요!"); return; }
    state.dashRemaining = L.DASH_SECONDS;
    state.dashCooldown = L.DASH_COOLDOWN;
    setStatus("⚡ 질주! 재규어와 위험 지역에서 멀어져요!");
    updateDash();
  }
  $("dashButton").addEventListener("click", triggerDash);

  function updateHud() {
    if (!state) return;
    $("hudLives").textContent = state.lives + " / " + state.startingLives;
    $("hudStars").textContent = state.stars.filter((star) => star.collected).length + " / " + L.STARS.length;
    $("hudTime").textContent = L.remainingTime(state.seconds, state.mode) + "초 남음";
    $("hudKey").textContent = state.keyCollected ? "🔑 획득" : "🔒 열쇠 찾기";
    if (state.jaguar) {
      const distance = Math.round(Math.hypot(state.jaguar.x - state.player.x, state.jaguar.y - state.player.y));
      $("hudDanger").textContent = distance < 160 ? "🚨 재규어 근접!" : "🐆 재규어 추격 중";
    } else { $("hudDanger").textContent = "🌴 탐험 중"; }
    updateDash();
  }
  function begin() {
    clearInput();
    state = {
      phase: "playing", character, mode: selectedMode, startingLives: L.selectLives(range.value),
      lives: L.selectLives(range.value), player: { ...L.START, radius: L.PLAYER_RADIUS },
      enemies: L.ENEMIES.map((enemy) => ({ ...enemy })),
      stars: L.STARS.map((star) => ({ ...star, collected: false })),
      invulnerable: 0, seconds: 0, flash: 0,
      keyCollected: false, jaguar: null, dashCooldown: 0, dashRemaining: 0,
    };
    setup.hidden = true;
    game.hidden = false;
    pauseOverlay.hidden = true;
    resultOverlay.hidden = true;
    $("pauseButton").textContent = "⏸ 일시정지";
    setStatus("🔑 먼저 정글 오른쪽의 열쇠를 찾아요. 출구는 잠겨 있어요!");
    updateHud();
    lastFrame = performance.now();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function pause() {
    if (!state || state.phase !== "playing") return;
    state.phase = "paused";
    clearInput();
    pauseOverlay.hidden = false;
    $("pauseButton").textContent = "▶ 계속";
    setStatus("일시정지했어요.");
    updateDash();
  }
  function resume() {
    if (!state || state.phase !== "paused") return;
    state.phase = "playing";
    pauseOverlay.hidden = true;
    $("pauseButton").textContent = "⏸ 일시정지";
    lastFrame = performance.now();
    setStatus("다시 출발! 열쇠를 찾고 출구로 가요.");
    updateDash();
  }
  function finish(won, reason = "life") {
    if (!state || state.phase !== "playing") return;
    state.phase = won ? "won" : "lost";
    clearInput();
    updateHud();
    const picked = state.stars.filter((star) => star.collected).length;
    $("resultTitle").textContent = won ? "🎉 탈출 성공!" : "💛 다시 도전!";
    $("resultText").textContent = won ?
      "남은 목숨 " + state.lives + "개 · 모은 별 " + picked + "개 · " +
      Math.floor(state.seconds) + "초 · " +
      Math.round(L.calculateScore(state.startingLives, state.lives, picked, state.seconds) *
        (state.mode === "thrill" ? 1.3 : 1)) + "점!" :
      reason === "time" ? "⏰ 해가 졌어요! 이번엔 열쇠를 먼저 찾아 빠르게 탈출해 봐요." :
      "목숨을 모두 사용했어요. 위험 예고를 보고 ⚡ 긴급 질주로 피해 보세요!";
    resultOverlay.hidden = false;
    setStatus(won ? "정글 탈출 성공! 다음 도전에서는 더 많은 별을 찾아보세요." : "게임 종료. 다시 도전 버튼으로 재시작할 수 있어요.");
  }
  function returnToSetup() {
    state = null;
    clearInput();
    game.hidden = true;
    setup.hidden = false;
    pauseOverlay.hidden = true;
    resultOverlay.hidden = true;
    window.scrollTo({ top: 0, behavior: "instant" });
    $("startButton").focus();
  }
  $("startButton").addEventListener("click", begin);
  $("retryButton").addEventListener("click", begin);
  $("restartButton").addEventListener("click", begin);
  $("pauseRestartButton").addEventListener("click", begin);
  $("settingsButton").addEventListener("click", returnToSetup);
  $("pauseButton").addEventListener("click", () => state?.phase === "paused" ? resume() : pause());
  $("resumeButton").addEventListener("click", resume);

  document.addEventListener("keydown", (event) => {
    if (!state) return;
    if (event.key === "Escape") {
      if (state.phase === "playing" || state.phase === "paused") {
        event.preventDefault();
        state.phase === "playing" ? pause() : resume();
      }
      return;
    }
    if (event.code === "Space" || event.key === "Shift") {
      if (state.phase === "playing") { event.preventDefault(); triggerDash(); }
      return;
    }
    const dir = directions[event.key.toLowerCase()];
    if (!dir) return;
    if (state.phase === "playing" || state.phase === "paused") event.preventDefault();
    if (state.phase === "playing") heldKeys.add(dir);
  });
  document.addEventListener("keyup", (event) => {
    const dir = directions[event.key.toLowerCase()];
    if (dir) heldKeys.delete(dir);
  });
  window.addEventListener("blur", () => { if (state?.phase === "playing") pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state?.phase === "playing") pause(); });
  document.querySelectorAll(".dir").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      if (state?.phase !== "playing") return;
      event.preventDefault();
      try { button.setPointerCapture(event.pointerId); } catch (_) { /* no capture in older browsers */ }
      pointerDirections.set(event.pointerId, button.dataset.dir);
      button.classList.add("active");
    });
    function release(event) {
      pointerDirections.delete(event.pointerId);
      button.classList.remove("active");
    }
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) button.addEventListener(name, release);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  });

  function getInput() {
    const active = new Set([...heldKeys, ...pointerDirections.values()]);
    const dx = Number(active.has("right")) - Number(active.has("left"));
    const dy = Number(active.has("down")) - Number(active.has("up"));
    return { dx, dy };
  }
  function tick(dt) {
    if (!state || state.phase !== "playing") return;
    const seconds = L.clamp(dt, 0, 0.05);
    state.seconds += seconds;
    if (L.remainingTime(state.seconds, state.mode) === 0) { finish(false, "time"); return; }
    state.dashCooldown = Math.max(0, state.dashCooldown - seconds);
    state.dashRemaining = Math.max(0, state.dashRemaining - seconds);
    state.invulnerable = Math.max(0, state.invulnerable - seconds);
    state.flash = Math.max(0, state.flash - seconds);
    const { dx, dy } = getInput();
    state.player = {
      ...L.movePlayer(state.player, dx, dy, seconds, L.OBSTACLES,
        state.dashRemaining > 0 ? L.DASH_BOOST : 1),
      radius: L.PLAYER_RADIUS,
    };
    state.enemies = state.enemies.map((enemy) => L.patrol(enemy, seconds));
    for (const star of state.stars) {
      if (!star.collected && Math.hypot(star.x - state.player.x, star.y - state.player.y) < 34) {
        star.collected = true;
        setStatus("⭐ 반짝이는 별을 찾았어요!");
      }
    }
    if (!state.keyCollected && Math.hypot(state.player.x - L.KEY.x, state.player.y - L.KEY.y) < 36) {
      state.keyCollected = true;
      state.jaguar = { ...L.JAGUAR };
      state.jaguarWaypoints = [];
      state.jaguarPathAge = 0;
      setStatus("🔑 열쇠 획득! 🐆 재규어가 깨어났어요! 이제 출구로 달려요!");
    }
    if (state.jaguar) {
      state.jaguarPathAge += seconds;
      if (!state.jaguarWaypoints.length || state.jaguarPathAge >= 0.85) {
        state.jaguarWaypoints = L.findChasePath(state.jaguar, state.player);
        state.jaguarPathAge = 0;
      }
      while (state.jaguarWaypoints.length &&
        Math.hypot(state.jaguar.x - state.jaguarWaypoints[0].x,
          state.jaguar.y - state.jaguarWaypoints[0].y) < 13) {
        state.jaguarWaypoints.shift();
      }
      state.jaguar = L.chaseJaguar(
        state.jaguar,
        state.jaguarWaypoints[0] || state.player,
        seconds, state.mode);
    }
    // Gate only opens after the key; arriving at a locked gate never silently wins.
    if (L.hasEscaped(state.player) && state.keyCollected) { finish(true); return; }
    if (L.hasEscaped(state.player) && !state.keyCollected && !state.nearGateWarned) {
      state.nearGateWarned = true;
      setStatus("🔒 출구가 잠겼어요. 정글 오른쪽의 🔑 열쇠가 필요해요!");
    }
    const fallingFruit = L.HAZARDS.some((h) =>
      L.dangerPhase(state.seconds, h.phase, state.mode) === "active" &&
      L.circlesTouch(state.player, h));
    const touching = fallingFruit ||
      state.enemies.some((enemy) => L.circlesTouch(state.player, enemy)) ||
      (state.jaguar && L.circlesTouch(state.player, state.jaguar));
    const hit = L.resolveEnemyHit(state.lives, state.invulnerable, touching);
    if (hit.hit) {
      state.lives = hit.lives;
      state.invulnerable = hit.invulnerableSeconds;
      state.flash = 0.35;
      setStatus("앗! " + (fallingFruit ? "나무 열매가 떨어졌어요!" : "적과 마주쳤어요!") +
        " 목숨 -1 · 잠시 무적!");

      if (hit.dead) { finish(false); return; }
    }
    updateHud();
  }

  function rounded(x, y, w, h, radius, fill, stroke, width = 1) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function circle(x, y, r, fill, stroke, width = 1) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function drawGround() {
    const ground = ctx.createLinearGradient(0, 0, L.SIZE, L.SIZE);
    ground.addColorStop(0, "#84bb72"); ground.addColorStop(1, "#438d61");
    ctx.fillStyle = ground; ctx.fillRect(0, 0, L.SIZE, L.SIZE);
    // Fixed deterministic undergrowth (no frame-to-frame random animation).
    for (let yi = 0; yi < 21; yi++) {
      for (let xi = 0; xi < 21; xi++) {
        const px = xi * 35 + 14 + (yi * 17 % 16);
        const py = yi * 35 + 12 + (xi * 11 % 13);
        ctx.fillStyle = ((xi * 7 + yi * 11) % 4 === 0) ? "#8dca79" : "#70ad66";
        ctx.fillRect(px, py, 7, 4);
      }
    }
    // Helpful visual route; movement remains free on the grass.
    ctx.beginPath(); ctx.moveTo(78, 637);
    ctx.bezierCurveTo(80, 500, 70, 390, 117, 345);
    ctx.bezierCurveTo(154, 277, 223, 236, 365, 236);
    ctx.bezierCurveTo(368, 180, 354, 95, 447, 90);
    ctx.lineTo(635, 83);
    ctx.strokeStyle = "#b99b6b"; ctx.lineWidth = 64; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    ctx.strokeStyle = "#dcc492"; ctx.lineWidth = 51; ctx.stroke();
    // Leaf borders show world edge.
    ctx.strokeStyle = "#244e34"; ctx.lineWidth = 30; ctx.strokeRect(11, 11, 698, 698);
    for (let i = 0; i < 22; i++) {
      const t = i * 30 + 20;
      circle(t, 12, 19, "#2c7648"); circle(t, 708, 19, "#347f4b");
      circle(12, t, 19, "#35814b"); circle(708, t, 19, "#2e7347");
    }
  }
  function drawObstacles() {
    L.OBSTACLES.forEach((rect, idx) => {
      rounded(rect.x, rect.y, rect.w, rect.h, 13, "#69442a", "#392f20", 5);
      ctx.save();
      ctx.beginPath(); ctx.roundRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6, 10); ctx.clip();
      for (let x = rect.x + 15; x < rect.x + rect.w + 15; x += 36) {
        for (let y = rect.y + 10; y < rect.y + rect.h + 18; y += 29) {
          circle(x + (idx % 2) * 5, y, 20, "#2c703f", "#235c36", 3);
          circle(x - 4, y - 5, 9, "#59a759");
        }
      }
      ctx.restore();
    });
  }
  function drawExit(time) {
    const e = L.EXIT;
    const pulse = Math.sin(time * 3) * 4;
    circle(e.x, e.y, e.radius + 11 + pulse, state.keyCollected ? "#fff4a733" : "#17372b55");
    circle(e.x, e.y, e.radius + pulse / 2, state.keyCollected ? "#2d9e8c" : "#5e716a", state.keyCollected ? "#ffe87e" : "#adb7b2", 6);
    circle(e.x, e.y, 24, "#155c4c");
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "39px system-ui";
    ctx.fillText(state.keyCollected ? "🚪" : "🔒", e.x, e.y + 2);
    ctx.font = "900 18px system-ui"; ctx.fillStyle = "#102f29";
    ctx.fillText(state.keyCollected ? "탈출!" : "열쇠 필요", e.x, e.y + 69);
  }
  function drawStar(x, y, time) {
    const r = 14 + Math.sin(time * 4 + x * 0.1) * 2.4;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(time * 2) * 0.1);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI / 5) - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r / 2;
      const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = "#ffe475"; ctx.strokeStyle = "#886422";
    ctx.lineWidth = 3; ctx.fill(); ctx.stroke(); ctx.restore();
  }

  function drawKey(time) {
    if (state.keyCollected) return;
    const k = L.KEY;
    circle(k.x, k.y, 38 + Math.sin(time * 4) * 4, "#ffed8999", "#fff1a7", 3);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "41px system-ui";
    ctx.fillText("🔑", k.x, k.y);
    ctx.font = "900 17px system-ui"; ctx.fillStyle = "#132a25";
    ctx.fillText("열쇠", k.x, k.y + 54);
  }
  function drawHazards(time) {
    L.HAZARDS.forEach((h) => {
      const phase = L.dangerPhase(time, h.phase, state.mode);
      if (phase === "idle") {
        circle(h.x, h.y, h.radius + 6, "#4f8a5040", "#e9cd8c", 2);
      } else {
        const pulse = Math.sin(time * 15) * 4;
        circle(h.x, h.y, h.radius + pulse, phase === "active" ? "#ef463f91" : "#ffc24763",
          phase === "active" ? "#ff413c" : "#ffdc56", 7);
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "36px system-ui";
        ctx.fillText(phase === "active" ? "💥" : "⚠️", h.x, h.y);
      }
    });
  }
  function drawEnemy(enemy, time) {
    const isMonkey = enemy.kind === "monkey";
    const isJaguar = enemy.kind === "jaguar";
    circle(enemy.x, enemy.y + 6, enemy.radius + 5, "#193a2788");
    if (isJaguar) circle(enemy.x, enemy.y, enemy.radius + 14 + Math.sin(time * 8) * 3, "#e33a5377", "#f86b59", 3);
    circle(enemy.x, enemy.y, enemy.radius + 1, isJaguar ? "#c44745" : isMonkey ? "#d68b55" : "#6ebc52", "#2b5138", 4);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "39px system-ui";
    ctx.fillText(isJaguar ? "🐆" : isMonkey ? "🐵" : "🐍", enemy.x, enemy.y - 3 + Math.sin(time * 6 + enemy.x) * 2);
  }
  function drawPlayer(time) {
    if (!state) return;
    const p = state.player;
    const flicker = state.invulnerable > 0 && Math.floor(time * 10) % 2 === 0;
    ctx.save();
    if (flicker) ctx.globalAlpha = 0.43;
    circle(p.x, p.y + 8, 23, "#214d3999");
    circle(p.x, p.y, p.radius + 3, state.character === "explorer" ? "#ffe6a2" : "#f1e6ff", "#153b34", 4);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "42px system-ui";
    ctx.fillText(state.character === "explorer" ? "🧒" : "🐰", p.x, p.y - 5);
    ctx.restore();
    if (state.invulnerable > 0) {
      circle(p.x, p.y, 33, null, "#e9fff0", 3);
    }
  }
  function draw() {
    if (!state) return;
    const time = state.seconds;
    ctx.clearRect(0, 0, L.SIZE, L.SIZE);
    drawGround();
    drawObstacles();
    drawHazards(time);
    drawExit(time);
    drawKey(time);
    for (const star of state.stars) if (!star.collected) drawStar(star.x, star.y, time);
    for (const enemy of state.enemies) drawEnemy(enemy, time);
    if (state.jaguar) drawEnemy(state.jaguar, time);
    drawPlayer(time);
    if (L.remainingTime(time, state.mode) <= 20) {
      ctx.fillStyle = "rgba(180,20,45," + (0.09 + Math.max(0,Math.sin(time * 5)) * 0.11) + ")";
      ctx.fillRect(0, 0, L.SIZE, 18);
    }
    if (state.flash > 0) {
      ctx.fillStyle = "rgba(255,100,90," + (state.flash * 0.28) + ")";
      ctx.fillRect(0, 0, L.SIZE, L.SIZE);
    }
  }
  function frame(now) {
    const dt = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    if (state) {
      tick(dt);
      draw();
    }
    requestAnimationFrame(frame);
  }
  updateLifeChoice();
  requestAnimationFrame(frame);
})();