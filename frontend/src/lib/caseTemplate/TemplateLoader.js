import { api } from "../api";
import { getTemplateImageUrl } from "../templateImage";
import {
  normalizePrintArea,
  normalizeExclusionZones,
} from "../cameraZone";
import { buildDemoLoadedTemplate } from "./demoTemplate";

/**
 * Load and normalize a case overlay template for a model + case type.
 * Always works in template pixel coordinates (never screen pixels).
 * Falls back to an admin default overlay (all models), then a built-in demo.
 */
export async function loadTemplate({ modelId, caseTypeSlug, allowDemo = true } = {}) {
  if (!modelId || !caseTypeSlug) {
    return allowDemo
      ? buildDemoLoadedTemplate({ modelId, caseTypeSlug })
      : { template: null, printArea: null, exclusionZones: [], overlayUrl: null };
  }

  try {
    const { data } = await api.get("/templates", {
      params: { model_id: modelId, case_type_slug: caseTypeSlug },
    });
    const loaded = normalizeLoadedTemplate(data);
    if (loaded.template && loaded.overlayUrl) return loaded;
    return allowDemo
      ? buildDemoLoadedTemplate({ modelId, caseTypeSlug })
      : loaded;
  } catch (err) {
    if (err?.response?.status !== 404) {
      console.error("[TemplateLoader] failed to load template", err);
    }
    return allowDemo
      ? buildDemoLoadedTemplate({ modelId, caseTypeSlug })
      : { template: null, printArea: null, exclusionZones: [], overlayUrl: null };
  }
}

export function normalizeLoadedTemplate(raw) {
  if (!raw) {
    return { template: null, printArea: null, exclusionZones: [], overlayUrl: null };
  }

  const canvasWidth = Number(raw.canvas_width) || 360;
  const canvasHeight = Number(raw.canvas_height) || 720;
  const printArea = normalizePrintArea(raw, canvasWidth, canvasHeight);
  const exclusionZones = normalizeExclusionZones(raw);
  const overlayUrl = getTemplateImageUrl(raw.file_path);

  return {
    template: {
      ...raw,
      canvas_width: canvasWidth,
      canvas_height: canvasHeight,
      print_area: printArea,
      exclusion_zones: exclusionZones,
      mask_zones: exclusionZones,
      is_default: Boolean(raw.is_default),
    },
    printArea,
    exclusionZones,
    overlayUrl,
    canvasWidth,
    canvasHeight,
  };
}

/**
 * Future-ready shape for multi-side / multi-area templates.
 * Today we expose a single "back" print surface.
 */
export function listPrintSurfaces(template) {
  if (!template) return [];
  const canvasWidth = Number(template.canvas_width) || 0;
  const canvasHeight = Number(template.canvas_height) || 0;
  const printArea = normalizePrintArea(template, canvasWidth, canvasHeight);
  if (!printArea) return [];
  return [
    {
      id: "back",
      label: "Back",
      printArea,
      exclusionZones: normalizeExclusionZones(template),
      overlayPath: template.file_path || null,
      version: template.version || 1,
    },
  ];
}
