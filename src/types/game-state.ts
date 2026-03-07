export type SquadId = string;
export type ZoneId = string;
export type Faction = 'player' | 'enemy';
export type TerrainType = 'open' | 'hill' | 'forest' | 'rough';
export type FormationType = 'line' | 'column' | 'square' | 'loose';

export interface Vec2 {
  x: number;
  y: number;
}

export interface MatchState {
  tick: number;
  phase: 'command' | 'execution' | 'victory' | 'defeat';
  map: BattleMap;
  squads: Squad[];
  pendingOrders: Order[];
  turnNumber: number;
  executionTicksRemaining: number;
  battleLog: BattleLogEntry[];
  prngSeed: number;
}

export interface BattleMap {
  width: number;
  height: number;
  tileSize: number;
  terrain: TerrainType[][];
  zones: TerrainZone[];
}

export interface TerrainZone {
  id: ZoneId;
  terrainType: TerrainType;
  tiles: Vec2[];
  defenseBonus: number;
  movementCost: number;
  concealmentBonus: number;
  center: Vec2;
}

export interface Squad {
  id: SquadId;
  name: string;
  faction: Faction;
  position: Vec2;
  facing: number;
  soldierCount: number;
  maxSoldiers: number;
  formation: FormationType;
  morale: MoraleState;
  fatigue: number;
  isEngaged: boolean;
  isRouting: boolean;
  engagedWith: SquadId | null;
  currentOrder: Order | null;
  stats: SquadStats;
  soldiers: SoldierVisual[];
  path: Vec2[];
  isChangingFormation: boolean;
  formationChangeTicksLeft: number;
  disengageTicksLeft: number;
}

export interface SquadStats {
  attack: number;
  defense: number;
  speed: number;
  discipline: number;
}

export interface SoldierVisual {
  localOffset: Vec2;
  alive: boolean;
  animState: 'idle' | 'walking' | 'fighting' | 'routing';
}

export interface MoraleState {
  current: number;
  max: number;
  modifiers: MoraleModifier[];
}

export interface MoraleModifier {
  source: string;
  value: number;
  duration: number;
}

export interface BattleLogEntry {
  tick: number;
  turn: number;
  message: string;
  type: 'combat' | 'move' | 'morale' | 'system';
}

// Orders
export type ActionType = 'move' | 'hold' | 'attack' | 'defend_area' | 'retreat' | 'reform' | 'flank' | 'support';

export interface Order {
  squadId: SquadId;
  action: ActionType;
  targetPosition?: Vec2;
  targetSquadId?: SquadId;
  targetZoneId?: ZoneId;
  formation?: FormationType;
  condition?: OrderCondition;
  fallback?: FallbackAction;
}

export interface OrderCondition {
  type: 'if_engaged' | 'if_morale_below' | 'if_enemy_near' | 'if_casualties_above';
  threshold?: number;
}

export interface FallbackAction {
  action: ActionType;
  targetPosition?: Vec2;
  formation?: FormationType;
}
