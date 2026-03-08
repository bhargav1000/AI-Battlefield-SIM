import { MatchState } from '../types';
import { Camera } from './camera';
import { renderTerrain } from './terrain-renderer';
import { renderSquads } from './squad-renderer';
import { worldToScreen } from './isometric';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  camera: Camera;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.camera = new Camera(this.canvas);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const container = this.canvas.parentElement!;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }

  render(state: MatchState): void {
    const { ctx, canvas } = this;

    // Clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply camera transform
    this.camera.applyTransform(ctx);

    // Render terrain
    renderTerrain(ctx, state.map);

    // Render squads
    renderSquads(ctx, state);

    // Reset transform for UI overlays
    this.camera.resetTransform(ctx);
  }

  centerOnMap(mapWidth: number, mapHeight: number): void {
    const center = worldToScreen(mapWidth / 2, mapHeight / 2);
    this.camera.x = this.canvas.width / 2 - center.x * this.camera.zoom;
    this.camera.y = this.canvas.height / 3 - center.y * this.camera.zoom;
  }
}
