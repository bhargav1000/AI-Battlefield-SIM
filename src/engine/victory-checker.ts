import { MatchState } from '../types';

export function checkVictory(state: MatchState): 'victory' | 'defeat' | null {
  const playerSquads = state.squads.filter((s) => s.faction === 'player');
  const enemySquads = state.squads.filter((s) => s.faction === 'enemy');

  const playerAlive = playerSquads.some((s) => s.soldierCount > 0 && !s.isRouting);
  const enemyAlive = enemySquads.some((s) => s.soldierCount > 0 && !s.isRouting);

  if (!enemyAlive && playerAlive) return 'victory';
  if (!playerAlive && enemyAlive) return 'defeat';
  if (!playerAlive && !enemyAlive) return 'defeat'; // mutual destruction = loss

  return null;
}
