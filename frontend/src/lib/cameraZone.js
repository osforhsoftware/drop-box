import * as fabric from "fabric";

/** Mask / exclusion zone types — areas where customer artwork must not print */

export const ZONE_KINDS = [
  { id: "camera", label: "Camera", stroke: "#ef4444", fill: "rgba(239,68,68,0.3)" },
  { id: "flash", label: "Flash", stroke: "#f59e0b", fill: "rgba(245,158,11,0.3)" },
  { id: "sensor", label: "Sensor", stroke: "#8b5cf6", fill: "rgba(139,92,246,0.3)" },
  { id: "other", label: "Other", stroke: "#22c55e", fill: "rgba(34,197,94,0.3)" },
];

export const PRINT_AREA_STYLE = {
  stroke: "rgba(96,165,250,0.95)",
  fill: "transparent",
  strokeWidth: 3,
  strokeDashArray: [10, 6],
};

export function zoneKindStyle(kind) {
  return ZONE_KINDS.find((k) => k.id === kind) || ZONE_KINDS[ZONE_KINDS.length - 1];
}

export function defaultCornerRadius(width, height) {
  return Math.max(4, Math.round(Math.min(width, height) * 0.22));
}

/** Gentler radius for full-case print areas (0.22 of min side is too aggressive). */
export function printAreaCornerRadius(width, height, preferred) {
  if (preferred != null && !Number.isNaN(Number(preferred))) {
    return Math.max(0, Math.min(Number(preferred), width / 2, height / 2));
  }
  return Math.min(56, Math.max(24, Math.round(Math.min(width, height) * 0.06)));
}

function zoneDim(raw, ...keys) {
  if (!raw || typeof raw !== "object") return null;
  for (const k of keys) {
    if (raw[k] != null && !Number.isNaN(Number(raw[k]))) return Number(raw[k]);
  }
  return null;
}

/**
 * Validate print / mask rect dimensions. Returns { ok, error, area }.
 * Fails loudly when width/height are missing — that previously produced a
 * partial top-left-only outline (rx/ry stroked on a 0×0 rect).
 */
export function validateRectArea(raw, label = "zone") {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: `${label}: missing object`, area: null };
  }
  const width = zoneDim(raw, "width", "w");
  const height = zoneDim(raw, "height", "h");
  const x = Number(raw.x) || 0;
  const y = Number(raw.y) || 0;
  if (!width || !height || width <= 0 || height <= 0) {
    const error = `${label}: invalid dimensions (x=${raw.x}, y=${raw.y}, width=${raw.width}, height=${raw.height})`;
    console.warn(`[cameraZone] ${error}`);
    return { ok: false, error, area: null };
  }
  return {
    ok: true,
    error: null,
    area: { x, y, width, height, rx: raw.rx, ry: raw.ry },
  };
}

function normalizeRectZone(raw, defaults = {}) {
  if (!raw || typeof raw !== "object") return null;

  // Legacy docs use type:"camera"|"flash" with shape:"rect", or type:"rect".
  const shape = raw.shape || (raw.type === "rect" || raw.type === "polygon" ? raw.type : null);
  if (shape === "circle" || raw.type === "circle") return null;
  if (!(shape === "rect" || raw.type === "rect" || raw.width || raw.w)) return null;

  const checked = validateRectArea(raw, defaults.label || "mask zone");
  if (!checked.ok) return null;

  const { x, y, width, height } = checked.area;
  const kind =
    raw.kind ||
    defaults.kind ||
    (raw.type && raw.type !== "rect" ? raw.type : null) ||
    "camera";
  const rxRaw = raw.rx != null ? Number(raw.rx) : raw.ry != null ? Number(raw.ry) : null;
  const rx =
    rxRaw != null && !Number.isNaN(rxRaw)
      ? Math.max(0, rxRaw)
      : defaultCornerRadius(width, height);
  const style = zoneKindStyle(kind);
  return {
    id: raw.id || defaults.id || `zone-${kind}`,
    kind,
    label: raw.label || style.label,
    type: "rect",
    shape: "rect",
    x,
    y,
    width,
    height,
    rx,
    ry: raw.ry != null && !Number.isNaN(Number(raw.ry)) ? Number(raw.ry) : rx,
  };
}

