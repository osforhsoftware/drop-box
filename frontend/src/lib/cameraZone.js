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

export function clampCornerRadius(value, width, height) {
  return Math.max(0, Math.min(Number(value) || 0, width / 2, height / 2));
}

export function fitCornerRadii(width, height, radii = {}) {
  let rtl = Math.max(0, Number(radii.rtl) || 0);
  let rtr = Math.max(0, Number(radii.rtr) || 0);
  let rbr = Math.max(0, Number(radii.rbr) || 0);
  let rbl = Math.max(0, Number(radii.rbl) || 0);
  const factor = Math.min(
    1,
    width / Math.max(rtl + rtr, 1e-6),
    width / Math.max(rbl + rbr, 1e-6),
    height / Math.max(rtl + rbl, 1e-6),
    height / Math.max(rtr + rbr, 1e-6)
  );
  return {
    rtl: +(rtl * factor).toFixed(2),
    rtr: +(rtr * factor).toFixed(2),
    rbr: +(rbr * factor).toFixed(2),
    rbl: +(rbl * factor).toFixed(2),
  };
}

/** Max px for one corner without shrinking the other three. */
export function maxRadiusForCorner(radii, key, width, height) {
  const rtl = Number(radii?.rtl) || 0;
  const rtr = Number(radii?.rtr) || 0;
  const rbr = Number(radii?.rbr) || 0;
  const rbl = Number(radii?.rbl) || 0;
  const half = Math.min(width, height) / 2;
  if (key === "rtl") return Math.max(0, Math.min(half, width - rtr, height - rbl));
  if (key === "rtr") return Math.max(0, Math.min(half, width - rtl, height - rbr));
  if (key === "rbr") return Math.max(0, Math.min(half, width - rbl, height - rtr));
  return Math.max(0, Math.min(half, width - rbr, height - rtl));
}

export function clampIndependentCorner(radii, key, value, width, height) {
  const next = {
    rtl: Math.round(Number(radii?.rtl) || 0),
    rtr: Math.round(Number(radii?.rtr) || 0),
    rbr: Math.round(Number(radii?.rbr) || 0),
    rbl: Math.round(Number(radii?.rbl) || 0),
  };
  next[key] = Math.round(Math.max(0, Math.min(Number(value) || 0, maxRadiusForCorner(next, key, width, height))));
  return { ...next, rx: next.rtl, ry: next.rtr };
}

/** Per-corner radii (CSS order: TL, TR, BR, BL). Falls back to uniform rx. */
export function normalizeCornerRadii(raw, width, height, uniformFallback = 0) {
  const src = raw && typeof raw === "object" ? raw : {};
  const uniform = clampCornerRadius(src.rx ?? src.ry ?? uniformFallback, width, height);
  const pick = (key) => Math.round(clampCornerRadius(src[key] != null ? src[key] : uniform, width, height));
  const next = {
    rtl: pick("rtl"),
    rtr: pick("rtr"),
    rbr: pick("rbr"),
    rbl: pick("rbl"),
  };
  return {
    ...next,
    rx: next.rtl,
    ry: next.rtr,
  };
}

export function uniformCornerRadii(radius, width, height) {
  const r = clampCornerRadius(radius, width, height);
  return { rtl: r, rtr: r, rbr: r, rbl: r, rx: r, ry: r };
}

function traceRoundedRect(ctx, x, y, w, h, radii) {
  const r = fitCornerRadii(w, h, radii);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, [r.rtl, r.rtr, r.rbr, r.rbl]);
    return;
  }
  ctx.moveTo(x + r.rtl, y);
  ctx.lineTo(x + w - r.rtr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.rtr);
  ctx.lineTo(x + w, y + h - r.rbr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.rbr, y + h);
  ctx.lineTo(x + r.rbl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.rbl);
  ctx.lineTo(x, y + r.rtl);
  ctx.quadraticCurveTo(x, y, x + r.rtl, y);
  ctx.closePath();
}

/** Draw independent corner radii on a Fabric Rect (rx/ry alone cannot do this). */
export function attachIndependentCorners(rect, radii) {
  if (!rect) return rect;
  const w = rect.width || 1;
  const h = rect.height || 1;
  const next = normalizeCornerRadii(radii, w, h, radii?.rx ?? rect.rx ?? 0);
  rect.cornerRadii = { rtl: next.rtl, rtr: next.rtr, rbr: next.rbr, rbl: next.rbl };
  rect.set({ rx: next.rtl, ry: next.rtl });
  rect._render = function renderIndependentCorners(ctx) {
    const width = this.width;
    const height = this.height;
    traceRoundedRect(
      ctx,
      -width / 2,
      -height / 2,
      width,
      height,
      this.cornerRadii || { rtl: this.rx, rtr: this.rx, rbr: this.rx, rbl: this.rx }
    );
    if (typeof this._renderPaintInOrder === "function") {
      this._renderPaintInOrder(ctx);
    } else {
      this._renderFill(ctx);
      this._renderStroke(ctx);
    }
  };
  return rect;
}

