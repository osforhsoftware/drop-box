import * as fabric from "fabric";

/**
 * User artwork layer — always behind the case overlay.
 * Supports move / scale / rotate / wheel zoom / pinch / double-click reset.
 */
export class ArtworkLayer {
  constructor({
    clipFactory,
    allowOverflow = false,
    onTransform,
  } = {}) {
    this.object = null;
    this.clipFactory = clipFactory;
    this.allowOverflow = allowOverflow;
    this.onTransform = onTransform;
    this._initialTransform = null;
    this._pinch = null;
    this._bound = false;
  }

  async placeFromDataUrl(canvas, dataUrl, { sceneW, sceneH, printArea } = {}) {
    const img = await fabric.Image.fromURL(dataUrl);
    return this.place(canvas, img, { sceneW, sceneH, printArea });
  }

  place(canvas, img, { sceneW, sceneH, printArea } = {}) {
    if (!canvas || !img) return null;
    this.clear(canvas);

    const area = printArea && printArea.width > 0 && printArea.height > 0
      ? printArea
      : { x: 0, y: 0, width: sceneW, height: sceneH };

    const fitScale = Math.min(
      (area.width * 0.92) / img.width,
      (area.height * 0.92) / img.height
    );

    img.set({
      originX: "center",
      originY: "center",
      left: area.x + area.width / 2,
      top: area.y + area.height / 2,
      scaleX: fitScale,
      scaleY: fitScale,
      angle: 0,
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      lockScalingFlip: true,
      objectCaching: true,
    });
    img.isUserArtwork = true;

    const clip = this.clipFactory?.createArtworkClip();
    if (clip) img.clipPath = clip;

    canvas.add(img);
    canvas.sendObjectToBack(img);
    this.object = img;
    this._initialTransform = this.getTransform();
    this._bindInteractions(canvas, area);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
    return img;
  }

  clear(canvas) {
    if (this.object && canvas) {
      canvas.remove(this.object);
    }
    this.object = null;
    this._initialTransform = null;
    this._pinch = null;
    this._bound = false;
  }

  applyClip() {
    if (!this.object || !this.clipFactory) return;
    const clip = this.clipFactory.createArtworkClip();
    this.object.clipPath = clip || undefined;
    this.object.dirty = true;
  }

  rotate(deltaDeg = 15) {
    if (!this.object) return;
    this.object.rotate((this.object.angle || 0) + deltaDeg);
    this.object.setCoords();
    this._emitTransform();
  }

  zoom(factor, { printArea } = {}) {
    if (!this.object || !factor) return;
    this.object.scaleX *= factor;
    this.object.scaleY *= factor;
    this.object.setCoords();
    if (!this.allowOverflow && printArea) this.constrainToPrintArea(printArea);
    this._emitTransform();
  }

  reset() {
    if (!this.object || !this._initialTransform) return;
    this.object.set({ ...this._initialTransform });
    this.object.setCoords();
    this._emitTransform();
  }

  getTransform() {
    const o = this.object;
    if (!o) return null;
    return {
      left: o.left,
      top: o.top,
      scaleX: o.scaleX,
      scaleY: o.scaleY,
      angle: o.angle || 0,
      originX: o.originX,
      originY: o.originY,
    };
  }

  /**
   * Soft-constrain artwork center into print area (unless overflow mode).
   */
  constrainToPrintArea(printArea) {
    if (this.allowOverflow || !this.object || !printArea) return;
    const o = this.object;
    const minX = printArea.x;
    const maxX = printArea.x + printArea.width;
    const minY = printArea.y;
    const maxY = printArea.y + printArea.height;
    const cx = Math.min(maxX, Math.max(minX, o.left));
    const cy = Math.min(maxY, Math.max(minY, o.top));
    if (cx !== o.left || cy !== o.top) {
      o.set({ left: cx, top: cy });
      o.setCoords();
    }
  }

  _bindInteractions(canvas, printArea) {
    if (!this.object || this._bound) return;
    const obj = this.object;

    const onMoving = () => {
      if (!this.allowOverflow) this.constrainToPrintArea(printArea);
      this._emitTransform();
    };
    const onModified = () => {
      if (!this.allowOverflow) this.constrainToPrintArea(printArea);
      this._emitTransform();
      canvas.requestRenderAll();
    };
    const onScaling = () => this._emitTransform();
    const onRotating = () => this._emitTransform();

    obj.on("moving", onMoving);
    obj.on("modified", onModified);
    obj.on("scaling", onScaling);
    obj.on("rotating", onRotating);

    // Double-click / double-tap reset
    obj.on("mousedblclick", () => {
      this.reset();
      canvas.requestRenderAll();
    });

    this._bound = true;
  }

  _emitTransform() {
    if (typeof this.onTransform === "function") {
      this.onTransform(this.getTransform());
    }
  }

  /** Attach canvas-level wheel + pinch handlers (call once per canvas). */
  static attachViewportGestures(canvas, getArtworkLayer, getPrintArea) {
    if (!canvas || canvas.__caseTemplateGesturesBound) return;
    canvas.__caseTemplateGesturesBound = true;

    canvas.on("mouse:wheel", (opt) => {
      const layer = getArtworkLayer?.();
      const target = layer?.object;
      if (!target) return;
      const e = opt.e;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY;
      const factor = delta > 0 ? 0.92 : 1.08;
      layer.zoom(factor, { printArea: getPrintArea?.() });
      canvas.requestRenderAll();
    });

    const el = canvas.upperCanvasEl || canvas.lowerCanvasEl;
    if (!el) return;

    let pinch = null;

    const distance = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    };

    el.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 2) {
          const layer = getArtworkLayer?.();
          if (!layer?.object) return;
          pinch = {
            startDist: distance(e.touches[0], e.touches[1]),
            startScaleX: layer.object.scaleX,
            startScaleY: layer.object.scaleY,
          };
          e.preventDefault();
        }
      },
      { passive: false }
    );

    el.addEventListener(
      "touchmove",
      (e) => {
        if (!pinch || e.touches.length !== 2) return;
        const layer = getArtworkLayer?.();
        if (!layer?.object) return;
        const dist = distance(e.touches[0], e.touches[1]);
        const ratio = dist / pinch.startDist;
        layer.object.scaleX = pinch.startScaleX * ratio;
        layer.object.scaleY = pinch.startScaleY * ratio;
        layer.object.setCoords();
        if (!layer.allowOverflow) layer.constrainToPrintArea(getPrintArea?.());
        layer._emitTransform();
        canvas.requestRenderAll();
        e.preventDefault();
      },
      { passive: false }
    );

    el.addEventListener("touchend", () => {
      pinch = null;
    });
  }
}
