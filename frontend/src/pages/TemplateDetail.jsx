import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Star, Zap, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { api, resolveMediaUrl } from "../lib/api";
import { useAuth } from "../lib/auth";
import { startTemplateCheckout } from "../lib/templateCheckout";
import { formatPrice, caseTypeLabel } from "../constants/templateProducts";
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

  useEffect(() => {
    setLoading(true);
    setBrandId("");
    setModelId("");
    setModels([]);
    api
      .get(`/shop/templates/${slug}`)
      .then(async (r) => {
        setTemplate(r.data);
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

  const handleAddToCart = async () => {
    if (!template || !brandId || !modelId) return;
    try {
      const [brandsRes, modelsRes, productsRes] = await Promise.all([
        api.get("/brands"),
        api.get("/models", { params: { brand_id: brandId } }),
        api.get("/products", { params: { brand_id: brandId, model_id: modelId } }),
      ]);
      const brand = brandsRes.data.find((b) => b.id === brandId);
      const model = modelsRes.data.find((m) => m.id === modelId);
      const product = productsRes.data.find((p) => p.slug === template.case_type) || productsRes.data[0];
      if (!brand || !model || !product) throw new Error("Catalog missing");

      const designUrl = template.thumbnail || template.images?.[0];
      const price = template.effective_price ?? template.sale_price ?? template.price;

      // Add to context cart
      addToCart({
        template_product: template,
        template_product_id: template.id,
        brand,
        model,
        product: { ...product, price },
        design_url: designUrl,
        preview_url: designUrl,
        quantity: 1,
      });
      toast.success("Item added to cart");
    } catch {
      setError("Could not add to cart. Please select a phone model.");
    }
  };

  const handlePurchase = async () => {
    if (!template || !brandId || !modelId) return;
    setBuying(true);
    try {
      const [brandsRes, modelsRes, productsRes] = await Promise.all([
        api.get("/brands"),
        api.get("/models", { params: { brand_id: brandId } }),
        api.get("/products", { params: { brand_id: brandId, model_id: modelId } }),
      ]);
      const brand = brandsRes.data.find((b) => b.id === brandId);
      const model = modelsRes.data.find((m) => m.id === modelId);
      const product = productsRes.data.find((p) => p.slug === template.case_type) || productsRes.data[0];
      if (!brand || !model || !product) throw new Error("Catalog missing");

      startTemplateCheckout({ template, brand, model, product, quantity: 1 });
      if (!user) {
        navigate("/login?next=/checkout");
        return;
      }
      navigate("/checkout");
    } catch {
      setError("Could not start checkout. Please select a phone model.");
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

  const images = template.images?.length ? template.images : [template.thumbnail];
  const price = template.effective_price ?? template.sale_price ?? template.price;
  const currentImg = resolveMediaUrl(images[galleryIdx]);
  const { colors: colorTags } = partitionTags(template.tags);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10" data-testid="template-detail">
      <Link
        to="/shop"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Back to shop
      </Link>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        <div className="space-y-4">
          <div className="product-card-media glass rounded-2xl group">
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
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGalleryIdx(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 ${
                    i === galleryIdx ? "border-brand" : "border-transparent"
                  }`}
                >
                  <img src={resolveMediaUrl(img)} alt="" className="w-full h-full object-contain bg-[#0a0a0c] p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
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
            <span className="text-3xl font-medium">{formatPrice(price)}</span>
            {template.discount_percent > 0 && (
              <>
                <span className="text-lg text-white/40 line-through">
                  {formatPrice(template.price)}
                </span>
                <span className="px-2 py-0.5 rounded bg-brand/20 text-brand text-xs font-mono">
                  SAVE {template.discount_percent}%
                </span>
              </>
            )}
          </div>

          <p className="text-sm text-white/50 mt-2">
            + {formatPrice(SHIPPING_FEE)} shipping · Total {formatPrice(price + SHIPPING_FEE)}
          </p>

          <p className="text-white/60 leading-relaxed">
            {template.description || template.short_description}
          </p>

          <div className="glass rounded-2xl p-5 space-y-3 text-sm">
            <h3 className="font-medium">Specifications</h3>
            <dl className="grid grid-cols-2 gap-3 text-white/60">
              <div>
                <dt className="text-white/40 text-xs uppercase tracking-wider">Case type</dt>
                <dd>{caseTypeLabel(template.case_type)}</dd>
              </div>
              <div>
                <dt className="text-white/40 text-xs uppercase tracking-wider">Material</dt>
                <dd>{template.material || "Premium UV print"}</dd>
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
                  options={models.map((m) => ({ value: m.id, label: m.name }))}
                  disabled={!brandId}
                  testId="detail-model-select"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              data-testid="add-to-cart-btn"
              onClick={(e) => {
                e.preventDefault();
                handleAddToCart();
              }}
              disabled={buying || !modelId || template.stock <= 0}
              className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShoppingBag className="w-4 h-4" />
              {template.stock <= 0 ? "Out of stock" : "Add to Cart"}
            </button>
            <button
              type="button"
              onClick={handlePurchase}
              disabled={buying || !modelId || template.stock <= 0}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="buy-now"
            >
              <Zap className="w-4 h-4" />
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
