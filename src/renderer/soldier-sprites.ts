import { Faction } from '../types';
import {
  PLAYER_COLOR,
  PLAYER_COLOR_DARK,
  ENEMY_COLOR,
  ENEMY_COLOR_DARK,
} from '../utils/constants';

type AnimState = 'idle' | 'walking' | 'fighting' | 'routing';

interface SpriteSet {
  idle: HTMLCanvasElement;
  walking: HTMLCanvasElement;
  fighting: HTMLCanvasElement;
  routing: HTMLCanvasElement;
}

const SPRITE_W = 10;
const SPRITE_H = 16;

let playerSprites: SpriteSet | null = null;
let enemySprites: SpriteSet | null = null;

/**
 * Get the sprite for a soldier given its faction and animation state.
 */
export function getSoldierSprite(faction: Faction, animState: AnimState): HTMLCanvasElement {
  if (!playerSprites || !enemySprites) {
    generateAllSprites();
  }
  const set = faction === 'player' ? playerSprites! : enemySprites!;
  return set[animState];
}

export function getSpriteSize(): { w: number; h: number } {
  return { w: SPRITE_W, h: SPRITE_H };
}

function generateAllSprites(): void {
  playerSprites = {
    idle: createSoldierSprite(PLAYER_COLOR, PLAYER_COLOR_DARK, 'idle'),
    walking: createSoldierSprite(PLAYER_COLOR, PLAYER_COLOR_DARK, 'walking'),
    fighting: createSoldierSprite(PLAYER_COLOR, PLAYER_COLOR_DARK, 'fighting'),
    routing: createSoldierSprite('#888', '#555', 'routing'),
  };
  enemySprites = {
    idle: createSoldierSprite(ENEMY_COLOR, ENEMY_COLOR_DARK, 'idle'),
    walking: createSoldierSprite(ENEMY_COLOR, ENEMY_COLOR_DARK, 'walking'),
    fighting: createSoldierSprite(ENEMY_COLOR, ENEMY_COLOR_DARK, 'fighting'),
    routing: createSoldierSprite('#888', '#555', 'routing'),
  };
}

function createSoldierSprite(
  mainColor: string,
  darkColor: string,
  anim: AnimState,
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SPRITE_W;
  c.height = SPRITE_H;
  const ctx = c.getContext('2d')!;

  // Center X
  const cx = SPRITE_W / 2;

  // --- Legs ---
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 1.2;

  const legSpread = anim === 'walking' ? 2 : anim === 'routing' ? 2.5 : 1;
  const legOffsetY = anim === 'walking' ? 1 : 0;

  // Left leg
  ctx.beginPath();
  ctx.moveTo(cx - 0.5, 11);
  ctx.lineTo(cx - legSpread, SPRITE_H - 1 + legOffsetY);
  ctx.stroke();

  // Right leg
  ctx.beginPath();
  ctx.moveTo(cx + 0.5, 11);
  ctx.lineTo(cx + legSpread, SPRITE_H - 1 - legOffsetY);
  ctx.stroke();

  // Boots
  ctx.fillStyle = '#333';
  ctx.fillRect(cx - legSpread - 0.5, SPRITE_H - 2 + legOffsetY, 2, 1.5);
  ctx.fillRect(cx + legSpread - 0.5, SPRITE_H - 2 - legOffsetY, 2, 1.5);

  // --- Body (torso) ---
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.moveTo(cx - 3, 11); // bottom-left
  ctx.lineTo(cx - 2, 5);  // top-left (shoulder)
  ctx.lineTo(cx + 2, 5);  // top-right (shoulder)
  ctx.lineTo(cx + 3, 11); // bottom-right
  ctx.closePath();
  ctx.fill();

  // Torso outline
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Belt
  ctx.fillStyle = darkColor;
  ctx.fillRect(cx - 3, 9.5, 6, 1.2);

  // --- Arms ---
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 1.4;

  if (anim === 'fighting') {
    // Right arm raised with weapon
    ctx.beginPath();
    ctx.moveTo(cx + 2, 6);
    ctx.lineTo(cx + 5, 3);
    ctx.stroke();

    // Weapon (sword)
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 5, 3);
    ctx.lineTo(cx + 5, -1);
    ctx.stroke();

    // Left arm with shield
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 2, 6);
    ctx.lineTo(cx - 4, 8);
    ctx.stroke();

    // Shield
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(cx - 5, 8, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (anim === 'routing') {
    // Arms flailing
    ctx.beginPath();
    ctx.moveTo(cx - 2, 6);
    ctx.lineTo(cx - 5, 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 2, 6);
    ctx.lineTo(cx + 5, 4);
    ctx.stroke();
  } else {
    // Arms at sides (idle/walking)
    ctx.beginPath();
    ctx.moveTo(cx - 2, 6);
    ctx.lineTo(cx - 3, 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 2, 6);
    ctx.lineTo(cx + 3, 10);
    ctx.stroke();

    // Weapon at side (spear/sword held down)
    if (anim === 'idle') {
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + 3, 10);
      ctx.lineTo(cx + 3.5, 2);
      ctx.stroke();

      // Spear tip
      ctx.fillStyle = '#ddd';
      ctx.beginPath();
      ctx.moveTo(cx + 3.5, 2);
      ctx.lineTo(cx + 2.5, 0.5);
      ctx.lineTo(cx + 4.5, 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- Head ---
  // Helmet
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(cx, 3.8, 2.8, Math.PI, 0); // helmet dome
  ctx.fill();

  // Face
  ctx.fillStyle = '#d4a574'; // skin tone
  ctx.beginPath();
  ctx.arc(cx, 4, 2, 0, Math.PI * 2);
  ctx.fill();

  // Helmet overlay (top half)
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(cx, 3.6, 2.3, Math.PI, 0);
  ctx.fill();

  // Helmet brim
  ctx.fillStyle = darkColor;
  ctx.fillRect(cx - 3, 3, 6, 0.8);

  // Eyes
  ctx.fillStyle = '#222';
  ctx.fillRect(cx - 1, 3.8, 0.8, 0.8);
  ctx.fillRect(cx + 0.5, 3.8, 0.8, 0.8);

  return c;
}
