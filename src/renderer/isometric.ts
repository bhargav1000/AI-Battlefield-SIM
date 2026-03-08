import { Vec2 } from '../types';
import { ISO_TILE_WIDTH, ISO_TILE_HEIGHT } from '../utils/constants';

/**
 * Convert world grid coordinates to isometric screen coordinates.
 */
export function worldToScreen(worldX: number, worldY: number): Vec2 {
  return {
    x: (worldX - worldY) * (ISO_TILE_WIDTH / 2),
    y: (worldX + worldY) * (ISO_TILE_HEIGHT / 2),
  };
}

/**
 * Convert screen coordinates to world grid coordinates.
 */
export function screenToWorld(screenX: number, screenY: number): Vec2 {
  return {
    x: (screenX / (ISO_TILE_WIDTH / 2) + screenY / (ISO_TILE_HEIGHT / 2)) / 2,
    y: (screenY / (ISO_TILE_HEIGHT / 2) - screenX / (ISO_TILE_WIDTH / 2)) / 2,
  };
}

/**
 * Get the four corners of an isometric tile for rendering.
 */
export function getTileCorners(worldX: number, worldY: number): Vec2[] {
  const center = worldToScreen(worldX, worldY);
  return [
    { x: center.x, y: center.y - ISO_TILE_HEIGHT / 2 }, // top
    { x: center.x + ISO_TILE_WIDTH / 2, y: center.y },  // right
    { x: center.x, y: center.y + ISO_TILE_HEIGHT / 2 }, // bottom
    { x: center.x - ISO_TILE_WIDTH / 2, y: center.y },  // left
  ];
}
