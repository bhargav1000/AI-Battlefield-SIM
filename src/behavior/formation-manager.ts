import { FormationType, SoldierVisual, Vec2 } from '../types';
import { vec2 } from '../utils/math';

export function generateFormationPositions(
  formation: FormationType,
  soldierCount: number,
  facing: number
): Vec2[] {
  const positions: Vec2[] = [];

  switch (formation) {
    case 'line':
      return generateLineFormation(soldierCount, facing);
    case 'column':
      return generateColumnFormation(soldierCount, facing);
    case 'square':
      return generateSquareFormation(soldierCount, facing);
    case 'loose':
      return generateLooseFormation(soldierCount, facing);
    default:
      return generateLineFormation(soldierCount, facing);
  }
}

function generateLineFormation(count: number, facing: number): Vec2[] {
  const positions: Vec2[] = [];
  const cols = Math.min(count, Math.ceil(Math.sqrt(count * 4)));
  const rows = Math.ceil(count / cols);
  const rad = (facing * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const spacing = 0.12;

  let idx = 0;
  for (let r = 0; r < rows && idx < count; r++) {
    for (let c = 0; c < cols && idx < count; c++) {
      const lx = (c - (cols - 1) / 2) * spacing;
      const ly = r * spacing;
      // Rotate by facing
      const rx = lx * cosA - ly * sinA;
      const ry = lx * sinA + ly * cosA;
      positions.push(vec2(rx, ry));
      idx++;
    }
  }
  return positions;
}

function generateColumnFormation(count: number, facing: number): Vec2[] {
  const positions: Vec2[] = [];
  const cols = 2;
  const rows = Math.ceil(count / cols);
  const rad = (facing * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const spacing = 0.12;

  let idx = 0;
  for (let r = 0; r < rows && idx < count; r++) {
    for (let c = 0; c < cols && idx < count; c++) {
      const lx = (c - (cols - 1) / 2) * spacing;
      const ly = r * spacing;
      const rx = lx * cosA - ly * sinA;
      const ry = lx * sinA + ly * cosA;
      positions.push(vec2(rx, ry));
      idx++;
    }
  }
  return positions;
}

function generateSquareFormation(count: number, facing: number): Vec2[] {
  const positions: Vec2[] = [];
  const side = Math.ceil(Math.sqrt(count));
  const rad = (facing * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const spacing = 0.12;

  let idx = 0;
  for (let r = 0; r < side && idx < count; r++) {
    for (let c = 0; c < side && idx < count; c++) {
      const lx = (c - (side - 1) / 2) * spacing;
      const ly = (r - (side - 1) / 2) * spacing;
      const rx = lx * cosA - ly * sinA;
      const ry = lx * sinA + ly * cosA;
      positions.push(vec2(rx, ry));
      idx++;
    }
  }
  return positions;
}

function generateLooseFormation(count: number, facing: number): Vec2[] {
  const positions: Vec2[] = [];
  const cols = Math.ceil(Math.sqrt(count * 2));
  const rows = Math.ceil(count / cols);
  const rad = (facing * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const spacing = 0.2;

  let idx = 0;
  for (let r = 0; r < rows + 1 && idx < count; r++) {
    const offset = r % 2 === 0 ? 0 : spacing / 2;
    for (let c = 0; c < cols && idx < count; c++) {
      const lx = (c - (cols - 1) / 2) * spacing + offset;
      const ly = (r - rows / 2) * spacing;
      const rx = lx * cosA - ly * sinA;
      const ry = lx * sinA + ly * cosA;
      positions.push(vec2(rx, ry));
      idx++;
    }
  }
  return positions;
}

export function updateSoldierVisuals(
  soldiers: SoldierVisual[],
  formation: FormationType,
  livingCount: number,
  facing: number
): void {
  const formationPositions = generateFormationPositions(formation, livingCount, facing);

  let livingIdx = 0;
  for (const soldier of soldiers) {
    if (soldier.alive && livingIdx < formationPositions.length) {
      soldier.localOffset = formationPositions[livingIdx];
      livingIdx++;
    }
  }
}
