/**
 * Single shared demo phone-case overlay used when no admin template
 * (model-specific or default) exists for the selected model + case type.
 */
export const DEMO_PHONE_CASE_OVERLAY = "/images/demo-phone-case-overlay.png";

export const DEMO_TEMPLATE_CANVAS = { width: 1024, height: 1536 };

/** Inner transparent print surface of demo-phone-case-overlay.png */
export const DEMO_PRINT_AREA = {
  x: 280,
  y: 282,
  width: 463,
  height: 949,
  rx: 48,
  ry: 48,
};

/** Camera bump punched out of artwork on the demo overlay */
export const DEMO_CAMERA_ZONE = {
  id: "zone-demo-camera",
  kind: "camera",
  label: "Camera",
  type: "rect",
  shape: "rect",
  x: 300,
  y: 300,
  width: 208,
  height: 196,
  rx: 36,
  ry: 36,
};

export function buildDemoLoadedTemplate({ modelId = null, caseTypeSlug = null } = {}) {
  const { width: canvasWidth, height: canvasHeight } = DEMO_TEMPLATE_CANVAS;
  const printArea = { ...DEMO_PRINT_AREA };
  const exclusionZones = [{ ...DEMO_CAMERA_ZONE }];

  return {
    template: {
      id: null,
      is_demo: true,
      model_id: modelId,
      case_type_slug: caseTypeSlug,
      file_path: DEMO_PHONE_CASE_OVERLAY,
      canvas_width: canvasWidth,
      canvas_height: canvasHeight,
      print_area: printArea,
      exclusion_zones: exclusionZones,
      mask_zones: exclusionZones,
      camera_zone: DEMO_CAMERA_ZONE,
      version: 0,
      enabled: true,
    },
    printArea,
    exclusionZones,
    overlayUrl: DEMO_PHONE_CASE_OVERLAY,
    canvasWidth,
    canvasHeight,
    isDemo: true,
  };
}
