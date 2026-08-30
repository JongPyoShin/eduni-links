export class InputController {
  constructor({ gamepadProvider } = {}) {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.interactEdge = false;
    this.closeEdge = false;
    this.debugEdge = false;
    this.resetEdge = false;
    this.navigateEdge = 0;
    this.activityEdge = false;
    this.gamepadIndex = null;
    this.gamepadDirection = { x: 0, y: 0 };
    this.gamepadNavHeld = false;
    this.gamepadButtons = { a: false, b: false };
    this.keyboardNavHeld = new Set();
    this.qaCommandObserver = null;
    this.qaCommandElement = null;
    this.qaInputPanel = null;
    this.qaClickSequence = 0;
    this.gamepadProvider = gamepadProvider || (() => (typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : []));
    this._bind();
  }

  _dir() {
    return {
      x: (this.right ? 1 : 0) - (this.left ? 1 : 0),
      y: (this.down ? 1 : 0) - (this.up ? 1 : 0),
    };
  }

  direction() {
    const keyboard = this._dir();
    if (keyboard.x || keyboard.y) return keyboard;
    return this.gamepadDirection;
  }

  getDigitalState() {
    return {
      left: this.left,
      right: this.right,
      up: this.up,
      down: this.down,
      direction: this.direction(),
      interactPending: this.interactEdge,
      closePending: this.closeEdge,
    };
  }

  setDigitalAction(action, down) {
    const active = Boolean(down);
    if (action === "interact") {
      if (active) {
        this.interactEdge = true;
        this.activityEdge = true;
      }
      return true;
    }
    if (action === "close") {
      if (active) {
        this.closeEdge = true;
        this.activityEdge = true;
      }
      return true;
    }
    if (!["left", "right", "up", "down"].includes(action)) return false;

    this[action] = active;
    if (active) {
      if (action === "left" || action === "up") this.navigateEdge = -1;
      if (action === "right" || action === "down") this.navigateEdge = 1;
      this.activityEdge = true;
    }
    return true;
  }

  pollGamepad() {
    const pads = this.gamepadProvider() || [];
    let pad = this.gamepadIndex !== null ? pads[this.gamepadIndex] : null;
    if (!pad || !pad.connected) {
      this.gamepadIndex = null;
      pad = Array.from(pads || []).find((candidate) => candidate?.connected) || null;
      if (pad) this.gamepadIndex = pad.index;
    }
    if (!pad) {
      this.gamepadDirection = { x: 0, y: 0 };
      this.gamepadNavHeld = false;
      return;
    }
    const axisX = pad.axes?.[0] || 0;
    const axisY = pad.axes?.[1] || 0;
    const magnitude = Math.hypot(axisX, axisY);
    const deadzone = 0.25;
    const analog = magnitude > deadzone ? { x: axisX / magnitude * Math.min(1, (magnitude - deadzone) / (1 - deadzone)), y: axisY / magnitude * Math.min(1, (magnitude - deadzone) / (1 - deadzone)) } : { x: 0, y: 0 };
    const dpadX = (pad.buttons?.[15]?.pressed ? 1 : 0) - (pad.buttons?.[14]?.pressed ? 1 : 0);
    const dpadY = (pad.buttons?.[13]?.pressed ? 1 : 0) - (pad.buttons?.[12]?.pressed ? 1 : 0);
    this.gamepadDirection = magnitude > deadzone ? analog : { x: dpadX, y: dpadY };
    const menuDirection = Math.abs(this.gamepadDirection.x) >= Math.abs(this.gamepadDirection.y) ? Math.sign(this.gamepadDirection.x) : Math.sign(this.gamepadDirection.y);
    if (menuDirection && !this.gamepadNavHeld) {
      this.navigateEdge = menuDirection;
      this.gamepadNavHeld = true;
      this.activityEdge = true;
    } else if (!menuDirection) {
      this.gamepadNavHeld = false;
    }
    const a = Boolean(pad.buttons?.[0]?.pressed);
    const b = Boolean(pad.buttons?.[1]?.pressed);
    if (a && !this.gamepadButtons.a) this.interactEdge = true;
    if (b && !this.gamepadButtons.b) this.closeEdge = true;
    if (a !== this.gamepadButtons.a || b !== this.gamepadButtons.b || menuDirection) this.activityEdge = true;
    this.gamepadButtons = { a, b };
  }

  consumeInteract() {
    const v = this.interactEdge;
    this.interactEdge = false;
    return v;
  }

  consumeClose() {
    const v = this.closeEdge;
    this.closeEdge = false;
    return v;
  }

  consumeDebug() {
    const v = this.debugEdge;
    this.debugEdge = false;
    return v;
  }

  consumeReset() {
    const v = this.resetEdge;
    this.resetEdge = false;
    return v;
  }

  consumeNavigate() {
    const v = this.navigateEdge;
    this.navigateEdge = 0;
    return v;
  }

  consumeActivity() {
    const value = this.activityEdge;
    this.activityEdge = false;
    return value;
  }

  _bind() {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", (e) => this._onKey(e, true));
    window.addEventListener("keyup", (e) => this._onKey(e, false));
    this._bindDpad();
    this._bindQaDom();
  }

  _onKey(e, down) {
    switch (e.code) {
      case "ArrowLeft":
        this.left = down;
        if (down && !this.keyboardNavHeld.has(e.code)) this.navigateEdge = -1;
        if (down) this.keyboardNavHeld.add(e.code); else this.keyboardNavHeld.delete(e.code);
        if (down) this.activityEdge = true;
        break;
      case "ArrowRight":
        this.right = down;
        if (down && !this.keyboardNavHeld.has(e.code)) this.navigateEdge = 1;
        if (down) this.keyboardNavHeld.add(e.code); else this.keyboardNavHeld.delete(e.code);
        if (down) this.activityEdge = true;
        break;
      case "ArrowUp":
        this.up = down;
        if (down && !this.keyboardNavHeld.has(e.code)) this.navigateEdge = -1;
        if (down) this.keyboardNavHeld.add(e.code); else this.keyboardNavHeld.delete(e.code);
        if (down) this.activityEdge = true;
        break;
      case "ArrowDown":
        this.down = down;
        if (down && !this.keyboardNavHeld.has(e.code)) this.navigateEdge = 1;
        if (down) this.keyboardNavHeld.add(e.code); else this.keyboardNavHeld.delete(e.code);
        if (down) this.activityEdge = true;
        break;
      case "Enter":
      case "Space":
      case "KeyA":
        if (down) { this.interactEdge = true; this.activityEdge = true; }
        e.preventDefault();
        break;
      case "Escape":
      case "KeyB":
        if (down) { this.closeEdge = true; this.activityEdge = true; }
        break;
      case "Backquote":
        if (down) { this.debugEdge = true; this.activityEdge = true; }
        break;
      case "KeyR":
        if (down) { this.resetEdge = true; this.activityEdge = true; }
        break;
      default:
        return;
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
  }

  _bindDpad() {
    const map = {
      "dpad-left": "left",
      "dpad-right": "right",
      "dpad-up": "up",
      "dpad-down": "down",
      "dpad-a": "interact",
      "dpad-b": "close",
    };
    for (const [id, action] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (!el) continue;
      const set = (v) => this.setDigitalAction(action, v);
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        set(true);
      });
      el.addEventListener("pointerup", () => set(false));
      el.addEventListener("pointerleave", () => set(false));
      el.addEventListener("pointercancel", () => set(false));
    }
  }

  _qaRecord(action, state, accepted = true, source = "command") {
    const el = this.qaCommandElement;
    if (!el) return;
    const token = `${source}:${++this.qaClickSequence}:${action}:${state}`;
    el.dataset.lastApplied = token;
    el.dataset.accepted = accepted ? "true" : "false";
    el.dataset.action = accepted ? action : "";
    el.dataset.state = accepted ? state : "";
    el.dataset.direction = JSON.stringify(this.direction());
    el.dataset.source = source;
  }

  _qaPulse(action, durationMs = 1000) {
    const accepted = this.setDigitalAction(action, true);
    this._qaRecord(action, "down", accepted, "click");
    if (!accepted) return false;
    const holdMs = action === "interact" || action === "close" ? 80 : durationMs;
    window.setTimeout(() => {
      this.setDigitalAction(action, false);
      this._qaRecord(action, "up", true, "click");
    }, holdMs);
    return true;
  }

  _ensureQaClickPanel() {
    if (typeof document === "undefined") return null;
    let panel = document.getElementById("qa-input-panel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "qa-input-panel";
    panel.dataset.contract = "eduni-jungle-click-input-v2";
    panel.dataset.holdDurations = "1000,250,100";
    panel.setAttribute("aria-label", "QA input controls");
    panel.style.cssText = "position:fixed;right:10px;top:54px;z-index:50;display:grid;grid-template-columns:repeat(4,62px);gap:5px;padding:8px;border-radius:10px;background:rgba(0,0,0,.72);font:11px system-ui;color:#fff;max-height:calc(100vh - 64px);overflow:auto;";

    const controls = [
      { id: "qa-hold-up", label: "↑ 1s", action: "up", duration: 1000 },
      { id: "qa-hold-down", label: "↓ 1s", action: "down", duration: 1000 },
      { id: "qa-hold-left", label: "← 1s", action: "left", duration: 1000 },
      { id: "qa-hold-right", label: "→ 1s", action: "right", duration: 1000 },
      { id: "qa-nudge-up", label: "↑ 250", action: "up", duration: 250 },
      { id: "qa-nudge-down", label: "↓ 250", action: "down", duration: 250 },
      { id: "qa-nudge-left", label: "← 250", action: "left", duration: 250 },
      { id: "qa-nudge-right", label: "→ 250", action: "right", duration: 250 },
      { id: "qa-fine-up", label: "↑ 100", action: "up", duration: 100 },
      { id: "qa-fine-down", label: "↓ 100", action: "down", duration: 100 },
      { id: "qa-fine-left", label: "← 100", action: "left", duration: 100 },
      { id: "qa-fine-right", label: "→ 100", action: "right", duration: 100 },
      { id: "qa-interact", label: "QA A", action: "interact", duration: 80 },
      { id: "qa-close", label: "QA B", action: "close", duration: 80 },
    ];

    for (const spec of controls) {
      const button = document.createElement("button");
      button.id = spec.id;
      button.type = "button";
      button.textContent = spec.label;
      button.dataset.action = spec.action;
      button.dataset.durationMs = String(spec.duration);
      button.style.cssText = "min-height:34px;border:1px solid rgba(255,255,255,.45);border-radius:7px;background:rgba(255,255,255,.14);color:#fff;font:700 10px system-ui;";
      button.addEventListener("click", () => this._qaPulse(spec.action, spec.duration));
      panel.appendChild(button);
    }

    document.body.appendChild(panel);
    this.qaInputPanel = panel;
    return panel;
  }

  _bindQaDom() {
    if (typeof document === "undefined") return;
    const query = (globalThis.location?.search || "").replaceAll("\\&", "&");
    if (new URLSearchParams(query).get("qa") !== "1") return;

    let el = document.getElementById("qa-input-command");
    if (!el) {
      el = document.createElement("output");
      el.id = "qa-input-command";
      el.hidden = true;
      el.dataset.contract = "eduni-jungle-input-v1";
      el.dataset.lastApplied = "";
      document.body.appendChild(el);
    }
    this.qaCommandElement = el;
    this._ensureQaClickPanel();

    if (typeof MutationObserver === "undefined") return;
    const applyCommand = () => {
      const raw = el.dataset.command || "";
      if (!raw || raw === el.dataset.lastApplied) return;
      const [sequence, action, state] = raw.split(":");
      const validState = state === "down" || state === "up";
      const accepted = Boolean(sequence) && validState && this.setDigitalAction(action, state === "down");
      el.dataset.lastApplied = raw;
      el.dataset.accepted = accepted ? "true" : "false";
      el.dataset.action = accepted ? action : "";
      el.dataset.state = accepted ? state : "";
      el.dataset.direction = JSON.stringify(this.direction());
      el.dataset.source = "command";
    };

    this.qaCommandObserver = new MutationObserver(applyCommand);
    this.qaCommandObserver.observe(el, { attributes: true, attributeFilter: ["data-command"] });
    applyCommand();
  }
}
