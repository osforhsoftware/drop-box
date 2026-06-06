import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fabric } from "fabric";
import { useDropzone } from "react-dropzone";
import { api } from "../lib/api";
import { setDraft, getDraft } from "../lib/draft";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Trash2,
  Check,
} from "lucide-react";

const STEPS = ["Brand", "Model", "Case Type", "Design"];

export default function Customize() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [products, setProducts] = useState([]);
  const [brand, setBrand] = useState(null);
  const [model, setModel] = useState(null);
  const [product, setProduct] = useState(null);

  useEffect(() => {
    api.get("/brands").then((r) => setBrands(r.data));
    api.get("/products").then((r) => setProducts(r.data));
    const d = getDraft();
    if (d.brand) setBrand(d.brand);
    if (d.model) setModel(d.model);
    if (d.product) setProduct(d.product);
  }, []);

  useEffect(() => {
    if (brand) api.get(`/models?brand_id=${brand.id}`).then((r) => setModels(r.data));
  }, [brand]);

  const next = () => setStep((s) => Math.min(3, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const selectBrand = (b) => {
    setBrand(b);
    setModel(null);
    setDraft({ brand: b, model: null });
    next();
  };
  const selectModel = (m) => {
    setModel(m);
    setDraft({ model: m });
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
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={() => (step === 0 ? navigate("/") : prev())}
          className="text-sm text-white/60 hover:text-white flex items-center gap-2"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`step-dot ${i <= step ? "active" : ""}`} />
              <span
                className={`font-mono text-xs uppercase tracking-widest ${i === step ? "text-white" : "text-white/30"}`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/10" />}
            </div>
          ))}
        </div>
        <div className="w-16" />
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
          onDone={() => navigate("/checkout")}
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
            className={`glass glass-hover rounded-2xl p-8 text-left transition-transform hover:scale-[1.02] ${selected?.id === b.id ? "ring-2 ring-[#ff4f00]" : ""}`}
          >
            <div className="font-display text-2xl">{b.name}</div>
            <div className="font-mono text-xs text-white/40 mt-1">Tap to select</div>
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
            className={`glass glass-hover rounded-2xl p-6 text-left ${selected?.id === m.id ? "ring-2 ring-[#ff4f00]" : ""}`}
          >
            <div className="font-medium">{m.name}</div>
            <div className="font-mono text-xs text-white/40 mt-1">{brand?.name}</div>
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
            className={`glass glass-hover rounded-2xl p-6 text-left flex flex-col gap-4 ${selected?.id === p.id ? "ring-2 ring-[#ff4f00]" : ""}`}
          >
            <div className="aspect-square rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/5 grid place-items-center">
              <div className="w-16 h-28 rounded-xl bg-zinc-900 border border-white/10" />
            </div>
            <div>
              <div className="font-display text-xl">{p.name}</div>
              <p className="text-xs text-white/50 mt-1 line-clamp-2">
                {p.description}
              </p>
              <div className="mt-3 font-mono text-sm text-[#ff4f00]">₹{p.price}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DesignStep({ brand, model, product, onDone }) {
  const canvasElRef = useRef(null);
  const canvasRef = useRef(null);
  const imgObjRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);

  // Init fabric canvas
  useEffect(() => {
    const c = new fabric.Canvas(canvasElRef.current, {
      width: 360,
      height: 720,
      backgroundColor: "#0c0c0e",
      preserveObjectStacking: true,
    });
    canvasRef.current = c;
    return () => {
      c.dispose();
      canvasRef.current = null;
    };
  }, []);

  const onDrop = async (files) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      fabric.Image.fromURL(reader.result, (img) => {
        const c = canvasRef.current;
        if (!c) return;
        c.remove(...c.getObjects());
        const scale = Math.min(
          (c.getWidth() * 0.9) / img.width,
          (c.getHeight() * 0.9) / img.height,
        );
        img.scale(scale);
        img.set({
          left: c.getWidth() / 2,
          top: c.getHeight() / 2,
          originX: "center",
          originY: "center",
        });
        c.add(img);
        c.setActiveObject(img);
        c.renderAll();
        imgObjRef.current = img;
      });
    };
    reader.readAsDataURL(file);

    // Upload to backend
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
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: false,
  });

  const rotate = () => {
    const o = imgObjRef.current;
    if (o) {
      o.rotate((o.angle || 0) + 15);
      canvasRef.current.renderAll();
    }
  };
  const zoom = (factor) => {
    const o = imgObjRef.current;
    if (o) {
      o.scale(o.scaleX * factor);
      canvasRef.current.renderAll();
    }
  };
  const clearImg = () => {
    const c = canvasRef.current;
    if (c) c.remove(...c.getObjects());
    imgObjRef.current = null;
    setUploadedUrl(null);
  };

  const handleContinue = async () => {
    if (!uploadedUrl) return;
    // export preview
    const c = canvasRef.current;
    const dataUrl = c.toDataURL({ format: "png", quality: 0.9 });
    // upload preview
    const blob = await (await fetch(dataUrl)).blob();
    const form = new FormData();
    form.append("file", new File([blob], "preview.png", { type: "image/png" }));
    const r = await api.post("/upload/preview", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setDraft({
      preview_url: r.data.url,
      design_url: uploadedUrl,
      brand,
      model,
      product,
    });
    onDone();
  };

  return (
    <div data-testid="design-step">
      <div className="label-eyebrow">Step 04 · Live customizer</div>
      <h1 className="font-display text-4xl lg:text-5xl mt-3 mb-8">
        Make it yours.
      </h1>
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 glass rounded-2xl overflow-hidden min-h-[600px] relative grid place-items-center">
          <div className="relative">
            {/* phone case frame */}
            <div className="absolute inset-0 pointer-events-none z-10 rounded-[44px] border-[6px] border-zinc-900 shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]" />
            {/* camera cutout overlay */}
            <div className="absolute top-6 left-6 w-[100px] h-[100px] rounded-[28px] bg-black/90 border border-white/10 z-20 pointer-events-none grid grid-cols-2 gap-2 p-3">
              <div className="rounded-full bg-zinc-900 border border-white/10" />
              <div className="rounded-full bg-zinc-900 border border-white/10" />
              <div className="rounded-full bg-zinc-900 border border-white/10" />
              <div className="rounded-full bg-zinc-900 border border-white/10" />
            </div>
            <canvas ref={canvasElRef} className="rounded-[40px]" />
          </div>
          <div className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-widest text-white/40">
            {brand.name} · {model.name} · {product.name}
          </div>
        </div>

        <div className="lg:col-span-4 glass rounded-2xl p-6 flex flex-col gap-5">
          <div>
            <div className="label-eyebrow mb-3">Upload artwork</div>
            <div
              {...getRootProps()}
              data-testid="dropzone"
              className={`glass-2 rounded-xl p-6 text-center cursor-pointer border border-dashed ${isDragActive ? "border-[#ff4f00] bg-[#ff4f00]/5" : "border-white/15"}`}
            >
              <input {...getInputProps()} />
              <Upload className="w-6 h-6 mx-auto text-[#ff4f00]" />
              <div className="mt-3 text-sm">
                Drop image here or <span className="text-[#ff4f00]">browse</span>
              </div>
              <div className="text-xs text-white/40 mt-1">JPG · PNG · WEBP</div>
            </div>
            {uploading && (
              <div className="text-xs text-white/50 mt-2">Uploading…</div>
            )}
          </div>

          <div>
            <div className="label-eyebrow mb-3">Adjust</div>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => zoom(1.1)}
                data-testid="zoom-in"
                className="glass-2 rounded-lg p-3 grid place-items-center hover:bg-white/10"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => zoom(0.9)}
                data-testid="zoom-out"
                className="glass-2 rounded-lg p-3 grid place-items-center hover:bg-white/10"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={rotate}
                data-testid="rotate"
                className="glass-2 rounded-lg p-3 grid place-items-center hover:bg-white/10"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={clearImg}
                data-testid="clear-img"
                className="glass-2 rounded-lg p-3 grid place-items-center hover:bg-white/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-white/40 mt-2">
              Drag image inside canvas to reposition.
            </div>
          </div>

          <div className="glass-2 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-xs text-white/40">Total</div>
                <div className="font-display text-2xl">₹{product.price}</div>
              </div>
              <div className="text-xs text-white/40 text-right">
                Free shipping
                <br />
                inside India
              </div>
            </div>
          </div>

          <button
            disabled={!uploadedUrl}
            onClick={handleContinue}
            data-testid="continue-checkout"
            className={`btn-primary flex items-center justify-center gap-2 ${!uploadedUrl ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            Continue to checkout <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
