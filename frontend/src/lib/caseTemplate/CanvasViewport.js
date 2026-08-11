import { fitFabricCanvas } from "../fabricFit";

/**
 * Fit-to-canvas viewport: keeps Fabric scene coords at template pixels
 * while scaling the display for desktop / tablet / mobile.
 */
export class CanvasViewport {
  constructor({ maxHeight = 560 } = {}) {
    this.maxHeight = maxHeight;
    this.scale = 1;
    this.naturalW = 360;
    this.naturalH = 720;
  }

  setNaturalSize(width, height) {
    this.naturalW = Math.max(1, Number(width) || 360);
    this.naturalH = Math.max(1, Number(height) || 720);
  }

  /**
   * Scale canvas display to fit container. Scene coordinates stay at natural size.
   * @returns {number} display scale (zoom)
   */
  fit(canvas, containerEl) {
    if (!canvas || !containerEl) return this.scale;
    this.scale = fitFabricCanvas(
      canvas,
      containerEl,
      this.naturalW,
      this.naturalH,
      this.maxHeight
    );
    return this.scale;
  }

  /** Scene (template) size — never screen pixels. */
  getSceneSize(canvas) {
    if (!canvas) return { w: this.naturalW, h: this.naturalH };
    const zoom = canvas.getZoom() || 1;
    return {
      w: canvas.getWidth() / zoom,
      h: canvas.getHeight() / zoom,
    };
  }
}
