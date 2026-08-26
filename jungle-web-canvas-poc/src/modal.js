export class ModalController {
  constructor() {
    this.open = false;
    this.payload = null;
  }

  openModal(payload) {
    this.open = true;
    this.payload = payload;
  }

  closeModal() {
    this.open = false;
    this.payload = null;
  }

  blocksMovement() {
    return this.open;
  }

  toggle(payload) {
    if (this.open) this.closeModal();
    else this.openModal(payload);
  }
}
