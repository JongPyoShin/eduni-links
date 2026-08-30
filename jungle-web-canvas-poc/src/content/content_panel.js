export class ContentPanelController {
  constructor() {
    this.open = false;
    this.payload = null;
    this.focusIndex = 0;
    this.selected = new Set();
  }

  openPanel(payload) {
    this.open = true;
    this.payload = payload;
    this.focusIndex = 0;
    this.selected = new Set();
  }

  closePanel() {
    this.open = false;
    this.payload = null;
    this.focusIndex = 0;
    this.selected = new Set();
  }

  blocksMovement() {
    return this.open;
  }

  moveChoice(step) {
    const choices = this.payload?.choices || [];
    if (!choices.length || !step) return;
    this.focusIndex = (this.focusIndex + step + choices.length) % choices.length;
  }

  activate() {
    const choices = this.payload?.choices || [];
    if (!this.open) return { type: "none" };
    if (!choices.length) return { type: "confirm", kind: this.payload.kind };
    const choice = choices[this.focusIndex];
    if (this.payload.choiceMode === "single") {
      this.selected = new Set([choice.id]);
      return { type: "choice", kind: this.payload.kind, choice, complete: true };
    }
    this.selected.add(choice.id);
    return { type: "choice", kind: this.payload.kind, choice, complete: this.selected.size === choices.length };
  }

  setResponse(text, tone = "neutral") {
    this.payload = { ...this.payload, response: text, responseTone: tone };
  }
}

export function renderContentPanel(panel, modalEl) {
  modalEl.style.display = panel.open ? "flex" : "none";
  if (!panel.open) return;
  const p = panel.payload;
  modalEl.querySelector(".card").className = `card${p.responseTone === "gentle" ? " gentle-shake" : ""}${p.kind === "reward" ? " reward-reveal" : ""}`;
  modalEl.querySelector("#modal-title").textContent = p.title;
  modalEl.querySelector("#modal-body").textContent = p.body || "";
  modalEl.querySelector("#modal-progress").textContent = p.progress || "";
  const image = modalEl.querySelector("#modal-img");
  image.style.display = p.img ? "block" : "none";
  if (p.img) image.src = p.img;
  const badge = modalEl.querySelector("#reward-badge");
  badge.style.display = p.badge ? "grid" : "none";
  if (p.badge) {
    if (p.badgeIcon) badge.textContent = p.badgeIcon;
    badge.setAttribute("aria-label", p.badgeLabel || p.title || "탐험 배지");
  }
  const choices = modalEl.querySelector("#modal-choices");
  choices.replaceChildren();
  for (const [index, choice] of (p.choices || []).entries()) {
    const row = document.createElement("div");
    row.className = `choice${index === panel.focusIndex ? " focused" : ""}${panel.selected.has(choice.id) ? " selected" : ""}`;
    row.textContent = `${panel.selected.has(choice.id) ? "✓" : "○"} ${choice.label}`;
    choices.append(row);
  }
  const response = modalEl.querySelector("#modal-response");
  response.textContent = p.response || "";
  response.className = p.response ? `response ${p.responseTone || ""}` : "response";
  const summary = modalEl.querySelector("#reward-summary");
  summary.replaceChildren();
  if (p.checklist) {
    for (const [index, item] of p.checklist.entries()) {
      const line = document.createElement("div");
      line.className = "reward-item";
      line.style.animationDelay = `${400 + index * 180}ms`;
      line.textContent = `✓ ${item}`;
      summary.append(line);
    }
  }
  const confirm = modalEl.querySelector("#modal-confirm");
  confirm.textContent = p.confirmLabel || (p.choices ? "선택하기" : "계속");
  confirm.style.display = p.choices || (p.kind === "reward" && !p.revealReady) || p.autoProgress ? "none" : "inline-flex";
  modalEl.querySelector("#modal-hint").textContent = p.autoProgress ? "잠깐만 기다려 줘!" : p.choices ? "어느 방향키로도 고르고 A로 선택 · B / Escape로 닫기" : p.kind === "reward" && !p.revealReady ? "배지를 준비하고 있어…" : "A / Enter로 계속 · B / Escape로 닫기";
}
