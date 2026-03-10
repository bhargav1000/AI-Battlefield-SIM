import { Vec2 } from '../types';

const EDGE_THRESHOLD = 40; // px from canvas edge to trigger scroll
const EDGE_SCROLL_SPEED = 8; // max px per frame

export class Camera {
  x: number = 0;
  y: number = 0;
  zoom: number = 1.0;

  private isDragging = false;
  private dragStart: Vec2 = { x: 0, y: 0 };
  private cameraStart: Vec2 = { x: 0, y: 0 };
  private mouseX: number = -1;
  private mouseY: number = -1;
  private mouseOnCanvas = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.setupControls();
    this.startEdgeScroll();
  }

  private startEdgeScroll(): void {
    const tick = () => {
      if (this.mouseOnCanvas && !this.isDragging) {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const mx = this.mouseX;
        const my = this.mouseY;

        // Left edge
        if (mx < EDGE_THRESHOLD) {
          this.x += EDGE_SCROLL_SPEED * (1 - mx / EDGE_THRESHOLD);
        }
        // Right edge
        if (mx > w - EDGE_THRESHOLD) {
          this.x -= EDGE_SCROLL_SPEED * (1 - (w - mx) / EDGE_THRESHOLD);
        }
        // Top edge
        if (my < EDGE_THRESHOLD) {
          this.y += EDGE_SCROLL_SPEED * (1 - my / EDGE_THRESHOLD);
        }
        // Bottom edge
        if (my > h - EDGE_THRESHOLD) {
          this.y -= EDGE_SCROLL_SPEED * (1 - (h - my) / EDGE_THRESHOLD);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private setupControls(): void {
    this.canvas.addEventListener('mouseenter', () => { this.mouseOnCanvas = true; });
    this.canvas.addEventListener('mouseleave', () => { this.mouseOnCanvas = false; });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.cameraStart = { x: this.x, y: this.y };
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', (e) => {
      // Track mouse position relative to canvas for edge scrolling
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;

      if (!this.isDragging) return;
      this.x = this.cameraStart.x + (e.clientX - this.dragStart.x);
      this.y = this.cameraStart.y + (e.clientY - this.dragStart.y);
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(3.0, this.zoom * zoomDelta));

      // Zoom toward mouse position
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      this.x = mx - ((mx - this.x) * newZoom) / this.zoom;
      this.y = my - ((my - this.y) * newZoom) / this.zoom;
      this.zoom = newZoom;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard pan
    window.addEventListener('keydown', (e) => {
      const panSpeed = 20;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          this.x += panSpeed;
          break;
        case 'ArrowRight':
        case 'd':
          this.x -= panSpeed;
          break;
        case 'ArrowUp':
        case 'w':
          this.y += panSpeed;
          break;
        case 'ArrowDown':
        case 's':
          this.y -= panSpeed;
          break;
      }
    });
  }

  /** Center on a world position (provide screen coords directly) */
  centerOn(screenX: number, screenY: number): void {
    this.x = this.canvas.width / 2 - screenX * this.zoom;
    this.y = this.canvas.height / 2 - screenY * this.zoom;
  }

  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.zoom, 0, 0, this.zoom, this.x, this.y);
  }

  resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
