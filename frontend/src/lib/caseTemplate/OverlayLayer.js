import * as fabric from "fabric";

/**
 * Case overlay PNG (bezel, camera bump, buttons, shadows).
 * Always above artwork; never interactive.
 */
export class OverlayLayer {
  constructor() {
    this.object = null;
  }

  async mount(canvas, { url, canvasWidth, canvasHeight }) {
    this.unmount(canvas);
    if (!url || !canvas) return null;

    const img = await fabric.Image.fromURL(url, { crossOrigin: "anonymous" });
    if (!img || !canvas) return null;

    const cw = canvasWidth || img.width;
    const ch = canvasHeight || img.height;
    img.set({
      left: 0,
      top: 0,
      originX: "left",
      originY: "top",
      scaleX: cw / img.width,
      scaleY: ch / img.height,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      objectCaching: true,
      excludeFromExport: false, // preview may include it; print export hides via ExportRenderer
    });
    img.isCaseOverlay = true;
    canvas.add(img);
    this.object = img;
    return img;
  }

  unmount(canvas) {
    if (this.object && canvas) {
      canvas.remove(this.object);
    }
    this.object = null;
  }

  bringToFront(canvas) {
    if (this.object && canvas) canvas.bringObjectToFront(this.object);
  }
}
