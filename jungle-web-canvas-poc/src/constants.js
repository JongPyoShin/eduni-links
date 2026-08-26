export const WORLD = {
  WIDTH: 1600,
  HEIGHT: 1200,
  GROUND_COLOR: "#2f6b3a",
  GROUND_COLOR_ALT: "#356f3f",
};

export const PLAYER = {
  SRC_W: 432,
  SRC_H: 1024,
  PIVOT_FRAC: { x: 0.5, y: 0.90625 },
  DISPLAY_W: 112,
  DISPLAY_H: Math.round(112 * (1024 / 432)),
  CONTRACT_REF_W: 192,
  CONTRACT_REF_H: 256,
  CONTRACT_PIVOT: { x: 96, y: 232 },
};

export const MOVEMENT = {
  PRECISION_RATIO: 0.45,
  CRUISE_RATIO: 0.75,
  PRECISION_HOLD_MS: 100,
  ACCELERATION_MS: 400,
  SPEED_MAX: 260,
};

export const CAMERA = {
  ZOOM: 1,
  FOLLOW_LERP: 0.18,
};

export const BLUEBIRD = {
  INTERACT_RADIUS: 64,
  WORLD: { x: 1300, y: 420 },
  NAME: "Bluebird",
  FACT: "Camp bluebirds nest in hollow logs near the ridge lookout.",
};

export const DEBUG_KEY = "Backquote";
export const ASSET_ROOT = "./assets/";
