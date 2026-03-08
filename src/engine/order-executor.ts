import { Squad, MatchState, Order } from '../types';
import { findPath } from '../behavior/pathfinding';
import { vec2Distance } from '../utils/math';
import {
  FORMATION_CHANGE_TICKS,
  DISENGAGE_TICKS,
} from '../utils/constants';
import { findNearestEnemy } from '../behavior/engagement-resolver';

export function assignOrders(state: MatchState): void {
  for (const order of state.pendingOrders) {
    const squad = state.squads.find((s) => s.id === order.squadId);
    if (!squad || squad.soldierCount <= 0 || squad.isRouting) continue;

    // Check conditions
    if (order.condition) {
      // Store condition for runtime checking - the order starts normally
      // but will switch to fallback when condition triggers
    }

    // Check if formation change is needed
    if (order.formation && order.formation !== squad.formation) {
      squad.isChangingFormation = true;
      squad.formationChangeTicksLeft = FORMATION_CHANGE_TICKS;
    }

    // If engaged and order requires movement, start disengaging
    if (squad.isEngaged && needsMovement(order)) {
      squad.disengageTicksLeft = DISENGAGE_TICKS;
    }

    // Compute path if needed
    if (order.targetPosition && needsMovement(order)) {
      squad.path = findPath(state.map, squad.position, order.targetPosition);
    }

    // For attack orders targeting a squad, compute path to that squad
    if (order.action === 'attack' && order.targetSquadId) {
      const target = state.squads.find((s) => s.id === order.targetSquadId);
      if (target) {
        squad.path = findPath(state.map, squad.position, target.position);
      }
    }

    squad.currentOrder = order;
  }

  state.pendingOrders = [];
}

export function checkOrderConditions(state: MatchState): void {
  for (const squad of state.squads) {
    if (!squad.currentOrder || !squad.currentOrder.condition || squad.isRouting) continue;

    const condition = squad.currentOrder.condition;
    let triggered = false;

    switch (condition.type) {
      case 'if_engaged':
        triggered = squad.isEngaged;
        break;
      case 'if_morale_below':
        triggered = squad.morale.current < (condition.threshold ?? 30);
        break;
      case 'if_enemy_near': {
        const nearest = findNearestEnemy(squad, state);
        if (nearest) {
          triggered = vec2Distance(squad.position, nearest.position) < (condition.threshold ?? 5);
        }
        break;
      }
      case 'if_casualties_above': {
        const casualtyPct = ((squad.maxSoldiers - squad.soldierCount) / squad.maxSoldiers) * 100;
        triggered = casualtyPct > (condition.threshold ?? 50);
        break;
      }
    }

    if (triggered && squad.currentOrder.fallback) {
      const fallback = squad.currentOrder.fallback;
      squad.currentOrder = {
        squadId: squad.id,
        action: fallback.action,
        targetPosition: fallback.targetPosition,
        formation: fallback.formation,
      };

      if (fallback.formation && fallback.formation !== squad.formation) {
        squad.isChangingFormation = true;
        squad.formationChangeTicksLeft = FORMATION_CHANGE_TICKS;
      }

      if (fallback.targetPosition) {
        squad.path = findPath(state.map, squad.position, fallback.targetPosition);
      }

      state.battleLog.push({
        tick: state.tick,
        turn: state.turnNumber,
        message: `${squad.name}: condition triggered, switching to ${fallback.action}`,
        type: 'system',
      });
    }
  }
}

function needsMovement(order: Order): boolean {
  return ['move', 'attack', 'flank', 'support', 'retreat'].includes(order.action);
}
