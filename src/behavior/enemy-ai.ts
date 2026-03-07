import { MatchState, Order, Squad } from '../types';
import { findNearestEnemy } from './engagement-resolver';
import { vec2Distance } from '../utils/math';

/**
 * Simple scripted AI for enemy squads:
 * - If not engaged, advance toward nearest player squad
 * - If engaged, fight (hold)
 * - If morale is low, retreat toward map edge
 */
export function generateEnemyOrders(state: MatchState): Order[] {
  const orders: Order[] = [];
  const enemySquads = state.squads.filter(
    (s) => s.faction === 'enemy' && s.soldierCount > 0 && !s.isRouting
  );

  for (const squad of enemySquads) {
    const order = generateOrderForSquad(squad, state);
    if (order) orders.push(order);
  }

  return orders;
}

function generateOrderForSquad(squad: Squad, state: MatchState): Order | null {
  // Low morale: retreat
  if (squad.morale.current < 30) {
    return {
      squadId: squad.id,
      action: 'retreat',
      targetPosition: getNearestEdge(squad, state),
    };
  }

  // If engaged, hold and fight
  if (squad.isEngaged) {
    return {
      squadId: squad.id,
      action: 'hold',
      formation: squad.formation,
    };
  }

  // Find nearest player squad and advance
  const target = findNearestEnemy(squad, state);
  if (target) {
    const dist = vec2Distance(squad.position, target.position);

    if (dist > 3) {
      // March toward target in column for speed
      return {
        squadId: squad.id,
        action: 'move',
        targetPosition: { x: target.position.x, y: target.position.y },
        formation: 'column',
      };
    } else {
      // Close range: attack in line
      return {
        squadId: squad.id,
        action: 'attack',
        targetSquadId: target.id,
        formation: 'line',
      };
    }
  }

  return { squadId: squad.id, action: 'hold' };
}

function getNearestEdge(squad: Squad, state: MatchState): { x: number; y: number } {
  const { width, height } = state.map;
  const { x, y } = squad.position;

  // For enemies, retreat toward top (y=0)
  return { x, y: 0 };
}
