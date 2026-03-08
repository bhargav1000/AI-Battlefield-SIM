import { Vec2, BattleMap, TerrainType } from '../types';
import { TERRAIN_MOVEMENT_COST } from '../utils/constants';

interface AStarNode {
  pos: Vec2;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

function heuristic(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function posKey(p: Vec2): string {
  return `${p.x},${p.y}`;
}

const NEIGHBORS: Vec2[] = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
  { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
];

export function findPath(map: BattleMap, start: Vec2, end: Vec2): Vec2[] {
  const startR = { x: Math.round(start.x), y: Math.round(start.y) };
  const endR = { x: Math.round(end.x), y: Math.round(end.y) };

  if (startR.x === endR.x && startR.y === endR.y) return [];

  const open: AStarNode[] = [];
  const closed = new Set<string>();

  const startNode: AStarNode = {
    pos: startR,
    g: 0,
    h: heuristic(startR, endR),
    f: heuristic(startR, endR),
    parent: null,
  };
  open.push(startNode);

  let iterations = 0;
  const maxIterations = 2000;

  while (open.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open[bestIdx];
    open.splice(bestIdx, 1);

    if (current.pos.x === endR.x && current.pos.y === endR.y) {
      // Reconstruct path
      const path: Vec2[] = [];
      let node: AStarNode | null = current;
      while (node && node.parent) {
        path.unshift(node.pos);
        node = node.parent;
      }
      return path;
    }

    closed.add(posKey(current.pos));

    for (const offset of NEIGHBORS) {
      const nx = current.pos.x + offset.x;
      const ny = current.pos.y + offset.y;

      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;

      const key = posKey({ x: nx, y: ny });
      if (closed.has(key)) continue;

      const terrain: TerrainType = map.terrain[ny][nx];
      const moveCost = TERRAIN_MOVEMENT_COST[terrain] ?? 1.0;
      const isDiag = offset.x !== 0 && offset.y !== 0;
      const stepCost = moveCost * (isDiag ? 1.414 : 1.0);
      const g = current.g + stepCost;
      const h = heuristic({ x: nx, y: ny }, endR);

      const existing = open.find((n) => n.pos.x === nx && n.pos.y === ny);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = g + h;
          existing.parent = current;
        }
      } else {
        open.push({ pos: { x: nx, y: ny }, g, h, f: g + h, parent: current });
      }
    }
  }

  // No path found - return direct line
  return [endR];
}
