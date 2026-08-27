export const WORLD = {
  WIDTH: 1600,
  HEIGHT: 1200,
  GROUND_COLOR: "#2f6b3a",
  GROUND_COLOR_ALT: "#356f3f",
};

export const PLAYER = {
  FRAME_W: 192,
  FRAME_H: 256,
  PIVOT: { x: 96, y: 232 },
  DISPLAY_W: 112,
  WALK_STEP_MS: 140,
  ASSET_ROOT: "./assets/player/",
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
  VISUAL: { x: 1410, y: 400 },
  NAME: "Bluebird",
  FACT: "Camp bluebirds nest in hollow logs near the ridge lookout.",
};

export const DEBUG_KEY = "Backquote";
export const ASSET_ROOT = "./assets/";
