export class InputController {
  constructor() {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.interactEdge = false;
    this.closeEdge = false;
    this.debugEdge = false;
    this.resetEdge = false;
    this.navigateEdge = 0;
    this._bind();
  }

  _dir() {
    return {
      x: (this.right ? 1 : 0) - (this.left ? 1 : 0),
      y: (this.down ? 1 : 0) - (this.up ? 1 : 0),
    };
  }

  direction() {
    return this._dir();
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

  _bind() {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", (e) => this._onKey(e, true));
    window.addEventListener("keyup", (e) => this._onKey(e, false));
    this._bindDpad();
  }

  _onKey(e, down) {
    switch (e.code) {
      case "ArrowLeft":
        this.left = down;
        if (down) this.navigateEdge = -1;
        break;
      case "ArrowRight":
        this.right = down;
        if (down) this.navigateEdge = 1;
        break;
      case "ArrowUp":
        this.up = down;
        break;
      case "ArrowDown":
        this.down = down;
        break;
      case "Enter":
      case "Space":
      case "KeyA":
        if (down) this.interactEdge = true;
        e.preventDefault();
        break;
      case "Escape":
      case "KeyB":
        if (down) this.closeEdge = true;
        break;
      case "Backquote":
        if (down) this.debugEdge = true;
        break;
      case "KeyR":
        if (down) this.resetEdge = true;
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
      const set = (v) => {
        if (action === "interact") {
          if (v) this.interactEdge = true;
        } else if (action === "close") {
          if (v) this.closeEdge = true;
        } else {
          this[action] = v;
          if (v && action === "left") this.navigateEdge = -1;
          if (v && action === "right") this.navigateEdge = 1;
        }
      };
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        set(true);
      });
      el.addEventListener("pointerup", () => set(false));
      el.addEventListener("pointerleave", () => set(false));
      el.addEventListener("pointercancel", () => set(false));
    }
  }
}
