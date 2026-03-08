import { Squad, MatchState } from '../types';
import { vec2Distance, angleBetween, angleDifference } from '../utils/math';
import { ENGAGEMENT_RANGE, FLANK_ANGLE, REAR_ANGLE } from '../utils/constants';

export type AttackAngle = 'front' | 'flank' | 'rear';

export function getAttackAngle(attacker: Squad, defender: Squad): AttackAngle {
  const approachAngle = angleBetween(defender.position, attacker.position);
  const diff = angleDifference(defender.facing, approachAngle);

  if (diff > REAR_ANGLE) return 'rear';
  if (diff > FLANK_ANGLE) return 'flank';
  return 'front';
}

export function resolveEngagements(state: MatchState): void {
  const squads = state.squads.filter((s) => s.soldierCount > 0 && !s.isRouting);

  // Clear old engagements
  for (const squad of state.squads) {
    squad.isEngaged = false;
    squad.engagedWith = null;
  }

  // Find new engagements
  for (let i = 0; i < squads.length; i++) {
    for (let j = i + 1; j < squads.length; j++) {
      const a = squads[i];
      const b = squads[j];

      if (a.faction === b.faction) continue;

      const dist = vec2Distance(a.position, b.position);
      if (dist <= ENGAGEMENT_RANGE) {
        a.isEngaged = true;
        a.engagedWith = b.id;
        b.isEngaged = true;
        b.engagedWith = a.id;
      }
    }
  }
}

export function findNearestEnemy(squad: Squad, state: MatchState): Squad | null {
  let nearest: Squad | null = null;
  let nearestDist = Infinity;

  for (const other of state.squads) {
    if (other.faction === squad.faction) continue;
    if (other.soldierCount <= 0) continue;

    const dist = vec2Distance(squad.position, other.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = other;
    }
  }

  return nearest;
}

export function hasEnemiesWithin(squad: Squad, range: number, state: MatchState): boolean {
  for (const other of state.squads) {
    if (other.faction === squad.faction) continue;
    if (other.soldierCount <= 0) continue;
    if (vec2Distance(squad.position, other.position) <= range) return true;
  }
  return false;
}

export function countNearbyRoutingAllies(squad: Squad, range: number, state: MatchState): number {
  let count = 0;
  for (const other of state.squads) {
    if (other.id === squad.id) continue;
    if (other.faction !== squad.faction) continue;
    if (!other.isRouting) continue;
    if (vec2Distance(squad.position, other.position) <= range) count++;
  }
  return count;
}
