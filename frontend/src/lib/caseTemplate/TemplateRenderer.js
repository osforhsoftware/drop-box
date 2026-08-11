import * as fabric from "fabric";
import { CanvasViewport } from "./CanvasViewport";
import { ClipPathFactory } from "./ClipPathFactory";
import { OverlayLayer } from "./OverlayLayer";
import { GuideLayer } from "./GuideLayer";
import { ArtworkLayer } from "./ArtworkLayer";
import { CaseColorLayer, DEFAULT_CASE_COLOR, STUDIO_BACKGROUND } from "./CaseColorLayer";
import { ExportRenderer } from "./ExportRenderer";
import { loadTemplate, normalizeLoadedTemplate } from "./TemplateLoader";

/**
 * Orchestrates yourPrint-style layered case preview:
 *   Layer 0 — case body color (white default)
 *   Layer 1 — user artwork (clipped)
 *   Layer 2 — case overlay PNG
 *   Layer 3 — print guide (edit mode only)
 *
 * Scene coordinates are always template pixels.
 * Owns its own <canvas> inside containerEl to avoid React StrictMode / Fabric conflicts.
 */
export class TemplateRenderer {
  constructor({
    containerEl,
    allowOverflow = false,
    editMode = true,
    maxHeight = 560,
    caseColor = DEFAULT_CASE_COLOR,
    onReady,
    onArtworkChange,
  } = {}) {
    this.containerEl = containerEl;
    this.allowOverflow = allowOverflow;
    this.editMode = editMode;
    this.onReady = onReady;
    this.onArtworkChange = onArtworkChange;

    this._hostCanvas = null;
    this.canvas = null;
    this.template = null;
    this.printArea = null;
    this.exclusionZones = [];
    this.overlayUrl = null;
    this.canvasWidth = 360;
    this.canvasHeight = 720;
    this.ready = false;

    this.viewport = new CanvasViewport({ maxHeight });
    this.clipFactory = new ClipPathFactory();
    this.caseColor = new CaseColorLayer({ color: caseColor || DEFAULT_CASE_COLOR });
    this.overlay = new OverlayLayer();
    this.guide = new GuideLayer();
    this.artwork = new ArtworkLayer({
      clipFactory: this.clipFactory,
      allowOverflow,
      onTransform: (t) => {
        try {
          this.onArtworkChange?.(t);
        } catch {
          /* ignore listener errors */
        }
      },
    });

    this._ro = null;
  }

  async init() {
    if (!this.containerEl) throw new Error("TemplateRenderer: containerEl required");
    if (this.canvas) return this;

    // Create a fresh canvas node Fabric can own (safe under React StrictMode).
    this.containerEl.innerHTML = "";
    this._hostCanvas = document.createElement("canvas");
    this._hostCanvas.className = "block max-w-full rounded-lg";
    this.containerEl.appendChild(this._hostCanvas);

    this.canvas = new fabric.Canvas(this._hostCanvas, {
      width: this.canvasWidth,
      height: this.canvasHeight,
      backgroundColor: STUDIO_BACKGROUND,
      preserveObjectStacking: true,
      selection: false,
    });

    ArtworkLayer.attachViewportGestures(
      this.canvas,
      () => this.artwork,
      () => this.printArea
    );

    if (typeof ResizeObserver !== "undefined") {
      this._ro = new ResizeObserver(() => {
        try {
          this.fit();
        } catch {
          /* ignore fit errors after dispose */
        }
      });
      this._ro.observe(this.containerEl);
    }

    this.fit();
    this.ready = true;
    try {
      this.onReady?.(this);
    } catch {
      /* ignore */
    }
    return this;
  }

  async loadForModel({ modelId, caseTypeSlug }) {
    const loaded = await loadTemplate({ modelId, caseTypeSlug });
    return this.applyLoaded(loaded);
  }

  async applyTemplateRaw(rawTemplate) {
    return this.applyLoaded(normalizeLoadedTemplate(rawTemplate));
  }

