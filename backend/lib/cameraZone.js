function defaultCornerRadius(width, height) {
  return Math.max(4, Math.round(Math.min(width, height) * 0.22));
}

function zoneDim(raw, ...keys) {
  if (!raw || typeof raw !== "object") return null;
  for (const k of keys) {
    if (raw[k] != null && !Number.isNaN(Number(raw[k]))) return Number(raw[k]);
  }
  return null;
}

function normalizeRectExclusion(raw, defaults = {}) {
  const width = zoneDim(raw, "width", "w");
  const height = zoneDim(raw, "height", "h");
  if (!width || !height) {
    console.warn("[cameraZone] Invalid rect exclusion dimensions", raw);
    return null;
  }
  const rxRaw = raw.rx != null ? Number(raw.rx) : raw.ry != null ? Number(raw.ry) : null;
  const fallback = rxRaw != null && !Number.isNaN(rxRaw) ? Math.max(0, rxRaw) : defaultCornerRadius(width, height);
  const corners = normalizeCornerRadii(raw, width, height, fallback);
  const type =
    raw.kind ||
    (raw.type && raw.type !== "rect" ? raw.type : null) ||
    defaults.type ||
    "camera";
  const labels = { camera: "Camera", flash: "Flash", sensor: "Sensor", speaker: "Speaker", other: "Other" };
  return {
    id: raw.id || defaults.id || `zone-${type}`,
    type,
    kind: type,
    label: raw.label || labels[type] || "Mask",
    shape: "rect",
    x: Number(raw.x) || 0,
    y: Number(raw.y) || 0,
    width,
    height,
    ...corners,
  };
}

function normalizeCircleExclusion(raw, defaults = {}) {
  const r = zoneDim(raw, "r", "radius");
  if (!r || r <= 0) {
    console.warn("[cameraZone] Invalid circle exclusion radius", raw);
    return null;
  }
  const type =
    raw.kind ||
    (raw.type && raw.type !== "circle" ? raw.type : null) ||
    defaults.type ||
    "camera";
  const labels = { camera: "Camera", flash: "Flash", sensor: "Sensor", speaker: "Speaker", other: "Other" };
  return {
    id: raw.id || defaults.id || `zone-${type}`,
    type,
    kind: type,
    label: raw.label || labels[type] || "Mask",
    shape: "circle",
    x: Number(raw.x) || 0,
    y: Number(raw.y) || 0,
    r,
  };
}

function normalizeExclusionZone(raw, defaults = {}) {
  if (!raw || typeof raw !== "object") return null;
  const shape = raw.shape || (raw.type === "rect" || raw.type === "polygon" || raw.type === "circle" ? raw.type : null);
  if (shape === "circle" || raw.type === "circle" || ((raw.r != null || raw.radius != null) && !raw.width && !raw.w)) {
    return normalizeCircleExclusion(raw, defaults);
  }
  if (shape === "rect" || raw.width || raw.w || raw.type === "rect") {
    return normalizeRectExclusion(raw, defaults);
  }
  if (raw.type === "polygon" && Array.isArray(raw.points) && raw.points.length >= 3) {
    const points = raw.points.map((p) => {
      const x = Number(p.x ?? p[0]);
      const y = Number(p.y ?? p[1]);
      if (Number.isNaN(x) || Number.isNaN(y)) return null;
      return { x, y };
    });
    if (points.some((p) => !p)) return null;
    return {
      id: raw.id || defaults.id || "zone-polygon",
      type: raw.kind || "other",
      kind: raw.kind || "other",
      label: raw.label || "Mask",
      shape: "polygon",
      points,
    };
  }
  return normalizeRectExclusion(raw, defaults);
}

function printAreaCornerRadius(width, height, preferred) {
  if (preferred != null && !Number.isNaN(Number(preferred))) {
    return Math.max(0, Math.min(Number(preferred), width / 2, height / 2));
  }
  return Math.min(56, Math.max(24, Math.round(Math.min(width, height) * 0.06)));
}

function clampCornerRadius(value, width, height) {
  return Math.max(0, Math.min(Number(value) || 0, width / 2, height / 2));
}

