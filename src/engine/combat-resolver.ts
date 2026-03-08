import { Squad, MatchState } from '../types';
import { getAttackAngle, AttackAngle } from '../behavior/engagement-resolver';
import {
  FORMATION_ATTACK_MOD,
  FORMATION_DEFENSE_MOD,
  TERRAIN_DEFENSE_BONUS,
  FLANK_DAMAGE_MULT,
  REAR_DAMAGE_MULT,
  HEAVY_CASUALTY_THRESHOLD,
  HEAVY_CASUALTY_PENALTY,
  HILL_ATTACK_BONUS,
} from '../utils/constants';

interface CombatResult {
  attackerCasualties: number;
  defenderCasualties: number;
  attackAngleOnDefender: AttackAngle;
  attackAngleOnAttacker: AttackAngle;
}

export function resolveCombat(state: MatchState): void {
  const processed = new Set<string>();

  for (const squad of state.squads) {
    if (!squad.isEngaged || !squad.engagedWith) continue;
    if (squad.soldierCount <= 0) continue;

    const pairKey = [squad.id, squad.engagedWith].sort().join(':');
    if (processed.has(pairKey)) continue;
    processed.add(pairKey);

    const opponent = state.squads.find((s) => s.id === squad.engagedWith);
    if (!opponent || opponent.soldierCount <= 0) continue;

    const result = resolveMelee(squad, opponent, state);

    // Apply casualties
    applyCasualties(squad, result.attackerCasualties, state);
    applyCasualties(opponent, result.defenderCasualties, state);

    // Update anim state
    for (const s of squad.soldiers) {
      if (s.alive) s.animState = 'fighting';
    }
    for (const s of opponent.soldiers) {
      if (s.alive) s.animState = 'fighting';
    }
  }
}

function resolveMelee(a: Squad, b: Squad, state: MatchState): CombatResult {
  const angleOnB = getAttackAngle(a, b);
  const angleOnA = getAttackAngle(b, a);

  const damageAToB = calculateDamage(a, b, angleOnB, state);
  const damageBToA = calculateDamage(b, a, angleOnA, state);

  return {
    attackerCasualties: damageBToA,
    defenderCasualties: damageAToB,
    attackAngleOnDefender: angleOnB,
    attackAngleOnAttacker: angleOnA,
  };
}

function calculateDamage(attacker: Squad, defender: Squad, angle: AttackAngle, state: MatchState): number {
  const livingRatio = attacker.soldierCount / attacker.maxSoldiers;
  let damage = attacker.stats.attack * livingRatio;

  // Formation attack modifier
  const attackMod = FORMATION_ATTACK_MOD[attacker.formation] ?? 1.0;
  damage *= attackMod;

  // Flank/rear bonus
  if (angle === 'flank') damage *= FLANK_DAMAGE_MULT;
  if (angle === 'rear') damage *= REAR_DAMAGE_MULT;

  // Terrain defense for defender
  const defenderTerrain = getTerrainAt(defender, state);
  damage *= 1 - (TERRAIN_DEFENSE_BONUS[defenderTerrain] ?? 0);

  // Formation defense for defender
  const defenseMod = FORMATION_DEFENSE_MOD[defender.formation] ?? 0;
  damage *= 1 - defenseMod;

  // Hill attack bonus
  const attackerTerrain = getTerrainAt(attacker, state);
  if (attackerTerrain === 'hill' && defenderTerrain !== 'hill') {
    damage *= 1 + HILL_ATTACK_BONUS;
  }

  // Fatigue
  damage *= 1 - attacker.fatigue * 0.3;

  // Wavering penalty
  if (attacker.morale.current < 30) damage *= 0.8;
  else if (attacker.morale.current < 60) damage *= 0.9;

  // Heavy casualty penalty
  if (1 - livingRatio > HEAVY_CASUALTY_THRESHOLD) {
    damage *= 1 - HEAVY_CASUALTY_PENALTY;
  }

  return Math.max(0, Math.floor(damage));
}

function applyCasualties(squad: Squad, casualties: number, state: MatchState): void {
  if (casualties <= 0) return;

  const actualCasualties = Math.min(casualties, squad.soldierCount);
  squad.soldierCount -= actualCasualties;

  // Mark soldiers as dead
  let killed = 0;
  for (const soldier of squad.soldiers) {
    if (!soldier.alive) continue;
    if (killed >= actualCasualties) break;
    soldier.alive = false;
    killed++;
  }

  if (actualCasualties > 0) {
    state.battleLog.push({
      tick: state.tick,
      turn: state.turnNumber,
      message: `${squad.name} lost ${actualCasualties} soldiers! (${squad.soldierCount}/${squad.maxSoldiers} remaining)`,
      type: 'combat',
    });
  }
}

function getTerrainAt(squad: Squad, state: MatchState): string {
  const tx = Math.round(squad.position.x);
  const ty = Math.round(squad.position.y);
  if (tx < 0 || tx >= state.map.width || ty < 0 || ty >= state.map.height) return 'open';
  return state.map.terrain[ty][tx];
}
