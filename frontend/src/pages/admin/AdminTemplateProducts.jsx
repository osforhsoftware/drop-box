import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { api, resolveMediaUrl } from "../../lib/api";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_COLLECTIONS,
  TEMPLATE_PHONE_BRANDS,
  TEMPLATE_PRODUCT_TYPES,
  formatPrice,
  displayTemplateTitle,
  productTypeLabel,
  normalizeProductType,
  TEMPLATE_THUMB_SPEC,
  TEMPLATE_TAG_SUGGESTIONS,
  syncVariantRows,
  getDesignCompatibility,
} from "../../constants/templateProducts";
import {
  Plus, Trash2, Pencil, Copy, Star, Eye, EyeOff, Globe, Search, X, Check, RotateCcw,
  Package, Smartphone, Layers, DollarSign, Image, Settings, ChevronDown, ChevronUp, MoreVertical, Filter, SlidersHorizontal,
} from "lucide-react";
import TemplateQuickView from "../../components/TemplateQuickView";
import TagSelect from "../../components/TagSelect";
import ModelMultiSelect from "../../components/admin/ModelMultiSelect";
import BrandModelManagerModal from "../../components/admin/BrandModelManagerModal";
import LogoColorSelect from "../../components/LogoColorSelect";
import { isColorTag, partitionTags } from "../../constants/colorSwatch";

const EMPTY = {
  title: "",
  slug: "",
  description: "",
  short_description: "",
  product_type: "customized",
  phone_brand: "Apple",
  phone_models: [],
  compatibility: [],
  category: "Minimal",
  collection: "Essentials",
  case_type: "",
  material: "",
  price: "",
  sale_price: "",
  stock: "10",
  variant_inventory: [],
  sku: "",
  tags: [],
  featured: false,
  best_seller: false,
  new_arrival: true,
  status: "published",
  rating: "4.5",
  review_count: "0",
  meta_title: "",
  meta_description: "",
  keywords: "",
};

const NON_COLOR_TAG_SUGGESTIONS = TEMPLATE_TAG_SUGGESTIONS.filter((t) => !isColorTag(t));

const EMPTY_MATERIAL = {
  case_type: "",
  material: "",
  price: "",
  sale_price: "",
  description: "",
  short_description: "",
  sku: "",
  stock: "10",
  status: "published",
  phone_models: [],
  inherit_models: true,
};

function caseTypeKey(slug) {
  return String(slug || "").trim().toLowerCase().replace(/-case$/, "");
}

function mergeColorAndOtherTags(colorTags, otherTags) {
  return [...colorTags, ...otherTags];
}

