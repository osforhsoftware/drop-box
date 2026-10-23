import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Star, Zap, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { api, resolveMediaUrl } from "../lib/api";
import { useAuth } from "../lib/auth";
import { startTemplateCheckout } from "../lib/templateCheckout";
import {
  formatPrice,
  caseTypeLabel,
  isModelOutOfStock,
  listMaterialVariants,
  productFromMaterial,
} from "../constants/templateProducts";
import { SHIPPING_FEE } from "../constants/shipping";
import { partitionTags } from "../constants/colorSwatch";
import { ColorSwatchGroup } from "../components/ColorSwatch";
import { useCart } from "../lib/cart";
import { toast } from "sonner";
import TemplateProductCard from "../components/TemplateProductCard";
import FilterSelect from "../components/templates/FilterSelect";

export default function TemplateDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [buying, setBuying] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    setLoading(true);
    setBrandId("");
    setModelId("");
    setModels([]);
    setSelectedMaterialId("");
    setActionError("");
    setError("");
    api
      .get(`/shop/templates/${slug}`)
      .then(async (r) => {
        setTemplate(r.data);
        setSelectedMaterialId(r.data.id);
        const brandsRes = await api.get("/brands");
        const brandList = brandsRes.data || [];
        setBrands(brandList);
        const brand = brandList.find((b) => b.name === r.data.phone_brand) || brandList[0];
        if (brand) {
          setBrandId(brand.id);
          const modelsRes = await api.get("/models", { params: { brand_id: brand.id } });
          const modelList = modelsRes.data || [];
          setModels(modelList);
          const modelName = r.data.phone_models?.[0];
          const model = modelList.find((m) => m.name === modelName) || modelList[0];
          if (model) setModelId(model.id);
        }
      })
      .catch(() => setError("Template not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleBrandChange = async (nextBrandId) => {
    setBrandId(nextBrandId);
    setModelId("");
    setModels([]);
    if (!nextBrandId) return;
    try {
      const modelsRes = await api.get("/models", { params: { brand_id: nextBrandId } });
      const modelList = modelsRes.data || [];
      setModels(modelList);
      if (modelList[0]) setModelId(modelList[0].id);
    } catch {
      setModels([]);
    }
  };

  const materials = listMaterialVariants(template);
  const selectedVariant = materials.find((item) => item.id === selectedMaterialId) || materials[0];
  const selectedProduct = productFromMaterial(template, selectedVariant);
  const selectedModel = models.find((m) => m.id === modelId);
  const selectedOutOfStock = Boolean(
    selectedProduct && selectedModel && isModelOutOfStock(selectedProduct, selectedModel.name)
  );

  const handleMaterialSelect = (variant) => {
    if (!variant) return;
    setSelectedMaterialId(variant.id);
    setActionError("");
    if (variant.has_variant_image) setGalleryIdx(0);
  };

  const handleAddToCart = async () => {
    if (!selectedProduct || !brandId || !modelId) {
      setActionError("Please select your brand and model");
      return;
    }
    try {
      const brand = brands.find((b) => b.id === brandId);
      const model = models.find((m) => m.id === modelId);
      if (!brand || !model) throw new Error("Device selection missing");
      if (isModelOutOfStock(selectedProduct, model.name)) {
        toast.error(`${model.name} is out of stock for this material`);
        return;
      }

      const productsRes = await api.get("/products", {
        params: { brand_id: brandId, model_id: modelId },
      });
      const product =
        productsRes.data.find((p) => p.slug === selectedProduct.case_type)
        || productsRes.data.find((p) => String(p.slug || "").replace(/-case$/, "") === String(selectedProduct.case_type || "").replace(/-case$/, ""))
        || productsRes.data[0];
      if (!product) throw new Error("Case type unavailable for this device");

      const designUrl = selectedProduct.thumbnail || selectedProduct.images?.[0];
      const price = selectedProduct.effective_price ?? selectedProduct.sale_price ?? selectedProduct.price;

      addToCart({
        template_product: selectedProduct,
        template_product_id: selectedProduct.id,
        brand,
        model,
        product: { ...product, price },
        design_url: designUrl,
        preview_url: designUrl,
        quantity: 1,
      });
      toast.success(`Added ${selectedVariant?.case_type_label || caseTypeLabel(selectedProduct.case_type)} for ${brand.name} ${model.name}`);
    } catch {
      setActionError("Could not add to cart. Please select a phone model available for this case.");
    }
  };

  const handlePurchase = async () => {
    if (!selectedProduct || !brandId || !modelId) {
      setActionError("Please select your brand and model");
      return;
    }
    const brand = brands.find((b) => b.id === brandId);
    const model = models.find((m) => m.id === modelId);
    if (!brand || !model) {
      setActionError("Please select your brand and model");
      return;
    }
    if (isModelOutOfStock(selectedProduct, model.name)) {
      toast.error(`${model.name} is out of stock for this material`);
      return;
    }
    setBuying(true);
    setActionError("");
    try {
      const productsRes = await api.get("/products", {
        params: { brand_id: brandId, model_id: modelId },
      });
      const product =
        productsRes.data.find((p) => p.slug === selectedProduct.case_type)
        || productsRes.data.find((p) => String(p.slug || "").replace(/-case$/, "") === String(selectedProduct.case_type || "").replace(/-case$/, ""))
        || productsRes.data[0];
      if (!product) {
        throw new Error("This case type is not available for the selected device");
      }

      startTemplateCheckout({ template: selectedProduct, brand, model, product, quantity: 1 });
      toast.success(`Checkout for ${selectedVariant?.case_type_label || caseTypeLabel(selectedProduct.case_type)} · ${brand.name} ${model.name}`);
      if (!user) {
        navigate("/login?next=/checkout");
        return;
      }
      navigate("/checkout");
    } catch (err) {
      setActionError(err.message || "Could not start checkout. Please select a phone model.");
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20" data-testid="template-detail-loading">
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="aspect-square bg-white/5 rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-2xl">{error || "Not found"}</h2>
        <Link to="/shop" className="btn-primary mt-6 inline-flex">Back to shop</Link>
      </div>
    );
  }

  const gallerySource = selectedVariant?.has_variant_image ? selectedProduct : template;
  const images = gallerySource.images?.length ? gallerySource.images : [gallerySource.thumbnail];
  const price = selectedProduct.effective_price ?? selectedProduct.sale_price ?? selectedProduct.price;
  const currentImg = resolveMediaUrl(images[galleryIdx] || images[0]);
  const { colors: colorTags } = partitionTags(template.tags);
  const selectedMaterialLabel = selectedVariant?.case_type_label || caseTypeLabel(selectedProduct.case_type);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10" data-testid="template-detail">
      <Link
        to="/shop"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-brand mb-7"
      >
        <ArrowLeft className="w-4 h-4" /> Back to shop
      </Link>

      <div className="grid lg:grid-cols-[1.08fr_.92fr] gap-9 lg:gap-14 xl:gap-20">
        <div className="flex flex-col-reverse lg:flex-row gap-3 lg:gap-4 min-w-0">
          {images.length > 1 && (
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto no-scrollbar lg:w-[76px] shrink-0">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGalleryIdx(i)}
                  className={`w-[68px] h-[76px] lg:w-[76px] lg:h-[88px] rounded-xl overflow-hidden shrink-0 border-2 bg-[#f4f5f2] transition-colors ${
                    i === galleryIdx ? "border-brand" : "border-transparent hover:border-black/15"
                  }`}
                >
                  <img src={resolveMediaUrl(img)} alt="" className="w-full h-full object-contain p-1.5" />
                </button>
              ))}
            </div>
          )}
          <div className="product-detail-media product-card-media glass rounded-2xl group flex-1">
            <img
              src={currentImg}
              alt={template.title}
              className="cursor-zoom-in"
              onClick={() => setZoomed(true)}
            />
            <button
              type="button"
              onClick={() => setZoomed(true)}
              className="absolute bottom-4 right-4 glass-2 rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setGalleryIdx((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 glass-2 rounded-full p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryIdx((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 glass-2 rounded-full p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-32 lg:self-start">
          {template.collection && (
            <span className="label-eyebrow text-brand">{template.collection}</span>
          )}
          <h1 className="font-display text-3xl lg:text-4xl">{template.title}</h1>

          {template.rating > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(template.rating)
                        ? "fill-brand text-brand"
                        : "text-white/20"
                    }`}
                  />
                ))}
              </div>
              <span className="text-white/60">
                {Number(template.rating).toFixed(1)}
                {template.review_count > 0 && ` (${template.review_count} reviews)`}
              </span>
            </div>
          )}

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-medium" data-testid="product-price">{formatPrice(price)}</span>
            {selectedProduct.discount_percent > 0 && (
              <>
                <span className="text-lg text-white/40 line-through">
                  {formatPrice(selectedProduct.price)}
                </span>
                <span className="px-2 py-0.5 rounded bg-brand/20 text-brand text-xs font-mono">
                  SAVE {selectedProduct.discount_percent}%
                </span>
              </>
            )}
          </div>

          <p className="text-sm text-white/50 mt-2">
            + {formatPrice(SHIPPING_FEE)} shipping · Total {formatPrice(price + SHIPPING_FEE)}
          </p>

          {materials.length > 0 && (
            <div className="space-y-2" data-testid="material-select">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-sm">Material</h3>
                <span className="text-xs text-white/50" data-testid="selected-material-label">
                  {selectedMaterialLabel}
                </span>
              </div>
              <div role="radiogroup" aria-label="Case material" className="flex flex-wrap gap-2">
                {materials.map((variant) => {
                  const selected = variant.id === selectedVariant?.id;
                  const materialOut = selectedModel
                    ? isModelOutOfStock({ ...variant, variants: variant.variants }, selectedModel.name)
                    : variant.in_stock === false;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-testid={`material-${variant.case_type}`}
                      onClick={() => handleMaterialSelect(variant)}
                      className={`rounded-xl px-3 py-2 text-left text-sm border transition-colors min-w-[8.5rem] ${
                        selected
                          ? "border-brand bg-brand/15 ring-2 ring-brand"
                          : "border-white/10 bg-white/[0.03] hover:border-white/25"
                      }`}
                    >
                      <span className="block font-medium">
                        {variant.case_type_label || caseTypeLabel(variant.case_type)}
                      </span>
                      <span className="block text-xs text-white/55 mt-0.5">
                        {formatPrice(variant.effective_price)}
                        {materialOut ? " · Out of stock" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-white/60 leading-relaxed" data-testid="product-description">
            {selectedProduct.description || selectedProduct.short_description}
          </p>

          <div className="glass rounded-2xl p-5 space-y-3 text-sm">
            <h3 className="font-medium">Specifications</h3>
            <dl className="grid grid-cols-2 gap-3 text-white/60">
              <div>
                <dt className="text-white/40 text-xs uppercase tracking-wider">Case type</dt>
                <dd>{selectedMaterialLabel}</dd>
              </div>
              <div>
                <dt className="text-white/40 text-xs uppercase tracking-wider">Material</dt>
                <dd>{selectedProduct.material || selectedMaterialLabel || "Premium UV print"}</dd>
              </div>
              <div>
                <dt className="text-white/40 text-xs uppercase tracking-wider">Brand</dt>
                <dd>{template.phone_brand}</dd>
              </div>
              <div>
                <dt className="text-white/40 text-xs uppercase tracking-wider">Category</dt>
                <dd>{template.category}</dd>
              </div>
              {colorTags.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-white/40 text-xs uppercase tracking-wider mb-1.5">Color</dt>
                  <dd>
                    <ColorSwatchGroup colors={colorTags} size="lg" showLabels />
                  </dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-white/40 text-xs uppercase tracking-wider">Compatible models</dt>
                <dd>{template.phone_models?.join(", ") || "All models for brand"}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3" data-testid="device-select">
            <h3 className="font-medium text-sm">Select your device</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Brand</label>
                <FilterSelect
                  value={brandId}
                  onChange={handleBrandChange}
                  placeholder="Select brand"
                  options={brands.map((b) => ({ value: b.id, label: b.name }))}
                  testId="detail-brand-select"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Model</label>
                <FilterSelect
                  value={modelId}
                  onChange={setModelId}
                  placeholder={brandId ? "Select model" : "Select brand first"}
                  options={models.map((m) => ({
                    value: m.id,
                    label: selectedProduct && isModelOutOfStock(selectedProduct, m.name)
                      ? `${m.name} (Out of stock)`
                      : m.name,
                  }))}
                  disabled={!brandId}
                  testId="detail-model-select"
                />
              </div>
            </div>
            {brandId && modelId && (
              <p className="text-xs text-white/50" data-testid="device-selection-summary">
                Will order for{" "}
                <span className="text-white/80">
                  {brands.find((b) => b.id === brandId)?.name || "—"} ·{" "}
                  {models.find((m) => m.id === modelId)?.name || "—"}
                </span>
              </p>
            )}
            {selectedOutOfStock && (
              <p className="text-xs text-amber-200/90" data-testid="variant-out-of-stock">
                <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 font-medium text-amber-300">
                  Out of stock
                </span>
                <span className="ml-2">
                  {selectedMaterialLabel} for {selectedModel.name} is unavailable. Other materials or models can still be ordered.
                </span>
              </p>
            )}
            {actionError && (
              <p className="text-xs text-red-300" data-testid="detail-action-error">{actionError}</p>
            )}
          </div>

          <div className="btn-row pt-2">
            <button
              data-testid="add-to-cart-btn"
              onClick={(e) => {
                e.preventDefault();
                handleAddToCart();
              }}
              disabled={buying || !modelId || selectedOutOfStock}
              className="btn-secondary disabled:opacity-50"
            >
              <ShoppingBag aria-hidden />
              {selectedOutOfStock ? "Out of stock" : "Add to Cart"}
            </button>
            <button
              type="button"
              onClick={handlePurchase}
              disabled={buying || !modelId || selectedOutOfStock}
              className="btn-primary disabled:opacity-50"
              data-testid="buy-now"
            >
              <Zap aria-hidden />
              {buying ? "Processing…" : "Buy Now"}
            </button>
          </div>
        </div>
      </div>

      {template.related?.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl mb-8">Related Templates</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {template.related.slice(0, 4).map((t) => (
              <TemplateProductCard key={t.id} template={t} />
            ))}
          </div>
        </section>
      )}

      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomed(false)}
        >
          <img
            src={currentImg}
            alt={template.title}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
