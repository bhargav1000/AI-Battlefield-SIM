import { Vec2 } from '../types';

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vec2Scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function vec2Length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vec2Distance(a: Vec2, b: Vec2): number {
  return vec2Length(vec2Sub(a, b));
}

export function vec2Normalize(v: Vec2): Vec2 {
  const len = vec2Length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function vec2Lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function vec2Equals(a: Vec2, b: Vec2): boolean {
  return Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;
}

export function vec2Floor(v: Vec2): Vec2 {
  return { x: Math.floor(v.x), y: Math.floor(v.y) };
}

export function vec2Round(v: Vec2): Vec2 {
  return { x: Math.round(v.x), y: Math.round(v.y) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function angleBetween(from: Vec2, to: Vec2): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
}

export function angleDifference(a: number, b: number): number {
  let diff = ((b - a + 180) % 360) - 180;
  if (diff < -180) diff += 360;
  return Math.abs(diff);
}
