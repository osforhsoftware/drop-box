import { createPrintAreaOutline, validateRectArea } from "../cameraZone";

/**
 * Edit-mode print area guide (blue dashed rounded rect).
 * Hidden for export / preview snapshots.
 */
export class GuideLayer {
  constructor() {
    this.object = null;
    this.visible = true;
  }

  mount(canvas, printArea) {
    this.unmount(canvas);
    if (!canvas || !printArea) return null;
    if (!validateRectArea(printArea, "GuideLayer").ok) return null;

    const guide = createPrintAreaOutline(printArea);
    if (!guide) return null;

    guide.set({
      visible: this.visible,
      excludeFromExport: true,
      objectCaching: false,
      evented: false,
      selectable: false,
    });
    canvas.add(guide);
    this.object = guide;
    return guide;
  }

  unmount(canvas) {
    if (this.object && canvas) canvas.remove(this.object);
    this.object = null;
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    if (this.object) {
      this.object.set({ visible: this.visible });
      this.object.dirty = true;
    }
  }

  bringToFront(canvas) {
    if (this.object && canvas) canvas.bringObjectToFront(this.object);
  }
}
