import { BattleMap } from '../types';
import { getTileCorners } from './isometric';
import { TERRAIN_COLORS } from '../utils/constants';

export function renderTerrain(ctx: CanvasRenderingContext2D, map: BattleMap): void {
  // Render tiles back-to-front for correct overlap
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const terrain = map.terrain[y][x];
      const corners = getTileCorners(x, y);
      const color = TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS.open;

      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // Render zone labels
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  for (const zone of map.zones) {
    const corners = getTileCorners(zone.center.x, zone.center.y);
    const cx = corners[0].x;
    const cy = corners[0].y + 20;
    ctx.fillText(zone.id, cx, cy);
  }
}
