import { useEffect, useState, useCallback } from "react";
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
  displayTemplateTitle,
  getUpdatedTemplateTitle,
  getUpdatedProductDescription,
  getMaterialSpecification,
  matchesTemplate,
  isMaterialCompatibleWithModel,
  getDesignCompatibility,
  getModelPrice,
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
  const [errorState, setErrorState] = useState(null);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [buying, setBuying] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [actionError, setActionError] = useState("");

  const loadProducts = async (bId, mId, tpl) => {
    if (!bId || !mId) {
      setProducts([]);
      setProductId("");
      return;
    }
    setLoadingProducts(true);
    try {
      const res = await api.get("/products", {
        params: { brand_id: bId, model_id: mId },
      });
      const list = res.data || [];
      setProducts(list);
      setProductId((curr) => {
        if (curr && list.some((p) => p.id === curr)) return curr;
        const matched = list.find((p) => matchesTemplate(p, tpl?.case_type));
        return (matched || list[0])?.id || "";
      });
    } catch {
      setProducts([]);
      setProductId("");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadProduct = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setBrandId("");
    setModelId("");
    setModels([]);
    setSelectedMaterialId("");
    setActionError("");
    setErrorState(null);
    setProducts([]);
    setProductId("");
    try {
      const r = await api.get(`/shop/templates/${slug}`);
      const tpl = r.data;
      if (!tpl) {
        setErrorState({
          type: "not_found",
          title: "Product not found",
          message: "The phone case you are looking for does not exist or may have been removed.",
        });
        return;
      }
      setTemplate(tpl);
      const allMats = listMaterialVariants(tpl);
      const inStockMats = allMats.filter((m) => m.status === "published" && (m.stock == null || Number(m.stock) > 0));
      const candidateMats = inStockMats.length > 0 ? inStockMats : allMats;
      const defaultMat = candidateMats.find((m) => m.is_default || m.id === tpl.default_variant_id || (m.id === tpl.id && tpl.is_default));
      const cheapest = [...candidateMats].sort((a, b) => {
        const pA = Number(a.sale_price || a.price || 0);
        const pB = Number(b.sale_price || b.price || 0);
        return pA - pB;
      })[0];
      setSelectedMaterialId(defaultMat?.id || cheapest?.id || tpl.id);
      const brandsRes = await api.get("/brands");
      const allBrands = brandsRes.data || [];

      const designCompat = getDesignCompatibility(tpl);

      let availableBrands = allBrands;
      if (designCompat.length > 0) {
        const compatBrandNames = new Set(designCompat.map((c) => String(c.brand || "").trim().toLowerCase()));
        const filtered = allBrands.filter((b) => compatBrandNames.has(String(b.name || "").trim().toLowerCase()));
        if (filtered.length > 0) {
          availableBrands = filtered;
        }
      }
      setBrands(availableBrands);

      const matchedBrand = availableBrands.find(
        (b) => String(b.name || "").toLowerCase() === String(tpl.phone_brand || "").toLowerCase()
      ) || availableBrands[0];

      const brand = matchedBrand;
      if (brand) {
        setBrandId(brand.id);
        const modelsRes = await api.get("/models", { params: { brand_id: brand.id } });
        const allModels = modelsRes.data || [];

        // Show all models configured across all variants for this brand
        const brandCompat = designCompat.find(
          (c) => String(c.brand || "").trim().toLowerCase() === String(brand.name || "").trim().toLowerCase()
        );
        const targetModels = brandCompat && Array.isArray(brandCompat.models) && brandCompat.models.length > 0
          ? new Set(brandCompat.models.map((m) => String(m).trim().toLowerCase()))
          : (Array.isArray(tpl.phone_models) && tpl.phone_models.length > 0
              ? new Set(tpl.phone_models.map((m) => String(m).trim().toLowerCase()))
              : null);

        const compatibleModels = targetModels
          ? allModels.filter((m) => targetModels.has(String(m.name).trim().toLowerCase()))
          : allModels;
        setModels(compatibleModels);

        const defaultModelName = (brandCompat && brandCompat.models?.[0]) || tpl.phone_models?.[0];
        const model = (defaultModelName && compatibleModels.find((m) => m.name.toLowerCase() === defaultModelName.toLowerCase())) || compatibleModels[0];
        if (model) {
          setModelId(model.id);
          await loadProducts(brand.id, model.id, tpl);
        }
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setErrorState({
          type: "not_found",
          title: "Product not found",
          message: "The phone case you are looking for does not exist, has been removed, or the link may be outdated.",
        });
      } else {
        setErrorState({
          type: "server_error",
          title: "Unable to load product",
          message: err.response?.data?.detail || err.message || "Failed to load product. Please check your connection and try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleBrandChange = async (nextBrandId) => {
    setBrandId(nextBrandId);
    setModelId("");
    setModels([]);
    setProducts([]);
    setProductId("");
    if (!nextBrandId) return;
    const nextBrand = brands.find((b) => b.id === nextBrandId);
    if (!nextBrand) return;

    try {
      const modelsRes = await api.get("/models", { params: { brand_id: nextBrandId } });
      const allModels = modelsRes.data || [];

      const currentTpl = activeTemplate || template;
      const designCompat = getDesignCompatibility(template || currentTpl);

      const brandCompat = designCompat.find(
        (c) => String(c.brand || "").trim().toLowerCase() === String(nextBrand.name || "").trim().toLowerCase()
      );
      const targetModels = brandCompat && Array.isArray(brandCompat.models) && brandCompat.models.length > 0
        ? new Set(brandCompat.models.map((m) => String(m).trim().toLowerCase()))
        : null;

      const compatibleModels = targetModels
        ? allModels.filter((m) => targetModels.has(String(m.name).trim().toLowerCase()))
        : allModels;
      setModels(compatibleModels);
      if (compatibleModels[0]) {
        setModelId(compatibleModels[0].id);
        await loadProducts(nextBrandId, compatibleModels[0].id, currentTpl);
      }
    } catch {
      setModels([]);
      setProducts([]);
    }
  };

  const handleModelChange = async (nextModelId) => {
    setModelId(nextModelId);
    setProducts([]);
    setProductId("");
    if (!nextModelId || !brandId) return;
    await loadProducts(brandId, nextModelId, activeTemplate || template);
  };

  const materials = listMaterialVariants(template);
  const selectedModel = models.find((m) => m.id === modelId);

  // Filter material variants compatible with the chosen model using explicit template configuration
  const compatibleMaterials = selectedModel
    ? materials.filter((m) => isMaterialCompatibleWithModel(m, selectedModel, template))
    : materials;

  const isMaterialInStock = (m, modelName) => {
    if (m.status && m.status !== "published") return false;
    if (modelName && isModelOutOfStock(m, modelName)) return false;
    if (m.stock != null && Number(m.stock) <= 0) return false;
    if (m.in_stock === false) return false;
    return true;
  };

  const activeInStockMaterials = compatibleMaterials.filter((m) =>
    isMaterialInStock(m, selectedModel?.name)
  );

  const showMaterialSelector = activeInStockMaterials.length > 1;
  const noCompatibleMaterial = Boolean(selectedModel && compatibleMaterials.length === 0);

  // Auto-select valid compatible and in-stock material when brand or model changes
  useEffect(() => {
    if (!compatibleMaterials.length) return;
    const currentValid = compatibleMaterials.some(
      (m) => m.id === selectedMaterialId && isMaterialInStock(m, selectedModel?.name)
    );
    if (!currentValid) {
      const best = activeInStockMaterials[0] || compatibleMaterials[0];
      if (best) setSelectedMaterialId(best.id);
    }
  }, [compatibleMaterials, activeInStockMaterials, selectedMaterialId, selectedModel?.name]);

  const selectedVariant = (activeInStockMaterials.length > 0 ? activeInStockMaterials : compatibleMaterials).find(
    (item) => item.id === selectedMaterialId
  ) || compatibleMaterials.find((item) => item.id === selectedMaterialId) || activeInStockMaterials[0] || compatibleMaterials[0] || materials[0];

  const activeTemplate = productFromMaterial(template, selectedVariant) || template;

  const selectedProduct = products.find((p) => matchesTemplate(p, selectedVariant?.case_type))
    || products.find((p) => matchesTemplate(p, activeTemplate?.case_type))
    || null;

  const selectedOutOfStock = Boolean(
    activeTemplate && selectedModel && !isMaterialInStock(selectedVariant || activeTemplate, selectedModel.name)
  );

  const canBuy = !buying && modelId && !noCompatibleMaterial && !selectedOutOfStock && (selectedVariant?.stock == null || Number(selectedVariant.stock) > 0);

  const handleMaterialSelect = (variant) => {
    if (!variant) return;
    setSelectedMaterialId(variant.id);
    setActionError("");
    if (products.length > 0) {
      const matched = products.find((p) => matchesTemplate(p, variant.case_type));
      if (matched) setProductId(matched.id);
    }
  };

  const handleCaseProductSelect = (p) => {
    if (!p) return;
    setProductId(p.id);
    setActionError("");
    const matched = materials.find((v) => matchesTemplate(p, v.case_type));
    if (matched) {
      setSelectedMaterialId(matched.id);
    }
  };

  useEffect(() => {
    if (selectedVariant?.has_variant_image) {
      setGalleryIdx(0);
    }
  }, [selectedVariant?.id]);

  const modelPricing = getModelPrice(selectedVariant || activeTemplate, selectedModel?.name);
  const currentPrice = modelPricing.effective_price;
  const currentRegularPrice = modelPricing.price;
  const currentSalePrice = modelPricing.sale_price;
  const hasModelDiscount = currentSalePrice != null && currentSalePrice > 0 && currentSalePrice < currentRegularPrice;
  const modelDiscountPercent = hasModelDiscount
    ? Math.round((1 - currentSalePrice / currentRegularPrice) * 100)
    : 0;

  const isDefaultMaterialSelected = Boolean(
    !selectedVariant || selectedVariant.id === template?.id || selectedVariant.case_type === template?.case_type
  );

  const displayTitle = getUpdatedTemplateTitle(template, selectedVariant, selectedProduct);
  const displayDescription = selectedVariant?.description?.trim()
    || selectedProduct?.description?.trim()
    || template?.description?.trim()
    || "";
  const selectedMaterialLabel =
    selectedVariant?.case_type_label ||
    (selectedVariant?.case_type ? caseTypeLabel(selectedVariant.case_type) : "") ||
    selectedProduct?.name ||
    (activeTemplate?.case_type ? caseTypeLabel(activeTemplate.case_type) : "");
  const displayCaseType =
    selectedVariant?.case_type_label ||
    selectedMaterialLabel ||
    (activeTemplate?.case_type ? caseTypeLabel(activeTemplate.case_type) : "");
  const displayMaterial = selectedVariant?.material
    || selectedProduct?.material
    || getMaterialSpecification(selectedProduct, selectedVariant, template, isDefaultMaterialSelected)
    || template?.material
    || "";

  const handleAddToCart = async () => {
    if (noCompatibleMaterial) {
      setActionError(`No compatible case materials are available for ${selectedModel?.name || "this model"}`);
      return;
    }
    if (!brandId || !modelId) {
      setActionError("Please select your brand and model");
      return;
    }
    const brand = brands.find((b) => b.id === brandId);
    const model = models.find((m) => m.id === modelId);
    if (!brand || !model) {
      setActionError("Device selection missing");
      return;
    }
    const compat = Array.isArray(activeTemplate?.compatibility) && activeTemplate.compatibility.length > 0
      ? activeTemplate.compatibility
      : (activeTemplate?.phone_brand ? [{ brand: activeTemplate.phone_brand, models: activeTemplate.phone_models || [] }] : []);

    if (compat.length > 0) {
      const brandGroup = compat.find(
        (g) => String(g.brand || "").trim().toLowerCase() === String(brand.name || "").trim().toLowerCase()
      );
      if (!brandGroup) {
        setActionError(`This case is not available for ${brand.name}`);
        return;
      }
      if (Array.isArray(brandGroup.models) && brandGroup.models.length > 0) {
        const isCompat = brandGroup.models.some(
          (m) => String(m).trim().toLowerCase() === String(model.name).trim().toLowerCase()
        );
        if (!isCompat) {
          setActionError(`This design is not available for ${model.name}`);
          return;
        }
      }
    }
    if (isModelOutOfStock(activeTemplate, model.name)) {
      toast.error(`${model.name} is out of stock for this material`);
      return;
    }

    try {
      let resolvedProduct = selectedProduct;
      if (!resolvedProduct && brandId && modelId) {
        const productsRes = await api.get("/products", {
          params: { brand_id: brandId, model_id: modelId },
        });
        resolvedProduct =
          productsRes.data.find((p) => matchesTemplate(p, activeTemplate.case_type))
          || productsRes.data.find((p) => String(p.slug || "").replace(/-case$/, "") === String(activeTemplate.case_type || "").replace(/-case$/, ""))
          || null;
      }
      if (!resolvedProduct) {
        resolvedProduct = {
          id: activeTemplate.id,
          name: selectedMaterialLabel || activeTemplate.title,
          slug: activeTemplate.case_type,
          price: currentPrice,
          material: displayMaterial,
        };
      }

      const itemPrice = currentPrice;
      const pricedProduct = { ...resolvedProduct, price: itemPrice };
      const materialName = selectedMaterialLabel || resolvedProduct?.name || activeTemplate.title;
      const designUrl = activeTemplate.thumbnail || activeTemplate.images?.[0] || template?.thumbnail;

      addToCart({
        template_product: {
          ...activeTemplate,
          title: displayTitle,
          description: displayDescription,
          case_type: activeTemplate.case_type || resolvedProduct?.slug,
          case_type_label: materialName,
          material: displayMaterial,
          price: currentPrice,
          effective_price: currentPrice,
        },
        template_product_id: activeTemplate.id,
        brand,
        model,
        product: pricedProduct,
        price: itemPrice,
        design_url: designUrl,
        preview_url: designUrl,
        quantity: 1,
      });

      toast.success(
        brand && model
          ? `Added ${materialName} for ${brand.name} ${model.name}`
          : `Added ${materialName} to cart`
      );
    } catch {
      setActionError("Could not add to cart. Please select a phone model available for this case.");
    }
  };

  const handlePurchase = async () => {
    if (noCompatibleMaterial) {
      setActionError(`No compatible case materials are available for ${selectedModel?.name || "this model"}`);
      return;
    }
    if (!brandId || !modelId) {
      setActionError("Please select your brand and model");
      return;
    }
    const brand = brands.find((b) => b.id === brandId);
    const model = models.find((m) => m.id === modelId);
    if (!brand || !model) {
      setActionError("Device selection missing");
      return;
    }
    const compat = Array.isArray(activeTemplate?.compatibility) && activeTemplate.compatibility.length > 0
      ? activeTemplate.compatibility
      : (activeTemplate?.phone_brand ? [{ brand: activeTemplate.phone_brand, models: activeTemplate.phone_models || [] }] : []);

    if (compat.length > 0) {
      const brandGroup = compat.find(
        (g) => String(g.brand || "").trim().toLowerCase() === String(brand.name || "").trim().toLowerCase()
      );
      if (!brandGroup) {
        setActionError(`This case is not available for ${brand.name}`);
        return;
      }
      if (Array.isArray(brandGroup.models) && brandGroup.models.length > 0) {
        const isCompat = brandGroup.models.some(
          (m) => String(m).trim().toLowerCase() === String(model.name).trim().toLowerCase()
        );
        if (!isCompat) {
          setActionError(`This design is not available for ${model.name}`);
          return;
        }
      }
    }
    if (isModelOutOfStock(activeTemplate, model.name)) {
      toast.error(`${model.name} is out of stock for this material`);
      return;
    }

    setBuying(true);
    setActionError("");
    try {
      let resolvedProduct = selectedProduct;
      if (!resolvedProduct && brandId && modelId) {
        const productsRes = await api.get("/products", {
          params: { brand_id: brandId, model_id: modelId },
        });
        resolvedProduct =
          productsRes.data.find((p) => matchesTemplate(p, activeTemplate.case_type))
          || productsRes.data.find((p) => String(p.slug || "").replace(/-case$/, "") === String(activeTemplate.case_type || "").replace(/-case$/, ""))
          || null;
      }
      if (!resolvedProduct) {
        resolvedProduct = {
          id: activeTemplate.id,
          name: selectedMaterialLabel || activeTemplate.title,
          slug: activeTemplate.case_type,
          price: currentPrice,
          material: displayMaterial,
        };
      }

      const itemPrice = currentPrice;
      const pricedProduct = { ...resolvedProduct, price: itemPrice };
      const materialName = selectedMaterialLabel || resolvedProduct?.name || activeTemplate.title;

      startTemplateCheckout({
        template: {
          ...activeTemplate,
          title: displayTitle,
          description: displayDescription,
          case_type: activeTemplate.case_type || resolvedProduct?.slug,
          case_type_label: materialName,
          material: displayMaterial,
          price: currentPrice,
          effective_price: currentPrice,
        },
        brand,
        model,
        product: pricedProduct,
        price: itemPrice,
        quantity: 1,
      });
      toast.success(
        brand && model
          ? `Checkout for ${materialName} · ${brand.name} ${model.name}`
          : `Checkout for ${materialName}`
      );
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

  if (errorState || !template) {
    const isNotFound = errorState?.type === "not_found" || (!errorState && !template);
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center" data-testid="template-detail-error">
        <div className="glass max-w-md mx-auto p-8 rounded-2xl border border-white/10 space-y-4">
          <h2 className="font-display text-2xl text-white">
            {isNotFound ? (errorState?.title || "Product not found") : (errorState?.title || "Unable to load product")}
          </h2>
          <p className="text-sm text-white/60">
            {isNotFound
              ? (errorState?.message || "The phone case you are looking for does not exist, has been removed, or the link may be outdated.")
              : (errorState?.message || "We encountered an issue loading this product. Please check your connection and try again.")}
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-3">
            {!isNotFound && (
              <button
                type="button"
                onClick={loadProduct}
                className="btn-primary text-sm px-5 py-2 inline-flex items-center gap-2"
                data-testid="template-detail-retry-btn"
              >
                Try again
              </button>
            )}
            <Link
              to="/shop"
              className={isNotFound ? "btn-primary text-sm px-5 py-2 inline-flex" : "btn-secondary text-sm px-5 py-2 inline-flex"}
              data-testid="template-detail-shop-link"
            >
              Browse Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeVariantImages = selectedVariant?.has_variant_image && Array.isArray(selectedVariant.images) && selectedVariant.images.length > 0
    ? selectedVariant.images
    : (selectedVariant?.has_variant_image && selectedVariant.thumbnail ? [selectedVariant.thumbnail] : null);
  const images = activeVariantImages || (template?.images?.length ? template.images : [template?.thumbnail]);
  const price = currentPrice;
  const currentImg = resolveMediaUrl(images[galleryIdx] || images[0]);
  const { colors: colorTags } = partitionTags(template.tags);

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
          <h1 className="font-display text-3xl lg:text-4xl">{displayTitle}</h1>

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
            <span className="text-3xl font-medium" data-testid="detail-price">{formatPrice(price)}</span>
            {(hasModelDiscount || (isDefaultMaterialSelected && (activeTemplate.discount_percent > 0 || template.discount_percent > 0))) && (
              <>
                <span className="text-lg text-white/40 line-through">
                  {formatPrice(hasModelDiscount ? currentRegularPrice : (activeTemplate.price ?? template.price))}
                </span>
                <span className="px-2 py-0.5 rounded bg-brand/20 text-brand text-xs font-mono">
                  SAVE {hasModelDiscount ? modelDiscountPercent : (activeTemplate.discount_percent || template.discount_percent)}%
                </span>
              </>
            )}
          </div>

          <p className="text-sm text-white/50 mt-2">
            + {formatPrice(SHIPPING_FEE)} shipping · Total {formatPrice(price + SHIPPING_FEE)}
          </p>

          <p
            className="text-base sm:text-[17px] text-white/85 leading-relaxed max-w-prose break-words py-0.5"
            data-testid="product-description"
          >
            {displayDescription}
          </p>

          {/* Material selector - positioned neatly above Specifications, close to price & description */}
          {showMaterialSelector && (
            <div className="pt-1 space-y-2.5" data-testid="material-select">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/50 block font-medium uppercase tracking-wider">
                  Select case material
                </label>
                {selectedVariant && (
                  <span className="text-xs font-mono text-brand font-medium" data-testid="selected-material-label">
                    {selectedVariant.case_type_label || caseTypeLabel(selectedVariant.case_type)}
                  </span>
                )}
              </div>

              <div
                role="radiogroup"
                aria-label="Select case material"
                className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5"
              >
                {compatibleMaterials.map((m) => {
                  const isSelected = selectedVariant?.id === m.id || selectedVariant?.case_type === m.case_type;
                  const matPricing = getModelPrice(m, selectedModel?.name);
                  const matPrice = matPricing.effective_price;
                  const matLabel = m.case_type_label || caseTypeLabel(m.case_type);
                  const isOut = selectedModel
                    ? isModelOutOfStock(m, selectedModel.name)
                    : (m.stock != null && Number(m.stock) <= 0);
                  return (
                    <button
                      key={m.id || m.case_type}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-disabled={isOut}
                      tabIndex={0}
                      data-testid={`material-option-${m.case_type || m.id}`}
                      onClick={() => handleMaterialSelect(m)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleMaterialSelect(m);
                        }
                      }}
                      className={`group relative text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? "bg-brand/15 border-brand ring-1 ring-brand text-white shadow-[0_0_12px_rgba(109,177,97,0.18)]"
                          : isOut
                          ? "bg-white/[0.01] border-white/5 text-white/40 opacity-60"
                          : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06] text-white/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 w-full">
                        <span
                          className={`text-xs sm:text-sm font-medium leading-tight line-clamp-1 ${
                            isSelected ? "text-white" : "text-white/90"
                          }`}
                          title={matLabel}
                        >
                          {matLabel}
                        </span>
                        <span
                          className={`w-3.5 h-3.5 rounded-full border shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-brand bg-brand"
                              : "border-white/30 group-hover:border-white/50"
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between w-full mt-0.5">
                        <span
                          className={`font-mono text-xs font-semibold ${
                            isSelected ? "text-brand" : "text-brand/90"
                          }`}
                        >
                          {formatPrice(matPrice)}
                        </span>
                        {isOut && (
                          <span className="text-[10px] text-amber-400 font-medium">Out of stock</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!showMaterialSelector && compatibleMaterials.length >= 1 && (
            <div className="pt-0.5 flex items-center gap-2 text-xs text-white/70" data-testid="single-material-info">
              <span className="text-white/40 uppercase tracking-wider font-medium text-[11px]">Material:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                {selectedMaterialLabel} · {formatPrice(currentPrice)}
              </span>
            </div>
          )}

          {noCompatibleMaterial && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300" data-testid="no-materials-alert">
              No case materials are available for {selectedModel?.name || "this model"}. Please select another phone model.
            </div>
          )}

          <div className="glass rounded-2xl p-5 space-y-3 text-sm">
            <h3 className="font-medium">Specifications</h3>
            <dl className="grid grid-cols-2 gap-3 text-white/60">
              <div>
                <dt className="text-white/40 text-xs uppercase tracking-wider">Case type</dt>
                <dd>{displayCaseType}</dd>
              </div>
              <div>
                <dt className="text-white/40 text-xs uppercase tracking-wider">Material</dt>
                <dd>{displayMaterial}</dd>
              </div>
              <div>
                <dt className="text-white/40 text-xs uppercase tracking-wider">Brand</dt>
                <dd>
                  {Array.isArray(template.compatibility) && template.compatibility.length > 0
                    ? template.compatibility.map((c) => c.brand).join(", ")
                    : template.phone_brand}
                </dd>
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
              {Array.isArray(template.phone_models) && template.phone_models.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-white/40 text-xs uppercase tracking-wider">Compatible models</dt>
                  <dd>{(activeTemplate?.phone_models || template.phone_models || []).join(", ")}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="space-y-4" data-testid="device-select">
            {brands.length > 0 && (
              <div className="space-y-3" data-testid="compatible-models-section">
                <h3 className="font-medium text-sm">Compatible models</h3>
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
                      onChange={handleModelChange}
                      placeholder={brandId ? "Select model" : "Select brand first"}
                      options={models.map((m) => ({
                        value: m.id,
                        label: activeTemplate && isModelOutOfStock(activeTemplate, m.name)
                          ? `${m.name} (Out of stock)`
                          : m.name,
                      }))}
                      disabled={!brandId}
                      testId="detail-model-select"
                    />
                  </div>
                </div>
              </div>
            )}

            {brandId && modelId && (
              <p className="text-xs text-white/50" data-testid="device-selection-summary">
                Will order for{" "}
                <span className="text-white/80">
                  {brands.find((b) => b.id === brandId)?.name || "—"} ·{" "}
                  {models.find((m) => m.id === modelId)?.name || "—"}
                  {selectedMaterialLabel ? ` · ${selectedMaterialLabel}` : ""}
                </span>
              </p>
            )}
            {noCompatibleMaterial && (
              <p className="text-xs text-amber-200/90" data-testid="variant-unavailable">
                <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 font-medium text-amber-300">
                  Unavailable
                </span>
                <span className="ml-2">
                  No compatible case materials are available for {selectedModel?.name || "this model"}. Please select another phone model.
                </span>
              </p>
            )}
            {selectedOutOfStock && (
              <p className="text-xs text-amber-200/90" data-testid="variant-out-of-stock">
                <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 font-medium text-amber-300">
                  Out of stock
                </span>
                <span className="ml-2">
                  {selectedMaterialLabel} for {selectedModel?.name} is unavailable. Other materials or models can still be ordered.
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
              disabled={!canBuy}
              className="btn-secondary disabled:opacity-50"
            >
              <ShoppingBag aria-hidden />
              {selectedOutOfStock || (selectedVariant?.stock != null && Number(selectedVariant.stock) <= 0) ? "Out of stock" : "Add to Cart"}
            </button>
            <button
              type="button"
              data-testid="buy-now-btn"
              onClick={(e) => {
                e.preventDefault();
                handlePurchase();
              }}
              disabled={!canBuy}
              className="btn-primary disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {buying ? "Preparing..." : !canBuy ? "Unavailable" : "Buy Now"}
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
