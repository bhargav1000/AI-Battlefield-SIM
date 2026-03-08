import { MatchState } from '../types';

export interface SerializedState {
  map: {
    width: number;
    height: number;
    zones: { id: string; terrain: string; center: { x: number; y: number } }[];
  };
  player_squads: SerializedSquad[];
  enemy_squads: SerializedSquad[];
  turn: number;
}

interface SerializedSquad {
  id: string;
  name: string;
  position: { x: number; y: number };
  soldiers: number;
  max_soldiers: number;
  morale: number;
  formation: string;
  is_engaged: boolean;
  is_routing: boolean;
}

export function serializeState(state: MatchState): SerializedState {
  return {
    map: {
      width: state.map.width,
      height: state.map.height,
      zones: state.map.zones.map((z) => ({
        id: z.id,
        terrain: z.terrainType,
        center: { x: Math.round(z.center.x), y: Math.round(z.center.y) },
      })),
    },
    player_squads: state.squads
      .filter((s) => s.faction === 'player' && s.soldierCount > 0)
      .map(serializeSquad),
    enemy_squads: state.squads
      .filter((s) => s.faction === 'enemy' && s.soldierCount > 0)
      .map(serializeSquad),
    turn: state.turnNumber,
  };
}

function serializeSquad(s: any): SerializedSquad {
  return {
    id: s.id,
    name: s.name,
    position: { x: Math.round(s.position.x), y: Math.round(s.position.y) },
    soldiers: s.soldierCount,
    max_soldiers: s.maxSoldiers,
    morale: Math.round(s.morale.current),
    formation: s.formation,
    is_engaged: s.isEngaged,
    is_routing: s.isRouting,
  };
}
