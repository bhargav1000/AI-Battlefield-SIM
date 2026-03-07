import { Squad, MatchState } from '../types';
import { worldToScreen } from './isometric';
import {
  PLAYER_COLOR,
  PLAYER_COLOR_DARK,
  ENEMY_COLOR,
  ENEMY_COLOR_DARK,
  MORALE_WAVERING_THRESHOLD,
  MORALE_SHAKEN_THRESHOLD,
} from '../utils/constants';

export function renderSquads(ctx: CanvasRenderingContext2D, state: MatchState): void {
  // Sort by Y position for depth ordering
  const sorted = [...state.squads]
    .filter((s) => s.soldierCount > 0)
    .sort((a, b) => a.position.y + a.position.x - (b.position.y + b.position.x));

  for (const squad of sorted) {
    renderSquad(ctx, squad);
  }
}

function renderSquad(ctx: CanvasRenderingContext2D, squad: Squad): void {
  const screenPos = worldToScreen(squad.position.x, squad.position.y);
  const isPlayer = squad.faction === 'player';
  const mainColor = isPlayer ? PLAYER_COLOR : ENEMY_COLOR;
  const darkColor = isPlayer ? PLAYER_COLOR_DARK : ENEMY_COLOR_DARK;

  // Draw soldiers
  for (const soldier of squad.soldiers) {
    if (!soldier.alive) continue;

    const sx = screenPos.x + soldier.localOffset.x * 60;
    const sy = screenPos.y + soldier.localOffset.y * 60 - 4;

    // Soldier body
    ctx.fillStyle = squad.isRouting ? '#888' : mainColor;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Dark outline
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Squad label background
  const labelY = screenPos.y - 16;
  ctx.font = 'bold 9px sans-serif';
  const textWidth = ctx.measureText(squad.name).width;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(screenPos.x - textWidth / 2 - 3, labelY - 8, textWidth + 6, 11);

  // Squad name
  ctx.fillStyle = squad.isRouting ? '#888' : mainColor;
  ctx.textAlign = 'center';
  ctx.fillText(squad.name, screenPos.x, labelY);

  // Morale bar
  const barWidth = 30;
  const barHeight = 3;
  const barX = screenPos.x - barWidth / 2;
  const barY = labelY + 3;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const moraleRatio = squad.morale.current / squad.morale.max;
  let moraleColor = '#4caf50'; // green
  if (squad.morale.current < MORALE_WAVERING_THRESHOLD) moraleColor = '#f44336'; // red
  else if (squad.morale.current < MORALE_SHAKEN_THRESHOLD) moraleColor = '#ff9800'; // orange

  ctx.fillStyle = moraleColor;
  ctx.fillRect(barX, barY, barWidth * moraleRatio, barHeight);

  // Formation indicator
  ctx.font = '7px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(squad.formation.charAt(0).toUpperCase(), screenPos.x, barY + 12);

  // Order arrow
  if (squad.currentOrder?.targetPosition && !squad.isRouting) {
    const target = worldToScreen(squad.currentOrder.targetPosition.x, squad.currentOrder.targetPosition.y);
    ctx.beginPath();
    ctx.moveTo(screenPos.x, screenPos.y);
    ctx.lineTo(target.x, target.y);
    ctx.strokeStyle = isPlayer ? 'rgba(79, 195, 247, 0.4)' : 'rgba(239, 83, 80, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead
    const angle = Math.atan2(target.y - screenPos.y, target.x - screenPos.x);
    const headLen = 6;
    ctx.beginPath();
    ctx.moveTo(target.x, target.y);
    ctx.lineTo(target.x - headLen * Math.cos(angle - 0.4), target.y - headLen * Math.sin(angle - 0.4));
    ctx.lineTo(target.x - headLen * Math.cos(angle + 0.4), target.y - headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = isPlayer ? 'rgba(79, 195, 247, 0.5)' : 'rgba(239, 83, 80, 0.4)';
    ctx.fill();
  }

  // Engagement indicator
  if (squad.isEngaged) {
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
