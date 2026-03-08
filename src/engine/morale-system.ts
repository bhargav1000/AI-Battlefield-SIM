import { Squad, MatchState } from '../types';
import { getAttackAngle } from '../behavior/engagement-resolver';
import { hasEnemiesWithin, countNearbyRoutingAllies } from '../behavior/engagement-resolver';
import {
  MORALE_ROUTING_THRESHOLD,
  MORALE_RALLY_THRESHOLD,
  MORALE_RALLY_SAFE_DISTANCE,
  NEARBY_ROUT_RANGE,
  NEARBY_ROUT_DRAIN,
  CASUALTY_MORALE_MULT,
  CUMULATIVE_CASUALTY_DRAIN,
  FLANK_MORALE_DRAIN,
  REAR_MORALE_DRAIN,
  BASE_MORALE_RECOVERY,
  MORALE_MAX,
} from '../utils/constants';
import { clamp } from '../utils/math';

export function updateMorale(state: MatchState): void {
  for (const squad of state.squads) {
    if (squad.soldierCount <= 0) continue;

    if (squad.isRouting) {
      handleRallyCheck(squad, state);
      continue;
    }

    const drain = calculateMoraleDrain(squad, state);
    const recovery = calculateMoraleRecovery(squad, state);

    squad.morale.current = clamp(squad.morale.current - drain + recovery, 0, MORALE_MAX);

    // Check for routing
    if (squad.morale.current <= MORALE_ROUTING_THRESHOLD) {
      squad.isRouting = true;
      squad.currentOrder = null;
      squad.path = [];
      state.battleLog.push({
        tick: state.tick,
        turn: state.turnNumber,
        message: `${squad.name} is ROUTING! Morale broken!`,
        type: 'morale',
      });
    }
  }
}

function calculateMoraleDrain(squad: Squad, state: MatchState): number {
  let drain = 0;

  // Cumulative casualties
  const totalCasualtyRatio = 1 - squad.soldierCount / squad.maxSoldiers;
  drain += totalCasualtyRatio * CUMULATIVE_CASUALTY_DRAIN;

  // Flanked or rear-attacked
  if (squad.isEngaged && squad.engagedWith) {
    const attacker = state.squads.find((s) => s.id === squad.engagedWith);
    if (attacker) {
      const angle = getAttackAngle(attacker, squad);
      if (angle === 'flank') drain += FLANK_MORALE_DRAIN;
      if (angle === 'rear') drain += REAR_MORALE_DRAIN;
    }
  }

  // Nearby routing allies
  const routingAllies = countNearbyRoutingAllies(squad, NEARBY_ROUT_RANGE, state);
  drain += routingAllies * NEARBY_ROUT_DRAIN;

  // Fatigue
  drain += squad.fatigue * 1.5;

  // Discipline reduces drain
  drain *= 1 - squad.stats.discipline * 0.5;

  return Math.max(0, drain);
}

function calculateMoraleRecovery(squad: Squad, state: MatchState): number {
  if (squad.isEngaged) return 0;
  if (hasEnemiesWithin(squad, MORALE_RALLY_SAFE_DISTANCE, state)) return 0;

  let recovery = BASE_MORALE_RECOVERY;

  // Terrain bonuses
  const terrain = getTerrainAt(squad, state);
  if (terrain === 'hill') recovery += 1;
  if (terrain === 'forest') recovery += 0.5;

  // Discipline
  recovery *= 1 + squad.stats.discipline * 0.3;

  // Fatigue slows recovery
  recovery *= 1 - squad.fatigue * 0.5;

  return Math.max(0, recovery);
}

function handleRallyCheck(squad: Squad, state: MatchState): void {
  // Slowly recover morale even while routing
  if (!hasEnemiesWithin(squad, MORALE_RALLY_SAFE_DISTANCE, state)) {
    squad.morale.current = Math.min(MORALE_MAX, squad.morale.current + 1);
  }

  if (squad.morale.current >= MORALE_RALLY_THRESHOLD && !hasEnemiesWithin(squad, MORALE_RALLY_SAFE_DISTANCE, state)) {
    squad.isRouting = false;
    squad.formation = 'loose';
    state.battleLog.push({
      tick: state.tick,
      turn: state.turnNumber,
      message: `${squad.name} has rallied!`,
      type: 'morale',
    });
  }
}

function getTerrainAt(squad: Squad, state: MatchState): string {
  const tx = Math.round(squad.position.x);
  const ty = Math.round(squad.position.y);
  if (tx < 0 || tx >= state.map.width || ty < 0 || ty >= state.map.height) return 'open';
  return state.map.terrain[ty][tx];
}