export default function AdminTemplateProducts() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("active");
  const [selected, setSelected] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [thumbnail, setThumbnail] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [preview, setPreview] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [caseTypes, setCaseTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandModels, setBrandModels] = useState([]);
  const [activeBrandName, setActiveBrandName] = useState("Apple");
  const [loadingModels, setLoadingModels] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState("");
  const [newBrandInput, setNewBrandInput] = useState("");
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [pendingMaterials, setPendingMaterials] = useState([]);
  const [materialSiblings, setMaterialSiblings] = useState([]);
  const [materialForm, setMaterialForm] = useState(EMPTY_MATERIAL);
  const [linkProductId, setLinkProductId] = useState("");
  const [linkTargets, setLinkTargets] = useState([]);
  const [materialSaving, setMaterialSaving] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [stagedDefaultCaseType, setStagedDefaultCaseType] = useState("");
  const [expandedStockIds, setExpandedStockIds] = useState(new Set());
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const toggleStockExpand = (id) => {
    setExpandedStockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenActionMenuId(null);
    };
    if (openActionMenuId) {
      window.addEventListener("click", handleGlobalClick);
      return () => window.removeEventListener("click", handleGlobalClick);
    }
  }, [openActionMenuId]);

  const updateSibling = (variantId, field, value) => {
    setMaterialSiblings((prev) =>
      prev.map((s) => {
        if (s.id !== variantId) return s;
        const updated = { ...s, [field]: value };
        if (field === "variant_inventory" && Array.isArray(value)) {
          updated.stock = String(value.reduce((acc, r) => acc + (r.is_out_of_stock ? 0 : Math.max(0, Number(r.stock_quantity) || 0)), 0));
        }
        return updated;
      })
    );
    if (editing && variantId === editing.id) {
      setForm((prev) => {
        const next = { ...prev };
        if (field === "price") next.price = String(value);
        else if (field === "sale_price") next.sale_price = value == null ? "" : String(value);
        else if (field === "stock") next.stock = String(value);
        else if (field === "sku") next.sku = String(value || "");
        else if (field === "material") next.material = String(value || "");
        else if (field === "description") next.description = String(value || "");
        else if (field === "compatibility") {
          next.compatibility = value;
          next.phone_models = [...new Set((value || []).flatMap((g) => g.models || []))];
        } else if (field === "phone_models") {
          next.phone_models = value;
        } else if (field === "variant_inventory") {
          next.variant_inventory = value;
          next.stock = String(value.reduce((acc, r) => acc + (r.is_out_of_stock ? 0 : Math.max(0, Number(r.stock_quantity) || 0)), 0));
        }
        return next;
      });
    }
  };

  const handleSetDefaultVariant = async (variant) => {
    if (!editing) return;
    if (variant.status !== "published") {
      toast.error("Cannot set a disabled or draft material as default. Please enable it first.");
      return;
    }
    if (variant.stock != null && Number(variant.stock) <= 0) {
      toast.error("Cannot set an out-of-stock material as default.");
      return;
    }

    setMaterialSaving(true);
    try {
      await api.post(`/admin/template-products/${editing.id}/default-variant/${variant.id}`);
      const cName = caseTypes.find((c) => c.slug === variant.case_type)?.name || variant.case_type;
      toast.success(`${cName} set as default storefront material`);
      await loadMaterialGroup(editing);
      load(data.page);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not set default material");
    } finally {
      setMaterialSaving(false);
    }
  };

  const saveSingleVariant = async (variant) => {
    if (!editing) return;
    const isCurrent = variant.id === editing.id;
    const p = Number(variant.price);
    if (!Number.isFinite(p) || p <= 0) {
      toast.error("Valid price greater than 0 is required");
      return;
    }
    setMaterialSaving(true);
    try {
      const cleanInventory = Array.isArray(variant.variant_inventory) ? variant.variant_inventory.map((row) => ({
        variant_id: row.variant_id,
        model_name: row.model_name,
        brand: row.brand || null,
        stock_quantity: Math.max(0, Math.floor(Number(row.stock_quantity) || 0)),
        is_out_of_stock: row.is_out_of_stock === true || Number(row.stock_quantity) <= 0,
        price: row.price != null && row.price !== "" ? Number(row.price) : null,
        sale_price: row.sale_price != null && row.sale_price !== "" ? Number(row.sale_price) : null,
      })) : undefined;

      await api.patch(`/admin/template-products/${editing.id}/material-variants/${variant.id}`, {
        price: p,
        sale_price: variant.sale_price === "" || variant.sale_price == null ? null : Number(variant.sale_price),
        stock: Math.max(0, parseInt(variant.stock, 10) || 0),
        sku: variant.sku || null,
        material: variant.material || "",
        description: variant.description || "",
        status: variant.status || "published",
        phone_models: Array.isArray(variant.phone_models) ? variant.phone_models : undefined,
        compatibility: Array.isArray(variant.compatibility) ? variant.compatibility : undefined,
        variant_inventory: cleanInventory,
      });
      const cName = caseTypes.find((c) => c.slug === variant.case_type)?.name || variant.case_type;
      toast.success(isCurrent ? `Primary material (${cName}) saved` : `Variant ${cName} saved`);
      setEditingVariantId(null);
      await loadMaterialGroup(editing);
      load(data.page);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save variant");
    } finally {
      setMaterialSaving(false);
    }
  };
  const [showBrandModelManager, setShowBrandModelManager] = useState(false);
  const thumbRef = useRef(null);
  const galleryRef = useRef(null);

  const isTrashView = viewMode === "trash";

  useEffect(() => {
    api
      .get("/case-types")
      .then((r) => setCaseTypes(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCaseTypes([]));
    api
      .get("/brands")
      .then((r) => setBrands(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBrands([]));
  }, []);

  const load = useCallback((p = 1) => {
    setLoading(true);
    const params = { page: p, limit: 20, status: statusFilter };
    if (search) params.search = search;
    if (typeFilter !== "all") params.product_type = typeFilter;
    if (viewMode === "trash") params.trash = "true";
    api
      .get("/admin/template-products", { params })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [statusFilter, search, typeFilter, viewMode]);

  useEffect(() => {
    const t = setTimeout(() => load(1), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const set = (k, v) => setForm({ ...form, [k]: v });

  useEffect(() => {
    const urls = gallery.map((f) => URL.createObjectURL(f));
    setGalleryPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [gallery]);

  const loadBrandModelsForBrand = useCallback(async (brandName, brandList = brands) => {
    const list = brandList && brandList.length ? brandList : brands;
    const matched = (list || []).find(
      (b) => b.name?.toLowerCase() === String(brandName || "").trim().toLowerCase()
    );
    if (!matched?.id) {
      setBrandModels([]);
      return [];
    }
    setLoadingModels(true);
    try {
      const res = await api.get("/models", { params: { brand_id: matched.id } });
      const mList = Array.isArray(res.data) ? res.data : [];
      setBrandModels(mList);
      return mList;
    } catch {
      setBrandModels([]);
      return [];
    } finally {
      setLoadingModels(false);
    }
  }, [brands]);

  const handleBrandSelect = async (nextBrandName) => {
    if (!nextBrandName) return;
    if (nextBrandName === "__add_new_brand__") {
      setBrandSearchQuery("");
      setNewBrandInput("");
      setShowAddBrandModal(true);
      return;
    }
    setActiveBrandName(nextBrandName);
    setForm((prev) => {
      const currentCompat = prev.compatibility || [];
      const exists = currentCompat.some(
        (g) => g.brand.toLowerCase() === nextBrandName.toLowerCase()
      );
      const nextCompat = exists
        ? currentCompat
        : [...currentCompat, { brand: nextBrandName, models: [] }];
      return {
        ...prev,
        phone_brand: nextBrandName,
        compatibility: nextCompat,
      };
    });
    await loadBrandModelsForBrand(nextBrandName);
  };

  const handleAddNewBrand = async (rawName) => {
    const trimmed = String(rawName || "").trim();
    if (!trimmed) {
      toast.error("Please enter a brand name");
      return null;
    }
    const existingInCatalog = brands.find(
      (b) => b.name?.toLowerCase() === trimmed.toLowerCase()
    );
    if (existingInCatalog) {
      await handleBrandSelect(existingInCatalog.name);
      setShowAddBrandModal(false);
      setNewBrandInput("");
      toast.info(`Selected existing brand "${existingInCatalog.name}"`);
      return existingInCatalog;
    }
    setCreatingBrand(true);
    try {
      const res = await api.post("/brands", { name: trimmed });
      const createdBrand = res.data;
      const nextBrands = [...brands, createdBrand].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
      setBrands(nextBrands);
      await handleBrandSelect(createdBrand.name);
      setShowAddBrandModal(false);
      setNewBrandInput("");
      toast.success(`Brand "${createdBrand.name}" created and added`);
      return createdBrand;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create brand in catalog");
      return null;
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleRemoveBrand = (brandToRemove) => {
    setForm((prev) => {
      const nextCompat = (prev.compatibility || []).filter(
        (g) => g.brand.toLowerCase() !== brandToRemove.toLowerCase()
      );
      const allModels = [...new Set(nextCompat.flatMap((g) => g.models))];
      let nextActive = activeBrandName;
      if (activeBrandName.toLowerCase() === brandToRemove.toLowerCase()) {
        nextActive = nextCompat[0]?.brand || brands[0]?.name || "Apple";
        loadBrandModelsForBrand(nextActive);
        setActiveBrandName(nextActive);
      }
      return {
        ...prev,
        compatibility: nextCompat,
        phone_brand: nextCompat[0]?.brand || nextActive,
        phone_models: allModels,
        variant_inventory: syncVariantRows(allModels, prev.variant_inventory, prev.stock),
      };
    });
  };

  const handleActiveBrandModelsChange = (updatedModels) => {
    setForm((prev) => {
      const currentCompat = prev.compatibility || [];
      const exists = currentCompat.some(
        (g) => g.brand.toLowerCase() === activeBrandName.toLowerCase()
      );
      const nextCompat = exists
        ? currentCompat.map((g) =>
            g.brand.toLowerCase() === activeBrandName.toLowerCase()
              ? { ...g, models: updatedModels }
              : g
          )
        : [...currentCompat, { brand: activeBrandName, models: updatedModels }];

      const allModels = [...new Set(nextCompat.flatMap((g) => g.models))];
      return {
        ...prev,
        compatibility: nextCompat,
        phone_models: allModels,
        variant_inventory: syncVariantRows(allModels, prev.variant_inventory, prev.stock),
      };
    });
  };

  const handleModelAdded = (newModel) => {
    if (!newModel?.name) return;
    setBrandModels((prev) => {
      if (prev.some((m) => m.id === newModel.id || m.name.toLowerCase() === newModel.name.toLowerCase())) {
        return prev;
      }
      return [...prev, newModel].sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const handleCatalogUpdated = async (affectedBrandId, affectedBrandName) => {
    try {
      const bRes = await api.get("/brands");
      const bList = Array.isArray(bRes.data) ? bRes.data : [];
      setBrands(bList);

      const targetBrand = affectedBrandName || activeBrandName || form.phone_brand;
      if (targetBrand) {
        await loadBrandModelsForBrand(targetBrand, bList);
      }
    } catch {
      // ignore
    }
  };

  const openCreate = async () => {
    const defaultBrand = brands[0]?.name || "Apple";
    setEditing(null);
    setActiveBrandName(defaultBrand);
    setForm({
      ...EMPTY,
      phone_brand: defaultBrand,
      compatibility: [{ brand: defaultBrand, models: [] }],
      case_type: caseTypes[0]?.slug || "",
      phone_models: [],
      variant_inventory: [],
    });
    setThumbnail(null);
    setGallery([]);
    setPreview(null);
    setExistingImages([]);
    setRemoveImages([]);
    setMaterialSiblings([]);
    setPendingMaterials([]);
    setStagedDefaultCaseType("");
    setEditingVariantId(null);
    setMaterialForm(EMPTY_MATERIAL);
    setLinkProductId("");
    setLinkTargets([]);
    setShowForm(true);
    await loadBrandModelsForBrand(defaultBrand);
  };

  const openEdit = async (item) => {
    setEditing(item);
    setPendingMaterials([]);
    setStagedDefaultCaseType("");
    setEditingVariantId(null);

    let initialCompat = [];
    if (Array.isArray(item.compatibility) && item.compatibility.length > 0) {
      initialCompat = item.compatibility.map((g) => ({
        brand: g.brand,
        models: Array.isArray(g.models) ? [...g.models] : [],
      }));
    } else {
      const itemBrand = item.phone_brand || brands[0]?.name || "Apple";
      const existingModels = Array.isArray(item.phone_models) ? [...item.phone_models] : [];
      initialCompat = [{ brand: itemBrand, models: existingModels }];
    }

    const currentBrand = initialCompat[0]?.brand || item.phone_brand || brands[0]?.name || "Apple";
    setActiveBrandName(currentBrand);

    const allModels = [...new Set(initialCompat.flatMap((g) => g.models))];

    setForm({
      title: displayTemplateTitle(item.title),
      slug: item.slug,
      description: item.description || "",
      short_description: item.short_description || "",
      product_type: normalizeProductType(item.product_type),
      phone_brand: currentBrand,
      compatibility: initialCompat,
      phone_models: allModels,
      category: item.category || "Minimal",
      collection: item.collection || "Essentials",
      case_type: item.case_type || caseTypes[0]?.slug || "",
      material: item.material || "",
      price: String(item.price),
      sale_price: item.sale_price != null ? String(item.sale_price) : "",
      stock: String(item.stock ?? 0),
      variant_inventory: (() => {
        const brandMap = {};
        (initialCompat || []).forEach((g) => {
          (g.models || []).forEach((m) => {
            brandMap[m] = g.brand;
          });
        });
        return syncVariantRows(
          allModels,
          item.variants?.length ? item.variants : item.variant_inventory,
          item.stock ?? 0,
          item.price ?? "",
          item.sale_price ?? "",
          brandMap
        );
      })(),
      sku: item.sku || "",
      tags: [...(item.tags || [])],
      featured: item.featured,
      best_seller: item.best_seller,
      new_arrival: item.new_arrival,
      status: item.status,
      rating: String(item.rating ?? 4.5),
      review_count: String(item.review_count ?? 0),
      meta_title: item.seo?.meta_title || "",
      meta_description: item.seo?.meta_description || "",
      keywords: item.seo?.keywords || "",
    });
    setThumbnail(null);
    setGallery([]);
    setPreview(resolveMediaUrl(item.thumbnail));
    setExistingImages(item.images || []);
    setRemoveImages([]);
    setMaterialForm(EMPTY_MATERIAL);
    setLinkProductId("");
    setShowForm(true);
    await loadBrandModelsForBrand(currentBrand);
    loadMaterialGroup(item);
  };

  const loadMaterialGroup = async (item) => {
    try {
      const [groupRes, listRes] = await Promise.all([
        api.get(`/admin/template-products/${item.id}/material-variants`),
        api.get("/admin/template-products", { params: { page: 1, limit: 100, status: "all" } }),
      ]);
      const rawSiblings = groupRes.data.items || [item];
      const brandMap = {};
      (item.compatibility || []).forEach((g) => {
        (g.models || []).forEach((m) => {
          brandMap[m] = g.brand;
        });
      });
      const siblings = rawSiblings.map((s) => {
        const sModels = Array.isArray(s.phone_models) && s.phone_models.length > 0
          ? s.phone_models
          : (Array.isArray(item.phone_models) ? item.phone_models : []);
        const sBrandMap = { ...brandMap };
        (s.compatibility || []).forEach((g) => {
          (g.models || []).forEach((m) => {
            sBrandMap[m] = g.brand;
          });
        });
        const inv = syncVariantRows(
          sModels,
          s.variants?.length ? s.variants : s.variant_inventory,
          s.stock ?? 0,
          s.price ?? "",
          s.sale_price ?? "",
          sBrandMap
        );
        return {
          ...s,
          variant_inventory: inv,
        };
      });
      setMaterialSiblings(siblings);

      const designCompat = getDesignCompatibility({ ...item, material_variants: siblings });
      if (designCompat.length > 0) {
        setForm((prev) => {
          const currentCompat = prev.compatibility || [];
          const merged = [...currentCompat];
          for (const group of designCompat) {
            const existingG = merged.find((g) => g.brand.toLowerCase() === group.brand.toLowerCase());
            if (!existingG) {
              merged.push({ brand: group.brand, models: [...group.models] });
            } else {
              for (const m of group.models) {
                if (!existingG.models.includes(m)) {
                  existingG.models.push(m);
                }
              }
            }
          }
          const allModels = [...new Set(merged.flatMap((g) => g.models))];
          return {
            ...prev,
            compatibility: merged,
            phone_models: allModels,
          };
        });
      }

      const groupedIds = new Set(siblings.map((row) => row.id));
      setLinkTargets(
        (listRes.data.items || []).filter((row) => (
          !groupedIds.has(row.id) && !row.design_id && !row.trashed_at
        ))
      );
    } catch {
      setMaterialSiblings([item]);
      setLinkTargets([]);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setMaterialSiblings([]);
    setPendingMaterials([]);
    setStagedDefaultCaseType("");
    setEditingVariantId(null);
    setMaterialForm(EMPTY_MATERIAL);
    setLinkProductId("");
    setLinkTargets([]);
    if (thumbRef.current) thumbRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const onThumbnailChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setThumbnail(f);
    setPreview(URL.createObjectURL(f));
  };

  const onGalleryChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setGallery((prev) => [...prev, ...files]);
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const removeExistingImage = (url) => {
    setExistingImages((prev) => {
      const next = prev.filter((u) => u !== url);
      if (!thumbnail && preview && resolveMediaUrl(url) === preview) {
        setPreview(next[0] ? resolveMediaUrl(next[0]) : null);
      }
      return next;
    });
    setRemoveImages((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };

  const removeNewGalleryFile = (index) => {
    setGallery((prev) => prev.filter((_, i) => i !== index));
  };

  const clearThumbnail = () => {
    setThumbnail(null);
    if (thumbRef.current) thumbRef.current.value = "";
    if (editing?.thumbnail && existingImages.includes(editing.thumbnail)) {
      removeExistingImage(editing.thumbnail);
      return;
    }
    if (editing?.thumbnail) {
      setPreview(resolveMediaUrl(editing.thumbnail));
      return;
    }
    setPreview(null);
  };

  const requestRemoveThumbnail = () => {
    if (!preview && !thumbnail) return;
    setConfirmAction({
      type: "removeThumbnail",
      message: "Remove the thumbnail image?",
      destructive: true,
    });
  };

  const requestRemoveExistingImage = (url) => {
    setConfirmAction({
      type: "removeGalleryExisting",
      url,
      message: "Remove this gallery image?",
      destructive: true,
    });
  };

  const requestRemoveNewGalleryFile = (index) => {
    setConfirmAction({
      type: "removeGalleryNew",
      index,
      message: "Remove this new image?",
      destructive: true,
    });
  };

  const buildFormData = () => {
    const fd = new FormData();
    const skip = new Set(["phone_models", "tags", "variant_inventory", "compatibility"]);
    Object.entries(form).forEach(([k, v]) => {
      if (skip.has(k)) return;
      if (typeof v === "boolean") fd.append(k, String(v));
      else if (Array.isArray(v)) return;
      else fd.append(k, v ?? "");
    });
    const groupsWithModels = (form.compatibility || []).filter((g) => g.models && g.models.length > 0);
    const finalCompat = groupsWithModels.length > 0 ? groupsWithModels : form.compatibility;
    fd.append("compatibility", JSON.stringify(finalCompat));
    fd.append("phone_brand", finalCompat[0]?.brand || form.phone_brand || "");
    fd.append("phone_models", JSON.stringify(form.phone_models));
    fd.append("tags", JSON.stringify(form.tags));
    fd.append("variant_inventory", JSON.stringify(
      (form.variant_inventory || []).map((row) => ({
        variant_id: row.variant_id,
        model_name: row.model_name,
        brand: row.brand || null,
        stock_quantity: Math.max(0, Math.floor(Number(row.stock_quantity) || 0)),
        is_out_of_stock: row.is_out_of_stock === true || Number(row.stock_quantity) <= 0,
        price: row.price != null && row.price !== "" ? Number(row.price) : null,
        sale_price: row.sale_price != null && row.sale_price !== "" ? Number(row.sale_price) : null,
      }))
    ));
    if (thumbnail) fd.append("thumbnail", thumbnail);
    gallery.forEach((f) => fd.append("gallery", f));
    if (removeImages.length) fd.append("remove_images", JSON.stringify(removeImages));

    if (!editing) {
      const isPrimaryDefault = !stagedDefaultCaseType || stagedDefaultCaseType === form.case_type;
      fd.append("is_default", String(isPrimaryDefault));
    }

    if (editing) {
      const otherVariants = materialSiblings
        .filter((s) => s.id !== editing.id && caseTypeKey(s.case_type) !== caseTypeKey(form.case_type))
        .map((v) => ({
          id: v.id || null,
          case_type: v.case_type,
          material: v.material || "",
          case_type_label: v.case_type_label || null,
          price: Number(v.price) || 0,
          sale_price: v.sale_price === "" || v.sale_price == null ? null : Number(v.sale_price),
          stock: Math.max(0, parseInt(v.stock, 10) || 0),
          sku: v.sku || null,
          description: v.description || "",
          status: v.status || "published",
          is_default: Boolean(v.is_default),
          phone_models: Array.isArray(v.phone_models) ? v.phone_models : [],
          compatibility: Array.isArray(v.compatibility) ? v.compatibility : [],
          variant_inventory: Array.isArray(v.variant_inventory) ? v.variant_inventory.map((row) => ({
            variant_id: row.variant_id,
            model_name: row.model_name,
            brand: row.brand || null,
            stock_quantity: Math.max(0, Math.floor(Number(row.stock_quantity) || 0)),
            is_out_of_stock: row.is_out_of_stock === true || Number(row.stock_quantity) <= 0,
            price: row.price != null && row.price !== "" ? Number(row.price) : null,
            sale_price: row.sale_price != null && row.sale_price !== "" ? Number(row.sale_price) : null,
          })) : undefined,
          thumbnail: v.thumbnail || null,
          images: Array.isArray(v.images) ? v.images : [],
        }));
      fd.append("material_variants", JSON.stringify(otherVariants));
    }

    return fd;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!editing && !thumbnail) {
      toast.error("Thumbnail image is required");
      return;
    }
    const totalModels = (form.compatibility || []).reduce((sum, g) => sum + (g.models?.length || 0), 0);
    if (totalModels === 0 && (!form.phone_models || form.phone_models.length === 0)) {
      toast.error("Please select at least one supported phone model");
      return;
    }
    const activeGroup = (form.compatibility || []).find(
      (g) => g.brand.toLowerCase() === activeBrandName.toLowerCase()
    );
    const validModelNames = new Set(brandModels.map((m) => m.name.toLowerCase()));
    if (brandModels.length > 0 && activeGroup?.models?.length > 0) {
      const invalid = activeGroup.models.filter((m) => !validModelNames.has(String(m).trim().toLowerCase()));
      if (invalid.length > 0) {
        toast.error(`The following models are not valid for ${activeBrandName}: ${invalid.join(", ")}`);
        return;
      }
    }
    setSaving(true);
    try {
      const fd = buildFormData();
      if (editing) {
        if (
          materialForm.case_type &&
          materialForm.price &&
          caseTypeKey(materialForm.case_type) !== caseTypeKey(form.case_type)
        ) {
          const currentRaw = fd.get("material_variants");
          const currentList = currentRaw ? JSON.parse(currentRaw) : [];
          if (!currentList.some((m) => caseTypeKey(m.case_type) === caseTypeKey(materialForm.case_type))) {
            currentList.push({
              case_type: materialForm.case_type,
              material: materialForm.material,
              price: Number(materialForm.price),
              sale_price: materialForm.sale_price ? Number(materialForm.sale_price) : null,
              stock: Math.max(0, parseInt(materialForm.stock, 10) || 0),
              sku: materialForm.sku || null,
              description: materialForm.description,
              status: materialForm.status || "published",
              phone_models: materialForm.inherit_models !== false ? [] : (materialForm.phone_models || []),
            });
            fd.set("material_variants", JSON.stringify(currentList));
          }
        }

        const res = await api.put(`/admin/template-products/${editing.id}`, fd);
        toast.success("Phone case and material variants updated");
        setMaterialForm(EMPTY_MATERIAL);
        if (res.data?.material_variants) {
          setMaterialSiblings(res.data.material_variants);
        }
        await loadMaterialGroup(res.data || editing);
        load(data.page);
        closeForm();
      } else {
        // Auto-stage in-progress material variant if filled
        let stagedList = [...pendingMaterials];
        if (materialForm.case_type && materialForm.price) {
          if (
            caseTypeKey(materialForm.case_type) !== caseTypeKey(form.case_type) &&
            !stagedList.some((m) => caseTypeKey(m.case_type) === caseTypeKey(materialForm.case_type))
          ) {
            const modelsToSave = materialForm.inherit_models !== false ? [] : (materialForm.phone_models || []);
            stagedList.push({ ...materialForm, phone_models: modelsToSave });
            setPendingMaterials(stagedList);
            setMaterialForm(EMPTY_MATERIAL);
          }
        } else if (materialForm.case_type && !materialForm.price) {
          setSaving(false);
          toast.error("Please enter a price for the additional material variant in progress, or clear it");
          return;
        }

        const createRes = await api.post("/admin/template-products", fd);
        const created = createRes.data;
        if (stagedList.length > 0 && created?.id) {
          const failedVariants = [];
          for (const mat of stagedList) {
            try {
              await api.post(`/admin/template-products/${created.id}/material-variants`, {
                case_type: mat.case_type,
                material: mat.material,
                price: Number(mat.price),
                sale_price: mat.sale_price === "" || mat.sale_price == null ? null : Number(mat.sale_price),
                description: mat.description,
                short_description: mat.short_description,
                sku: mat.sku,
                stock: mat.stock,
                status: mat.status || "published",
                is_default: mat.case_type === stagedDefaultCaseType,
                phone_models: Array.isArray(mat.phone_models) && mat.phone_models.length > 0 ? mat.phone_models : undefined,
                compatibility: Array.isArray(mat.compatibility) && mat.compatibility.length > 0 ? mat.compatibility : undefined,
                variant_inventory: Array.isArray(mat.variant_inventory) ? mat.variant_inventory : undefined,
              });
            } catch (err) {
              console.error("Failed to add staged material variant:", err);
              failedVariants.push({
                case_type: mat.case_type,
                error: err.response?.data?.detail || err.message || "Failed to create variant",
              });
            }
          }

          // Reload the saved product group from backend to confirm variants persisted
          try {
            const verifyRes = await api.get(`/admin/template-products/${created.id}/material-variants`);
            const verifiedItems = verifyRes.data?.items || [];
            if (failedVariants.length > 0) {
              toast.error(
                `Product created, but ${failedVariants.length} material variant(s) failed: ${failedVariants.map((f) => f.case_type).join(", ")}. Only ${verifiedItems.length} material(s) persisted.`
              );
            } else {
              toast.success(
                `Phone case and all ${verifiedItems.length - 1} material variant(s) created and verified`
              );
            }
          } catch {
            if (failedVariants.length > 0) {
              toast.error(`Variant creation failed: ${failedVariants.map((f) => f.case_type).join(", ")}`);
            } else {
              toast.success("Phone case created");
            }
          }
        } else {
          toast.success("Phone case created");
        }
      }
      closeForm();
      load(data.page);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const isVariantOut = (variant) =>
    variant?.is_out_of_stock === true || Number(variant?.stock_quantity) <= 0;

  const variantStockConfirmMessage = (modelName, markOut) =>
    markOut
      ? `Mark "${modelName}" out of stock? Shoppers will not be able to buy this model. Other models and this product page stay available.`
      : `Mark "${modelName}" back in stock? Shoppers will be able to buy this model again.`;

  const applyVariantOutOfStock = async (item, variant, markOut) => {
    try {
      const res = await api.patch(
        `/admin/template-products/${item.id}/variants/${encodeURIComponent(variant.variant_id)}`,
        { is_out_of_stock: markOut }
      );
      setData((prev) => ({
        ...prev,
        items: prev.items.map((row) => (row.id === item.id ? res.data : row)),
      }));
      toast.success(
        markOut
          ? `${variant.model_name} marked out of stock`
          : `${variant.model_name} is back in stock`
      );
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not update stock");
    }
  };

  const requestToggleVariantOutOfStock = (item, variant) => {
    const out = isVariantOut(variant);
    if (out && Number(variant.stock_quantity) <= 0) {
      toast.error(`Set a stock quantity above 0 for ${variant.model_name} before marking it in stock`);
      return;
    }
    setConfirmAction({
      type: "variantOos",
      item,
      variant,
      markOut: !out,
      confirmLabel: !out ? "Mark out of stock" : "Mark in stock",
      message: variantStockConfirmMessage(variant.model_name, !out),
    });
  };

  const requestToggleFormVariantStock = (index, row) => {
    const out = isVariantOut(row);
    if (out && Number(row.stock_quantity) <= 0) {
      toast.error(`Set a stock quantity above 0 for ${row.model_name} before marking it in stock`);
      return;
    }
    setConfirmAction({
      type: "formVariantOos",
      index,
      markOut: !out,
      confirmLabel: !out ? "Mark out of stock" : "Mark in stock",
      message: `${variantStockConfirmMessage(row.model_name, !out)} You still need to save this phone case.`,
    });
  };

  const applyMaterialGroup = (data, currentId = editing?.id) => {
    const items = data.items || [];
    setMaterialSiblings(items);
    const groupedIds = new Set(items.map((row) => row.id));
    setLinkTargets((prev) => prev.filter((row) => !groupedIds.has(row.id)));
    const current = items.find((row) => row.id === currentId);
    if (current) setEditing((prev) => (prev ? { ...prev, ...current } : current));
  };

  const addMaterialVariant = async () => {
    if (!editing) return;
    if (!materialForm.case_type || !materialForm.price) {
      toast.error("Choose a material and enter a price");
      return;
    }
    setMaterialSaving(true);
    try {
      const modelsToSave = materialForm.inherit_models !== false ? [] : (materialForm.phone_models || []);
      const compatToSave = materialForm.inherit_models !== false
        ? []
        : (materialForm.compatibility && materialForm.compatibility.length > 0
            ? materialForm.compatibility
            : (form.compatibility || []).map((g) => ({
                brand: g.brand,
                models: (g.models || []).filter((m) => modelsToSave.includes(m)),
              })).filter((g) => g.models.length > 0));

      const res = await api.post(`/admin/template-products/${editing.id}/material-variants`, {
        case_type: materialForm.case_type,
        material: materialForm.material,
        price: Number(materialForm.price),
        sale_price: materialForm.sale_price === "" || materialForm.sale_price == null ? null : Number(materialForm.sale_price),
        description: materialForm.description,
        short_description: materialForm.short_description,
        sku: materialForm.sku,
        stock: materialForm.stock,
        status: materialForm.status,
        phone_models: modelsToSave.length > 0 ? modelsToSave : undefined,
        compatibility: compatToSave.length > 0 ? compatToSave : undefined,
      });
      applyMaterialGroup(res.data);
      setMaterialForm(EMPTY_MATERIAL);
      toast.success("Material variant added");
      load(data.page);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not add material");
    } finally {
      setMaterialSaving(false);
    }
  };

  const stageMaterialVariant = () => {
    if (!materialForm.case_type || !materialForm.price) {
      toast.error("Choose a material and enter a price");
      return;
    }
    if (caseTypeKey(materialForm.case_type) === caseTypeKey(form.case_type)) {
      toast.error("This case type is already configured as the primary material above");
      return;
    }
    if (pendingMaterials.some((m) => caseTypeKey(m.case_type) === caseTypeKey(materialForm.case_type))) {
      toast.error("This material variant has already been added to staging");
      return;
    }
    const modelsToSave = materialForm.inherit_models !== false ? [] : (materialForm.phone_models || []);
    const compatToSave = materialForm.inherit_models !== false
      ? []
      : (materialForm.compatibility && materialForm.compatibility.length > 0
          ? materialForm.compatibility
          : (form.compatibility || []).map((g) => ({
              brand: g.brand,
              models: (g.models || []).filter((m) => modelsToSave.includes(m)),
            })).filter((g) => g.models.length > 0));

    setPendingMaterials((prev) => [
      ...prev,
      {
        ...materialForm,
        phone_models: modelsToSave,
        compatibility: compatToSave,
      },
    ]);
    setMaterialForm(EMPTY_MATERIAL);
    toast.success("Material variant staged. It will be created when you save this product.");
  };

  const removePendingMaterial = (idx) => {
    setPendingMaterials((prev) => prev.filter((_, i) => i !== idx));
  };

  const linkMaterial = async () => {
    if (!editing || !linkProductId) return;
    setMaterialSaving(true);
    try {
      const res = await api.post(`/admin/template-products/${editing.id}/link-design`, {
        product_id: linkProductId,
      });
      applyMaterialGroup(res.data);
      setLinkProductId("");
      toast.success("Existing product linked as a material");
      load(data.page);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not link product");
    } finally {
      setMaterialSaving(false);
    }
  };

  const unlinkMaterial = async (item) => {
    setMaterialSaving(true);
    try {
      await api.post(`/admin/template-products/${item.id}/unlink-design`);
      toast.success("Material unlinked from this design");
      if (editing) await loadMaterialGroup(editing);
      load(data.page);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not unlink material");
    } finally {
      setMaterialSaving(false);
    }
  };

  const toggleMaterialStatus = async (item) => {
    const nextStatus = item.status === "published" ? "draft" : "published";
    try {
      await api.patch(`/admin/template-products/${item.id}/status`, { status: nextStatus });
      toast.success(nextStatus === "published" ? "Material enabled" : "Material disabled");
      if (editing) await loadMaterialGroup(editing);
      load(data.page);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not update material");
    }
  };

  const updateVariantRow = (index, patch) => {
    setForm((current) => ({
      ...current,
      variant_inventory: current.variant_inventory.map((row, i) => (
        i === index ? { ...row, ...patch } : row
      )),
    }));
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === data.items.length) setSelected(new Set());
    else setSelected(new Set(data.items.map((i) => i.id)));
  };

  const bulk = async (action) => {
    if (!selected.size) return;
    if (action === "trash") {
      setConfirmAction({
        type: "bulk",
        bulkAction: "trash",
        message: `Move ${selected.size} phone case(s) to trash?`,
      });
      return;
    }
    if (action === "purge") {
      setConfirmAction({
        type: "bulk",
        bulkAction: "purge",
        message: `Permanently delete ${selected.size} phone case(s)? This cannot be undone.`,
        destructive: true,
      });
      return;
    }
    await api.post("/admin/template-products/bulk", {
      ids: [...selected],
      action,
    });
    toast.success("Bulk action completed");
    setSelected(new Set());
    load(data.page);
  };

  const requestToggleStatus = (item) => {
    const nextStatus = item.status === "published" ? "draft" : "published";
    const label = displayTemplateTitle(item.title);
    setConfirmAction({
      type: "status",
      item,
      nextStatus,
      message:
        nextStatus === "draft"
          ? `Unpublish "${label}"? It will be hidden from the shop.`
          : `Publish "${label}"? It will appear on the shop.`,
    });
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, item, nextStatus, url, index, bulkAction, variant, markOut } = confirmAction;
    setConfirmAction(null);
    try {
      if (type === "variantOos") {
        await applyVariantOutOfStock(item, variant, markOut);
      } else if (type === "formVariantOos") {
        updateVariantRow(index, { is_out_of_stock: markOut });
        toast.success(markOut ? "Marked out of stock — save to apply" : "Marked in stock — save to apply");
      } else if (type === "status") {
        await api.patch(`/admin/template-products/${item.id}/status`, { status: nextStatus });
        toast.success(nextStatus === "published" ? "Phone case published" : "Phone case unpublished");
        load(data.page);
      } else if (type === "trash") {
        await api.patch(`/admin/template-products/${item.id}/trash`);
        toast.success("Moved to trash");
        load(data.page);
      } else if (type === "purge") {
        await api.delete(`/admin/template-products/${item.id}`);
        toast.success("Permanently deleted");
        load(data.page);
      } else if (type === "restore") {
        await api.patch(`/admin/template-products/${item.id}/restore`);
        toast.success("Phone case restored");
        load(data.page);
      } else if (type === "feature") {
        await api.patch(`/admin/template-products/${item.id}/feature`, {
          featured: !item.featured,
        });
        toast.success(item.featured ? "Removed from featured" : "Added to featured");
        load(data.page);
      } else if (type === "bulk") {
        await api.post("/admin/template-products/bulk", {
          ids: [...selected],
          action: bulkAction,
        });
        const labels = {
          trash: "Moved to trash",
          purge: "Permanently deleted",
          restore: "Phone cases restored",
        };
        toast.success(labels[bulkAction] || "Bulk action completed");
        setSelected(new Set());
        load(data.page);
      } else if (type === "removeThumbnail") {
        clearThumbnail();
      } else if (type === "removeGalleryExisting") {
        removeExistingImage(url);
      } else if (type === "removeGalleryNew") {
        removeNewGalleryFile(index);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    }
  };

  const requestToggleFeature = (item) => {
    const label = displayTemplateTitle(item.title);
    if (!item.featured && item.status !== "published") {
      toast.error("Publish the phone case before featuring it on the homepage");
      return;
    }
    setConfirmAction({
      type: "feature",
      item,
      message: item.featured
        ? `Remove "${label}" from featured? It will disappear from the homepage slider.`
        : `Feature "${label}"? It will appear on the homepage slider.`,
    });
  };

  const requestMoveToTrash = (item) => {
    const label = displayTemplateTitle(item.title);
    setConfirmAction({
      type: "trash",
      item,
      message: `Move "${label}" to trash? You can restore it later from the Trash tab.`,
    });
  };

  const requestPermanentDelete = (item) => {
    const label = displayTemplateTitle(item.title);
    setConfirmAction({
      type: "purge",
      item,
      message: `Permanently delete "${label}"? This cannot be undone.`,
      destructive: true,
    });
  };

  const requestRestore = (item) => {
    const label = displayTemplateTitle(item.title);
    setConfirmAction({
      type: "restore",
      item,
      message: `Restore "${label}" to your product list?`,
    });
  };

  const duplicate = async (item) => {
    await api.post(`/admin/template-products/${item.id}/duplicate`);
    toast.success("Phone case duplicated");
    load(1);
  };

  const selectedBrandObj = brands.find(
    (b) => b.name?.toLowerCase() === String(activeBrandName || form.phone_brand || "").trim().toLowerCase()
  );
  const activeGroupModels = (form.compatibility || []).find(
    (g) => g.brand.toLowerCase() === activeBrandName.toLowerCase()
  )?.models || [];

  const configuredBrandKeys = new Set(
    (form.compatibility || []).map((g) => String(g.brand || "").trim().toLowerCase())
  );
  const availableCatalogBrands = brands.filter(
    (b) => !configuredBrandKeys.has(String(b.name || "").trim().toLowerCase())
  );
  const filteredCatalogBrands = brands.filter((b) => {
    if (!brandSearchQuery.trim()) return true;
    return (b.name || "").toLowerCase().includes(brandSearchQuery.trim().toLowerCase());
  });

  return (
    <div data-testid="admin-template-products">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="label-eyebrow">Catalog</div>
          <h1 className="font-display text-3xl mt-2">Phone Cases</h1>
          <p className="text-sm text-white/50 mt-2">
            Manage pre-designed phone cases for the shop.
          </p>
        </div>
        <button
          data-testid="add-template-product"
          onClick={openCreate}
          className="btn-primary flex items-center gap-2"
          disabled={isTrashView}
        >
          <Plus className="w-4 h-4" /> Add Phone Case
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5">
        <button
          type="button"
          onClick={() => { setViewMode("active"); setSelected(new Set()); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            viewMode === "active"
              ? "bg-brand text-white shadow-lg shadow-brand/20 ring-1 ring-white/20"
              : "glass-2 text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          <span>Active phone cases</span>
          {viewMode === "active" && data.total != null && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold">
              {data.total}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => { setViewMode("trash"); setSelected(new Set()); setStatusFilter("all"); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            viewMode === "trash"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/20 ring-1 ring-white/20"
              : "glass-2 text-white/60 hover:text-white hover:bg-white/10"
          }`}
          data-testid="trash-view-tab"
        >
          <Trash2 className="w-4 h-4" />
          <span>Trash</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass rounded-xl p-3 mb-5 border border-white/10 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, brand, or model…"
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/40"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!isTrashView && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand"
                data-testid="filter-product-type"
                aria-label="Filter by phone case type"
              >
                <option value="all">All case types</option>
                {TEMPLATE_PRODUCT_TYPES.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.label}</option>
                ))}
              </select>
            </>
          )}

          {(search || (!isTrashView && (statusFilter !== "all" || typeFilter !== "all"))) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setTypeFilter("all");
              }}
              className="text-xs text-white/50 hover:text-white px-2 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk selection action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-brand/10 border border-brand/30 mb-5 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-medium text-white">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span>{selected.size} phone {selected.size === 1 ? "case" : "cases"} selected</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isTrashView ? (
              <>
                <button
                  type="button"
                  onClick={() => bulk("restore")}
                  className="btn-secondary text-xs py-1.5 px-3 text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
                <button
                  type="button"
                  onClick={() => bulk("purge")}
                  className="btn-secondary text-xs py-1.5 px-3 text-red-400 hover:text-red-300 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete permanently</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => bulk("publish")}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Publish</span>
                </button>
                <button
                  type="button"
                  onClick={() => bulk("unpublish")}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Unpublish</span>
                </button>
                <button
                  type="button"
                  onClick={() => bulk("feature")}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span>Feature</span>
                </button>
                <button
                  type="button"
                  onClick={() => bulk("trash")}
                  className="btn-secondary text-xs py-1.5 px-3 text-red-400 hover:text-red-300 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Move to trash</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs text-white/50 hover:text-white px-2 py-1 ml-1"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Main Container: Desktop Table + Mobile Cards */}
      <div className="glass rounded-2xl overflow-hidden border border-white/10 shadow-xl">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45 bg-white/[0.02]">
                <th className="py-3.5 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selected.size === data.items.length && data.items.length > 0}
                    onChange={toggleAll}
                    aria-label="Select all phone cases"
                    className="rounded border-white/20 bg-white/5 cursor-pointer accent-[#6DB161]"
                  />
                </th>
                <th className="py-3.5 px-4 min-w-[220px]">Product</th>
                <th className="py-3.5 px-4 min-w-[130px]">Compatibility</th>
                <th className="py-3.5 px-4 min-w-[90px]">Price</th>
                <th className="py-3.5 px-4 min-w-[200px]">Stock & Models</th>
                <th className="py-3.5 px-4 min-w-[110px]">Status</th>
                <th className="py-3.5 px-4 min-w-[100px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-white/40">
                    <div className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                      <span>Loading phone cases…</span>
                    </div>
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-white/40">
                    <div className="space-y-3">
                      <p>{isTrashView ? "Trash is empty." : "No phone cases match your search or filter."}</p>
                      {!isTrashView && (
                        <button
                          type="button"
                          onClick={openCreate}
                          className="btn-primary text-xs py-1.5 px-4 inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Phone Case</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data.items.map((item) => {
                  const isSelected = selected.has(item.id);
                  const isExpanded = expandedStockIds.has(item.id);
                  const variants = item.variants || [];
                  const outCount = variants.filter(isVariantOut).length;
                  const visibleVariants = isExpanded || variants.length <= 2 ? variants : variants.slice(0, 2);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isSelected ? "bg-brand/[0.04]" : ""
                      }`}
                    >
                      {/* 1. Selection Checkbox */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          aria-label={`Select ${item.title}`}
                          className="rounded border-white/20 bg-white/5 cursor-pointer accent-[#6DB161]"
                        />
                      </td>

                      {/* 2. Product Info (Image + Title + Badges) */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveMediaUrl(item.thumbnail)}
                            alt=""
                            className="w-11 h-13 object-cover rounded-lg shrink-0 bg-white/5 border border-white/10 shadow-sm"
                            loading="lazy"
                          />
                          <div className="min-w-0 max-w-[220px] lg:max-w-[260px]">
                            <span
                              className="font-medium text-white text-sm truncate block hover:text-brand transition-colors cursor-pointer"
                              title={item.title}
                              onClick={() => openEdit(item)}
                            >
                              {displayTemplateTitle(item.title)}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-medium whitespace-nowrap">
                                {productTypeLabel(normalizeProductType(item.product_type))}
                              </span>
                              {item.category && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                                  {item.category}
                                </span>
                              )}
                              {item.design_id && (
                                <span className="text-[9px] font-mono uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-1.5 py-0.2 rounded">
                                  Linked
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Compatibility (Brands & Model Count) */}
                      <td className="py-3.5 px-4 align-middle text-xs">
                        <div className="text-white/90 font-medium">
                          {Array.isArray(item.compatibility) && item.compatibility.length > 0 ? (
                            item.compatibility.length > 2 ? (
                              <span title={item.compatibility.map((c) => c.brand).join(", ")}>
                                {item.compatibility.slice(0, 2).map((c) => c.brand).join(", ")}
                                <span className="text-white/40 text-[10px] ml-1 bg-white/10 px-1.5 py-0.5 rounded-full">
                                  +{item.compatibility.length - 2}
                                </span>
                              </span>
                            ) : (
                              item.compatibility.map((c) => c.brand).join(", ")
                            )
                          ) : (
                            item.phone_brand || "All"
                          )}
                        </div>
                        <div className="text-[11px] text-white/40 mt-0.5">
                          {variants.length > 0
                            ? `${variants.length} models`
                            : Array.isArray(item.phone_models) && item.phone_models.length > 0
                            ? `${item.phone_models.length} models`
                            : "Single model"}
                        </div>
                      </td>

                      {/* 4. Price */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-semibold text-white text-sm">
                          {formatPrice(item.sale_price || item.price)}
                        </div>
                        {item.sale_price != null && Number(item.sale_price) < Number(item.price) && (
                          <div className="text-[11px] text-white/40 line-through">
                            {formatPrice(item.price)}
                          </div>
                        )}
                      </td>

                      {/* 5. Stock & Model Availability Controls */}
                      <td className="py-3.5 px-4 align-middle">
                        {variants.length === 0 ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                              Number(item.stock) > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                            }`}>
                              {Number(item.stock) > 0 ? `${item.stock} in stock` : "Out of stock"}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-w-[210px]">
                            <div className="flex items-center justify-between gap-1 text-[11px]">
                              <span className={`font-medium ${outCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                {outCount === 0 ? "All in stock" : `${outCount} of ${variants.length} out`}
                              </span>
                              {variants.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => toggleStockExpand(item.id)}
                                  className="text-brand hover:underline inline-flex items-center gap-0.5 text-[10px] cursor-pointer"
                                  aria-expanded={isExpanded}
                                >
                                  {isExpanded ? "Collapse" : `+${variants.length - 2} more`}
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}
                            </div>

                            <ul className="space-y-1 pt-0.5">
                              {visibleVariants.map((variant) => {
                                const out = isVariantOut(variant);
                                return (
                                  <li
                                    key={variant.variant_id}
                                    className="flex items-center justify-between gap-2 p-1.5 rounded bg-white/[0.03] border border-white/5 text-[11px]"
                                  >
                                    <span className="min-w-0 truncate">
                                      <span className="block truncate text-white/80 font-medium">
                                        {variant.model_name}
                                      </span>
                                      <span className={`text-[10px] ${out ? "text-amber-400" : "text-emerald-400"}`}>
                                        {out ? "Out of stock" : `${variant.stock_quantity ?? 0} in stock`}
                                      </span>
                                    </span>
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={out}
                                      aria-label={`${out ? "Mark in stock" : "Mark out of stock"}: ${variant.model_name}`}
                                      title={out ? "Mark in stock" : "Mark out of stock"}
                                      data-testid={`variant-oos-toggle-${variant.variant_id}`}
                                      disabled={isTrashView}
                                      onClick={() => requestToggleVariantOutOfStock(item, variant)}
                                      className="shrink-0 disabled:opacity-40"
                                    >
                                      <StockSwitchKnob on={out} />
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </td>

                      {/* 6. Status & Featured Toggle */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          {isTrashView ? (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-medium">
                              Trashed
                            </span>
                          ) : (
                            <>
                              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                                item.status === "published"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-white/10 text-white/60 border border-white/10"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${item.status === "published" ? "bg-emerald-400 animate-pulse" : "bg-white/40"}`} />
                                <span className="capitalize">{item.status}</span>
                              </span>

                              <button
                                type="button"
                                onClick={() => requestToggleFeature(item)}
                                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                  item.featured ? "text-amber-400 hover:bg-amber-400/10" : "text-white/20 hover:text-white/60 hover:bg-white/5"
                                }`}
                                title={item.featured ? "Remove from featured" : "Add to featured"}
                                aria-label={item.featured ? "Remove from featured" : "Add to featured"}
                              >
                                <Star className={`w-4 h-4 ${item.featured ? "fill-current" : ""}`} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 7. Row Actions */}
                      <td className="py-3.5 px-4 align-middle text-right">
                        <div className="inline-flex items-center justify-end gap-1 relative">
                          {isTrashView ? (
                            <>
                              <button
                                type="button"
                                onClick={() => requestRestore(item)}
                                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                title="Restore"
                                aria-label="Restore"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => requestPermanentDelete(item)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Delete permanently"
                                aria-label="Delete permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                title="Edit"
                                aria-label="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setPreviewItem(item)}
                                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                title="Preview"
                                aria-label="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionMenuId(openActionMenuId === item.id ? null : item.id);
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    openActionMenuId === item.id ? "bg-white/20 text-white" : "text-white/50 hover:text-white hover:bg-white/10"
                                  }`}
                                  title="More actions"
                                  aria-label="More actions"
                                  aria-haspopup="true"
                                  aria-expanded={openActionMenuId === item.id}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {openActionMenuId === item.id && (
                                  <div
                                    className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl glass-2 border border-white/15 shadow-2xl py-1 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => { setOpenActionMenuId(null); duplicate(item); }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 text-left transition-colors cursor-pointer"
                                      title="Duplicate"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-white/60" />
                                      <span>Duplicate</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => { setOpenActionMenuId(null); requestToggleStatus(item); }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 text-left transition-colors cursor-pointer"
                                      title={item.status === "published" ? "Unpublish" : "Publish"}
                                    >
                                      {item.status === "published" ? (
                                        <>
                                          <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                                          <span>Unpublish</span>
                                        </>
                                      ) : (
                                        <>
                                          <Globe className="w-3.5 h-3.5 text-emerald-400" />
                                          <span>Publish</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => { setOpenActionMenuId(null); requestToggleFeature(item); }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 text-left transition-colors cursor-pointer"
                                      title={item.featured ? "Remove from featured" : "Add to featured"}
                                    >
                                      <Star className={`w-3.5 h-3.5 ${item.featured ? "text-amber-400 fill-current" : "text-white/60"}`} />
                                      <span>{item.featured ? "Unfeature" : "Feature"}</span>
                                    </button>

                                    <div className="my-1 border-t border-white/10" />

                                    <button
                                      type="button"
                                      onClick={() => { setOpenActionMenuId(null); requestMoveToTrash(item); }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/15 text-left transition-colors cursor-pointer"
                                      title="Move to trash"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Move to trash</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Responsive Mobile Cards View (< 768px) */}
        <div className="md:hidden divide-y divide-white/[0.06]">
          {loading ? (
            <div className="p-12 text-center text-white/40">
              <div className="inline-flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                <span>Loading phone cases…</span>
              </div>
            </div>
          ) : data.items.length === 0 ? (
            <div className="p-12 text-center text-white/40 space-y-3">
              <p>{isTrashView ? "Trash is empty." : "No phone cases found."}</p>
              {!isTrashView && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="btn-primary text-xs py-1.5 px-4 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Phone Case</span>
                </button>
              )}
            </div>
          ) : (
            data.items.map((item) => {
              const isSelected = selected.has(item.id);
              const isExpanded = expandedStockIds.has(item.id);
              const variants = item.variants || [];
              const outCount = variants.filter(isVariantOut).length;
              const visibleVariants = isExpanded ? variants : variants.slice(0, 1);

              return (
                <div
                  key={item.id}
                  className={`p-4 space-y-3 transition-colors ${isSelected ? "bg-brand/[0.04]" : ""}`}
                >
                  {/* Top row: Checkbox, Thumbnail, Title, Case Type, Status */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      aria-label={`Select ${item.title}`}
                      className="mt-1 rounded border-white/20 bg-white/5 cursor-pointer accent-[#6DB161]"
                    />
                    <img
                      src={resolveMediaUrl(item.thumbnail)}
                      alt=""
                      className="w-12 h-14 object-cover rounded-lg shrink-0 bg-white/5 border border-white/10"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-medium text-white text-sm truncate hover:text-brand cursor-pointer"
                        title={item.title}
                        onClick={() => openEdit(item)}
                      >
                        {displayTemplateTitle(item.title)}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-medium">
                          {productTypeLabel(normalizeProductType(item.product_type))}
                        </span>
                        {item.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                            {item.category}
                          </span>
                        )}
                        {item.design_id && (
                          <span className="text-[9px] font-mono uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-1 py-0.2 rounded">
                            Linked
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Status pill */}
                    <div className="shrink-0">
                      {isTrashView ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                          Trashed
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          item.status === "published"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-white/10 text-white/50"
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${item.status === "published" ? "bg-emerald-400" : "bg-white/40"}`} />
                          <span className="capitalize">{item.status}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2-Column Info: Price & Compatibility */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-white/5">
                    <div>
                      <span className="text-white/40 text-[10px] block">Price</span>
                      <span className="font-semibold text-white">
                        {formatPrice(item.sale_price || item.price)}
                      </span>
                      {item.sale_price != null && Number(item.sale_price) < Number(item.price) && (
                        <span className="text-[10px] text-white/40 line-through ml-1.5">
                          {formatPrice(item.price)}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-white/40 text-[10px] block">Compatibility</span>
                      <span className="text-white/80 truncate block font-medium">
                        {Array.isArray(item.compatibility) && item.compatibility.length > 0
                          ? item.compatibility.map((c) => c.brand).join(", ")
                          : item.phone_brand || "All"}
                      </span>
                    </div>
                  </div>

                  {/* Stock & Models */}
                  <div>
                    {variants.length === 0 ? (
                      <div className="text-xs text-white/60">
                        Stock: <span className="text-white font-medium">{item.stock}</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">
                            Models ({variants.length}) ·{" "}
                            <span className={outCount > 0 ? "text-amber-400" : "text-emerald-400"}>
                              {outCount > 0 ? `${outCount} out` : "All in stock"}
                            </span>
                          </span>
                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => toggleStockExpand(item.id)}
                              className="text-brand hover:underline text-[11px] flex items-center gap-0.5 cursor-pointer"
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? "Collapse" : `+${variants.length - 1} more`}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        <ul className="space-y-1">
                          {visibleVariants.map((variant) => {
                            const out = isVariantOut(variant);
                            return (
                              <li
                                key={variant.variant_id}
                                className="flex items-center justify-between text-xs p-1.5 rounded bg-white/[0.02] border border-white/5"
                              >
                                <span className="truncate pr-2">
                                  <span className="text-white/80 block truncate font-medium">{variant.model_name}</span>
                                  <span className={`text-[10px] ${out ? "text-amber-400" : "text-emerald-400"}`}>
                                    {out ? "Out of stock" : `${variant.stock_quantity ?? 0} in stock`}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={out}
                                  aria-label={`${out ? "Mark in stock" : "Mark out of stock"}: ${variant.model_name}`}
                                  title={out ? "Mark in stock" : "Mark out of stock"}
                                  data-testid={`variant-oos-toggle-${variant.variant_id}`}
                                  disabled={isTrashView}
                                  onClick={() => requestToggleVariantOutOfStock(item, variant)}
                                >
                                  <StockSwitchKnob on={out} />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    {!isTrashView ? (
                      <>
                        <button
                          type="button"
                          onClick={() => requestToggleFeature(item)}
                          className={`flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs cursor-pointer ${
                            item.featured ? "text-amber-400 bg-amber-400/10" : "text-white/40 hover:text-white"
                          }`}
                          title={item.featured ? "Remove from featured" : "Add to featured"}
                        >
                          <Star className={`w-3.5 h-3.5 ${item.featured ? "fill-current" : ""}`} />
                          <span>{item.featured ? "Featured" : "Feature"}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5 cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuId(openActionMenuId === item.id ? null : item.id);
                              }}
                              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                              title="More actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openActionMenuId === item.id && (
                              <div
                                className="absolute right-0 bottom-full mb-1 z-30 w-44 rounded-xl glass-2 border border-white/15 shadow-2xl py-1 text-xs backdrop-blur-xl"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => { setOpenActionMenuId(null); duplicate(item); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                                  title="Duplicate"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Duplicate</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setOpenActionMenuId(null); requestToggleStatus(item); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                                  title={item.status === "published" ? "Unpublish" : "Publish"}
                                >
                                  {item.status === "published" ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Globe className="w-3.5 h-3.5 text-emerald-400" />}
                                  <span>{item.status === "published" ? "Unpublish" : "Publish"}</span>
                                </button>
                                <div className="my-1 border-t border-white/10" />
                                <button
                                  type="button"
                                  onClick={() => { setOpenActionMenuId(null); requestMoveToTrash(item); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 cursor-pointer"
                                  title="Move to trash"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Move to trash</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-end gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => requestRestore(item)}
                          className="btn-secondary text-xs py-1 px-3 text-emerald-400 flex items-center gap-1.5 cursor-pointer"
                          title="Restore"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => requestPermanentDelete(item)}
                          className="btn-secondary text-xs py-1 px-3 text-red-400 flex items-center gap-1.5 cursor-pointer"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {data.pages > 1 && (
          <div className="p-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-white/60 bg-white/[0.01]">
            <div>
              Showing page <span className="text-white font-medium">{data.page}</span> of{" "}
              <span className="text-white font-medium">{data.pages}</span>
              {data.total ? ` (${data.total} total cases)` : ""}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => load(Math.max(1, data.page - 1))}
                disabled={data.page <= 1}
                className="px-2.5 py-1.5 rounded-lg glass-2 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => load(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    p === data.page
                      ? "bg-brand text-white shadow-md shadow-brand/20 font-bold"
                      : "glass-2 text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => load(Math.min(data.pages, data.page + 1))}
                disabled={data.page >= data.pages}
                className="px-2.5 py-1.5 rounded-lg glass-2 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {previewItem && (
        <TemplateQuickView
          item={previewItem}
          adminPreview
          onClose={() => setPreviewItem(null)}
        />
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[80] bg-black/70 grid place-items-center p-4" onClick={() => setConfirmAction(null)}>
          <div
            data-testid="template-status-confirm"
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-6 w-full max-w-md space-y-5"
          >
            <h2 className="font-display text-xl">Confirm</h2>
            <p className="text-white/70 text-sm break-words">{confirmAction.message}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="min-h-12 px-3 rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.04] inline-flex items-center justify-center text-sm whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmAction}
                className={`min-h-12 px-3 rounded-lg text-white inline-flex items-center justify-center text-sm whitespace-nowrap ${
                  confirmAction.destructive
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-brand-gradient bg-brand-gradient-hover text-white"
                }`}
              >
                {confirmAction.confirmLabel
                  || (confirmAction.destructive
                    ? (confirmAction.type === "purge" || confirmAction.bulkAction === "purge" ? "Delete forever" : "Delete")
                    : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeForm} />
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 glass rounded-2xl w-full max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-white/10"
            data-testid="template-product-form"
          >
            {/* Modal Sticky Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0c0e14]/90 backdrop-blur">
              <div>
                <span className="label-eyebrow text-brand">{editing ? "Catalog Editor" : "New Catalog Item"}</span>
                <h2 className="font-display text-xl sm:text-2xl text-white mt-0.5">
                  {editing ? "Edit Phone Case" : "Add Phone Case"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close"
                className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with independent scroll */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 custom-scrollbar">
              {/* Section 1: Product details */}
              <fieldset id="product-details-fields" className="rounded-xl border border-white/10 p-4 sm:p-5 bg-white/[0.02] space-y-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-brand flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Product details
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Product name" required>
                    <input
                      required
                      placeholder="e.g. Midnight Matte Case"
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                      className="form-field"
                    />
                  </Field>
                  <Field label="Slug" hint="Leave empty to auto-generate from the product name.">
                    <input
                      placeholder="auto-generated if empty"
                      value={form.slug}
                      onChange={(e) => set("slug", e.target.value)}
                      className="form-field"
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field
                      label="Phone case type"
                      required
                      hint="Customized cases show in the first shop row; original blank cases show in the second row and home slider."
                    >
                      <select
                        value={form.product_type}
                        onChange={(e) => set("product_type", e.target.value)}
                        className="form-field"
                        data-testid="product-type-select"
                      >
                        {TEMPLATE_PRODUCT_TYPES.map((t) => (
                          <option key={t.slug} value={t.slug}>{t.label}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Category">
                    <select value={form.category} onChange={(e) => set("category", e.target.value)} className="form-field">
                      {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Collection">
                    <select value={form.collection} onChange={(e) => set("collection", e.target.value)} className="form-field">
                      {TEMPLATE_COLLECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Description">
                      <textarea
                        placeholder="Full product description"
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        rows={3}
                        className="form-field"
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Short description">
                      <input
                        placeholder="Shown on cards and listings"
                        value={form.short_description}
                        onChange={(e) => set("short_description", e.target.value)}
                        className="form-field"
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2 space-y-4 pt-1 border-t border-white/5">
                    <LogoColorSelect
                      label="Logo & case colors"
                      value={partitionTags(form.tags).colors}
                      onChange={(colors) => {
                        const { other } = partitionTags(form.tags);
                        set("tags", mergeColorAndOtherTags(colors, other));
                      }}
                      hint="Choose a color or paste its hex code, then select Add color."
                      testId="phone-case-colors"
                    />
                    <TagSelect
                      label="Tags"
                      value={partitionTags(form.tags).other}
                      onChange={(other) => {
                        const { colors } = partitionTags(form.tags);
                        set("tags", mergeColorAndOtherTags(colors, other));
                      }}
                      suggestions={NON_COLOR_TAG_SUGGESTIONS}
                      placeholder="Type a tag and press Enter"
                      hint="Pick a quick suggestion or type your own tag."
                      testId="phone-case-tags"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Section 2: Compatible devices */}
              <fieldset className="rounded-xl border border-white/10 p-4 sm:p-5 bg-white/[0.02] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-brand flex items-center gap-1.5 float-none mb-0">
                    <Smartphone className="w-3.5 h-3.5" /> Compatible devices
                  </legend>
                  <button
                    type="button"
                    onClick={() => {
                      setBrandSearchQuery("");
                      setNewBrandInput("");
                      setShowAddBrandModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-brand/20 text-brand hover:bg-brand/30 transition-colors border border-brand/30"
                    data-testid="add-brand-header-btn"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add brand</span>
                  </button>
                </div>

                {/* Configured brands summary & tabs */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                    <span>Configured brand groups ({form.compatibility?.length || 0}):</span>
                    <span className="text-white/40">Total models selected: {form.phone_models?.length || 0}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2" data-testid="configured-brands-list">
                    {(form.compatibility || []).map((group) => {
                      const isActive = group.brand.toLowerCase() === activeBrandName.toLowerCase();
                      return (
                        <div
                          key={group.brand}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                            isActive
                              ? "border-brand bg-brand/10 text-white font-medium ring-1 ring-brand/30"
                              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                          onClick={() => handleBrandSelect(group.brand)}
                          data-testid={`brand-pill-${group.brand.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <span>{group.brand}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${isActive ? "bg-brand/20 text-brand" : "bg-white/10 text-white/50"}`}>
                            {group.models.length} {group.models.length === 1 ? "model" : "models"}
                          </span>
                          {(form.compatibility || []).length > 1 && (
                            <button
                              type="button"
                              title={`Remove ${group.brand}`}
                              className="p-0.5 rounded hover:bg-red-500/20 hover:text-red-300 text-white/40"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveBrand(group.brand);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        setBrandSearchQuery("");
                        setNewBrandInput("");
                        setShowAddBrandModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/20 bg-white/[0.03] text-xs text-white/70 hover:text-white hover:border-brand/50 hover:bg-white/[0.06] transition-colors"
                      data-testid="add-brand-pill"
                    >
                      <Plus className="w-3 h-3 text-brand" />
                      <span>Add brand</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Currently editing brand"
                    required
                    hint="Select or add a brand. Switching brands preserves existing brand and model selections."
                  >
                    <select
                      value={activeBrandName}
                      onChange={(e) => handleBrandSelect(e.target.value)}
                      className="form-field"
                      data-testid="phone-brand-select"
                    >
                      {(form.compatibility || []).length > 0 && (
                        <optgroup label="Configured for this product">
                          {(form.compatibility || []).map((g) => (
                            <option key={g.brand} value={g.brand}>
                              {g.brand} ({g.models?.length || 0} models)
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {availableCatalogBrands.length > 0 && (
                        <optgroup label="Add from catalog">
                          {availableCatalogBrands.map((b) => (
                            <option key={b.id || b.name} value={b.name}>
                              + {b.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="New brand">
                        <option value="__add_new_brand__">+ Add brand to catalog...</option>
                      </optgroup>
                    </select>
                  </Field>
                  <div className="flex items-end">
                    <div className="rounded-lg border border-white/10 p-2.5 bg-white/[0.02] w-full text-xs text-white/50 flex items-center justify-between">
                      <div>
                        Active: <span className="text-white font-medium">{activeBrandName || "None"}</span> · Models: <span className="text-brand font-medium">{brandModels.length}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBrandSearchQuery("");
                          setNewBrandInput("");
                          setShowAddBrandModal(true);
                        }}
                        className="text-brand hover:underline font-medium ml-2"
                        data-testid="add-brand-quick-link"
                      >
                        + Add brand
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <ModelMultiSelect
                      brandName={activeBrandName}
                      brandId={selectedBrandObj?.id}
                      models={brandModels}
                      value={activeGroupModels}
                      loading={loadingModels}
                      onManageClick={() => setShowBrandModelManager(true)}
                      onModelAdded={handleModelAdded}
                      onChange={handleActiveBrandModelsChange}
                      testId="phone-case-models"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Section 3: Materials */}
              <fieldset className="rounded-xl border border-white/10 p-4 sm:p-5 bg-white/[0.02] space-y-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-brand flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Materials
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Case type (Primary material)" required>
                    <select
                      required
                      value={form.case_type}
                      onChange={(e) => set("case_type", e.target.value)}
                      className="form-field"
                      data-testid="case-type-select"
                    >
                      <option value="" disabled>
                        {caseTypes.length ? "Select case type" : "No case types yet"}
                      </option>
                      {caseTypes.map((c) => (
                        <option key={c.id || c.slug} value={c.slug}>{c.name}</option>
                      ))}
                      {form.case_type && !caseTypes.some((c) => c.slug === form.case_type) && (
                        <option value={form.case_type}>{form.case_type}</option>
                      )}
                    </select>
                  </Field>
                  <Field label="Material spec">
                    <input placeholder="e.g. TPU, PC, Leather" value={form.material} onChange={(e) => set("material", e.target.value)} className="form-field" />
                  </Field>
                </div>
                {caseTypes.length === 0 && (
                  <p className="text-[11px] text-amber-400/80">
                    Add case types under Catalog → Case Types / Categories first.
                  </p>
                )}
                <div className="pt-2 border-t border-white/5">

            {editing ? (
              <fieldset className="space-y-4" data-testid="material-variants-admin">
                <legend className="label-eyebrow mb-2">Material variants</legend>
                <p className="text-[11px] text-white/35">
                  One shop listing is shown for this design. Each material keeps its own price, description, SKU, stock, and device compatibility. Existing product IDs are preserved.
                </p>

                <p className="text-[11px] text-white/50">
                  The primary material is <strong className="text-white">{caseTypes.find((c) => c.slug === form.case_type)?.name || form.case_type}</strong>. You can click <strong className="text-brand">Edit details</strong> on any material row below (including the primary material) to edit price, stock, description, and compatibility.
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/80">
                      All Configured Materials ({materialSiblings.length})
                    </span>
                    <span className="text-[11px] text-white/40">
                      Group ID: {editing.design_id || "Standalone"}
                    </span>
                  </div>
                  {materialSiblings.map((row) => {
                    const out = Number(row.stock) <= 0;
                    const isCurrent = row.id === editing.id;
                    const isDefault = Boolean(row.is_default || (!materialSiblings.some((s) => s.is_default) && isCurrent));
                    const hasCustomModels = Array.isArray(row.phone_models) && row.phone_models.length > 0;
                    const cName = caseTypes.find((c) => c.slug === row.case_type)?.name || row.case_type;
                    return (
                      <div key={row.id} className={`rounded-lg border px-3 py-2 space-y-1 ${isCurrent ? "border-brand/40 bg-brand/[0.03]" : "border-white/10 bg-white/[0.01]"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm truncate font-medium text-white">
                                {cName}
                                {row.material ? ` (${row.material})` : ""}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand/20 text-brand font-medium">
                                  Primary Material
                                </span>
                              )}
                              {isDefault && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-medium">
                                  Default (Storefront)
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] ${row.status !== "published" ? "text-amber-400" : out ? "text-amber-400" : "text-emerald-400"}`}>
                              {formatPrice(row.sale_price || row.price)} · {row.status === "published" ? (out ? "Out of stock" : `${row.stock} in stock`) : "Disabled"}
                              {row.sku ? ` · SKU: ${row.sku}` : ""}
                            </div>
                            <div className="text-[11px] text-white/45 mt-0.5">
                              {hasCustomModels
                                ? `Models (${row.phone_models.length}): ${row.phone_models.join(", ")}`
                                : `Inherits all design models (${form.phone_models.length})`}
                            </div>
                            {row.description && (
                              <p className="text-xs text-white/50 truncate mt-0.5">{row.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Set as default action */}
                            {isDefault ? (
                              <span className="text-[11px] text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10">
                                ✓ Default
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="text-[11px] text-white/60 hover:text-emerald-300 font-medium"
                                onClick={() => handleSetDefaultVariant(row)}
                                disabled={materialSaving}
                                data-testid={`set-default-btn-${row.id}`}
                              >
                                Set as default
                              </button>
                            )}

                            {/* Edit details action - available for ALL materials including primary */}
                            <button
                              type="button"
                              className="text-[11px] text-brand hover:text-brand-light font-medium"
                              onClick={() => setEditingVariantId(editingVariantId === row.id ? null : row.id)}
                              data-testid={`edit-variant-btn-${row.id}`}
                            >
                              {editingVariantId === row.id ? "Close" : "Edit details"}
                            </button>

                            <button
                              type="button"
                              className="text-[11px] text-white/60 hover:text-white"
                              onClick={() => toggleMaterialStatus(row)}
                            >
                              {row.status === "published" ? "Disable" : "Enable"}
                            </button>
                            {materialSiblings.length > 1 && !isCurrent && (
                              <button
                                type="button"
                                className="text-[11px] text-white/50 hover:text-red-300"
                                onClick={() => unlinkMaterial(row)}
                                disabled={materialSaving}
                              >
                                Unlink
                              </button>
                            )}
                          </div>
                        </div>

                        {editingVariantId === row.id && (
                          <div className="pt-3 border-t border-white/10 mt-2 space-y-3 bg-black/30 p-3 rounded-lg" data-testid={`edit-variant-panel-${row.id}`}>
                            {isCurrent && (
                              <div className="text-[11px] text-brand/90 bg-brand/10 px-2 py-1 rounded">
                                Editing Primary Material — updates made here sync with the Product Details fields above.
                              </div>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="text-[10px] text-white/50 block mb-1">Price (₹) *</label>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={row.price}
                                  onChange={(e) => updateSibling(row.id, "price", e.target.value)}
                                  className="form-field text-xs py-1"
                                  data-testid={`variant-price-input-${row.id}`}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-white/50 block mb-1">Sale price (₹)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={row.sale_price ?? ""}
                                  onChange={(e) => updateSibling(row.id, "sale_price", e.target.value)}
                                  className="form-field text-xs py-1"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-white/50 block mb-1">Stock</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={row.stock}
                                  onChange={(e) => updateSibling(row.id, "stock", e.target.value)}
                                  className="form-field text-xs py-1"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-white/50 block mb-1">SKU</label>
                                <input
                                  value={row.sku || ""}
                                  onChange={(e) => updateSibling(row.id, "sku", e.target.value)}
                                  className="form-field text-xs py-1"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-white/50 block mb-1">Material spec</label>
                                <input
                                  placeholder="e.g. 9H Tempered Glass"
                                  value={row.material || ""}
                                  onChange={(e) => updateSibling(row.id, "material", e.target.value)}
                                  className="form-field text-xs py-1"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-white/50 block mb-1">Description</label>
                                <input
                                  placeholder="Shown when this material is selected"
                                  value={row.description || ""}
                                  onChange={(e) => updateSibling(row.id, "description", e.target.value)}
                                  className="form-field text-xs py-1"
                                />
                              </div>
                            </div>

                            {/* Variant Compatibility Section */}
                            <div className="pt-2 border-t border-white/10 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                <label className="text-[11px] font-semibold text-white/80">Device Compatibility for this Material</label>
                                <div className="flex gap-3 text-xs">
                                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
                                    <input
                                      type="radio"
                                      name={`var_inherit_${row.id}`}
                                      checked={!row.has_custom_compatibility && (!row.compatibility || row.compatibility.length === 0)}
                                      onChange={() => {
                                        updateSibling(row.id, "has_custom_compatibility", false);
                                        updateSibling(row.id, "compatibility", []);
                                        updateSibling(row.id, "phone_models", []);
                                      }}
                                      className="accent-brand"
                                    />
                                    Inherit all design models ({form.phone_models?.length || 0})
                                  </label>
                                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
                                    <input
                                      type="radio"
                                      name={`var_inherit_${row.id}`}
                                      checked={Boolean(row.has_custom_compatibility || (Array.isArray(row.compatibility) && row.compatibility.length > 0))}
                                      onChange={() => {
                                        const initialCompat = (form.compatibility || []).map((g) => ({
                                          brand: g.brand,
                                          models: [...(g.models || [])],
                                        }));
                                        updateSibling(row.id, "has_custom_compatibility", true);
                                        updateSibling(row.id, "compatibility", initialCompat);
                                        updateSibling(row.id, "phone_models", [...new Set(initialCompat.flatMap((g) => g.models))]);
                                      }}
                                      className="accent-brand"
                                    />
                                    Custom model selection
                                  </label>
                                </div>
                              </div>

                              {(row.has_custom_compatibility || (Array.isArray(row.compatibility) && row.compatibility.length > 0)) && (
                                <div className="space-y-2 bg-black/40 p-2.5 rounded-lg border border-white/10 max-h-48 overflow-y-auto custom-scrollbar">
                                  {(form.compatibility || []).map((brandGroup) => {
                                    const brandName = brandGroup.brand;
                                    const currentGroup = (row.compatibility || []).find(
                                      (g) => g.brand.toLowerCase() === brandName.toLowerCase()
                                    );
                                    const selectedModels = currentGroup?.models || [];
                                    const isAllSelected = brandGroup.models.length > 0 && brandGroup.models.every((m) => selectedModels.includes(m));

                                    const toggleAllForBrand = () => {
                                      let nextCompat = [...(row.compatibility || [])];
                                      if (isAllSelected) {
                                        nextCompat = nextCompat.filter((g) => g.brand.toLowerCase() !== brandName.toLowerCase());
                                      } else {
                                        const idx = nextCompat.findIndex((g) => g.brand.toLowerCase() === brandName.toLowerCase());
                                        if (idx >= 0) {
                                          nextCompat[idx] = { brand: brandName, models: [...brandGroup.models] };
                                        } else {
                                          nextCompat.push({ brand: brandName, models: [...brandGroup.models] });
                                        }
                                      }
                                      const nextModels = [...new Set(nextCompat.flatMap((g) => g.models || []))];
                                      updateSibling(row.id, "compatibility", nextCompat);
                                      updateSibling(row.id, "phone_models", nextModels);
                                    };

                                    const toggleModel = (modelName) => {
                                      let nextCompat = [...(row.compatibility || [])];
                                      const idx = nextCompat.findIndex((g) => g.brand.toLowerCase() === brandName.toLowerCase());
                                      let bModels = idx >= 0 ? [...nextCompat[idx].models] : [];

                                      if (bModels.includes(modelName)) {
                                        bModels = bModels.filter((m) => m !== modelName);
                                      } else {
                                        bModels.push(modelName);
                                      }

                                      if (bModels.length === 0) {
                                        nextCompat = nextCompat.filter((g) => g.brand.toLowerCase() !== brandName.toLowerCase());
                                      } else if (idx >= 0) {
                                        nextCompat[idx] = { brand: brandName, models: bModels };
                                      } else {
                                        nextCompat.push({ brand: brandName, models: bModels });
                                      }

                                      const nextModels = [...new Set(nextCompat.flatMap((g) => g.models || []))];
                                      updateSibling(row.id, "compatibility", nextCompat);
                                      updateSibling(row.id, "phone_models", nextModels);
                                    };

                                    return (
                                      <div key={brandName} className="space-y-1 pb-2 border-b border-white/5 last:border-b-0">
                                        <div className="flex items-center justify-between text-xs font-medium text-white/90">
                                          <span>{brandName} <span className="text-[10px] text-white/50">({selectedModels.length}/{brandGroup.models.length})</span></span>
                                          <button
                                            type="button"
                                            onClick={toggleAllForBrand}
                                            className="text-[10px] text-brand hover:underline"
                                          >
                                            {isAllSelected ? "Deselect all" : "Select all"}
                                          </button>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
                                          {brandGroup.models.map((mName) => (
                                            <label key={mName} className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white cursor-pointer truncate">
                                              <input
                                                type="checkbox"
                                                checked={selectedModels.includes(mName)}
                                                onChange={() => toggleModel(mName)}
                                                className="accent-brand rounded"
                                              />
                                              <span className="truncate">{mName}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Per-model pricing & stock for this material variant */}
                            {(() => {
                              const rowCompat = Array.isArray(row.compatibility) && row.compatibility.length > 0 ? row.compatibility : form.compatibility;
                              const rowModels = Array.isArray(row.phone_models) && row.phone_models.length > 0 ? row.phone_models : form.phone_models;
                              const brandMap = {};
                              (rowCompat || []).forEach((g) => {
                                (g.models || []).forEach((m) => {
                                  brandMap[m] = g.brand;
                                });
                              });
                              const currentInv = syncVariantRows(
                                rowModels,
                                row.variants?.length ? row.variants : row.variant_inventory,
                                row.stock ?? 0,
                                row.price ?? "",
                                row.sale_price ?? "",
                                brandMap
                              );
                              if (!rowModels || rowModels.length === 0) return null;
                              return (
                                <div className="pt-2 border-t border-white/10 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-semibold text-white/80">
                                      Model-Specific Pricing & Stock
                                    </label>
                                    <span className="text-[10px] text-white/40">
                                      Total stock: {currentInv.reduce((acc, r) => acc + (r.is_out_of_stock ? 0 : (Number(r.stock_quantity) || 0)), 0)} units
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-white/40">
                                    Leave price blank to inherit this material's price (₹{row.price || "0"}).
                                  </p>
                                  <div className="grid grid-cols-[minmax(0,1.2fr)_5rem_5rem_4.5rem_auto] items-center gap-2 px-2 text-[9px] font-semibold uppercase tracking-wider text-white/40">
                                    <span>Model</span>
                                    <span className="text-center">Price (₹)</span>
                                    <span className="text-center">Sale (₹)</span>
                                    <span className="text-center">Stock</span>
                                    <span className="text-right">Out</span>
                                  </div>
                                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                                    {currentInv.map((mRow, mIdx) => {
                                      const out = isVariantOut(mRow);
                                      return (
                                        <div
                                          key={mRow.variant_id || mRow.model_name}
                                          className="grid grid-cols-[minmax(0,1.2fr)_5rem_5rem_4.5rem_auto] items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 bg-black/40"
                                        >
                                          <div className="min-w-0 overflow-hidden">
                                            <div className="flex items-center gap-1.5 truncate">
                                              {mRow.brand && (
                                                <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 shrink-0 font-medium">
                                                  {mRow.brand}
                                                </span>
                                              )}
                                              <span className="text-xs font-medium text-white truncate">{mRow.model_name}</span>
                                            </div>
                                            <div className={`text-[9px] ${out ? "text-amber-400" : "text-emerald-400"}`}>
                                              {out ? "Out of stock" : "In stock"}
                                            </div>
                                          </div>
                                          <div>
                                            <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              placeholder={row.price ? String(row.price) : "Base"}
                                              value={mRow.price ?? ""}
                                              onChange={(e) => {
                                                const next = [...currentInv];
                                                next[mIdx] = { ...next[mIdx], price: e.target.value };
                                                updateSibling(row.id, "variant_inventory", next);
                                              }}
                                              className="form-field !w-full min-w-0 text-center text-xs py-0.5"
                                              aria-label={`Price for ${mRow.model_name}`}
                                              data-testid={`variant-${row.id}-price-${mRow.variant_id || mIdx}`}
                                            />
                                          </div>
                                          <div>
                                            <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              placeholder="Sale"
                                              value={mRow.sale_price ?? ""}
                                              onChange={(e) => {
                                                const next = [...currentInv];
                                                next[mIdx] = { ...next[mIdx], sale_price: e.target.value };
                                                updateSibling(row.id, "variant_inventory", next);
                                              }}
                                              className="form-field !w-full min-w-0 text-center text-xs py-0.5"
                                              aria-label={`Sale price for ${mRow.model_name}`}
                                              data-testid={`variant-${row.id}-sale-${mRow.variant_id || mIdx}`}
                                            />
                                          </div>
                                          <div>
                                            <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              value={mRow.stock_quantity}
                                              onChange={(e) => {
                                                const next = [...currentInv];
                                                const qty = Number(e.target.value);
                                                next[mIdx] = {
                                                  ...next[mIdx],
                                                  stock_quantity: e.target.value,
                                                  is_out_of_stock: !Number.isFinite(qty) || qty <= 0,
                                                };
                                                updateSibling(row.id, "variant_inventory", next);
                                              }}
                                              className="form-field !w-full min-w-0 text-center text-xs py-0.5"
                                              aria-label={`Stock for ${mRow.model_name}`}
                                              data-testid={`variant-${row.id}-stock-${mRow.variant_id || mIdx}`}
                                            />
                                          </div>
                                          <div className="flex items-center gap-1.5 justify-self-end shrink-0">
                                            <button
                                              type="button"
                                              role="switch"
                                              aria-checked={out}
                                              aria-label={out ? `Mark ${mRow.model_name} in stock` : `Mark ${mRow.model_name} out of stock`}
                                              title={out ? "Mark in stock" : "Mark out of stock"}
                                              data-testid={`variant-${row.id}-oos-${mRow.variant_id || mIdx}`}
                                              onClick={() => {
                                                const next = [...currentInv];
                                                next[mIdx] = { ...next[mIdx], is_out_of_stock: !out };
                                                updateSibling(row.id, "variant_inventory", next);
                                              }}
                                            >
                                              <StockSwitchKnob on={out} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                className="btn-secondary text-xs py-1 px-3"
                                onClick={() => setEditingVariantId(null)}
                              >
                                Done
                              </button>
                              <button
                                type="button"
                                className="btn-primary text-xs py-1 px-3"
                                onClick={() => saveSingleVariant(row)}
                                disabled={materialSaving}
                              >
                                Save Variant
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-white/10 p-3.5 space-y-3 bg-white/[0.02]">
                  <div className="text-xs font-semibold text-white/80">Add another material variant to this design</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Add material">
                      <select
                        value={materialForm.case_type}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, case_type: e.target.value }))}
                        className="form-field"
                        data-testid="add-material-type"
                      >
                        <option value="">Select material</option>
                        {caseTypes
                          .filter((c) => !materialSiblings.some((row) => caseTypeKey(row.case_type) === caseTypeKey(c.slug)))
                          .map((c) => (
                            <option key={c.id || c.slug} value={c.slug}>{c.name}</option>
                          ))}
                      </select>
                    </Field>
                    <Field label="Price" required>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 499"
                        value={materialForm.price}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, price: e.target.value }))}
                        className="form-field"
                        data-testid="add-material-price"
                      />
                    </Field>
                    <Field label="Sale price">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Optional"
                        value={materialForm.sale_price}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, sale_price: e.target.value }))}
                        className="form-field"
                      />
                    </Field>
                    <Field label="Stock">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={materialForm.stock}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, stock: e.target.value }))}
                        className="form-field"
                      />
                    </Field>
                    <Field label="SKU">
                      <input
                        placeholder="Optional SKU"
                        value={materialForm.sku}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, sku: e.target.value }))}
                        className="form-field"
                      />
                    </Field>
                    <Field label="Material name">
                      <input
                        placeholder="e.g. Liquid Silicone"
                        value={materialForm.material}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, material: e.target.value }))}
                        className="form-field"
                      />
                    </Field>
                  </div>

                  {/* Model subset selection */}
                  {form.phone_models.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white/70 font-medium">Compatible Phone Models</label>
                        <span className="text-[11px] text-white/40">Optional restriction</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-white/80">
                          <input
                            type="radio"
                            name="edit_material_model_scope"
                            checked={materialForm.inherit_models !== false}
                            onChange={() => setMaterialForm((curr) => ({ ...curr, inherit_models: true, phone_models: [] }))}
                            className="accent-brand"
                          />
                          Inherit all design models ({form.phone_models.length})
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-white/80">
                          <input
                            type="radio"
                            name="edit_material_model_scope"
                            checked={materialForm.inherit_models === false}
                            onChange={() => setMaterialForm((curr) => ({ ...curr, inherit_models: false, phone_models: [...form.phone_models] }))}
                            className="accent-brand"
                          />
                          Specific model subset
                        </label>
                      </div>
                      {materialForm.inherit_models === false && (
                        <div className="space-y-2 bg-black/20 p-2.5 rounded-lg border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                          <div className="text-[11px] text-white/50 mb-1">Select which brands and models support this material:</div>
                          {(form.compatibility || []).map((brandGroup) => {
                            const bName = brandGroup.brand;
                            const bModels = brandGroup.models || [];
                            const selectedInBrand = (materialForm.phone_models || []).filter((m) => bModels.includes(m));
                            const allBrandSelected = bModels.length > 0 && bModels.every((m) => (materialForm.phone_models || []).includes(m));

                            const toggleAllBrand = () => {
                              let nextModels;
                              if (allBrandSelected) {
                                nextModels = (materialForm.phone_models || []).filter((m) => !bModels.includes(m));
                              } else {
                                nextModels = [...new Set([...(materialForm.phone_models || []), ...bModels])];
                              }
                              const nextCompat = (form.compatibility || []).map((g) => ({
                                brand: g.brand,
                                models: g.models.filter((m) => nextModels.includes(m)),
                              })).filter((g) => g.models.length > 0);
                              setMaterialForm((curr) => ({
                                ...curr,
                                phone_models: nextModels,
                                compatibility: nextCompat,
                              }));
                            };

                            const toggleSingle = (mName) => {
                              const nextModels = (materialForm.phone_models || []).includes(mName)
                                ? (materialForm.phone_models || []).filter((m) => m !== mName)
                                : [...(materialForm.phone_models || []), mName];
                              const nextCompat = (form.compatibility || []).map((g) => ({
                                brand: g.brand,
                                models: g.models.filter((m) => nextModels.includes(m)),
                              })).filter((g) => g.models.length > 0);
                              setMaterialForm((curr) => ({
                                ...curr,
                                phone_models: nextModels,
                                compatibility: nextCompat,
                              }));
                            };

                            return (
                              <div key={bName} className="space-y-1 pb-2 border-b border-white/5 last:border-b-0">
                                <div className="flex items-center justify-between text-xs font-medium text-white/90">
                                  <span>{bName} <span className="text-[10px] text-white/50">({selectedInBrand.length}/{bModels.length})</span></span>
                                  <button
                                    type="button"
                                    onClick={toggleAllBrand}
                                    className="text-[10px] text-brand hover:underline"
                                  >
                                    {allBrandSelected ? "Deselect all" : "Select all"}
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
                                  {bModels.map((mName) => (
                                    <label key={mName} className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white cursor-pointer truncate">
                                      <input
                                        type="checkbox"
                                        checked={(materialForm.phone_models || []).includes(mName)}
                                        onChange={() => toggleSingle(mName)}
                                        className="accent-brand rounded"
                                      />
                                      <span className="truncate">{mName}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <Field label="Material description">
                    <textarea
                      rows={2}
                      value={materialForm.description}
                      onChange={(e) => setMaterialForm((current) => ({ ...current, description: e.target.value }))}
                      className="form-field"
                      placeholder="Shown when this material is selected"
                    />
                  </Field>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-white/40">
                      Click to immediately add this variant to this design group.
                    </span>
                    <button
                      type="button"
                      onClick={addMaterialVariant}
                      disabled={materialSaving}
                      className="btn-secondary text-sm"
                      data-testid="add-material-submit"
                    >
                      {materialSaving ? "Saving…" : "+ Add Material Variant"}
                    </button>
                  </div>
                </div>

                {linkTargets.length > 0 && (
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                    <Field label="Link existing product">
                      <select
                        value={linkProductId}
                        onChange={(e) => setLinkProductId(e.target.value)}
                        className="form-field"
                      >
                        <option value="">Select a standalone product</option>
                        {linkTargets.map((row) => (
                          <option key={row.id} value={row.id}>
                            {displayTemplateTitle(row.title)} · {row.case_type}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <button
                      type="button"
                      onClick={linkMaterial}
                      disabled={materialSaving || !linkProductId}
                      className="btn-secondary text-sm mb-0.5"
                    >
                      Link
                    </button>
                  </div>
                )}
              </fieldset>
            ) : (
              <fieldset className="space-y-4" data-testid="material-variants-create">
                <legend className="label-eyebrow mb-2">Supported Case Materials</legend>
                <p className="text-[11px] text-white/40">
                  Configure additional materials for this design. The primary material is set above ({caseTypes.find((c) => c.slug === form.case_type)?.name || form.case_type || "None"}). Each material option retains its own price, stock, SKU, and description.
                </p>

                {/* Primary material indicator */}
                <div className="rounded-xl border border-brand/30 bg-brand/5 p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-brand text-black">
                        Primary Material
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {caseTypes.find((c) => c.slug === form.case_type)?.name || form.case_type || "None selected"}
                        {form.material ? ` (${form.material})` : ""}
                      </span>
                      {(!stagedDefaultCaseType || stagedDefaultCaseType === form.case_type) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-medium">
                          Default (Storefront)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {stagedDefaultCaseType && stagedDefaultCaseType !== form.case_type ? (
                        <button
                          type="button"
                          onClick={() => setStagedDefaultCaseType("")}
                          className="text-xs text-brand hover:underline font-medium"
                          data-testid="set-primary-default-btn"
                        >
                          Set as default
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-medium">✓ Default</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById("product-details-fields");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="text-xs text-white/50 hover:text-white underline"
                      >
                        Edit in Product Details ↑
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-white/70">
                    Price: <span className="text-brand font-medium">{form.price ? formatPrice(form.sale_price || form.price) : "Not set"}</span>
                    {form.sku ? ` · SKU: ${form.sku}` : ""}
                    {form.stock ? ` · ${form.stock} units` : ""}
                  </div>
                  <div className="text-[11px] text-white/40">
                    Configured in Product Details above. Inherits all {form.phone_models.length} selected phone model(s).
                  </div>
                </div>

                {/* Staged additional materials summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/80">
                      Additional Material Variants ({pendingMaterials.length})
                    </span>
                    <span className="text-[11px] text-white/40">
                      Total design materials: {1 + pendingMaterials.length}
                    </span>
                  </div>

                  {pendingMaterials.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 p-4 text-center space-y-1">
                      <p className="text-xs text-white/50">
                        No additional material variants staged yet.
                      </p>
                      <p className="text-[11px] text-white/35">
                        This design currently has 1 material ({caseTypes.find((c) => c.slug === form.case_type)?.name || form.case_type || "Matte"}). If you want shoppers to choose between materials (e.g. Matte, Silicone, Glass), configure and click <strong className="text-white/60">"+ Add Material Variant to Design"</strong> below.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingMaterials.map((mat, idx) => {
                        const ctName = caseTypes.find((c) => c.slug === mat.case_type)?.name || mat.case_type;
                        const out = Number(mat.stock) <= 0;
                        const isDefault = stagedDefaultCaseType === mat.case_type;
                        const hasCustomModels = Array.isArray(mat.phone_models) && mat.phone_models.length > 0;
                        return (
                          <div key={idx} className="rounded-lg border border-white/10 px-3 py-2 flex items-center justify-between gap-2 bg-white/[0.02]">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white truncate">{ctName}</span>
                                {mat.material && <span className="text-xs text-white/40">({mat.material})</span>}
                                {isDefault && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-medium">
                                    Default (Storefront)
                                  </span>
                                )}
                              </div>
                              <div className={`text-[11px] ${out ? "text-amber-400" : "text-emerald-400"}`}>
                                {formatPrice(mat.sale_price || mat.price)} · {out ? "Out of stock" : `${mat.stock || 0} in stock`}
                                {mat.sku ? ` · SKU: ${mat.sku}` : ""}
                              </div>
                              <div className="text-[11px] text-white/45 mt-0.5">
                                {hasCustomModels ? `Subset: ${mat.phone_models.join(", ")}` : `Inherits all design models (${form.phone_models.length})`}
                              </div>
                              {mat.description && (
                                <p className="text-xs text-white/50 truncate mt-0.5">{mat.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isDefault ? (
                                <span className="text-xs text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10">✓ Default</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (out) {
                                      toast.error("Cannot set an out-of-stock material as default");
                                      return;
                                    }
                                    setStagedDefaultCaseType(mat.case_type);
                                  }}
                                  className="text-xs text-white/60 hover:text-emerald-300 font-medium"
                                  data-testid={`set-staged-default-btn-${idx}`}
                                >
                                  Set as default
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (stagedDefaultCaseType === mat.case_type) {
                                    setStagedDefaultCaseType("");
                                  }
                                  removePendingMaterial(idx);
                                }}
                                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-500/20 hover:border-red-500/40"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 p-3.5 space-y-3 bg-white/[0.02]">
                  <div className="text-xs font-semibold text-white/80">Add another material variant</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Case material">
                      <select
                        value={materialForm.case_type}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, case_type: e.target.value }))}
                        className="form-field"
                        data-testid="add-staged-material-type"
                      >
                        <option value="">Select material</option>
                        {caseTypes
                          .filter(
                            (c) =>
                              caseTypeKey(c.slug) !== caseTypeKey(form.case_type) &&
                              !pendingMaterials.some((m) => caseTypeKey(m.case_type) === caseTypeKey(c.slug))
                          )
                          .map((c) => (
                            <option key={c.id || c.slug} value={c.slug}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label="Price" required>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 499"
                        value={materialForm.price}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, price: e.target.value }))}
                        className="form-field"
                        data-testid="add-staged-material-price"
                      />
                    </Field>
                    <Field label="Sale price">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Optional"
                        value={materialForm.sale_price}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, sale_price: e.target.value }))}
                        className="form-field"
                      />
                    </Field>
                    <Field label="Stock">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="10"
                        value={materialForm.stock}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, stock: e.target.value }))}
                        className="form-field"
                      />
                    </Field>
                    <Field label="SKU">
                      <input
                        placeholder="Optional SKU"
                        value={materialForm.sku}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, sku: e.target.value }))}
                        className="form-field"
                      />
                    </Field>
                    <Field label="Material name">
                      <input
                        placeholder="e.g. Liquid Silicone"
                        value={materialForm.material}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, material: e.target.value }))}
                        className="form-field"
                      />
                    </Field>
                  </div>

                  {/* Model subset selection */}
                  {form.phone_models.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white/70 font-medium">Compatible Phone Models</label>
                        <span className="text-[11px] text-white/40">Optional restriction</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-white/80">
                          <input
                            type="radio"
                            name="create_material_model_scope"
                            checked={materialForm.inherit_models !== false}
                            onChange={() => setMaterialForm((curr) => ({ ...curr, inherit_models: true, phone_models: [] }))}
                            className="accent-brand"
                          />
                          Inherit all design models ({form.phone_models.length})
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-white/80">
                          <input
                            type="radio"
                            name="create_material_model_scope"
                            checked={materialForm.inherit_models === false}
                            onChange={() => setMaterialForm((curr) => ({ ...curr, inherit_models: false, phone_models: [...form.phone_models] }))}
                            className="accent-brand"
                          />
                          Specific model subset
                        </label>
                      </div>
                      {materialForm.inherit_models === false && (
                        <div className="space-y-2 bg-black/20 p-2.5 rounded-lg border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                          <div className="text-[11px] text-white/50 mb-1">Select which brands and models support this material:</div>
                          {(form.compatibility || []).map((brandGroup) => {
                            const bName = brandGroup.brand;
                            const bModels = brandGroup.models || [];
                            const selectedInBrand = (materialForm.phone_models || []).filter((m) => bModels.includes(m));
                            const allBrandSelected = bModels.length > 0 && bModels.every((m) => (materialForm.phone_models || []).includes(m));

                            const toggleAllBrand = () => {
                              let nextModels;
                              if (allBrandSelected) {
                                nextModels = (materialForm.phone_models || []).filter((m) => !bModels.includes(m));
                              } else {
                                nextModels = [...new Set([...(materialForm.phone_models || []), ...bModels])];
                              }
                              const nextCompat = (form.compatibility || []).map((g) => ({
                                brand: g.brand,
                                models: g.models.filter((m) => nextModels.includes(m)),
                              })).filter((g) => g.models.length > 0);
                              setMaterialForm((curr) => ({
                                ...curr,
                                phone_models: nextModels,
                                compatibility: nextCompat,
                              }));
                            };

                            const toggleSingle = (mName) => {
                              const nextModels = (materialForm.phone_models || []).includes(mName)
                                ? (materialForm.phone_models || []).filter((m) => m !== mName)
                                : [...(materialForm.phone_models || []), mName];
                              const nextCompat = (form.compatibility || []).map((g) => ({
                                brand: g.brand,
                                models: g.models.filter((m) => nextModels.includes(m)),
                              })).filter((g) => g.models.length > 0);
                              setMaterialForm((curr) => ({
                                ...curr,
                                phone_models: nextModels,
                                compatibility: nextCompat,
                              }));
                            };

                            return (
                              <div key={bName} className="space-y-1 pb-2 border-b border-white/5 last:border-b-0">
                                <div className="flex items-center justify-between text-xs font-medium text-white/90">
                                  <span>{bName} <span className="text-[10px] text-white/50">({selectedInBrand.length}/{bModels.length})</span></span>
                                  <button
                                    type="button"
                                    onClick={toggleAllBrand}
                                    className="text-[10px] text-brand hover:underline"
                                  >
                                    {allBrandSelected ? "Deselect all" : "Select all"}
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
                                  {bModels.map((mName) => (
                                    <label key={mName} className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white cursor-pointer truncate">
                                      <input
                                        type="checkbox"
                                        checked={(materialForm.phone_models || []).includes(mName)}
                                        onChange={() => toggleSingle(mName)}
                                        className="accent-brand rounded"
                                      />
                                      <span className="truncate">{mName}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <Field label="Material description">
                    <textarea
                      rows={2}
                      value={materialForm.description}
                      onChange={(e) => setMaterialForm((current) => ({ ...current, description: e.target.value }))}
                      className="form-field"
                      placeholder="Shown when this material is selected"
                    />
                  </Field>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-white/40">
                      Click to stage this variant into the design.
                    </span>
                    <button
                      type="button"
                      onClick={stageMaterialVariant}
                      className="btn-secondary text-xs"
                      data-testid="stage-material-submit"
                    >
                      + Add Material Variant to Design
                    </button>
                  </div>
                </div>
              </fieldset>
            )}
                </div>
              </fieldset>

              {/* Section 4: Pricing & stock */}
              <fieldset className="rounded-xl border border-white/10 p-4 sm:p-5 bg-white/[0.02] space-y-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-brand flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Pricing & stock
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Regular price (₹)" required>
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      placeholder="399"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                      className="form-field"
                    />
                  </Field>
                  <Field label="Sale price (₹)">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Optional offer price"
                      value={form.sale_price}
                      onChange={(e) => set("sale_price", e.target.value)}
                      className="form-field"
                    />
                  </Field>
                  <Field label="SKU">
                    <input
                      placeholder="Stock keeping unit"
                      value={form.sku}
                      onChange={(e) => set("sku", e.target.value)}
                      className="form-field"
                    />
                  </Field>
                  {form.phone_models.length === 0 && (
                    <div className="sm:col-span-3">
                      <Field label="Stock quantity" hint="Used when this case has no phone models yet.">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={form.stock}
                          onChange={(e) => set("stock", e.target.value)}
                          className="form-field"
                          data-testid="stock-quantity"
                        />
                      </Field>
                    </div>
                  )}
                </div>

                {form.phone_models.length > 0 && (
                  <div data-testid="variant-stock-list" className="pt-2 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/80">Model-specific pricing & stock</span>
                      <span className="text-[11px] text-white/40">
                        Total stock: {form.variant_inventory.reduce((acc, r) => acc + (Number(r.stock_quantity) || 0), 0)} units
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40">
                      Configure independent pricing and stock per phone model. Leave price blank to inherit the material regular price (₹{form.price || "0"}).
                    </p>
                    <div className="grid grid-cols-[minmax(0,1.2fr)_5rem_5rem_4.5rem_auto] items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      <span>Model</span>
                      <span className="text-center">Price (₹)</span>
                      <span className="text-center">Sale (₹)</span>
                      <span className="text-center">Stock</span>
                      <span className="text-right">Out</span>
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                      {form.variant_inventory.map((row, index) => {
                        const out = isVariantOut(row);
                        return (
                          <div
                            key={row.variant_id || row.model_name}
                            className="grid grid-cols-[minmax(0,1.2fr)_5rem_5rem_4.5rem_auto] items-center gap-2 rounded-lg border border-white/10 px-3 py-2 bg-white/[0.01]"
                          >
                            <div className="min-w-0 overflow-hidden">
                              <div className="flex items-center gap-1.5 truncate">
                                {row.brand && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 shrink-0 font-medium">
                                    {row.brand}
                                  </span>
                                )}
                                <span className="text-xs font-medium text-white truncate">{row.model_name}</span>
                              </div>
                              <div className={`text-[10px] ${out ? "text-amber-400" : "text-emerald-400"}`}>
                                {out ? "Out of stock" : "In stock"}
                              </div>
                            </div>
                            <div>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder={form.price ? String(form.price) : "Base"}
                                value={row.price ?? ""}
                                onChange={(e) => updateVariantRow(index, { price: e.target.value })}
                                className="form-field !w-full min-w-0 text-center text-xs py-1"
                                aria-label={`Price for ${row.model_name}`}
                                data-testid={`variant-price-${row.variant_id || index}`}
                              />
                            </div>
                            <div>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="Sale"
                                value={row.sale_price ?? ""}
                                onChange={(e) => updateVariantRow(index, { sale_price: e.target.value })}
                                className="form-field !w-full min-w-0 text-center text-xs py-1"
                                aria-label={`Sale price for ${row.model_name}`}
                                data-testid={`variant-sale-${row.variant_id || index}`}
                              />
                            </div>
                            <div>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={row.stock_quantity}
                                onChange={(e) => {
                                  const stock_quantity = e.target.value;
                                  const qty = Number(stock_quantity);
                                  updateVariantRow(index, {
                                    stock_quantity,
                                    is_out_of_stock: !Number.isFinite(qty) || qty <= 0,
                                  });
                                }}
                                className="form-field !w-full min-w-0 text-center text-xs py-1"
                                aria-label={`Stock for ${row.model_name}`}
                                data-testid={`variant-stock-${row.variant_id || index}`}
                              />
                            </div>
                            <div className="flex items-center gap-1.5 justify-self-end shrink-0">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={out}
                                aria-label={out ? `Mark ${row.model_name} in stock` : `Mark ${row.model_name} out of stock`}
                                title={out ? "Mark in stock" : "Mark out of stock"}
                                data-testid={`variant-oos-${row.variant_id || index}`}
                                onClick={() => requestToggleFormVariantStock(index, row)}
                              >
                                <StockSwitchKnob on={out} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </fieldset>

              {/* Section 5: Media */}
              <fieldset className="rounded-xl border border-white/10 p-4 sm:p-5 bg-white/[0.02] space-y-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-brand flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5" /> Media
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs text-white/70 block mb-1 font-medium">Thumbnail image *</label>
                    <p className="text-[11px] text-white/35 mb-2">
                      Recommended: {TEMPLATE_THUMB_SPEC.width} × {TEMPLATE_THUMB_SPEC.height} px ({TEMPLATE_THUMB_SPEC.ratio}) · {TEMPLATE_THUMB_SPEC.formats} · max {TEMPLATE_THUMB_SPEC.maxSize}
                    </p>
                    {preview && (
                      <div className="relative inline-block mb-3">
                        <img src={preview} alt="" className="w-24 h-32 object-contain rounded-lg bg-[#0a0a0c] border border-white/10" />
                        <button
                          type="button"
                          onClick={requestRemoveThumbnail}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full grid place-items-center hover:bg-red-600 transition-colors shadow"
                          aria-label="Remove thumbnail"
                          title="Remove thumbnail"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <input
                      ref={thumbRef}
                      type="file"
                      accept="image/*"
                      onChange={onThumbnailChange}
                      className="text-xs text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:text-xs file:cursor-pointer hover:file:bg-white/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/70 block mb-1 font-medium">Gallery images</label>
                    <p className="text-[11px] text-white/35 mb-2">
                      Same size as thumbnail — {TEMPLATE_THUMB_SPEC.width} × {TEMPLATE_THUMB_SPEC.height} px ({TEMPLATE_THUMB_SPEC.ratio})
                    </p>
                    {(existingImages.length > 0 || galleryPreviews.length > 0) && (
                      <div className="flex flex-wrap gap-2 mb-3 max-h-36 overflow-y-auto p-1.5 rounded-lg border border-white/5 bg-black/20 custom-scrollbar">
                        {existingImages.map((url) => (
                          <div key={url} className="relative group">
                            <img src={resolveMediaUrl(url)} alt="" className="w-14 h-18 object-cover rounded border border-white/10" />
                            <button
                              type="button"
                              onClick={() => requestRemoveExistingImage(url)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full grid place-items-center hover:bg-red-600 transition-colors shadow opacity-80 group-hover:opacity-100"
                              aria-label="Remove image"
                              title="Remove image"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        {galleryPreviews.map((src, i) => (
                          <div key={src} className="relative group">
                            <img src={src} alt="" className="w-14 h-18 object-cover rounded ring-1 ring-brand/50" />
                            <button
                              type="button"
                              onClick={() => requestRemoveNewGalleryFile(i)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full grid place-items-center hover:bg-red-600 transition-colors shadow opacity-80 group-hover:opacity-100"
                              aria-label="Remove new image"
                              title="Remove new image"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input
                      ref={galleryRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onGalleryChange}
                      className="text-xs text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:text-xs file:cursor-pointer hover:file:bg-white/20"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Section 6: Visibility, Reviews & SEO */}
              <fieldset className="rounded-xl border border-white/10 p-4 sm:p-5 bg-white/[0.02] space-y-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-brand flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Visibility & SEO
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-xs text-white/50 block font-medium">Badges & Publishing</label>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {[
                        ["featured", "Featured"],
                        ["best_seller", "Best Seller"],
                        ["new_arrival", "New Arrival"],
                      ].map(([k, label]) => (
                        <label key={k} className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white">
                          <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} className="rounded border-white/20" />
                          <span>{label}</span>
                        </label>
                      ))}
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-white/50">Status:</span>
                        <select value={form.status} onChange={(e) => set("status", e.target.value)} className="form-field !w-auto !py-1 text-xs">
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <Field label="Rating (0 - 5)" hint="Shown on shop cards.">
                    <input type="number" min="0" max="5" step="0.1" placeholder="4.5" value={form.rating} onChange={(e) => set("rating", e.target.value)} className="form-field" />
                  </Field>
                  <Field label="Review count">
                    <input type="number" min="0" step="1" placeholder="0" value={form.review_count} onChange={(e) => set("review_count", e.target.value)} className="form-field" />
                  </Field>
                  <div className="md:col-span-2 pt-2 border-t border-white/5 space-y-3">
                    <Field label="Meta title">
                      <input placeholder="Search title" value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} className="form-field" />
                    </Field>
                    <Field label="Meta description">
                      <textarea placeholder="Search description" value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} rows={2} className="form-field" />
                    </Field>
                    <Field label="Keywords">
                      <input placeholder="Comma-separated keywords" value={form.keywords} onChange={(e) => set("keywords", e.target.value)} className="form-field" />
                    </Field>
                  </div>
                </div>
              </fieldset>
            </div>

            {/* Modal Sticky Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-[#0c0e14]/95 backdrop-blur flex items-center justify-end gap-3 shrink-0">
              <button type="button" onClick={closeForm} className="btn-secondary px-5 py-2 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-6 py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? "Saving…" : <><Check className="w-4 h-4" /> {editing ? "Save Changes" : "Create Phone Case"}</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="glass rounded-2xl w-full max-w-md p-6 border border-white/10 shadow-2xl space-y-5"
            data-testid="add-brand-modal"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg text-white">Add Compatible Brand</h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Choose from catalog or create a new brand
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBrandModal(false)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Catalog Brands section */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-white/70 block">
                Select from Brand Catalog
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search catalog brands…"
                  value={brandSearchQuery}
                  onChange={(e) => setBrandSearchQuery(e.target.value)}
                  className="form-field pl-9 text-xs py-2"
                  data-testid="brand-search-input"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {filteredCatalogBrands.length > 0 ? (
                  filteredCatalogBrands.map((b) => {
                    const isConfigured = configuredBrandKeys.has(String(b.name || "").trim().toLowerCase());
                    return (
                      <div
                        key={b.id || b.name}
                        onClick={() => {
                          handleBrandSelect(b.name);
                          setShowAddBrandModal(false);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isConfigured
                            ? "bg-brand/10 border border-brand/30 text-white"
                            : "bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 hover:text-white"
                        }`}
                        data-testid={`catalog-brand-item-${(b.name || "").toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <span className="font-medium">{b.name}</span>
                        {isConfigured ? (
                          <span className="text-[10px] text-brand bg-brand/20 px-2 py-0.5 rounded">
                            Configured
                          </span>
                        ) : (
                          <span className="text-[10px] text-white/40 hover:text-white">
                            + Select
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-xs text-white/40">
                    No matching brands in catalog
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3">
              <label className="text-xs font-medium text-white/70 block">
                Brand not in catalog? Add new brand
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Motorola, Nothing..."
                  value={newBrandInput}
                  onChange={(e) => setNewBrandInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNewBrand(newBrandInput);
                    }
                  }}
                  className="form-field text-xs py-2 flex-1"
                  data-testid="new-brand-input"
                />
                <button
                  type="button"
                  onClick={() => handleAddNewBrand(newBrandInput)}
                  disabled={creatingBrand || !newBrandInput.trim()}
                  className="btn-primary text-xs px-3 py-2 disabled:opacity-50 whitespace-nowrap"
                  data-testid="submit-new-brand-btn"
                >
                  {creatingBrand ? "Adding…" : "Add to Catalog"}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAddBrandModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <BrandModelManagerModal
        isOpen={showBrandModelManager}
        onClose={() => setShowBrandModelManager(false)}
        initialBrandName={activeBrandName || form.phone_brand}
        onCatalogUpdated={handleCatalogUpdated}
      />
    </div>
  );
}

function StockSwitchKnob({ on }) {
  return (
    <span
      className={`pointer-events-none relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-amber-500" : "bg-emerald-500/70"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </span>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="text-xs text-white/50 block mb-1">
        {label}{required ? " *" : ""}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-white/35 mt-1">{hint}</p> : null}
    </div>
  );
}