function normalizeCircleZone(raw, defaults = {}) {
  if (!raw || typeof raw !== "object") return null;
  const shape = raw.shape || (raw.type === "circle" ? "circle" : null);
  if (shape !== "circle" && raw.type !== "circle" && raw.r == null && raw.radius == null) {
    return null;
  }
  const r = zoneDim(raw, "r", "radius");
  if (!r || r <= 0) {
    console.warn("[cameraZone] circle zone: invalid radius", raw);
    return null;
  }
  const kind =
    raw.kind ||
    defaults.kind ||
    (raw.type && raw.type !== "circle" ? raw.type : null) ||
    "camera";
  const style = zoneKindStyle(kind);
  return {
    id: raw.id || defaults.id || `zone-${kind}`,
    kind,
    label: raw.label || style.label,
    type: "circle",
    shape: "circle",
    x: Number(raw.x) || 0,
    y: Number(raw.y) || 0,
    r,
  };
}

function normalizeAnyZone(raw, defaults = {}) {
  if (!raw || typeof raw !== "object") return null;
  const shape = raw.shape || (raw.type === "rect" || raw.type === "circle" || raw.type === "polygon" ? raw.type : null);
  if (shape === "circle" || raw.type === "circle" || ((raw.r != null || raw.radius != null) && !raw.width && !raw.w)) {
    return normalizeCircleZone(raw, defaults);
  }
  if (raw.type === "polygon" && Array.isArray(raw.points) && raw.points.length >= 3) {
    return {
      id: raw.id || defaults.id || "zone-polygon",
      kind: raw.kind || "other",
      label: raw.label || "Mask",
      type: "polygon",
      shape: "polygon",
      points: raw.points.map((p) => ({
        x: Number(p.x ?? p[0]) || 0,
        y: Number(p.y ?? p[1]) || 0,
      })),
    };
  }
  return normalizeRectZone(raw, defaults);
}

/** Main printable rectangle; defaults to full canvas when missing/invalid. */
export function normalizePrintArea(template, canvasW = 0, canvasH = 0) {
  const raw = template?.print_area || template?.printArea;
  if (raw && typeof raw === "object") {
    const checked = validateRectArea(raw, "print_area");
    if (checked.ok) {
      const rx = printAreaCornerRadius(
        checked.area.width,
        checked.area.height,
        raw.rx ?? raw.ry ?? checked.area.rx ?? checked.area.ry
      );
      return {
        x: checked.area.x,
        y: checked.area.y,
        width: checked.area.width,
        height: checked.area.height,
        rx,
        ry: rx,
      };
    }
  }
  const cw = Number(template?.canvas_width) || canvasW || 0;
  const ch = Number(template?.canvas_height) || canvasH || 0;
  if (cw > 0 && ch > 0) {
    const rx = printAreaCornerRadius(cw, ch);
    return { x: 0, y: 0, width: cw, height: ch, rx, ry: rx };
  }
  console.warn("[cameraZone] print_area: no valid print area or canvas size", {
    print_area: raw,
    canvas_width: template?.canvas_width,
    canvas_height: template?.canvas_height,
  });
  return null;
}

/** Build a stored print_area object from a Fabric rect. */
export function printAreaFromFabricRect(rect) {
  if (!rect) return null;
  const width = Math.round(rect.width * (rect.scaleX || 1));
  const height = Math.round(rect.height * (rect.scaleY || 1));
  if (!width || !height) return null;
  const scale = rect.scaleX || 1;
  const rx = printAreaCornerRadius(width, height, Math.round((rect.rx || 0) * scale));
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width,
    height,
    rx,
    ry: rx,
  };
}

/** Exclusion / mask zones (camera, flash, etc.). */
export function normalizeExclusionZones(template) {
  if (!template) return [];
  if (Array.isArray(template.exclusion_zones) && template.exclusion_zones.length) {
    return template.exclusion_zones.map((z) => normalizeAnyZone(z)).filter(Boolean);
  }
  if (Array.isArray(template.mask_zones) && template.mask_zones.length) {
    return template.mask_zones.map((z) => normalizeAnyZone(z)).filter(Boolean);
  }
  if (template.camera_zone) {
    const z = normalizeAnyZone(template.camera_zone, { kind: "camera" });
    return z ? [z] : [];
  }
  if (
    template.cutout_width != null &&
    template.cutout_height != null &&
    Number(template.cutout_width) > 0 &&
    Number(template.cutout_height) > 0
  ) {
    const z = normalizeAnyZone(
      {
        type: "rect",
        shape: "rect",
        x: template.cutout_x,
        y: template.cutout_y,
        width: template.cutout_width,
        height: template.cutout_height,
      },
      { kind: "camera" }
    );
    return z ? [z] : [];
  }
  return [];
}

