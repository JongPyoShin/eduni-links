/* 마주치지 마! v0.4 — scrolling jungle expedition world; offline/browser-only */
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
      ? "⏱ 105초 · 큰 정글 · 빠른 재규어 · 보너스 점수"
      : "🌿 180초 · 느긋한 정글 탐험 · 연습에 좋아요";
  }));
  function updateDash() {
    if (!state) return;
    const dash = $("dashButton");
    const ready = state.phase === "playing" && !state.hiding && state.dashCooldown <= 0;
    dash.disabled = !ready;
    dash.textContent = state.dashRemaining > 0 ? "⚡ 질주 중!" :
      ready ? "⚡ 긴급 질주" : "⚡ " + Math.ceil(state.dashCooldown) + "초 뒤";
  }
  function triggerDash() {
    if (!state || state.phase !== "playing" || state.hiding || state.dashCooldown > 0) return;
    const input = getInput();
    if (!input.dx && !input.dy) { setStatus("방향 버튼을 누른 채 ⚡ 긴급 질주를 눌러요!"); return; }
    state.dashRemaining = L.DASH_SECONDS;
    state.dashCooldown = L.DASH_COOLDOWN;
    setStatus("⚡ 질주! 재규어와 위험 지역에서 멀어져요!");
    updateDash();
  }
  $("dashButton").addEventListener("click", triggerDash);

  function endHiding(expired) {
    if (!state?.hiding) return;
    const shelter = state.shelters.find(s => s.id === state.hiding.shelterId);
    if (shelter) shelter.status = "used";
    state.hiding = null;
    state.disperseUntil = state.seconds + L.SEARCH_AFTER_HIDE_SECONDS;
    const escape = L.hideStateEnd(state.invulnerable, state.escapeBoost);
    state.invulnerable = escape.invulnerable;
    state.escapeBoost = escape.boost;
    state.chaseRoutes = {};
    setStatus(expired
      ? "💨 은신처가 사라졌어요! 몬스터들은 아직 다른 곳을 수색 중! 지금 도망쳐요!"
      : "🏃 은신처에서 나왔어요! 몬스터들은 잠깐 다른 곳을 수색해요.");
    updateHud();
  }
  function toggleHide() {
    if (!state || state.phase !== "playing") return;
    if (state.hiding) { endHiding(false); return; }
    const shelter = L.nearbyShelter(state.player, state.shelters);
    if (!shelter) { setStatus("🌿 은신처의 동그란 표시 안에 들어가서 숨기를 눌러요."); return; }
    state.hiding = L.hideStateStart(shelter);
    shelter.status = "occupied";
    state.disperseAnchor = { x: shelter.x, y: shelter.y };
    state.disperseRound += 1;
    state.disperseUntil = 0;
    state.dashRemaining = 0;
    state.escapeBoost = 0;
    state.chaseRoutes = {};
    clearInput();
    setStatus("🙈 " + shelter.name + "에 숨었어요! 몬스터들이 다른 곳으로 가요. " + shelter.hideSeconds + "초 후 다시 도망쳐요!");
    updateHud();
  }
  $("hideButton").addEventListener("click", toggleHide);

  function followChaser(enemy, key, index, dt) {
    const track = state.chaseRoutes[key] ||= { waypoints: [], age: 0.7 };
    const distracted = Boolean(state.hiding) || state.seconds < state.disperseUntil;
    const target = distracted && state.disperseAnchor
      ? L.searchTarget(state.disperseAnchor, state.disperseRound, index)
      : state.player;
    track.age += dt;
    if (track.age >= 0.7) {
      track.waypoints = L.findChasePath(enemy, target);
      track.age = 0;
    }
    while (track.waypoints.length &&
      Math.hypot(enemy.x - track.waypoints[0].x, enemy.y - track.waypoints[0].y) < 13) {
      track.waypoints.shift();
    }
    return L.chaseJaguar(enemy, track.waypoints[0] || target, dt, state.mode);
  }
  function updateHideControls() {
    if (!state) return;
    const button = $("hideButton");
    if (state.hiding) {
      button.disabled = state.phase !== "playing";
      button.textContent = "🚪 나오기";
      $("hudHide").textContent = "🙈 " + state.hiding.remaining.toFixed(1) + "초";
    } else {
      const shelter = L.nearbyShelter(state.player, state.shelters);
      button.disabled = state.phase !== "playing" || !shelter;
      button.textContent = shelter ? "🙈 숨기" : "🌿 숨기";
      $("hudHide").textContent = shelter ? "🌿 " + shelter.hideSeconds + "초 은신 가능" :
        "🌿 남은 은신처 " + state.shelters.filter(s => s.status === "available").length + "곳";
    }
  }

  function updateHud() {
    if (!state) return;
    $("hudLives").textContent = state.lives + " / " + state.startingLives;
    $("hudStars").textContent = state.stars.filter((star) => star.collected).length + " / " + L.STARS.length;
    $("hudArea").textContent = "📍 " + L.areaFor(state.player);
    const goal = state.keyCollected ? L.EXIT : L.KEY;
    $("hudGoal").textContent = (state.keyCollected ? "🚪 출구" : "🔑 열쇠") + " " +
      Math.ceil(Math.hypot(goal.x - state.player.x, goal.y - state.player.y) / 20) + "걸음";
    $("hudTime").textContent = L.remainingTime(state.seconds, state.mode) + "초 남음";
    $("hudTime").classList.remove("urgent");
    if (L.remainingTime(state.seconds, state.mode) <= 15) $("hudTime").classList.add("urgent");
    $("hudKey").textContent = state.keyCollected ? "🔑 획득" : "🔒 열쇠 찾기";
    const allEnemies = [...state.enemies, ...(state.jaguar ? [state.jaguar] : [])];
    const nearest = Math.min(...allEnemies.map(enemy =>
      Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y)));
    $("hudDanger").textContent = state.hiding ? "🌿 악당들이 멀리 이동 중" :
      state.seconds < state.disperseUntil ? "🔍 악당들이 다른 곳 수색 중" :
      nearest < 150 ? "🚨 악당이 가까워요!" : "👹 계속 추격 중";
    updateDash();
    updateHideControls();
  }
  function begin() {
    clearInput();
    state = {
      phase: "playing", character, mode: selectedMode, startingLives: L.selectLives(range.value),
      lives: L.selectLives(range.value), player: { ...L.START, radius: L.PLAYER_RADIUS },
      enemies: L.ENEMIES.map((enemy) => ({ ...enemy, speed: enemy.speed * 1.22 })),
      chaseRoutes: {}, disperseAnchor: null, disperseRound: 0, disperseUntil: 0,
      stars: L.STARS.map((star) => ({ ...star, collected: false })),
      shelters: L.SHELTERS.map(shelter => ({ ...shelter, status: "available" })),
      hiding: null, escapeBoost: 0,
      invulnerable: 0, seconds: 0, flash: 0,
      keyCollected: false, jaguar: null, dashCooldown: 0, dashRemaining: 0, bannerUntil: 0,
      camera: L.cameraFor(L.START),
    };
    setup.hidden = true;
    game.hidden = false;
    pauseOverlay.hidden = true;
    resultOverlay.hidden = true;
    $("eventBanner").hidden = true;
    $("pauseButton").textContent = "⏸ 일시정지";
    setStatus("🗺️ 정글 대탐험 시작! 넓은 숲을 돌아다니며 🔑 열쇠를 찾으세요. 미니맵을 보면 길을 찾기 쉬워요!");
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
    updateHideControls();
  }
  function resume() {
    if (!state || state.phase !== "paused") return;
    state.phase = "playing";
    pauseOverlay.hidden = true;
    $("pauseButton").textContent = "⏸ 일시정지";
    lastFrame = performance.now();
    setStatus("다시 출발! 열쇠를 찾고 출구로 가요.");
    updateDash();
    updateHideControls();
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
    if (event.key.toLowerCase() === "e" && !event.repeat) {
      if (state.phase === "playing") { event.preventDefault(); toggleHide(); }
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
    $("eventBanner").hidden = state.seconds >= state.bannerUntil;
    state.dashCooldown = Math.max(0, state.dashCooldown - seconds);
    state.dashRemaining = Math.max(0, state.dashRemaining - seconds);
    state.invulnerable = Math.max(0, state.invulnerable - seconds);
    state.flash = Math.max(0, state.flash - seconds);
    const { dx, dy } = getInput();
    state.escapeBoost = Math.max(0, state.escapeBoost - seconds);
    if (state.hiding) {
      const countdown = L.hideCountdown(state.hiding.remaining, seconds);
      state.hiding.remaining = countdown.remaining;
      if (countdown.expired) endHiding(true);
    } else {
      state.player = {
        ...L.movePlayer(state.player, dx, dy, seconds, L.OBSTACLES,
          state.dashRemaining > 0 ? L.DASH_BOOST : state.escapeBoost > 0 ? 1.55 : 1),
        radius: L.PLAYER_RADIUS,
      };
    }
    state.enemies = state.enemies.map((enemy, index) =>
      followChaser(enemy, enemy.id, index, seconds));
    for (const star of state.stars) {
      if (!state.hiding && !star.collected && Math.hypot(star.x - state.player.x, star.y - state.player.y) < 34) {
        star.collected = true;
        setStatus("⭐ 반짝이는 별을 찾았어요!");
      }
    }
    if (!state.hiding && !state.keyCollected && Math.hypot(state.player.x - L.KEY.x, state.player.y - L.KEY.y) < 36) {
      state.keyCollected = true;
      state.jaguar = { ...L.JAGUAR };
      state.bannerUntil = state.seconds + 2.4;
      $("eventBanner").hidden = false;
      setStatus("🔑 열쇠 획득! 🐆 재규어가 깨어났어요! 이제 출구로 달려요!");
    }
    if (state.jaguar) {
      state.jaguar = followChaser(state.jaguar, "jaguar", 3, seconds);
    }
    // Gate only opens after the key; arriving at a locked gate never silently wins.
    if (!state.hiding && L.hasEscaped(state.player) && state.keyCollected) { finish(true); return; }
    if (L.hasEscaped(state.player) && !state.keyCollected && !state.nearGateWarned) {
      state.nearGateWarned = true;
      setStatus("🔒 출구가 잠겼어요. 정글 오른쪽의 🔑 열쇠가 필요해요!");
    }
    const fallingFruit = !state.hiding && L.HAZARDS.some((h) =>
      L.dangerPhase(state.seconds, h.phase, state.mode) === "active" &&
      L.circlesTouch(state.player, h));
    const touching = !state.hiding && (fallingFruit ||
      state.enemies.some((enemy) => L.circlesTouch(state.player, enemy)) ||
      (state.jaguar && L.circlesTouch(state.player, state.jaguar)));
    const hit = L.resolveEnemyHit(state.lives, state.invulnerable, touching);
    if (hit.hit) {
      state.lives = hit.lives;
      state.invulnerable = hit.invulnerableSeconds;
      state.flash = 0.35;
      setStatus("앗! " + (fallingFruit ? "나무 열매가 떨어졌어요!" : "적과 마주쳤어요!") +
        " 목숨 -1 · 잠시 무적!");

      if (hit.dead) { finish(false); return; }
    }
    const nextCamera = L.cameraFor(state.player);
    // Camera follows the hero instead of shrinking the 2048 × 1536 map to 720 pixels.
    state.camera.x += (nextCamera.x - state.camera.x) * Math.min(1, seconds * 8);
    state.camera.y += (nextCamera.y - state.camera.y) * Math.min(1, seconds * 8);
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
  function onScreen(x, y, pad = 80) {
    return x >= state.camera.x - pad && x <= state.camera.x + L.SIZE + pad &&
      y >= state.camera.y - pad && y <= state.camera.y + L.SIZE + pad;
  }
  function drawGround() {
    const ground = ctx.createLinearGradient(0, 0, L.WORLD_WIDTH, L.WORLD_HEIGHT);
    ground.addColorStop(0, "#6aaf66");
    ground.addColorStop(.55, "#81b971");
    ground.addColorStop(1, "#468b5b");
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, L.WORLD_WIDTH, L.WORLD_HEIGHT);
    // Different regions give an expedition feel like EDUNI's existing jungle exploration.
    for (const zone of [
      { x: 0, y: 0, w: 950, h: 780, color: "#497e4d80" },
      { x: 1070, y: 0, w: 978, h: 830, color: "#356d4e66" },
      { x: 780, y: 950, w: 1268, h: 586, color: "#acc67855" },
      { x: 0, y: 1000, w: 620, h: 536, color: "#b0c78355" },
    ]) {
      ctx.fillStyle = zone.color; ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    }
    // Exploration trail: two meandering jungle paths, not hard rails.
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(124, 1325);
    ctx.bezierCurveTo(360, 1170, 335, 965, 650, 895);
    ctx.bezierCurveTo(885, 800, 1010, 1110, 1290, 1060);
    ctx.bezierCurveTo(1470, 990, 1490, 805, 1685, 938);
    ctx.strokeStyle = "#6e633f"; ctx.lineWidth = 101; ctx.stroke();
    ctx.strokeStyle = "#d7ba7d"; ctx.lineWidth = 85; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1685, 938);
    ctx.bezierCurveTo(1560, 660, 1820, 445, 1750, 350);
    ctx.bezierCurveTo(1700, 235, 1785, 155, 1890, 144);
    ctx.strokeStyle = "#6e633f"; ctx.lineWidth = 102; ctx.stroke();
    ctx.strokeStyle = "#dec78d"; ctx.lineWidth = 86; ctx.stroke();
    // A small waterfall and rock-ringed pond serve as a recognizable landmark.
    circle(1165, 240, 158, "#327d8199", "#b3e7b0", 16);
    circle(1165, 240, 112, "#48aabd", "#89e2e7", 10);
    circle(1160, 211, 64, "#d1f8e6a9");
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "54px system-ui"; ctx.fillText("💦", 1165, 226);
    ctx.font = "900 26px system-ui"; ctx.fillStyle = "#f3ffde";
    ctx.fillText("폭포 계곡", 1165, 352);
    // Deterministic undergrowth and canopy provide depth while limiting draw calls to the viewport.
    const minXi = Math.max(0, Math.floor((state.camera.x - 45) / 52));
    const maxXi = Math.min(Math.ceil(L.WORLD_WIDTH / 52), Math.ceil((state.camera.x + L.SIZE + 45) / 52));
    const minYi = Math.max(0, Math.floor((state.camera.y - 45) / 52));
    const maxYi = Math.min(Math.ceil(L.WORLD_HEIGHT / 52), Math.ceil((state.camera.y + L.SIZE + 45) / 52));
    for (let yi = minYi; yi <= maxYi; yi++) {
      for (let xi = minXi; xi <= maxXi; xi++) {
        const px = xi * 52 + 15 + (yi * 17 % 23), py = yi * 52 + 16 + (xi * 11 % 21);
        if ((xi * 17 + yi * 13) % 5 === 0) {
          circle(px, py, 8, "#316d4299");
          circle(px - 4, py - 4, 4, "#b5db7c");
        } else {
          ctx.fillStyle = (xi * 7 + yi * 11) % 3 === 0 ? "#aad18488" : "#5d995588";
          ctx.fillRect(px, py, 11, 5);
        }
      }
    }
    // Major landmarks help children recognize where they are, even with the map hidden.
    for (const marker of [
      { x: 175, y: 1370, icon: "⛺", label: "정글 야영지" },
      { x: 540, y: 480, icon: "🦋", label: "나비 숲" },
      { x: 1055, y: 1355, icon: "🌼", label: "꽃밭 쉼터" },
      { x: 1450, y: 425, icon: "🗿", label: "고대 유적" },
      { x: 1750, y: 810, icon: "🌴", label: "신비한 숲길" },
    ]) {
      if (!onScreen(marker.x, marker.y, 140)) continue;
      circle(marker.x, marker.y, 55, "#2f6f4599", "#d6eec1", 4);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "47px system-ui"; ctx.fillText(marker.icon, marker.x, marker.y);
      ctx.font = "900 21px system-ui"; ctx.fillStyle = "#fff7d6";
      ctx.fillText(marker.label, marker.x, marker.y + 76);
    }
    ctx.strokeStyle = "#244e34"; ctx.lineWidth = 30;
    ctx.strokeRect(11, 11, L.WORLD_WIDTH - 22, L.WORLD_HEIGHT - 22);
    for (let x = 30; x < L.WORLD_WIDTH; x += 43) {
      if (onScreen(x, 12, 40)) circle(x, 12, 21, "#2c7648");
      if (onScreen(x, L.WORLD_HEIGHT - 12, 40)) circle(x, L.WORLD_HEIGHT - 12, 21, "#347f4b");
    }
    for (let y = 35; y < L.WORLD_HEIGHT; y += 43) {
      if (onScreen(12, y, 40)) circle(12, y, 21, "#35814b");
      if (onScreen(L.WORLD_WIDTH - 12, y, 40)) circle(L.WORLD_WIDTH - 12, y, 21, "#2e7347");
    }
  }
  function drawObstacles() {
    L.OBSTACLES.forEach((rect, idx) => {
      if (!onScreen(rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h))) return;
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
  function drawShelters(time) {
    for (const shelter of state.shelters) {
      if (!onScreen(shelter.x, shelter.y, 125)) continue;
      if (shelter.status === "used") continue; // disappears permanently this round
      const occupied = state.hiding?.shelterId === shelter.id;
      const pulse = 2 * Math.sin(time * 5);
      const radius = shelter.radius + (occupied ? 7 : pulse);
      circle(shelter.x, shelter.y, radius + 7,
        occupied ? "#55e6bbaf" : "#d0ec9b72", occupied ? "#e0ffef" : "#f8efa9", 4);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "38px system-ui";
      ctx.fillText(shelter.kind === "bush" ? "🌿" : shelter.kind === "cave" ? "🕳️" : "🪵", shelter.x, shelter.y);
      if (occupied) {
        const progress = Math.max(0, state.hiding.remaining / state.hiding.max);
        ctx.beginPath(); ctx.arc(shelter.x, shelter.y, shelter.radius + 15,
          -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress);
        ctx.strokeStyle = progress < .25 ? "#ff7385" : "#fce68a";
        ctx.lineWidth = 9; ctx.stroke();
      }
      ctx.fillStyle = "#11342a"; ctx.font = "900 17px system-ui";
      ctx.fillText(occupied ? state.hiding.remaining.toFixed(1) + "초" :
        shelter.hideSeconds + "초 숨기", shelter.x, shelter.y + radius + 25);
    }
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
      if (!onScreen(h.x, h.y, 100)) return;
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
    const flicker = !state.hiding && state.invulnerable > 0 && Math.floor(time * 10) % 2 === 0;
    ctx.save();
    if (flicker) ctx.globalAlpha = 0.43;
    if (state.dashRemaining > 0 || state.escapeBoost > 0) {
      circle(p.x, p.y + 8, 45, "#9cefff70", "#fff3ac", 3);
    }
    circle(p.x, p.y + 8, 23, "#214d3999");
    circle(p.x, p.y, p.radius + 3, state.character === "explorer" ? "#ffe6a2" : "#f1e6ff", "#153b34", 4);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "42px system-ui";
    ctx.fillText(state.hiding ? "🙈" : state.character === "explorer" ? "🧒" : "🐰", p.x, p.y - 5);
    ctx.restore();
    if (state.invulnerable > 0 && !state.hiding) {
      circle(p.x, p.y, 33, null, "#e9fff0", 3);
    }
  }
  function drawMiniMap() {
    const mx = L.SIZE - 185, my = 16, mw = 169, mh = 126;
    const sx = mw / L.WORLD_WIDTH, sy = mh / L.WORLD_HEIGHT;
    ctx.save();
    rounded(mx - 5, my - 5, mw + 10, mh + 28, 14, "#0a332be8", "#d4ebba", 3);
    ctx.fillStyle = "#78aa6f"; ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = "#3d7452";
    for (const zone of L.WORLD_AREAS) {
      ctx.fillRect(mx + zone.x * sx, my + zone.y * sy, zone.w * sx, zone.h * sy);
    }
    for (const shelter of state.shelters) if (shelter.status === "available") {
      circle(mx + shelter.x * sx, my + shelter.y * sy, 2.8, "#fff1a2");
    }
    const goal = state.keyCollected ? L.EXIT : L.KEY;
    circle(mx + goal.x * sx, my + goal.y * sy, 5, "#ffe889", "#744c10", 2);
    for (const enemy of [...state.enemies, ...(state.jaguar ? [state.jaguar] : [])])
      circle(mx + enemy.x * sx, my + enemy.y * sy, 3.4, "#e95453");
    ctx.strokeStyle = "#e5ffee"; ctx.lineWidth = 1.7;
    ctx.strokeRect(mx + state.camera.x * sx, my + state.camera.y * sy, L.SIZE * sx, L.SIZE * sy);
    circle(mx + state.player.x * sx, my + state.player.y * sy, 5.5, "#fffef1", "#163d35", 2);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#f3ffdf"; ctx.font = "900 16px system-ui";
    ctx.fillText("🗺️ 정글 전체 지도", mx + mw / 2, my + mh + 16);
    ctx.restore();
  }
  function draw() {
    if (!state) return;
    const time = state.seconds;
    ctx.clearRect(0, 0, L.SIZE, L.SIZE);
    ctx.save();
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (state.flash > 0 && !reduced) {
      ctx.translate(Math.sin(time * 150) * 4 * state.flash, Math.cos(time * 110) * 4 * state.flash);
    }
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);
    drawGround();
    drawObstacles();
    drawShelters(time);
    drawHazards(time);
    drawExit(time);
    drawKey(time);
    for (const star of state.stars) if (!star.collected) drawStar(star.x, star.y, time);
    for (const enemy of state.enemies) drawEnemy(enemy, time);
    if (state.jaguar) drawEnemy(state.jaguar, time);
    drawPlayer(time);
    ctx.restore(); // World space ends; HUD and effects stay fixed to the viewport.
    drawMiniMap();
    if (L.remainingTime(time, state.mode) <= 20) {
      ctx.fillStyle = "rgba(180,20,45," + (0.09 + Math.max(0,Math.sin(time * 5)) * 0.11) + ")";
      ctx.fillRect(0, 0, L.SIZE, 18);
    }
    if (state.flash > 0) {
      ctx.fillStyle = "rgba(255,100,90," + (state.flash * 0.28) + ")";
      ctx.fillRect(0, 0, L.SIZE, L.SIZE);
    }
    ctx.restore();
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