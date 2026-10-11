/* 마주치지 마! v0.1 — browser-only, private session, no external services */
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
  let state = null;
  let lastFrame = 0;

  const directions = {
    arrowup: "up", w: "up", arrowleft: "left", a: "left",
    arrowdown: "down", s: "down", arrowright: "right", d: "right",
  };
  const vector = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
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

  function updateHud() {
    if (!state) return;
    $("hudLives").textContent = state.lives + " / " + state.startingLives;
    $("hudStars").textContent = state.stars.filter((star) => star.collected).length + " / " + L.STARS.length;
    $("hudTime").textContent = Math.floor(state.seconds) + "초";
  }
  function begin() {
    clearInput();
    state = {
      phase: "playing", character, startingLives: L.selectLives(range.value),
      lives: L.selectLives(range.value), player: { ...L.START, radius: L.PLAYER_RADIUS },
      enemies: L.ENEMIES.map((enemy) => ({ ...enemy })),
      stars: L.STARS.map((star) => ({ ...star, collected: false })),
      invulnerable: 0, seconds: 0, flash: 0,
    };
    setup.hidden = true;
    game.hidden = false;
    pauseOverlay.hidden = true;
    resultOverlay.hidden = true;
    $("pauseButton").textContent = "⏸ 일시정지";
    setStatus("화면 오른쪽 위의 빛나는 출구로 가요! 원숭이와 뱀을 조심해요.");
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
  }
  function resume() {
    if (!state || state.phase !== "paused") return;
    state.phase = "playing";
    pauseOverlay.hidden = true;
    $("pauseButton").textContent = "⏸ 일시정지";
    lastFrame = performance.now();
    setStatus("다시 출발! 출구까지 가요.");
  }
  function finish(won) {
    if (!state || state.phase !== "playing") return;
    state.phase = won ? "won" : "lost";
    clearInput();
    updateHud();
    const picked = state.stars.filter((star) => star.collected).length;
    $("resultTitle").textContent = won ? "🎉 탈출 성공!" : "💛 다시 도전!";
    $("resultText").textContent = won ?
      "남은 목숨 " + state.lives + "개 · 모은 별 " + picked + "개 · " +
      Math.floor(state.seconds) + "초 · " +
      L.calculateScore(state.startingLives, state.lives, picked, state.seconds) + "점!" :
      "목숨을 모두 사용했어요. 적의 움직임을 보고 다른 길로 피해 볼까요?";
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
    state.invulnerable = Math.max(0, state.invulnerable - seconds);
    state.flash = Math.max(0, state.flash - seconds);
    const { dx, dy } = getInput();
    state.player = { ...L.movePlayer(state.player, dx, dy, seconds), radius: L.PLAYER_RADIUS };
    state.enemies = state.enemies.map((enemy) => L.patrol(enemy, seconds));
    for (const star of state.stars) {
      if (!star.collected && Math.hypot(star.x - state.player.x, star.y - state.player.y) < 34) {
        star.collected = true;
        setStatus("⭐ 반짝이는 별을 찾았어요!");
      }
    }
    // Escaping takes precedence if the goal and an enemy are both touched in one frame.
    if (L.hasEscaped(state.player)) { finish(true); return; }
    const touching = state.enemies.some((enemy) => L.circlesTouch(state.player, enemy));
    const hit = L.resolveEnemyHit(state.lives, state.invulnerable, touching);
    if (hit.hit) {
      state.lives = hit.lives;
      state.invulnerable = hit.invulnerableSeconds;
      state.flash = 0.35;
      setStatus("앗, 마주쳤어요! 목숨 1개 감소. 잠깐 무적이에요.");
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
    circle(e.x, e.y, e.radius + 11 + pulse, "#fff4a733");
    circle(e.x, e.y, e.radius + pulse / 2, "#2d9e8c", "#ffe87e", 6);
    circle(e.x, e.y, 24, "#155c4c");
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "39px system-ui";
    ctx.fillText("🚪", e.x, e.y + 2);
    ctx.font = "900 18px system-ui"; ctx.fillStyle = "#102f29";
    ctx.fillText("출구!", e.x, e.y + 69);
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
  function drawEnemy(enemy, time) {
    const isMonkey = enemy.kind === "monkey";
    circle(enemy.x, enemy.y + 6, enemy.radius + 5, "#193a2788");
    circle(enemy.x, enemy.y, enemy.radius + 1, isMonkey ? "#d68b55" : "#6ebc52", "#2b5138", 4);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "39px system-ui";
    ctx.fillText(isMonkey ? "🐵" : "🐍", enemy.x, enemy.y - 3 + Math.sin(time * 6 + enemy.x) * 2);
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
    drawExit(time);
    for (const star of state.stars) if (!star.collected) drawStar(star.x, star.y, time);
    for (const enemy of state.enemies) drawEnemy(enemy, time);
    drawPlayer(time);
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