/** @deprecated alias — prefer normalizeExclusionZones */
export function normalizeMaskZones(template) {
  return normalizeExclusionZones(template).map((z) => {
    // Keep legacy consumers that expect type:"rect" + kind
    if (z.shape === "rect" || z.type === "rect") {
      return { ...z, type: "rect", kind: z.kind || z.type };
    }
    return z;
  });
}

/** @deprecated use normalizeMaskZones — returns first zone or null */
export function normalizeCameraZone(template) {
  const zones = normalizeExclusionZones(template);
  return zones[0] || null;
}

export function zoneFromFabricRect(rect, meta = {}) {
  if (!rect) return null;
  const width = Math.round(rect.width * (rect.scaleX || 1));
  const height = Math.round(rect.height * (rect.scaleY || 1));
  const scale = rect.scaleX || 1;
  const rx = Math.round((rect.rx || 0) * scale);
  const kind = rect.zoneKind || meta.kind || "camera";
  const style = zoneKindStyle(kind);
  return {
    id: rect.zoneId || meta.id,
    kind,
    label: meta.label || style.label,
    type: "rect",
    shape: "rect",
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width,
    height,
    rx: rx || defaultCornerRadius(width, height),
    ry: rx || defaultCornerRadius(width, height),
  };
}

export function roundedRectPathD(x, y, w, h, r) {
  const rad = Math.min(Math.max(0, r), w / 2, h / 2);
  const x2 = x + w;
  const y2 = y + h;
  // Use explicit L/Q (not H/V alone) so Fabric's path parser always closes all 4 sides.
  return [
    `M ${x + rad} ${y}`,
    `L ${x2 - rad} ${y}`,
    `Q ${x2} ${y} ${x2} ${y + rad}`,
    `L ${x2} ${y2 - rad}`,
    `Q ${x2} ${y2} ${x2 - rad} ${y2}`,
    `L ${x + rad} ${y2}`,
    `Q ${x} ${y2} ${x} ${y2 - rad}`,
    `L ${x} ${y + rad}`,
    `Q ${x} ${y} ${x + rad} ${y}`,
    "Z",
  ].join(" ");
}

export function circlePathD(cx, cy, r) {
  return [
    `M ${cx - r} ${cy}`,
    `a ${r} ${r} 0 1 0 ${r * 2} 0`,
    `a ${r} ${r} 0 1 0 ${-r * 2} 0`,
    "Z",
  ].join(" ");
}

function appendExclusionPath(d, zone) {
  if ((zone.shape === "circle" || zone.type === "circle") && zone.r > 0) {
    return `${d} ${circlePathD(zone.x, zone.y, zone.r)}`;
  }
  if ((zone.shape === "rect" || zone.type === "rect") && zone.width > 0 && zone.height > 0) {
    const rx = zone.rx ?? zone.ry ?? defaultCornerRadius(zone.width, zone.height);
    return `${d} ${roundedRectPathD(zone.x, zone.y, zone.width, zone.height, rx)}`;
  }
  if ((zone.shape === "polygon" || zone.type === "polygon") && zone.points?.length >= 3) {
    const pts = zone.points.map((p) => `${p.x} ${p.y}`).join(" L ");
    return `${d} M ${pts} Z`;
  }
  return d;
}

/** Even-odd SVG path: printable area minus exclusion holes. */
export function printableAreaEvenOddPath(printArea, exclusionZones) {
  const checked = validateRectArea(printArea, "print_area path");
  if (!checked.ok) return null;
  const { x, y, width, height } = checked.area;
  const rx = printAreaCornerRadius(width, height, printArea.rx ?? printArea.ry);
  let d = roundedRectPathD(x, y, width, height, rx);
  for (const z of exclusionZones || []) {
    d = appendExclusionPath(d, z);
  }
  return d;
}

export function maskZonesEvenOddPath(zones, canvasW, canvasH) {
  let d = `M 0 0 L ${canvasW} 0 L ${canvasW} ${canvasH} L 0 ${canvasH} Z`;
  for (const z of zones || []) {
    d = appendExclusionPath(d, z);
  }
  return d;
}

/**
 * Visible print-area outline for the Customize canvas.
 * Uses fabric.Rect (not Path) so left/top/width/height/rx are applied directly —
 * absolute Path coords + left/top previously caused a double-offset that only
 * left the top-left corner visible inside the zoomed canvas.
 */
