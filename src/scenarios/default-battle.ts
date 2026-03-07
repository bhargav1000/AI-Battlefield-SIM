import { MatchState, Squad, BattleMap, TerrainType, TerrainZone, SoldierVisual, Vec2 } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, TICKS_PER_TURN, MORALE_MAX } from '../utils/constants';
import { generateFormationPositions } from '../behavior/formation-manager';
import { vec2 } from '../utils/math';

export function createDefaultBattle(): MatchState {
  const map = createMap();
  const squads = [...createPlayerSquads(), ...createEnemySquads()];

  return {
    tick: 0,
    phase: 'command',
    map,
    squads,
    pendingOrders: [],
    turnNumber: 1,
    executionTicksRemaining: 0,
    battleLog: [
      { tick: 0, turn: 1, message: 'Battle begins! Issue your orders.', type: 'system' },
    ],
    prngSeed: 42,
  };
}

function createMap(): BattleMap {
  const terrain: TerrainType[][] = [];

  // Initialize all as open
  for (let y = 0; y < MAP_HEIGHT; y++) {
    terrain[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      terrain[y][x] = 'open';
    }
  }

  // Hill in the north-center
  for (let y = 3; y <= 8; y++) {
    for (let x = 17; x <= 23; x++) {
      terrain[y][x] = 'hill';
    }
  }

  // Forest on the east side
  for (let y = 10; y <= 18; y++) {
    for (let x = 32; x <= 37; x++) {
      terrain[y][x] = 'forest';
    }
  }

  // Rough terrain on the west
  for (let y = 12; y <= 17; y++) {
    for (let x = 2; x <= 7; x++) {
      terrain[y][x] = 'rough';
    }
  }

  // Small forest patch center-left
  for (let y = 14; y <= 17; y++) {
    for (let x = 12; x <= 15; x++) {
      terrain[y][x] = 'forest';
    }
  }

  const zones: TerrainZone[] = [
    createZone('hill_north', 'hill', terrain, vec2(20, 5)),
    createZone('forest_east', 'forest', terrain, vec2(35, 14)),
    createZone('rough_west', 'rough', terrain, vec2(4, 14)),
    createZone('forest_center', 'forest', terrain, vec2(13, 15)),
    createZone('open_center', 'open', terrain, vec2(20, 15)),
    createZone('open_south', 'open', terrain, vec2(20, 24)),
  ];

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tileSize: TILE_SIZE,
    terrain,
    zones,
  };
}

function createZone(id: string, terrainType: TerrainType, terrain: TerrainType[][], center: Vec2): TerrainZone {
  const tiles: Vec2[] = [];
  for (let y = 0; y < terrain.length; y++) {
    for (let x = 0; x < terrain[y].length; x++) {
      if (terrain[y][x] === terrainType) {
        // Only include tiles roughly near the zone center for named zones
        const dx = x - center.x;
        const dy = y - center.y;
        if (Math.abs(dx) <= 10 && Math.abs(dy) <= 10) {
          tiles.push(vec2(x, y));
        }
      }
    }
  }

  const movementCosts: Record<string, number> = { open: 1.0, hill: 1.4, forest: 1.3, rough: 1.5 };
  const defenseBonuses: Record<string, number> = { open: 0, hill: 0.2, forest: 0.1, rough: 0.05 };
  const concealmentBonuses: Record<string, number> = { open: 0, hill: 0, forest: 0.2, rough: 0 };

  return {
    id,
    terrainType,
    tiles,
    center,
    defenseBonus: defenseBonuses[terrainType] ?? 0,
    movementCost: movementCosts[terrainType] ?? 1.0,
    concealmentBonus: concealmentBonuses[terrainType] ?? 0,
  };
}

function createPlayerSquads(): Squad[] {
  return [
    createSquad('player_sq1', '1st Infantry', 'player', vec2(12, 22), 0, 28, 'line', { attack: 5, defense: 3, speed: 0.8, discipline: 0.6 }),
    createSquad('player_sq2', '2nd Infantry', 'player', vec2(20, 24), 0, 30, 'line', { attack: 4, defense: 4, speed: 0.7, discipline: 0.7 }),
    createSquad('player_sq3', '3rd Infantry', 'player', vec2(28, 22), 0, 26, 'column', { attack: 6, defense: 2, speed: 0.9, discipline: 0.5 }),
    createSquad('player_sq4', '4th Reserve', 'player', vec2(20, 27), 0, 30, 'line', { attack: 4, defense: 5, speed: 0.7, discipline: 0.8 }),
  ];
}

function createEnemySquads(): Squad[] {
  return [
    createSquad('enemy_sq1', 'Enemy Vanguard', 'enemy', vec2(18, 10), 180, 30, 'line', { attack: 5, defense: 3, speed: 0.8, discipline: 0.6 }),
    createSquad('enemy_sq2', 'Enemy Flank Left', 'enemy', vec2(8, 8), 180, 25, 'column', { attack: 5, defense: 2, speed: 0.9, discipline: 0.5 }),
    createSquad('enemy_sq3', 'Enemy Flank Right', 'enemy', vec2(30, 8), 180, 25, 'column', { attack: 5, defense: 2, speed: 0.9, discipline: 0.5 }),
    createSquad('enemy_sq4', 'Enemy Reserve', 'enemy', vec2(20, 4), 180, 28, 'line', { attack: 4, defense: 4, speed: 0.7, discipline: 0.7 }),
  ];
}

function createSquad(
  id: string,
  name: string,
  faction: 'player' | 'enemy',
  position: Vec2,
  facing: number,
  soldiers: number,
  formation: 'line' | 'column' | 'square' | 'loose',
  stats: { attack: number; defense: number; speed: number; discipline: number }
): Squad {
  const soldierVisuals: SoldierVisual[] = [];
  const positions = generateFormationPositions(formation, soldiers, facing);

  for (let i = 0; i < soldiers; i++) {
    soldierVisuals.push({
      localOffset: positions[i] ?? vec2(0, 0),
      alive: true,
      animState: 'idle',
    });
  }

  return {
    id,
    name,
    faction,
    position: { ...position },
    facing,
    soldierCount: soldiers,
    maxSoldiers: soldiers,
    formation,
    morale: { current: MORALE_MAX, max: MORALE_MAX, modifiers: [] },
    fatigue: 0,
    isEngaged: false,
    isRouting: false,
    engagedWith: null,
    currentOrder: null,
    stats,
    soldiers: soldierVisuals,
    path: [],
    isChangingFormation: false,
    formationChangeTicksLeft: 0,
    disengageTicksLeft: 0,
  };
}
