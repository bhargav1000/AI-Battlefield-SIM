// === Map ===
export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 30;
export const TILE_SIZE = 32;

// === Execution ===
export const TICKS_PER_TURN = 30;
export const TICK_INTERVAL_MS = 150; // ms between ticks during execution animation

// === Movement ===
export const BASE_SPEED = 0.8; // tiles per tick
export const FORMATION_SPEED_MOD: Record<string, number> = {
  line: 1.0,
  column: 1.3,
  square: 0.5,
  loose: 1.1,
};
export const TERRAIN_MOVEMENT_COST: Record<string, number> = {
  open: 1.0,
  hill: 1.4,
  forest: 1.3,
  rough: 1.5,
};
export const FATIGUE_PER_MOVE_TICK = 0.01;
export const FATIGUE_RECOVERY_PER_TICK = 0.005;

// === Formation ===
export const FORMATION_CHANGE_TICKS = 3;
export const DISENGAGE_TICKS = 2;

export const FORMATION_ATTACK_MOD: Record<string, number> = {
  line: 1.15,
  column: 0.9,
  square: 0.75,
  loose: 0.85,
};
export const FORMATION_DEFENSE_MOD: Record<string, number> = {
  line: 0.0,
  column: -0.1,
  square: 0.3,
  loose: -0.1,
};

// === Terrain ===
export const TERRAIN_DEFENSE_BONUS: Record<string, number> = {
  open: 0.0,
  hill: 0.2,
  forest: 0.1,
  rough: 0.05,
};
export const TERRAIN_CONCEALMENT: Record<string, number> = {
  open: 0.0,
  hill: 0.0,
  forest: 0.2,
  rough: 0.0,
};
export const HILL_ATTACK_BONUS = 0.1;

// === Combat ===
export const ENGAGEMENT_RANGE = 1.5; // tiles
export const FLANK_ANGLE = 90;
export const REAR_ANGLE = 135;
export const FLANK_DAMAGE_MULT = 1.25;
export const REAR_DAMAGE_MULT = 1.5;
export const FACING_ROTATION_SPEED = 45; // degrees per tick
export const HEAVY_CASUALTY_THRESHOLD = 0.4;
export const HEAVY_CASUALTY_PENALTY = 0.3;

// === Morale ===
export const MORALE_MAX = 100;
export const MORALE_SHAKEN_THRESHOLD = 60;
export const MORALE_WAVERING_THRESHOLD = 30;
export const MORALE_ROUTING_THRESHOLD = 15;
export const MORALE_RALLY_THRESHOLD = 25;
export const MORALE_RALLY_SAFE_DISTANCE = 5;
export const ROUTING_SPEED_MULT = 1.5;
export const NEARBY_ROUT_RANGE = 4;
export const NEARBY_ROUT_DRAIN = 3;
export const CASUALTY_MORALE_MULT = 80;
export const CUMULATIVE_CASUALTY_DRAIN = 2;
export const FLANK_MORALE_DRAIN = 3;
export const REAR_MORALE_DRAIN = 5;
export const BASE_MORALE_RECOVERY = 2;

// === Rendering ===
export const ISO_TILE_WIDTH = 64;
export const ISO_TILE_HEIGHT = 32;

// === Colors ===
export const TERRAIN_COLORS: Record<string, string> = {
  open: '#4a7c3f',
  hill: '#8b7355',
  forest: '#2d5a27',
  rough: '#6b6b4b',
};
export const PLAYER_COLOR = '#4fc3f7';
export const PLAYER_COLOR_DARK = '#0277bd';
export const ENEMY_COLOR = '#ef5350';
export const ENEMY_COLOR_DARK = '#b71c1c';
