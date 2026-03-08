import { MatchState } from '../types';
import { assignOrders, checkOrderConditions } from './order-executor';
import { updateMovement } from './movement-system';
import { resolveCombat } from './combat-resolver';
import { updateMorale } from './morale-system';
import { checkVictory } from './victory-checker';
import { resolveEngagements } from '../behavior/engagement-resolver';
import { updateSoldierVisuals } from '../behavior/formation-manager';

/**
 * Pure-ish simulation tick. Mutates state in place for performance,
 * but the function is deterministic given the same state.
 */
export function simulationTick(state: MatchState): void {
  state.tick++;

  // 1. Assign any pending orders
  if (state.pendingOrders.length > 0) {
    assignOrders(state);
  }

  // 2. Check order conditions for fallbacks
  checkOrderConditions(state);

  // 3. Update movement (including routing squads)
  updateMovement(state);

  // 4. Resolve engagements (who is fighting whom)
  resolveEngagements(state);

  // 5. Resolve combat damage
  resolveCombat(state);

  // 6. Update morale
  updateMorale(state);

  // 7. Update soldier visuals for each squad
  for (const squad of state.squads) {
    if (squad.soldierCount > 0) {
      updateSoldierVisuals(squad.soldiers, squad.formation, squad.soldierCount, squad.facing);
    }
    // Set idle for non-moving, non-fighting squads
    if (!squad.isEngaged && !squad.isRouting && squad.path.length === 0) {
      for (const s of squad.soldiers) {
        if (s.alive) s.animState = 'idle';
      }
    }
  }

  // 8. Check victory/defeat
  const result = checkVictory(state);
  if (result) {
    state.phase = result;
    state.battleLog.push({
      tick: state.tick,
      turn: state.turnNumber,
      message: result === 'victory' ? 'VICTORY! All enemy forces have been routed!' : 'DEFEAT! Your forces have been routed!',
      type: 'system',
    });
  }

  // 9. Decrease execution ticks
  state.executionTicksRemaining--;
}
