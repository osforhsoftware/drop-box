import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { setDraft, getDraft, replaceDraft } from "../lib/draft";
import { TemplateRenderer } from "../lib/caseTemplate";
import CatalogImage from "../components/CatalogImage";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Trash2,
  ShoppingBag,
} from "lucide-react";

import { useCart } from "../lib/cart";
import { SHIPPING_FEE } from "../constants/shipping";
import {
  CASE_COLOR_OPTIONS,
  DEFAULT_CASE_COLOR_ID,
  getCaseColorById,
  getCaseColorHex,
  isLightCaseColor,
} from "../constants/caseColors";

const STEPS = ["Brand", "Model", "Case Type", "Design"];

async function uploadEditedPreview(renderer, fallbackUrl) {
  const dataUrl = (await renderer?.exportPreviewDataUrl(1)) || fallbackUrl;
  if (!dataUrl) return null;
  if (typeof dataUrl === "string" && !dataUrl.startsWith("data:")) {
    return dataUrl;
  }
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append("file", new File([blob], "preview.png", { type: "image/png" }));
  const r = await api.post("/upload/preview", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return r.data.url;
}

export default function Customize() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [products, setProducts] = useState([]);
  const [brand, setBrand] = useState(null);
  const [model, setModel] = useState(null);
  const [product, setProduct] = useState(null);

  useEffect(() => {
    api.get("/brands").then((r) => setBrands(r.data));
    const d = getDraft();
    if (d.brand) setBrand(d.brand);
    if (d.model) setModel(d.model);
    if (d.product) setProduct(d.product);
  }, []);

  useEffect(() => {
    if (brand) api.get(`/models?brand_id=${brand.id}`).then((r) => setModels(r.data));
  }, [brand]);

  useEffect(() => {
    let cancelled = false;
    if (!brand || !model) {
      setProducts([]);
      return undefined;
    }
    api.get("/products", { params: { brand_id: brand.id, model_id: model.id } }).then((r) => {
      if (cancelled) return;
      setProducts(r.data);
      setProduct((current) => {
        if (!current || r.data.some((p) => p.id === current.id)) return current;
        setDraft({ product: null });
        return null;
      });
    }).catch(() => {
      if (!cancelled) setProducts([]);
    });
    return () => { cancelled = true; };
  }, [brand, model]);

  const next = () => setStep((s) => Math.min(3, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const selectBrand = (b) => {
    setBrand(b);
    setModel(null);
    setProduct(null);
    setDraft({ brand: b, model: null, product: null });
    next();
  };
  const selectModel = (m) => {
    setModel(m);
    setProduct(null);
    setDraft({ model: m, product: null });
    next();
  };
  const selectProduct = (p) => {
    setProduct(p);
    setDraft({ product: p });
    next();
  };

  return (
    <div data-testid="customize-page" className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      {/* Stepper */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <button
          type="button"
          onClick={() => (step === 0 ? navigate("/") : prev())}
          className="inline-flex shrink-0 items-center gap-2 self-start text-sm leading-none text-white/60 hover:text-white"
          data-testid="back-btn"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back
        </button>
        <nav aria-label="Customization steps" className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
          <ol className="flex items-center gap-2 sm:justify-center sm:gap-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex shrink-0 items-center gap-2 sm:gap-3">
                <span
                  className={`step-dot shrink-0 ${i <= step ? "active" : ""}`}
                  aria-current={i === step ? "step" : undefined}
                  aria-hidden={i === step ? undefined : true}
                />
                <span
                  className={`whitespace-nowrap font-mono text-[10px] uppercase tracking-widest sm:text-xs ${
                    i === step ? "text-white" : "text-white/30"
                  }`}
                >
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="h-px w-4 shrink-0 bg-white/10 sm:w-6" aria-hidden />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {step === 0 && (
        <BrandStep brands={brands} onSelect={selectBrand} selected={brand} />
      )}
      {step === 1 && (
        <ModelStep
          models={models}
          brand={brand}
          onSelect={selectModel}
          selected={model}
        />
      )}
      {step === 2 && (
        <ProductStep
          products={products}
          onSelect={selectProduct}
          selected={product}
        />
      )}
      {step === 3 && brand && model && product && (
        <DesignStep
          brand={brand}
          model={model}
          product={product}
          onDone={() => {
            if (!user) {
              navigate("/login?next=/checkout");
              return;
            }
            navigate("/checkout");
          }}
        />
      )}
    </div>
  );
}

function BrandStep({ brands, onSelect, selected }) {
  return (
    <div>
      <div className="label-eyebrow">Step 01</div>
      <h1 className="font-display text-4xl lg:text-5xl mt-3 mb-10">
        Pick your phone brand.
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {brands.map((b) => (
          <button
            key={b.id}
            data-testid={`brand-${b.slug}`}
            onClick={() => onSelect(b)}
            className={`glass glass-hover rounded-2xl p-8 text-left transition-transform hover:scale-[1.02] flex flex-col gap-4 ${selected?.id === b.id ? "ring-2 ring-brand" : ""}`}
          >
            <CatalogImage
              type="brand"
              url={b.logo_url}
              name={b.name}
              className="h-16 w-16"
            />
            <div>
              <div className="font-display text-2xl">{b.name}</div>
              <div className="font-mono text-xs text-white/40 mt-1">Tap to select</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ModelStep({ models, brand, onSelect, selected }) {
  return (
    <div>
      <div className="label-eyebrow">Step 02 · {brand?.name}</div>
      <h1 className="font-display text-4xl lg:text-5xl mt-3 mb-10">
        Which model do you have?
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {models.map((m) => (
          <button
            key={m.id}
            data-testid={`model-${m.id}`}
            onClick={() => onSelect(m)}
            className={`glass glass-hover rounded-2xl p-4 text-left flex flex-col gap-3 ${selected?.id === m.id ? "ring-2 ring-brand" : ""}`}
          >
            <CatalogImage
              type="model"
              url={m.image_url}
              name={m.name}
              className="w-full aspect-square rounded-xl"
            />
            <div>
              <div className="font-medium">{m.name}</div>
              <div className="font-mono text-xs text-white/40 mt-1">{brand?.name}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductStep({ products, onSelect, selected }) {
  return (
    <div>
      <div className="label-eyebrow">Step 03 · Case material</div>
      <h1 className="font-display text-4xl lg:text-5xl mt-3 mb-10">
        Choose your finish.
      </h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <button
            key={p.id}
            data-testid={`product-${p.slug}`}
            onClick={() => onSelect(p)}
            className={`glass glass-hover rounded-2xl p-6 text-left flex flex-col gap-4 ${selected?.id === p.id ? "ring-2 ring-brand" : ""}`}
          >
            <div className="aspect-square rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/5 grid place-items-center overflow-hidden p-4">
              <CatalogImage type="product" url={p.image_url} name={p.name} slug={p.slug} className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-display text-xl">{p.name}</div>
              <p className="text-xs text-white/50 mt-1 line-clamp-2">
                {p.description}
              </p>
              <div className="mt-3 font-mono text-sm text-brand">₹{p.price}</div>
            </div>
          </button>
        ))}
      </div>
      {products.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center text-white/55">
          No active case types are configured for this phone model yet.
        </div>
      )}
    </div>
  );
}

function DesignStep({ brand, model, product, onDone }) {
  const { addToCart } = useCart();
  const canvasContainerRef = useRef(null);
  const rendererRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [templateReady, setTemplateReady] = useState(false);
  const [hasTemplate, setHasTemplate] = useState(false);
  const [templateId, setTemplateId] = useState(null);
  const [initError, setInitError] = useState(null);
  const [caseColorId, setCaseColorId] = useState(DEFAULT_CASE_COLOR_ID);
  const [customCaseHex, setCustomCaseHex] = useState("#ffffff");

  useEffect(() => {
    let disposed = false;
    const container = canvasContainerRef.current;
    if (!container) return undefined;

    const initialHex = getCaseColorHex(DEFAULT_CASE_COLOR_ID);
    const renderer = new TemplateRenderer({
      containerEl: container,
      allowOverflow: false,
      editMode: false, // hide print-area dashed guide on customer canvas
      maxHeight: 560,
      caseColor: initialHex,
    });
    rendererRef.current = renderer;

    (async () => {
      try {
        await renderer.init();
        if (disposed) return;
        await renderer.loadForModel({
          modelId: model.id,
          caseTypeSlug: product.slug,
        });
        if (disposed) return;
        renderer.setCaseColor(getCaseColorHex(caseColorId === "custom" ? customCaseHex : caseColorId));
        setHasTemplate(Boolean(renderer.overlayUrl || renderer.template));
        // Demo fallback has no DB id — keep null so orders don't reference a fake template.
        setTemplateId(renderer.template?.is_demo ? null : renderer.template?.id || null);
        setInitError(null);
        if (renderer.printArea) {
          console.info("[Customize] print area", renderer.printArea);
        }
      } catch (err) {
        console.error("[Customize] template renderer init failed", err);
        if (!disposed) setInitError(err?.message || "Canvas failed to load");
      } finally {
        if (!disposed) setTemplateReady(true);
      }
    })();

    return () => {
      disposed = true;
      try {
        renderer.dispose();
      } catch (e) {
        console.warn("[Customize] dispose error", e);
      }
      rendererRef.current = null;
    };
    // Re-init only when model/case type changes; color updates via setCaseColor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.id, product.slug]);

  const applyCaseColor = (id, hexOverride) => {
    const hex = hexOverride || getCaseColorHex(id);
    setCaseColorId(id);
    rendererRef.current?.setCaseColor(hex);
    setDraft({ case_color: hex, case_color_id: id });
  };

  const onDrop = async (files) => {
    const file = files[0];
    if (!file) return;
    const renderer = rendererRef.current;
    if (!renderer) return;

    try {
      await renderer.setArtworkFromFile(file);
    } catch (error) {
      console.error("Failed to load the selected design", error);
      toast.error("Could not load this image");
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await api.post("/upload/design", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadedUrl(r.data.url);
      setDraft({ design_url: r.data.url });
    } catch (e) {
      console.error(e);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: false,
  });

  const rotate = () => rendererRef.current?.rotate(15);
  const zoom = (factor) => rendererRef.current?.zoom(factor);
  const clearImg = () => {
    rendererRef.current?.clearArtwork();
    setUploadedUrl(null);
  };

  const currentCaseHex = getCaseColorHex(
    caseColorId === "custom" ? customCaseHex : caseColorId
  );

  const handleAddToCart = async () => {
    const draft = getDraft();
    if (!draft.brand || !draft.model || !draft.product || !uploadedUrl || saving) return;
    const renderer = rendererRef.current;

    setSaving(true);
    try {
      // Persist both original upload (design_url) and edited canvas preview.
      const preview_url = await uploadEditedPreview(renderer, uploadedUrl);
      const print = renderer?.getPrintPayload() || {};
      const case_color = print.case_color || currentCaseHex;

      addToCart({
        template_product_id: null,
        brand: draft.brand,
        model: draft.model,
        product: draft.product,
        design_url: uploadedUrl,
        preview_url: preview_url || uploadedUrl,
        design_transform: print.design_transform,
        template_id: print.template_id || templateId,
        case_color,
        quantity: 1,
      });

      toast.success("Design added to cart");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add to cart");
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!uploadedUrl || saving) return;
    const renderer = rendererRef.current;
    setSaving(true);
    try {
      // Persist both original upload (design_url) and edited canvas preview.
      const preview_url = await uploadEditedPreview(renderer, uploadedUrl);
      const print = renderer?.getPrintPayload() || {};
      // Replace draft so a prior shop/cart checkout cannot leak into summary
      replaceDraft({
        source: "custom",
        preview_url: preview_url || uploadedUrl,
        design_url: uploadedUrl,
        design_transform: print.design_transform,
        template_id: print.template_id || templateId,
        case_color: print.case_color || currentCaseHex,
        brand,
        model,
        product,
      });
      onDone();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save design");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="design-step">
      <div className="label-eyebrow">Step 04 · Live customizer</div>
      <h1 className="font-display text-4xl lg:text-5xl mt-3 mb-8">
        Make it yours.
      </h1>
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 glass rounded-2xl overflow-hidden min-h-[400px] lg:min-h-[600px] relative flex flex-col items-center justify-center p-4">
          {!templateReady && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-black/40 text-white/50 text-sm">
              Loading canvas…
            </div>
          )}
          {initError && (
            <div className="absolute inset-x-4 top-4 z-20 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {initError}
            </div>
          )}
          <div
            ref={canvasContainerRef}
            className={`w-full max-w-full flex justify-center items-center min-h-[360px] ${!hasTemplate && templateReady ? "rounded-[40px] border-[6px] border-solid border-zinc-900 shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]" : ""}`}
            data-testid="case-canvas-host"
          />
          <div className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-widest text-white/40">
            {brand.name} · {model.name} · {product.name}
          </div>
        </div>

        <div className="lg:col-span-4 glass rounded-2xl p-4 sm:p-6 flex flex-col gap-5">
          <div>
            <div className="label-eyebrow mb-3">Upload artwork</div>
            <div
              {...getRootProps()}
              data-testid="dropzone"
              className={`glass-2 rounded-xl p-6 text-center cursor-pointer border border-dashed ${isDragActive ? "border-brand bg-brand/5" : "border-white/15"}`}
            >
              <input {...getInputProps()} />
              <Upload className="w-6 h-6 mx-auto text-brand" />
              <div className="mt-3 text-sm">
                Drop image here or <span className="text-brand">browse</span>
              </div>
              <div className="text-xs text-white/40 mt-1">JPG · PNG · WEBP</div>
            </div>
            {uploading && (
              <div className="text-xs text-white/50 mt-2">Uploading artwork…</div>
            )}
            {saving && (
              <div className="text-xs text-white/50 mt-2">Saving edited preview…</div>
            )}
          </div>

          <div>
            <div className="label-eyebrow mb-3">Case color</div>
            <div
              className="flex flex-wrap gap-2.5"
              data-testid="case-color-swatches"
              role="listbox"
              aria-label="Case color"
            >
              {CASE_COLOR_OPTIONS.map((opt) => {
                const selected = caseColorId === opt.id;
                const light = isLightCaseColor(opt.hex);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    title={opt.label}
                    data-testid={`case-color-${opt.id}`}
                    onClick={() => applyCaseColor(opt.id)}
                    className={`relative w-8 h-8 rounded-full border-2 transition-all shrink-0 ${
                      selected
                        ? "border-brand scale-110 shadow-[0_0_10px_rgba(109,177,97,0.4)]"
                        : light
                          ? "border-white/30 hover:border-white/50"
                          : "border-white/10 hover:border-white/30"
                    }`}
                    style={{ backgroundColor: opt.hex }}
                  />
                );
              })}
              <label
                title="Custom color"
                className={`relative w-8 h-8 rounded-full border-2 overflow-hidden cursor-pointer shrink-0 ${
                  caseColorId === "custom"
                    ? "border-brand scale-110"
                    : "border-white/20 hover:border-white/40"
                }`}
                style={{
                  background:
                    "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                }}
              >
                <input
                  type="color"
                  value={customCaseHex}
                  aria-label="Custom case color"
                  data-testid="case-color-custom"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const hex = e.target.value.toUpperCase();
                    setCustomCaseHex(hex);
                    applyCaseColor("custom", hex);
                  }}
                />
              </label>
            </div>
            <div className="text-xs text-white/40 mt-2">
              Default white ·{" "}
              {caseColorId === "custom"
                ? customCaseHex
                : getCaseColorById(caseColorId)?.label || "White"}
            </div>
          </div>

          <div>
            <div className="label-eyebrow mb-3">Adjust</div>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => zoom(1.1)}
                data-testid="zoom-in"
                className="glass-2 rounded-lg p-3 grid place-items-center hover:bg-white/10"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => zoom(0.9)}
                data-testid="zoom-out"
                className="glass-2 rounded-lg p-3 grid place-items-center hover:bg-white/10"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={rotate}
                data-testid="rotate"
                className="glass-2 rounded-lg p-3 grid place-items-center hover:bg-white/10"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={clearImg}
                data-testid="clear-img"
                className="glass-2 rounded-lg p-3 grid place-items-center hover:bg-white/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-white/40 mt-2">
              Drag · scroll/pinch zoom · double-click reset. Artwork is clipped to the print area (camera/flash holes punched out).
            </div>
          </div>

          <div className="glass-2 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Product</span>
              <span className="font-mono">₹{product.price}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Shipping</span>
              <span className="font-mono">₹{SHIPPING_FEE}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="font-mono text-xs text-white/40">Total</div>
              <div className="font-display text-2xl">₹{product.price + SHIPPING_FEE}</div>
            </div>
            <div className="text-xs text-white/40 text-right">
              Pan-India delivery · 3–5 days
            </div>
          </div>

          <div className="btn-row">
            <button
              type="button"
              data-testid="add-to-cart-btn"
              onClick={handleAddToCart}
              disabled={!uploadedUrl || saving || uploading}
              className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag aria-hidden />
              {saving ? "Saving…" : "Add to Cart"}
            </button>
            <button
              type="button"
              data-testid="continue-checkout"
              onClick={handleContinue}
              disabled={!uploadedUrl || saving || uploading}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Buy Now"}
              <ArrowRight aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