  async applyLoaded(loaded) {
    this.template = loaded.template;
    this.printArea = loaded.printArea;
    this.exclusionZones = loaded.exclusionZones || [];
    this.overlayUrl = loaded.overlayUrl;
    this.canvasWidth = loaded.canvasWidth || loaded.template?.canvas_width || 360;
    this.canvasHeight = loaded.canvasHeight || loaded.template?.canvas_height || 720;

    if (!this.canvas) await this.init();

    this.viewport.setNaturalSize(this.canvasWidth, this.canvasHeight);
    this.canvas.setDimensions({ width: this.canvasWidth, height: this.canvasHeight });
    this.canvas.setZoom(1);

    this.clipFactory.update({
      printArea: this.printArea,
      exclusionZones: this.exclusionZones,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
    });

    this.artwork.clear(this.canvas);
    this.caseColor.unmount(this.canvas);
    this.overlay.unmount(this.canvas);
    this.guide.unmount(this.canvas);

    this.canvas.backgroundColor = STUDIO_BACKGROUND;
    this.caseColor.mount(this.canvas, this.printArea, this.caseColor.color);

    if (this.overlayUrl) {
      try {
        await this.overlay.mount(this.canvas, {
          url: this.overlayUrl,
          canvasWidth: this.canvasWidth,
          canvasHeight: this.canvasHeight,
        });
      } catch (err) {
        console.error("[TemplateRenderer] overlay mount failed", err);
      }
    }

    if (this.printArea) {
      this.guide.mount(this.canvas, this.printArea);
      this.guide.setVisible(this.editMode);
    }

    this.restack();
    this.fit();
    this.canvas.requestRenderAll();
    return this;
  }

  /** Layer order: case color → artwork → overlay → guide */
  restack() {
    const c = this.canvas;
    if (!c) return;
    this.caseColor.sendToBack(c);
    if (this.artwork.object) {
      c.sendObjectToBack(this.artwork.object);
      this.caseColor.sendToBack(c);
    }
    this.overlay.bringToFront(c);
    if (this.editMode) this.guide.bringToFront(c);
  }

  setCaseColor(color) {
    this.caseColor.setColor(color);
    this.canvas?.requestRenderAll();
  }

  getCaseColor() {
    return this.caseColor.color;
  }

  fit() {
    if (!this.canvas || !this.containerEl) return 1;
    return this.viewport.fit(this.canvas, this.containerEl);
  }

  setEditMode(on) {
    this.editMode = Boolean(on);
    this.guide.setVisible(this.editMode);
    if (this.editMode) this.guide.bringToFront(this.canvas);
    this.canvas?.requestRenderAll();
  }

  async setArtworkFromFile(file) {
    const dataUrl = await readFileAsDataUrl(file);
    return this.setArtworkFromDataUrl(dataUrl);
  }

  async setArtworkFromDataUrl(dataUrl) {
    if (!this.canvas) return null;
    const { w, h } = this.viewport.getSceneSize(this.canvas);
    await this.artwork.placeFromDataUrl(this.canvas, dataUrl, {
      sceneW: w,
      sceneH: h,
      printArea: this.printArea,
    });
    this.restack();
    this.canvas.requestRenderAll();
    return this.artwork.object;
  }

  rotate(delta = 15) {
    this.artwork.rotate(delta);
    this.canvas?.requestRenderAll();
  }

  zoom(factor) {
    this.artwork.zoom(factor, { printArea: this.printArea });
    this.canvas?.requestRenderAll();
  }

  resetArtwork() {
    this.artwork.reset();
    this.canvas?.requestRenderAll();
  }

  clearArtwork() {
    this.artwork.clear(this.canvas);
    this.restack();
    this.canvas?.requestRenderAll();
  }

  getTransform() {
    return this.artwork.getTransform();
  }

  async exportPreviewDataUrl(multiplier = 1) {
    if (!this.canvas) return null;
    return ExportRenderer.toPreviewDataUrl(this.canvas, {
      guideLayer: this.guide,
      multiplier,
    });
  }

  getPrintPayload() {
    return ExportRenderer.capturePrintPayload({
      artworkLayer: this.artwork,
      template: this.template,
      canvas: this.canvas,
      caseColor: this.caseColor.color,
    });
  }

  dispose() {
    try {
      this._ro?.disconnect();
    } catch {
      /* ignore */
    }
    this._ro = null;

    try {
      this.artwork.clear(this.canvas);
      this.caseColor.unmount(this.canvas);
      this.overlay.unmount(this.canvas);
      this.guide.unmount(this.canvas);
    } catch {
      /* ignore */
    }

    try {
      this.canvas?.dispose();
    } catch {
      /* ignore */
    }
    this.canvas = null;
    this._hostCanvas = null;

    try {
      if (this.containerEl) this.containerEl.innerHTML = "";
    } catch {
      /* ignore */
    }

    this.ready = false;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}
