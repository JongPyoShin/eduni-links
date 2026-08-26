import test from "node:test";
import assert from "node:assert/strict";
import { ModalController } from "../src/modal.js";

test("modal blocks movement when open", () => {
  const m = new ModalController();
  assert.equal(m.blocksMovement(), false);
  m.openModal({ name: "Bluebird" });
  assert.equal(m.open, true);
  assert.equal(m.blocksMovement(), true);
  m.closeModal();
  assert.equal(m.blocksMovement(), false);
});

test("modal toggle closes when open", () => {
  const m = new ModalController();
  m.openModal({});
  m.toggle();
  assert.equal(m.open, false);
});
