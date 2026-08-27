import test from "node:test";
import assert from "node:assert/strict";
import { InputController } from "../src/input.js";
import { AudioManager } from "../src/audio.js";
import { EFFECT_PRESETS, EffectSystem } from "../src/effects.js";

function pad({ x = 0, y = 0, buttons = {} } = {}) {
  return { index: 0, connected: true, axes: [x, y], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: Boolean(buttons[i]) })) };
}

test("gamepad analog deadzone and normalized direction", () => {
  let current = pad({ x: 0.2, y: 0.1 });
  const input = new InputController({ gamepadProvider: () => [current] });
  input.pollGamepad();
  assert.deepEqual(input.direction(), { x: 0, y: 0 });
  current = pad({ x: 0.8, y: 0.6 });
  input.pollGamepad();
  const direction = input.direction();
  assert.ok(direction.x > 0 && direction.y > 0);
  assert.ok(Math.hypot(direction.x, direction.y) <= 1);
});

test("gamepad d-pad maps to continuous movement and menu direction", () => {
  let current = pad({ buttons: { 12: true, 14: true } });
  const input = new InputController({ gamepadProvider: () => [current] });
  input.pollGamepad();
  assert.deepEqual(input.direction(), { x: -1, y: -1 });
  assert.equal(input.consumeNavigate(), -1);
  input.pollGamepad();
  assert.equal(input.consumeNavigate(), 0, "held d-pad must not repeat menu navigation");
  current = pad();
  input.pollGamepad();
  current = pad({ buttons: { 15: true } });
  input.pollGamepad();
  assert.equal(input.consumeNavigate(), 1);
});

test("gamepad A/B are edge-triggered", () => {
  let current = pad({ buttons: { 0: true, 1: true } });
  const input = new InputController({ gamepadProvider: () => [current] });
  input.pollGamepad();
  assert.equal(input.consumeInteract(), true);
  assert.equal(input.consumeClose(), true);
  input.pollGamepad();
  assert.equal(input.consumeInteract(), false);
  assert.equal(input.consumeClose(), false);
  current = pad(); input.pollGamepad();
  current = pad({ buttons: { 0: true } }); input.pollGamepad();
  assert.equal(input.consumeInteract(), true);
});

test("audio routes named cues and remains safe before browser audio unlock", () => {
  const audio = new AudioManager({ contextFactory: () => null });
  assert.equal(audio.play("clueFound"), false);
  assert.equal(audio.lastEvent, "clueFound");
  audio.setGain("master", 0.7);
  assert.equal(audio.gains.master, 0.7);
  assert.equal(audio.unlock(), false);
  audio.play("rewardFanfare");
  assert.equal(audio.eventCounts.get("rewardFanfare"), 1);
  audio.setAmbience("forest", true);
  assert.equal(audio.ambience.forest, true);
});

test("effect presets are capped and expire through the lifecycle", () => {
  const effects = new EffectSystem({ maxParticles: 5 });
  assert.ok(EFFECT_PRESETS.includes("sparkle"));
  assert.equal(effects.spawn("sparkle", 10, 20), 5);
  assert.equal(effects.activeCount, 5);
  for (let i = 0; i < 20; i++) effects.update(50);
  assert.equal(effects.activeCount, 0);
  assert.equal(effects.spawn("missing", 0, 0), 0);
});