function fitCornerRadii(width, height, radii = {}) {
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

function normalizeCornerRadii(raw, width, height, uniformFallback = 0) {
  const src = raw && typeof raw === "object" ? raw : {};
  const uniform = clampCornerRadius(src.rx ?? src.ry ?? uniformFallback, width, height);
  const pick = (key) => clampCornerRadius(src[key] != null ? src[key] : uniform, width, height);
  const fitted = fitCornerRadii(width, height, {
    rtl: pick("rtl"),
    rtr: pick("rtr"),
    rbr: pick("rbr"),
    rbl: pick("rbl"),
  });
  return {
    ...fitted,
    rx: fitted.rtl,
    ry: fitted.rtr,
  };
}

function roundedRectPathD(x, y, w, h, r) {
  const corners =
    r && typeof r === "object"
      ? fitCornerRadii(w, h, r)
      : fitCornerRadii(w, h, { rtl: r, rtr: r, rbr: r, rbl: r });
  const x2 = x + w;
  const y2 = y + h;
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

function normalizePrintArea(template, canvasW = 0, canvasH = 0) {
  const raw = template?.print_area || template?.printArea;
  if (raw && typeof raw === "object") {
    const w = zoneDim(raw, "width", "w");
    const h = zoneDim(raw, "height", "h");
    if (w > 0 && h > 0) {
      const corners = normalizeCornerRadii(raw, w, h, printAreaCornerRadius(w, h, raw.rx ?? raw.ry));
      return {
        x: Number(raw.x) || 0,
        y: Number(raw.y) || 0,
        width: w,
        height: h,
        ...corners,
      };
    }
    console.warn("[cameraZone] print_area has invalid width/height", raw);
  }
  const cw = Number(template?.canvas_width) || canvasW || 0;
  const ch = Number(template?.canvas_height) || canvasH || 0;
  if (cw > 0 && ch > 0) {
    const rx = printAreaCornerRadius(cw, ch);
    return { x: 0, y: 0, width: cw, height: ch, ...normalizeCornerRadii({ rx }, cw, ch, rx) };
  }
  return null;
}

function normalizeExclusionZones(template) {
  if (!template) return [];
  if (Array.isArray(template.exclusion_zones) && template.exclusion_zones.length) {
    return template.exclusion_zones.map((z) => normalizeExclusionZone(z)).filter(Boolean);
  }
  if (Array.isArray(template.mask_zones) && template.mask_zones.length) {
    return template.mask_zones.map((z) => normalizeExclusionZone(z)).filter(Boolean);
  }
  if (template.camera_zone?.type || template.camera_zone?.shape || template.camera_zone?.width) {
    const z = normalizeExclusionZone({ ...template.camera_zone, type: template.camera_zone.kind || template.camera_zone.type || "camera" });
    return z ? [z] : [];
  }
  if (
    template.cutout_width != null &&
    template.cutout_height != null &&
    Number(template.cutout_width) > 0 &&
    Number(template.cutout_height) > 0
  ) {
    const z = normalizeExclusionZone({
      shape: "rect",
      x: template.cutout_x,
      y: template.cutout_y,
      width: template.cutout_width,
      height: template.cutout_height,
      type: "camera",
    });
    return z ? [z] : [];
  }
  return [];
}

function normalizeMaskZones(template) {
  return normalizeExclusionZones(template);
}

function normalizeCameraZone(template) {
  const zones = normalizeExclusionZones(template);
  return zones[0] || null;
}

function parsePrintAreaInput(body, canvasW, canvasH) {
  let raw = body.print_area || body.printArea;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { error: "Invalid print_area JSON" };
    }
  }
  if (!raw) {
    return { error: "print_area required — draw the printable phone body rectangle" };
  }
  const w = zoneDim(raw, "width", "w");
  const h = zoneDim(raw, "height", "h");
  if (!w || !h) return { error: "Invalid print_area dimensions" };
  const corners = normalizeCornerRadii(raw, w, h, printAreaCornerRadius(w, h, raw.rx ?? raw.ry));
  return {
    print_area: {
      x: Number(raw.x) || 0,
      y: Number(raw.y) || 0,
      width: w,
      height: h,
      ...corners,
    },
  };
}

function parseSingleZone(raw) {
  if (!raw || typeof raw !== "object") return { error: "Invalid zone" };
  const z = normalizeExclusionZone(raw);
  if (!z) return { error: "Invalid exclusion zone" };
  return { zone: z };
}

function parseExclusionZonesInput(body) {
  let raw = body.exclusion_zones;
  if (raw == null) raw = body.mask_zones;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { error: "Invalid exclusion_zones JSON" };
    }
  }

  if (Array.isArray(raw)) {
    if (!raw.length) return { error: "At least one exclusion zone required" };
    const zones = [];
    for (const item of raw) {
      const r = parseSingleZone(item);
      if (r.error) return r;
      zones.push(r.zone);
    }
    return { zones };
  }

  let legacy = body.camera_zone;
  if (typeof legacy === "string") {
    try {
      legacy = JSON.parse(legacy);
    } catch {
      return { error: "Invalid camera_zone JSON" };
    }
  }
  if (legacy) {
    const r = parseSingleZone({ ...legacy, type: legacy.kind || legacy.type || "camera" });
    if (r.error) return r;
    return { zones: [r.zone] };
  }

  return { error: "exclusion_zones required" };
}

/** @deprecated — alias */
function parseMaskZonesInput(body) {
  return parseExclusionZonesInput(body);
}

function enrichTemplate(template) {
  if (!template) return template;
  const canvas_width = Number(template.canvas_width) || 0;
  const canvas_height = Number(template.canvas_height) || 0;
  const print_area = normalizePrintArea(template, canvas_width, canvas_height);
  const exclusion_zones = normalizeExclusionZones(template);
  return {
    ...template,
    print_area,
    exclusion_zones,
    mask_zones: exclusion_zones,
    camera_zone: exclusion_zones[0] || null,
    canvas_width,
    canvas_height,
  };
}

module.exports = {
  defaultCornerRadius,
  printAreaCornerRadius,
  normalizeCornerRadii,
  roundedRectPathD,
  normalizeCameraZone,
  normalizeMaskZones,
  normalizeExclusionZones,
  normalizePrintArea,
  parseMaskZonesInput,
  parseExclusionZonesInput,
  parsePrintAreaInput,
  enrichTemplate,
};
