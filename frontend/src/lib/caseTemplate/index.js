/**
 * Case template rendering modules (yourPrint-style layered preview).
 *
 * Architecture supports future: multi print areas, front/back, wrap-around,
 * polygon masks, SVG overlays, template versioning, undo/redo.
 */
export { TemplateRenderer } from "./TemplateRenderer";
export { loadTemplate, normalizeLoadedTemplate, listPrintSurfaces } from "./TemplateLoader";
export {
  DEMO_PHONE_CASE_OVERLAY,
  DEMO_TEMPLATE_CANVAS,
  DEMO_PRINT_AREA,
  DEMO_CAMERA_ZONE,
  buildDemoLoadedTemplate,
} from "./demoTemplate";
export { CanvasViewport } from "./CanvasViewport";
export { ClipPathFactory } from "./ClipPathFactory";
export { ArtworkLayer } from "./ArtworkLayer";
export { OverlayLayer } from "./OverlayLayer";
export { GuideLayer } from "./GuideLayer";
export { CaseColorLayer, DEFAULT_CASE_COLOR, STUDIO_BACKGROUND } from "./CaseColorLayer";
export { ExportRenderer } from "./ExportRenderer";
