import { useCallback, useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import {
  ZONE_KINDS,
  PRINT_AREA_STYLE,
  defaultCornerRadius,
  printAreaCornerRadius,
  printAreaFromFabricRect,
  zoneFromFabricRect,
  zoneKindStyle,
  attachIndependentCorners,
  normalizeCornerRadii,
  uniformCornerRadii,
  clampIndependentCorner,
  maxRadiusForCorner,
} from "../lib/cameraZone";
import { fitFabricCanvas } from "../lib/fabricFit";
import { LOGO_COLOR } from "../constants/brand";

const PRINT_MODE = "print";
const PRINT_AREA_ID = "__print_area__";

function makeZoneRect({ zone, interactive = false }) {
  const style = zoneKindStyle(zone.kind);
  const corners = normalizeCornerRadii(
    zone,
    zone.width,
    zone.height,
    defaultCornerRadius(zone.width, zone.height)
  );
  const rect = new fabric.Rect({
    left: zone.x,
    top: zone.y,
    width: zone.width,
    height: zone.height,
    rx: corners.rtl,
    ry: corners.rtl,
    originX: "left",
    originY: "top",
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: 2,
    strokeDashArray: [6, 4],
    strokeUniform: true,
    lockRotation: true,
    cornerColor: LOGO_COLOR,
    cornerSize: 10,
    transparentCorners: false,
    selectable: interactive,
    evented: interactive,
    hasControls: interactive,
    hasBorders: interactive,
    objectCaching: false,
  });
  attachIndependentCorners(rect, corners);
  rect.zoneId = zone.id;
  rect.zoneKind = zone.kind;
  return rect;
}

function makePrintAreaRect(area, interactive = true) {
  const corners = normalizeCornerRadii(
    area,
    area.width,
    area.height,
    printAreaCornerRadius(area.width, area.height, area.rx ?? area.ry)
  );
  const rect = new fabric.Rect({
    left: area.x,
    top: area.y,
    width: area.width,
    height: area.height,
    rx: corners.rtl,
    ry: corners.rtl,
    originX: "left",
    originY: "top",
    fill: "rgba(96,165,250,0.12)",
    stroke: PRINT_AREA_STYLE.stroke,
    strokeWidth: PRINT_AREA_STYLE.strokeWidth,
    strokeDashArray: PRINT_AREA_STYLE.strokeDashArray,
    strokeUniform: true,
    lockRotation: true,
    cornerColor: LOGO_COLOR,
    cornerSize: 10,
    transparentCorners: false,
    selectable: interactive,
    evented: interactive,
    hasControls: interactive,
    hasBorders: interactive,
    objectCaching: false,
  });
  attachIndependentCorners(rect, corners);
  rect.isPrintArea = true;
  rect.zoneId = PRINT_AREA_ID;
  return rect;
}

function draftStyleForMode(mode) {
  if (mode === PRINT_MODE) {
    return {
      fill: "rgba(96,165,250,0.12)",
      stroke: PRINT_AREA_STYLE.stroke,
      strokeWidth: PRINT_AREA_STYLE.strokeWidth,
      strokeDashArray: PRINT_AREA_STYLE.strokeDashArray,
      cornerFn: printAreaCornerRadius,
    };
  }
  const style = zoneKindStyle(mode);
  return {
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: 2,
    strokeDashArray: [6, 4],
    cornerFn: defaultCornerRadius,
  };
}

function newZoneId() {
  return `zone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function isValidPrintArea(area) {
  return Boolean(area && area.width > 0 && area.height > 0);
}

/**
 * Admin editor: draw print area (with corner radius) + camera/flash/sensor mask zones.
 * Artwork on Customize is clipped to print area minus these exclusion holes.
 */
export default function ZoneEditor({
  imageFile,
  imageUrl,
  zones,
  onZonesChange,
  printArea,
  onPrintAreaChange,
  onDimensions,
}) {
  const containerRef = useRef(null);
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const imageRef = useRef(null);
  const rectMapRef = useRef(new Map());
  const printRectRef = useRef(null);
  const draftRectRef = useRef(null);
  const drawingRef = useRef(null);
  const imageSizeRef = useRef({ w: 0, h: 0 });
  const zonesRef = useRef(zones);
  const printAreaRef = useRef(printArea);
  const [ready, setReady] = useState(false);
  const [activeKind, setActiveKind] = useState(PRINT_MODE);
  const activeKindRef = useRef(activeKind);
  activeKindRef.current = activeKind;
  const [activeZoneId, setActiveZoneId] = useState(null);
  const [printSelected, setPrintSelected] = useState(false);
  const [radii, setRadii] = useState({ rtl: 32, rtr: 32, rbr: 32, rbl: 32 });
  const [loadError, setLoadError] = useState(null);

  zonesRef.current = zones;
  printAreaRef.current = printArea;

  const fitCanvas = useCallback(() => {
    const c = fabricRef.current;
    const el = containerRef.current;
    const { w, h } = imageSizeRef.current;
    if (!c || !el || !w || !h) return;
    if (el.clientWidth < 40) return;
    fitFabricCanvas(c, el, w, h, 460);
  }, []);

  const adoptRadii = useCallback((shape, isPrint) => {
    if (!shape || !shape.width || !shape.height) return;
    const fallback = isPrint
      ? printAreaCornerRadius(shape.width, shape.height, shape.rx)
      : defaultCornerRadius(shape.width, shape.height);
    const next = normalizeCornerRadii(shape, shape.width, shape.height, fallback);
    setRadii({ rtl: next.rtl, rtr: next.rtr, rbr: next.rbr, rbl: next.rbl });
  }, []);

  const emitZones = useCallback(
    (next) => {
      onZonesChange(next);
    },
    [onZonesChange]
  );

  const emitPrintArea = useCallback(
    (next) => {
      onPrintAreaChange?.(next);
    },
    [onPrintAreaChange]
  );

  const syncZoneRect = useCallback(
    (rect) => {
      if (!rect?.zoneId || rect.isPrintArea) return;
      const updated = zoneFromFabricRect(rect);
      const next = zonesRef.current.map((z) =>
        z.id === rect.zoneId ? { ...z, ...updated, id: z.id, kind: z.kind, label: z.label } : z
      );
      if (updated) adoptRadii({ ...updated, width: updated.width, height: updated.height }, false);
      emitZones(next);
    },
    [adoptRadii, emitZones]
  );

  const syncPrintRect = useCallback(
    (rect) => {
      if (!rect?.isPrintArea) return;
      const updated = printAreaFromFabricRect(rect);
      if (!updated) return;
      adoptRadii(updated, true);
      emitPrintArea(updated);
    },
    [adoptRadii, emitPrintArea]
  );

  const bindZoneRect = useCallback(
    (rect) => {
      const handler = () => syncZoneRect(rect);
      rect.on("modified", handler);
      rect.on("moving", handler);
      rect.on("scaling", handler);
      rect.on("selected", () => {
        setPrintSelected(false);
        setActiveZoneId(rect.zoneId);
        setActiveKind(rect.zoneKind || "camera");
        const z = zonesRef.current.find((x) => x.id === rect.zoneId);
        if (z) adoptRadii(z, false);
      });
    },
    [adoptRadii, syncZoneRect]
  );

  const bindPrintRect = useCallback(
    (rect) => {
      const handler = () => syncPrintRect(rect);
      rect.on("modified", handler);
      rect.on("moving", handler);
      rect.on("scaling", handler);
      rect.on("selected", () => {
        setPrintSelected(true);
        setActiveZoneId(null);
        setActiveKind(PRINT_MODE);
        const area = printAreaFromFabricRect(rect);
        if (area) adoptRadii(area, true);
      });
    },
    [adoptRadii, syncPrintRect]
  );

  const removeZone = useCallback(
    (id) => {
      const c = fabricRef.current;
      const rect = rectMapRef.current.get(id);
      if (c && rect) {
        c.remove(rect);
        rectMapRef.current.delete(id);
      }
      emitZones(zonesRef.current.filter((z) => z.id !== id));
      if (activeZoneId === id) setActiveZoneId(null);
      c?.renderAll();
    },
    [activeZoneId, emitZones]
  );

  const clearPrintArea = useCallback(() => {
    const c = fabricRef.current;
    if (c && printRectRef.current) {
      c.remove(printRectRef.current);
      printRectRef.current = null;
    }
    setPrintSelected(false);
    emitPrintArea(null);
    c?.renderAll();
  }, [emitPrintArea]);

  const applyOneRadius = useCallback(
    (key, value) => {
      const c = fabricRef.current;
      if (!c) return;
      const target = printSelected && printRectRef.current
        ? printRectRef.current
        : activeZoneId
          ? rectMapRef.current.get(activeZoneId)
          : null;
      if (!target) return;
      const w = target.width * (target.scaleX || 1);
      const h = target.height * (target.scaleY || 1);
      const next = clampIndependentCorner(radii, key, value, w, h);
      setRadii({ rtl: next.rtl, rtr: next.rtr, rbr: next.rbr, rbl: next.rbl });
      attachIndependentCorners(target, next);
      c.renderAll();
      if (printSelected) syncPrintRect(target);
      else syncZoneRect(target);
    },
    [activeZoneId, printSelected, radii, syncPrintRect, syncZoneRect]
  );

  const mountPrintArea = useCallback(
    (c, area) => {
      if (printRectRef.current) {
        c.remove(printRectRef.current);
        printRectRef.current = null;
      }
      if (!isValidPrintArea(area)) return;
      const rect = makePrintAreaRect(area, true);
      bindPrintRect(rect);
      c.add(rect);
      printRectRef.current = rect;
    },
    [bindPrintRect]
  );

  const renderAllZones = useCallback(
    (c, list) => {
      rectMapRef.current.forEach((rect) => c.remove(rect));
      rectMapRef.current.clear();
      for (const z of list) {
        if (z.type !== "rect" || z.width <= 0 || z.height <= 0) continue;
        const rect = makeZoneRect({ zone: z, interactive: true });
        bindZoneRect(rect);
        c.add(rect);
        rectMapRef.current.set(z.id, rect);
      }
      c.renderAll();
    },
    [bindZoneRect]
  );

  useEffect(() => {
    const src = imageFile ? URL.createObjectURL(imageFile) : imageUrl;
    if (!src || !canvasElRef.current) return;

    let cancelled = false;
    setLoadError(null);

    const isBlob = src.startsWith("blob:");
    const loadOpts = isBlob ? {} : { crossOrigin: "anonymous" };

    fabric.Image.fromURL(src, loadOpts)
      .then((img) => {
        if (imageFile) URL.revokeObjectURL(src);
        if (cancelled) return;
        if (!img) {
          setLoadError("Could not load template image. Check the file is a valid PNG.");
          return;
        }

        const w = img.width;
        const h = img.height;
        imageSizeRef.current = { w, h };
        onDimensions({ canvas_width: w, canvas_height: h });

        const c = new fabric.Canvas(canvasElRef.current, {
          width: w,
          height: h,
          selection: false,
          backgroundColor: "#18181b",
        });
        fabricRef.current = c;
        imageRef.current = img;

        img.set({
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          originX: "left",
          originY: "top",
        });
        c.add(img);
        c.sendObjectToBack(img);

        mountPrintArea(c, printAreaRef.current);
        renderAllZones(c, zonesRef.current);
        fitCanvas();

        c.on("mouse:down", (opt) => {
          const imgObj = imageRef.current;
          if (opt.target && opt.target !== imgObj) {
            if (opt.target.isPrintArea) {
              setPrintSelected(true);
              setActiveZoneId(null);
              setActiveKind(PRINT_MODE);
            } else if (opt.target.zoneId) {
              setPrintSelected(false);
              setActiveZoneId(opt.target.zoneId);
            }
            return;
          }
          const p = c.getScenePoint(opt.e);
          drawingRef.current = { x: p.x, y: p.y };
          if (draftRectRef.current) {
            c.remove(draftRectRef.current);
            draftRectRef.current = null;
          }
        });

        c.on("mouse:move", (opt) => {
          if (!drawingRef.current) return;
          const p = c.getScenePoint(opt.e);
          const x = Math.min(drawingRef.current.x, p.x);
          const y = Math.min(drawingRef.current.y, p.y);
          const w2 = Math.abs(p.x - drawingRef.current.x);
          const h2 = Math.abs(p.y - drawingRef.current.y);
          if (draftRectRef.current) c.remove(draftRectRef.current);
          const style = draftStyleForMode(activeKindRef.current);
          const corner = style.cornerFn(w2 || 1, h2 || 1);
          const draft = new fabric.Rect({
            left: x,
            top: y,
            width: w2,
            height: h2,
            rx: corner,
            ry: corner,
            originX: "left",
            originY: "top",
            fill: style.fill,
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            strokeDashArray: style.strokeDashArray,
            strokeUniform: true,
            selectable: false,
            evented: false,
            objectCaching: false,
          });
          c.add(draft);
          draftRectRef.current = draft;
          c.renderAll();
        });

        c.on("mouse:up", () => {
          if (!drawingRef.current || !draftRectRef.current) {
            drawingRef.current = null;
            return;
          }
          const draft = draftRectRef.current;
          drawingRef.current = null;
          draftRectRef.current = null;
          const rw = draft.width * (draft.scaleX || 1);
          const rh = draft.height * (draft.scaleY || 1);
          if (rw < 8 || rh < 8) {
            c.remove(draft);
            return;
          }
          c.remove(draft);

          if (activeKindRef.current === PRINT_MODE) {
            const corners = uniformCornerRadii(printAreaCornerRadius(rw, rh), rw, rh);
            const area = {
              x: Math.round(draft.left),
              y: Math.round(draft.top),
              width: Math.round(rw),
              height: Math.round(rh),
              ...corners,
            };
            mountPrintArea(c, area);
            setPrintSelected(true);
            setActiveZoneId(null);
            adoptRadii(area, true);
            emitPrintArea(area);
            if (printRectRef.current) c.setActiveObject(printRectRef.current);
            c.renderAll();
            return;
          }

          const style = zoneKindStyle(activeKindRef.current);
          const id = newZoneId();
          const corners = uniformCornerRadii(defaultCornerRadius(rw, rh), rw, rh);
          const zone = {
            id,
            kind: activeKindRef.current,
            label: style.label,
            type: "rect",
            x: Math.round(draft.left),
            y: Math.round(draft.top),
            width: Math.round(rw),
            height: Math.round(rh),
            ...corners,
          };
          const rect = makeZoneRect({ zone, interactive: true });
          bindZoneRect(rect);
          c.add(rect);
          rectMapRef.current.set(id, rect);
          setPrintSelected(false);
          setActiveZoneId(id);
          adoptRadii(zone, false);
          emitZones([...zonesRef.current, zone]);
          c.setActiveObject(rect);
          c.renderAll();
        });

        const scheduleFit = () => {
          fitCanvas();
          c.renderAll();
        };
        requestAnimationFrame(() => {
          scheduleFit();
          requestAnimationFrame(scheduleFit);
        });
        setTimeout(scheduleFit, 50);
        setTimeout(scheduleFit, 200);
        setReady(true);
      })
      .catch(() => {
        if (imageFile) URL.revokeObjectURL(src);
        if (!cancelled) {
          setLoadError("Could not load template image. Check the file is a valid PNG.");
        }
      });

    const currentRectMap = rectMapRef.current;
    return () => {
      cancelled = true;
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
      imageRef.current = null;
      printRectRef.current = null;
      currentRectMap.clear();
      draftRectRef.current = null;
      drawingRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- canvas init once per image
  }, [imageFile, imageUrl, onDimensions, fitCanvas]);

  useEffect(() => {
    if (!ready) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => fitCanvas());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready, fitCanvas]);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c || !ready) return;
    const ids = new Set(zones.map((z) => z.id));
    let changed = false;
    rectMapRef.current.forEach((_, id) => {
      if (!ids.has(id)) changed = true;
    });
    if (zones.length !== rectMapRef.current.size) changed = true;
    if (!changed) return;
    renderAllZones(c, zones);
  }, [zones, ready, renderAllZones]);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c || !ready) return;
    const current = printAreaFromFabricRect(printRectRef.current);
    const next = isValidPrintArea(printArea) ? printArea : null;
    const same =
      (!current && !next) ||
      (current &&
        next &&
        current.x === next.x &&
        current.y === next.y &&
        current.width === next.width &&
        current.height === next.height &&
        current.rtl === next.rtl &&
        current.rtr === next.rtr &&
        current.rbr === next.rbr &&
        current.rbl === next.rbl);
    if (same) return;
    mountPrintArea(c, next);
    c.renderAll();
  }, [printArea, ready, mountPrintArea]);

  const activeZone = zones.find((z) => z.id === activeZoneId);
  const radiusTarget = printSelected
    ? printArea
    : activeZone;
  const radiusLabel = printSelected ? "Print area" : activeZone?.label;

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/50">
        1) Select <strong className="text-white/70">Print area</strong> and drag over the phone body
        (adjust corner radius). 2) Select <strong className="text-white/70">Camera</strong> (and other
        cutouts) and draw holes where artwork must not print.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          key={PRINT_MODE}
          type="button"
          data-testid="zone-kind-print"
          onClick={() => {
            setActiveKind(PRINT_MODE);
            setPrintSelected(true);
            setActiveZoneId(null);
            if (printRectRef.current && fabricRef.current) {
              fabricRef.current.setActiveObject(printRectRef.current);
              fabricRef.current.renderAll();
              const area = printAreaFromFabricRect(printRectRef.current);
              if (area) adoptRadii(area, true);
            }
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            activeKind === PRINT_MODE
              ? "border-sky-400 text-white bg-sky-500/15"
              : "border-white/15 text-white/60 hover:border-white/30"
          }`}
        >
          <span
            className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
            style={{ background: "#60a5fa" }}
          />
          Print area
        </button>
        {ZONE_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            data-testid={`zone-kind-${k.id}`}
            onClick={() => {
              setActiveKind(k.id);
              setPrintSelected(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeKind === k.id
                ? "border-brand text-white bg-brand/15"
                : "border-white/15 text-white/60 hover:border-white/30"
            }`}
            style={activeKind === k.id ? { boxShadow: `inset 0 0 0 1px ${k.stroke}` } : undefined}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
              style={{ background: k.stroke }}
            />
            {k.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {loadError}
        </div>
      )}

      <div
        ref={containerRef}
        className="zone-editor-stage w-full flex justify-center items-center rounded-lg border border-white/10 p-2 min-h-[200px] h-[460px] max-h-[460px] overflow-hidden"
        style={{
          backgroundColor: "#18181b",
          backgroundImage:
            "linear-gradient(45deg, #27272a 25%, transparent 25%), linear-gradient(-45deg, #27272a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272a 75%), linear-gradient(-45deg, transparent 75%, #27272a 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
        }}
      >
        <canvas ref={canvasElRef} data-testid="zone-editor-canvas" className="block" />
      </div>

      {(isValidPrintArea(printArea) || zones.length > 0) && (
        <div className="space-y-2">
          <div className="text-xs text-white/50">Placed regions</div>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {isValidPrintArea(printArea) && (
              <li
                className={`flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1.5 border ${
                  printSelected ? "border-sky-400/50 bg-sky-500/[0.06]" : "border-white/10"
                }`}
              >
                <button
                  type="button"
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                  data-testid="print-area-select"
                  onClick={() => {
                    setPrintSelected(true);
                    setActiveZoneId(null);
                    setActiveKind(PRINT_MODE);
                    adoptRadii(printArea, true);
                    if (printRectRef.current && fabricRef.current) {
                      fabricRef.current.setActiveObject(printRectRef.current);
                      fabricRef.current.renderAll();
                    }
                  }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0 bg-sky-400" />
                  <span className="text-white/80 truncate">Print area</span>
                  <span className="font-mono text-white/35 truncate">
                    {printArea.width}×{printArea.height}
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="print-area-delete"
                  className="text-red-400 hover:text-red-300 shrink-0 px-1"
                  onClick={clearPrintArea}
                >
                  ×
                </button>
              </li>
            )}
            {zones.map((z) => {
              const style = zoneKindStyle(z.kind);
              const active = z.id === activeZoneId;
              return (
                <li
                  key={z.id}
                  className={`flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1.5 border ${
                    active ? "border-brand/50 bg-white/[0.04]" : "border-white/10"
                  }`}
                >
                  <button
                    type="button"
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                    onClick={() => {
                      setPrintSelected(false);
                      setActiveZoneId(z.id);
                      setActiveKind(z.kind || "camera");
                      adoptRadii(z, false);
                      const rect = rectMapRef.current.get(z.id);
                      if (rect && fabricRef.current) {
                        fabricRef.current.setActiveObject(rect);
                        fabricRef.current.renderAll();
                      }
                    }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: style.stroke }} />
                    <span className="text-white/80 truncate">{z.label}</span>
                    <span className="font-mono text-white/35 truncate">
                      {z.width}×{z.height}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-testid={`zone-delete-${z.id}`}
                    className="text-red-400 hover:text-red-300 shrink-0 px-1"
                    onClick={() => removeZone(z.id)}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {radiusTarget && ready && (
        <div className="space-y-3 text-xs">
          <div className="text-white/50">
            Corner radius · <span className="text-white/70">{radiusLabel}</span>
            <span className="text-white/35"> — each corner separately</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "rtl", label: "Top left" },
              { key: "rtr", label: "Top right" },
              { key: "rbl", label: "Bottom left" },
              { key: "rbr", label: "Bottom right" },
            ].map(({ key, label }) => {
              const max = Math.max(
                0,
                Math.round(maxRadiusForCorner(radii, key, radiusTarget.width, radiusTarget.height))
              );
              return (
                <div key={key} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <div className="text-white/55 mb-1.5">{label}</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(max, Math.round(radii[key]) || 0)}
                      value={Math.round(radii[key]) || 0}
                      onChange={(e) => applyOneRadius(key, Number(e.target.value))}
                      data-testid={`zone-corner-${key}`}
                      className="min-w-0 flex-1 accent-brand"
                    />
                    <input
                      type="number"
                      min={0}
                      max={max}
                      value={Math.round(radii[key]) || 0}
                      onChange={(e) => applyOneRadius(key, Number(e.target.value))}
                      className="w-16 shrink-0 rounded border border-white/10 bg-black/30 px-1.5 py-1 font-mono text-white/80 text-right"
                      data-testid={`zone-corner-${key}-input`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(isValidPrintArea(printArea) || zones.length > 0) && (
        <pre
          data-testid="mask-zones-json"
          className="text-[10px] font-mono text-white/40 bg-black/30 rounded p-2 overflow-x-auto max-h-36"
        >
          {JSON.stringify({ print_area: printArea || null, mask_zones: zones }, null, 2)}
        </pre>
      )}
    </div>
  );
}
