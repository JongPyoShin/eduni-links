export function createInput({ stick, interact, onInteract = () => {}, onCodex = () => {}, onClose = () => {}, onNavigate = () => {}, gamepadProvider } = {}) {
  const held = new Set();
  const listeners = [];
  let pointerId = null;
  let stickDirection = { x: 0, y: 0 };
  let disposed = false;
  let gamepadIndex = null, gamepadButtons = { a: false, b: false }, gamepadNavAt = 0;
  let gamepadNeedsNeutral = false;
  let previousModal = null;
  let companionOpen = false;
  const getGamepads = gamepadProvider || (() => globalThis.navigator?.getGamepads?.() || []);
  const thumb = stick?.querySelector?.('.stick-thumb');
  const renderThumb = () => {
    if (!thumb?.style) return;
    const bounds = stick.getBoundingClientRect();
    const thumbBounds = thumb.getBoundingClientRect();
    const travel = Math.max(0, (Math.min(bounds.width, bounds.height) - Math.max(thumbBounds.width, thumbBounds.height)) / 2 - 4);
    thumb.style.transform = `translate(${stickDirection.x * travel}px, ${stickDirection.y * travel}px)`;
  };

  const listen = (target, type, handler, options) => {
    if (!target?.addEventListener) return;
    target.addEventListener(type, handler, options);
    listeners.push([target, type, handler, options]);
  };
  const clear = () => {
    held.clear();
    stickDirection = { x: 0, y: 0 };
    gamepadDirection = { x: 0, y: 0 };
    renderThumb();
    if (pointerId !== null) {
      try { if (stick?.hasPointerCapture?.(pointerId)) stick.releasePointerCapture?.(pointerId); } catch {}
    }
    pointerId = null;
  };
  const direction = () => {
    const keyboardX = (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0);
    const keyboardY = (held.has("down") ? 1 : 0) - (held.has("up") ? 1 : 0);
    let x = keyboardX || stickDirection.x || gamepadDirection.x;
    let y = keyboardY || stickDirection.y || gamepadDirection.y;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    return { x, y };
  };
  let gamepadDirection = { x: 0, y: 0 };
  const pollGamepad = ({ modal = false, enabled = true, now = globalThis.performance?.now?.() ?? Date.now() } = {}) => {
    if (previousModal !== null && modal !== previousModal) { gamepadNeedsNeutral = true; gamepadNavAt = 0; }
    previousModal = modal;
    let pads;
    try { pads = enabled ? Array.from(getGamepads() || []) : []; } catch { gamepadNeedsNeutral = true; gamepadDirection = { x: 0, y: 0 }; return; }
    const pad = gamepadIndex === null ? [...(pads || [])].find(item => item?.connected) : pads?.[gamepadIndex];
    if (!pad?.connected) {
      if (gamepadIndex !== null) gamepadNeedsNeutral = true;
      gamepadIndex = null; gamepadDirection = { x: 0, y: 0 }; gamepadButtons = { a: false, b: false }; gamepadNavAt = 0;
      return;
    }
    gamepadIndex = pad.index;
    const finiteAxis = value => Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
    let x = finiteAxis(pad.axes?.[0]), y = finiteAxis(pad.axes?.[1]);
    const magnitude = Math.hypot(x, y), deadzone = 0.2;
    if (magnitude <= deadzone) x = y = 0;
    else { const scale = Math.min(1, (magnitude - deadzone) / (1 - deadzone)) / magnitude; x *= scale; y *= scale; }
    const pressed = index => { try { return !!pad.buttons?.[index]?.pressed; } catch { return false; } };
    const left = pressed(14), right = pressed(15), up = pressed(12), down = pressed(13);
    if (!x) x = Number(right) - Number(left);
    if (!y) y = Number(down) - Number(up);
    const a = pressed(0), b = pressed(1), neutral = !a && !b && !left && !right && !up && !down && magnitude <= deadzone;
    if (!enabled) { gamepadNeedsNeutral = true; gamepadDirection = { x: 0, y: 0 }; gamepadButtons = { a, b }; return; }
    if (gamepadNeedsNeutral) { if (neutral) gamepadNeedsNeutral = false; gamepadDirection = { x: 0, y: 0 }; gamepadButtons = { a, b }; return; }
    gamepadDirection = { x, y };
    if (modal) {
      const nav = Math.abs(x) >= Math.abs(y) ? Math.sign(x) : Math.sign(y);
      if (nav && (!gamepadNavAt || now >= gamepadNavAt)) { onNavigate(nav); gamepadNavAt = now + 350; }
      if (!nav) gamepadNavAt = 0;
      if (a && !gamepadButtons.a) onInteract(true);
      if (b && !gamepadButtons.b) onClose();
    } else if (a && !gamepadButtons.a) onInteract(false);
    gamepadButtons = { a, b };
  };
  const releaseGamepad = () => { gamepadNeedsNeutral = true; gamepadDirection = { x: 0, y: 0 }; gamepadNavAt = 0; };
  const movementKeys = new Map([
    ["KeyA", "left"], ["ArrowLeft", "left"],
    ["KeyD", "right"], ["ArrowRight", "right"],
    ["KeyW", "up"], ["ArrowUp", "up"],
    ["KeyS", "down"], ["ArrowDown", "down"],
  ]);
  const isEditable = (target) => target?.closest?.("input, textarea, select, [contenteditable='true']");
  const isNativeAction = (target) => target?.closest?.("button, a, summary, [role='button']");
  const isModal = (target) => target?.closest?.("[role='dialog']");
  const isCompanionTarget = (target) => target?.closest?.("#eduni-companion-layer");

  const keydown = (event) => {
    if (companionOpen || isCompanionTarget(event.target)) return;
    // Some Bluetooth controllers send keyboard arrows instead of Gamepad events.
    if (!isEditable(event.target) && isModal(event.target) && event.code?.startsWith('Arrow')) {
      onNavigate(event.code === 'ArrowDown' || event.code === 'ArrowRight' ? 1 : -1);
      event.preventDefault?.();
      return;
    }
    if (isEditable(event.target) || isNativeAction(event.target) || isModal(event.target)) return;
    const move = movementKeys.get(event.code);
    if (move) {
      held.add(move);
      event.preventDefault?.();
    } else if (!event.repeat && (event.code === "Enter" || event.code === "Space")) {
      onInteract();
      event.preventDefault?.();
    } else if (!event.repeat && event.code === "KeyC") {
      onCodex();
    }
  };
  const keyup = (event) => {
    const move = movementKeys.get(event.code);
    if (move) held.delete(move);
  };
  const pointerdown = (event) => {
    if (event.isPrimary === false || pointerId !== null) return;
    pointerId = event.pointerId;
    try { stick?.setPointerCapture?.(pointerId); }
    catch { pointerId = null; stickDirection = { x: 0, y: 0 }; renderThumb(); return; }
    updateStick(event);
    event.preventDefault?.();
  };
  const updateStick = (event) => {
    if (event.pointerId !== pointerId || !stick?.getBoundingClientRect) return;
    const bounds = stick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(bounds.width, bounds.height) / 2);
    let x = (event.clientX - (bounds.left + bounds.width / 2)) / radius;
    let y = (event.clientY - (bounds.top + bounds.height / 2)) / radius;
    const length = Math.hypot(x, y);
    if (length < 0.12) { x = 0; y = 0; }
    else if (length > 1) { x /= length; y /= length; }
    stickDirection = { x, y };
    renderThumb();
    event.preventDefault?.();
  };
  const endPointer = (event) => {
    if (event.pointerId !== pointerId) return;
    stickDirection = { x: 0, y: 0 };
    pointerId = null;
    renderThumb();
  };
  const lostCapture = (event) => {
    if (event.target !== stick || stick?.hasPointerCapture?.(event.pointerId)) return;
    endPointer(event);
  };
  const visibility = () => { if (globalThis.document?.hidden) { clear(); releaseGamepad(); } };

  listen(globalThis.window, "keydown", keydown);
  listen(globalThis.window, "keyup", keyup);
  listen(globalThis.window, "eduni-companion-visibility", (event) => {
    companionOpen = !!event.detail?.open;
    clear();
    releaseGamepad();
  });
  listen(globalThis.window, "blur", () => { clear(); releaseGamepad(); });
  listen(globalThis.document, "focusin", (event) => { if (isEditable(event.target) || isNativeAction(event.target) || isModal(event.target)) clear(); });
  listen(globalThis.document, "visibilitychange", visibility);
  listen(stick, "pointerdown", pointerdown);
  listen(stick, "pointermove", updateStick);
  listen(stick, "pointerup", endPointer);
  listen(stick, "pointercancel", endPointer);
  listen(stick, "lostpointercapture", lostCapture);
  listen(globalThis.window, "pointerup", endPointer);
  listen(globalThis.window, "pointercancel", endPointer);
  listen(interact, "click", onInteract);

  return {
    direction,
    pollGamepad,
    releaseGamepad,
    clear,
    dispose() {
      if (disposed) return;
      disposed = true;
      clear();
      for (const [target, type, handler, options] of listeners) target.removeEventListener(type, handler, options);
      listeners.length = 0;
    },
  };
}
