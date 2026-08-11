import {
  fabricClipPathForPrintableArea,
  validateRectArea,
} from "../cameraZone";

/**
 * Build Fabric clip paths: print area minus exclusion zones.
 * Supports rect / circle / polygon masks via cameraZone helpers.
 */
export class ClipPathFactory {
  constructor({ printArea = null, exclusionZones = [], canvasWidth = 0, canvasHeight = 0 } = {}) {
    this.printArea = printArea;
    this.exclusionZones = exclusionZones || [];
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  update({ printArea, exclusionZones, canvasWidth, canvasHeight } = {}) {
    if (printArea !== undefined) this.printArea = printArea;
    if (exclusionZones !== undefined) this.exclusionZones = exclusionZones || [];
    if (canvasWidth != null) this.canvasWidth = canvasWidth;
    if (canvasHeight != null) this.canvasHeight = canvasHeight;
  }

  /** Absolute-positioned clip for artwork (print area − masks). */
  createArtworkClip() {
    const pa = this.printArea && validateRectArea(this.printArea, "ClipPathFactory").ok
      ? this.printArea
      : null;
    return fabricClipPathForPrintableArea(
      pa,
      this.exclusionZones,
      this.canvasWidth,
      this.canvasHeight
    );
  }
}