function radiiFromFabricRect(rect, width, height, uniformFallback) {
  const scale = rect.scaleX || 1;
  const src = rect.cornerRadii
    ? {
        rtl: rect.cornerRadii.rtl * scale,
        rtr: rect.cornerRadii.rtr * scale,
        rbr: rect.cornerRadii.rbr * scale,
        rbl: rect.cornerRadii.rbl * scale,
      }
    : { rx: (rect.rx || 0) * scale };
  return normalizeCornerRadii(src, width, height, uniformFallback);
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
  const fallback =
    rxRaw != null && !Number.isNaN(rxRaw)
      ? Math.max(0, rxRaw)
      : defaultCornerRadius(width, height);
  const corners = normalizeCornerRadii(raw, width, height, fallback);
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
    ...corners,
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
      const corners = normalizeCornerRadii(
        raw,
        checked.area.width,
        checked.area.height,
        printAreaCornerRadius(checked.area.width, checked.area.height, raw.rx ?? raw.ry)
      );
      return {
        x: checked.area.x,
        y: checked.area.y,
        width: checked.area.width,
        height: checked.area.height,
        ...corners,
      };
    }
  }
  const cw = Number(template?.canvas_width) || canvasW || 0;
  const ch = Number(template?.canvas_height) || canvasH || 0;
  if (cw > 0 && ch > 0) {
    const corners = uniformCornerRadii(printAreaCornerRadius(cw, ch), cw, ch);
    return { x: 0, y: 0, width: cw, height: ch, ...corners };
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
  const fallback = printAreaCornerRadius(width, height);
  const corners = radiiFromFabricRect(rect, width, height, fallback);
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width,
    height,
    ...corners,
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
  const kind = rect.zoneKind || meta.kind || "camera";
  const style = zoneKindStyle(kind);
  const fallback = defaultCornerRadius(width, height);
  const corners = radiiFromFabricRect(rect, width, height, fallback);
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
    ...corners,
  };
}

export function roundedRectPathD(x, y, w, h, r) {
  const corners =
    r && typeof r === "object"
      ? fitCornerRadii(w, h, r)
      : fitCornerRadii(w, h, { rtl: r, rtr: r, rbr: r, rbl: r });
  const x2 = x + w;
  const y2 = y + h;
  // Use explicit L/Q (not H/V alone) so Fabric's path parser always closes all 4 sides.
  return [
    `M ${x + corners.rtl} ${y}`,
    `L ${x2 - corners.rtr} ${y}`,
    `Q ${x2} ${y} ${x2} ${y + corners.rtr}`,
    `L ${x2} ${y2 - corners.rbr}`,
    `Q ${x2} ${y2} ${x2 - corners.rbr} ${y2}`,
    `L ${x + corners.rbl} ${y2}`,
    `Q ${x} ${y2} ${x} ${y2 - corners.rbl}`,
    `L ${x} ${y + corners.rtl}`,
    `Q ${x} ${y} ${x + corners.rtl} ${y}`,
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
    const corners = normalizeCornerRadii(
      zone,
      zone.width,
      zone.height,
      zone.rx ?? zone.ry ?? defaultCornerRadius(zone.width, zone.height)
    );
    return `${d} ${roundedRectPathD(zone.x, zone.y, zone.width, zone.height, corners)}`;
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
  const corners = normalizeCornerRadii(
    printArea,
    width,
    height,
    printAreaCornerRadius(width, height, printArea.rx ?? printArea.ry)
  );
  let d = roundedRectPathD(x, y, width, height, corners);
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
  const corners = normalizeCornerRadii(
    printArea,
    width,
    height,
    printAreaCornerRadius(width, height, printArea.rx ?? printArea.ry)
  );

  // Fabric 7 defaults origin to center — left/top must be top-left of the print area.
  const rect = new fabric.Rect({
    left: x,
    top: y,
    width,
    height,
    rx: corners.rtl,
    ry: corners.rtl,
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
  attachIndependentCorners(rect, corners);
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
    const corners = normalizeCornerRadii(
      zone,
      zone.width,
      zone.height,
      zone.rx ?? zone.ry ?? defaultCornerRadius(zone.width, zone.height)
    );
    const clip = new fabric.Rect({
      left: zone.x,
      top: zone.y,
      width: zone.width,
      height: zone.height,
      rx: corners.rtl,
      ry: corners.rtl,
      originX: "left",
      originY: "top",
      absolutePositioned: true,
      inverted: Boolean(inverted),
      objectCaching: false,
    });
    attachIndependentCorners(clip, corners);
    return clip;
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
    const corners = normalizeCornerRadii(
      pa,
      pa.width,
      pa.height,
      printAreaCornerRadius(pa.width, pa.height, pa.rx ?? pa.ry)
    );
    const clip = new fabric.Rect({
      left: pa.x,
      top: pa.y,
      width: pa.width,
      height: pa.height,
      rx: corners.rtl,
      ry: corners.rtl,
      originX: "left",
      originY: "top",
      absolutePositioned: true,
      objectCaching: false,
    });
    attachIndependentCorners(clip, corners);
    return clip;
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