export function createPrintAreaOutline(printArea, { interactive = false } = {}) {
  const checked = validateRectArea(printArea, "print_area outline");
  if (!checked.ok) return null;

  const { x, y, width, height } = checked.area;
  const rx = printAreaCornerRadius(width, height, printArea.rx ?? printArea.ry);

  // Fabric 7 defaults origin to center — left/top must be top-left of the print area.
  const rect = new fabric.Rect({
    left: x,
    top: y,
    width,
    height,
    rx,
    ry: rx,
    originX: "left",
    originY: "top",
    fill: PRINT_AREA_STYLE.fill,
    stroke: PRINT_AREA_STYLE.stroke,
    strokeWidth: PRINT_AREA_STYLE.strokeWidth,
    strokeDashArray: PRINT_AREA_STYLE.strokeDashArray,
    strokeUniform: true,
    selectable: interactive,
    evented: interactive,
    hasControls: interactive,
    hasBorders: interactive,
    excludeFromExport: true,
    objectCaching: false,
  });
  rect.isPrintAreaGuide = true;
  return rect;
}

export function fabricClipPathForZone(zone, { inverted = false } = {}) {
  if (!zone) return null;
  if (zone.shape === "circle" || zone.type === "circle") {
    return new fabric.Circle({
      left: zone.x,
      top: zone.y,
      radius: zone.r,
      originX: "center",
      originY: "center",
      absolutePositioned: true,
      inverted: Boolean(inverted),
    });
  }
  if (zone.shape === "rect" || zone.type === "rect") {
    const checked = validateRectArea(zone, "clip zone");
    if (!checked.ok) return null;
    const rx = zone.rx ?? zone.ry ?? defaultCornerRadius(zone.width, zone.height);
    return new fabric.Rect({
      left: zone.x,
      top: zone.y,
      width: zone.width,
      height: zone.height,
      rx,
      ry: zone.ry ?? rx,
      originX: "left",
      originY: "top",
      absolutePositioned: true,
      inverted: Boolean(inverted),
    });
  }
  if ((zone.shape === "polygon" || zone.type === "polygon") && Array.isArray(zone.points) && zone.points.length >= 3) {
    return new fabric.Polygon(zone.points, {
      absolutePositioned: true,
      inverted: Boolean(inverted),
    });
  }
  return null;
}

/** Clip user artwork to print area with exclusion holes punched out. */
export function fabricClipPathForPrintableArea(printArea, exclusionZones, canvasW, canvasH) {
  const zones = (exclusionZones || []).filter((z) => {
    if (z.shape === "circle" || z.type === "circle") return z.r > 0;
    if (z.shape === "rect" || z.type === "rect") return z.width > 0 && z.height > 0;
    if (z.shape === "polygon" || z.type === "polygon") return z.points?.length >= 3;
    return false;
  });

  const pa =
    printArea && validateRectArea(printArea, "print_area clip").ok
      ? printArea
      : canvasW > 0 && canvasH > 0
        ? { x: 0, y: 0, width: canvasW, height: canvasH }
        : null;

  if (!pa && !zones.length) return null;

  if (!zones.length && pa) {
    const rx = printAreaCornerRadius(pa.width, pa.height, pa.rx ?? pa.ry);
    return new fabric.Rect({
      left: pa.x,
      top: pa.y,
      width: pa.width,
      height: pa.height,
      rx,
      ry: rx,
      originX: "left",
      originY: "top",
      absolutePositioned: true,
    });
  }

  const pathD = pa
    ? printableAreaEvenOddPath(pa, zones)
    : maskZonesEvenOddPath(zones, canvasW, canvasH);
  if (!pathD) return null;

  // Let Fabric place the Path at pathOffset with origin center so absolute
  // SVG coords in pathD align with canvas/scene pixels. Forcing left/top 0
  // with origin left/top shifts the clip when print_area is not at (0,0).
  return new fabric.Path(pathD, {
    absolutePositioned: true,
    fillRule: "evenodd",
    objectCaching: false,
  });
}

/**
 * Clip user artwork away from mask zones (legacy inverted holes).
 * Prefer fabricClipPathForPrintableArea when print_area is available.
 */
export function fabricClipPathForMaskZones(zones, canvasW, canvasH) {
  const list = (zones || []).filter((z) => {
    if (z.shape === "circle" || z.type === "circle") return z.r > 0;
    if (z.shape === "rect" || z.type === "rect") return z.width > 0 && z.height > 0;
    return false;
  });
  if (!list.length) return null;
  if (list.length === 1) {
    return fabricClipPathForZone(list[0], { inverted: true });
  }
  return new fabric.Path(maskZonesEvenOddPath(list, canvasW, canvasH), {
    absolutePositioned: true,
    fillRule: "evenodd",
    objectCaching: false,
  });
}
