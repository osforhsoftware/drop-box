import * as fabric from "fabric";
import { printAreaCornerRadius } from "../cameraZone";

/** Studio backdrop behind the case (yourPrint-style light stage). */
export const STUDIO_BACKGROUND = "#ececee";

/** Default case body color — white like yourPrint. */
export const DEFAULT_CASE_COLOR = "#ffffff";

/**
 * Solid case-body fill under artwork / overlay.
 * Fills the print area so transparent overlays read as a colored case.
 */
export class CaseColorLayer {
  constructor({ color = DEFAULT_CASE_COLOR } = {}) {
    this.object = null;
    this.color = color || DEFAULT_CASE_COLOR;
    this.printArea = null;
  }

  mount(canvas, printArea, color = this.color) {
    this.unmount(canvas);
    if (!canvas) return null;

    const area =
      printArea && printArea.width > 0 && printArea.height > 0
        ? printArea
        : {
            x: 0,
            y: 0,
            width: canvas.getWidth() / (canvas.getZoom() || 1),
            height: canvas.getHeight() / (canvas.getZoom() || 1),
          };

    this.printArea = area;
    this.color = color || DEFAULT_CASE_COLOR;
    const rx = printAreaCornerRadius(area.width, area.height, area.rx ?? area.ry);

    const rect = new fabric.Rect({
      left: area.x,
      top: area.y,
      width: area.width,
      height: area.height,
      rx,
      ry: rx,
      originX: "left",
      originY: "top",
      fill: this.color,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      objectCaching: false,
    });
    rect.isCaseColor = true;
    canvas.add(rect);
    canvas.sendObjectToBack(rect);
    this.object = rect;
    return rect;
  }

  setColor(color) {
    this.color = color || DEFAULT_CASE_COLOR;
    if (this.object) {
      this.object.set({ fill: this.color });
      this.object.dirty = true;
    }
  }

  unmount(canvas) {
    if (this.object && canvas) canvas.remove(this.object);
    this.object = null;
  }

  sendToBack(canvas) {
    if (this.object && canvas) canvas.sendObjectToBack(this.object);
  }
}
