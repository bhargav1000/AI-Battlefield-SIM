import { Squad, MatchState, Vec2 } from '../types';
import { vec2Distance, vec2Normalize, vec2Scale, vec2Add, angleBetween } from '../utils/math';
import {
  BASE_SPEED,
  FORMATION_SPEED_MOD,
  TERRAIN_MOVEMENT_COST,
  FATIGUE_PER_MOVE_TICK,
  FATIGUE_RECOVERY_PER_TICK,
  ROUTING_SPEED_MULT,
} from '../utils/constants';
import { findPath } from '../behavior/pathfinding';

export function updateMovement(state: MatchState): void {
  for (const squad of state.squads) {
    if (squad.soldierCount <= 0) continue;

    if (squad.isRouting) {
      moveRoutingSquad(squad, state);
      continue;
    }

    if (squad.isEngaged && squad.disengageTicksLeft > 0) {
      squad.disengageTicksLeft--;
      continue;
    }

    if (!squad.currentOrder) continue;

    const order = squad.currentOrder;

    // Handle formation changes
    if (squad.isChangingFormation) {
      squad.formationChangeTicksLeft--;
      if (squad.formationChangeTicksLeft <= 0) {
        squad.isChangingFormation = false;
        if (order.formation) {
          squad.formation = order.formation;
        }
      }
      continue;
    }

    // Process movement-related orders
    switch (order.action) {
      case 'move':
      case 'flank':
      case 'support':
        moveToTarget(squad, state);
        break;
      case 'attack':
        moveToAttackTarget(squad, state);
        break;
      case 'retreat':
        moveToTarget(squad, state);
        break;
      case 'hold':
      case 'defend_area':
        // Recover fatigue when stationary
        squad.fatigue = Math.max(0, squad.fatigue - FATIGUE_RECOVERY_PER_TICK);
        break;
      case 'reform':
        squad.fatigue = Math.max(0, squad.fatigue - FATIGUE_RECOVERY_PER_TICK);
        break;
    }
  }
}

function moveToTarget(squad: Squad, state: MatchState): void {
  const target = squad.currentOrder?.targetPosition;
  if (!target) return;

  if (squad.path.length === 0) {
    squad.path = findPath(state.map, squad.position, target);
    if (squad.path.length === 0) {
      // Already at target
      squad.currentOrder = null;
      return;
    }
  }

  moveAlongPath(squad, state);
}

function moveToAttackTarget(squad: Squad, state: MatchState): void {
  const targetId = squad.currentOrder?.targetSquadId;
  if (!targetId) return;

  const targetSquad = state.squads.find((s) => s.id === targetId);
  if (!targetSquad || targetSquad.soldierCount <= 0) {
    squad.currentOrder = null;
    return;
  }

  // If engaged, stop moving
  if (squad.isEngaged) return;

  // Recompute path toward target's current position
  squad.path = findPath(state.map, squad.position, targetSquad.position);
  moveAlongPath(squad, state);
}

function moveAlongPath(squad: Squad, state: MatchState): void {
  if (squad.path.length === 0) return;

  const speed = getEffectiveSpeed(squad, state);
  const nextWaypoint = squad.path[0];
  const dist = vec2Distance(squad.position, nextWaypoint);

  if (dist <= speed) {
    squad.position = { ...nextWaypoint };
    squad.path.shift();

    if (squad.path.length === 0 && squad.currentOrder?.action !== 'attack') {
      // Reached destination
      squad.currentOrder = null;
    }
  } else {
    const dir = vec2Normalize({ x: nextWaypoint.x - squad.position.x, y: nextWaypoint.y - squad.position.y });
    squad.position = vec2Add(squad.position, vec2Scale(dir, speed));
    squad.facing = angleBetween(squad.position, nextWaypoint);
  }

  // Fatigue
  const terrain = getTerrainAt(squad.position, state);
  squad.fatigue = Math.min(1.0, squad.fatigue + FATIGUE_PER_MOVE_TICK * (TERRAIN_MOVEMENT_COST[terrain] ?? 1));

  // Update soldier anim state
  for (const s of squad.soldiers) {
    if (s.alive) s.animState = 'walking';
  }
}

function moveRoutingSquad(squad: Squad, state: MatchState): void {
  // Route toward nearest map edge
  const { width, height } = state.map;
  const { x, y } = squad.position;

  let edgeTarget: Vec2;
  if (squad.faction === 'player') {
    edgeTarget = { x, y: height - 1 };
  } else {
    edgeTarget = { x, y: 0 };
  }

  const speed = BASE_SPEED * ROUTING_SPEED_MULT;
  const dist = vec2Distance(squad.position, edgeTarget);

  if (dist <= speed) {
    // Reached edge, remove from battle
    squad.soldierCount = 0;
    for (const s of squad.soldiers) s.alive = false;

    state.battleLog.push({
      tick: state.tick,
      turn: state.turnNumber,
      message: `${squad.name} has fled the battlefield!`,
      type: 'morale',
    });
  } else {
    const dir = vec2Normalize({ x: edgeTarget.x - x, y: edgeTarget.y - y });
    squad.position = vec2Add(squad.position, vec2Scale(dir, speed));
    squad.facing = angleBetween(squad.position, edgeTarget);
  }

  for (const s of squad.soldiers) {
    if (s.alive) s.animState = 'routing';
  }
}

function getEffectiveSpeed(squad: Squad, state: MatchState): number {
  const terrain = getTerrainAt(squad.position, state);
  const terrainCost = TERRAIN_MOVEMENT_COST[terrain] ?? 1.0;
  const formationMod = FORMATION_SPEED_MOD[squad.formation] ?? 1.0;
  return (BASE_SPEED * formationMod) / terrainCost;
}

function getTerrainAt(pos: Vec2, state: MatchState): string {
  const tx = Math.round(pos.x);
  const ty = Math.round(pos.y);
  if (tx < 0 || tx >= state.map.width || ty < 0 || ty >= state.map.height) return 'open';
  return state.map.terrain[ty][tx];
}
