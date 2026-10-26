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
} from "../../constants/templateProducts";
import {
  Plus, Trash2, Pencil, Copy, Star, Eye, EyeOff, Globe, Search, X, Check, RotateCcw,
  Package, Smartphone, Layers, DollarSign, Image,
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
  const [loadingModels, setLoadingModels] = useState(false);
  const [pendingMaterials, setPendingMaterials] = useState([]);
  const [materialSiblings, setMaterialSiblings] = useState([]);
  const [materialForm, setMaterialForm] = useState(EMPTY_MATERIAL);
  const [linkProductId, setLinkProductId] = useState("");
  const [linkTargets, setLinkTargets] = useState([]);
  const [materialSaving, setMaterialSaving] = useState(false);
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

  const handleBrandChange = async (nextBrandName) => {
    setForm((prev) => ({
      ...prev,
      phone_brand: nextBrandName,
      phone_models: [],
      variant_inventory: [],
    }));
    await loadBrandModelsForBrand(nextBrandName);
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

      const targetBrand = affectedBrandName || form.phone_brand;
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
    setForm({
      ...EMPTY,
      phone_brand: defaultBrand,
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
    setMaterialForm(EMPTY_MATERIAL);
    setLinkProductId("");
    setLinkTargets([]);
    setShowForm(true);
    await loadBrandModelsForBrand(defaultBrand);
  };

  const openEdit = async (item) => {
    setEditing(item);
    setPendingMaterials([]);
    const itemBrand = item.phone_brand || brands[0]?.name || "Apple";
    const modelsForBrand = await loadBrandModelsForBrand(itemBrand);
    const validModelNames = new Set((modelsForBrand || []).map((m) => m.name.toLowerCase()));

    const existingModels = item.phone_models || [];
    const reconciledModels = modelsForBrand.length > 0
      ? existingModels.filter((m) => validModelNames.has(String(m).trim().toLowerCase()))
      : existingModels;

    setForm({
      title: displayTemplateTitle(item.title),
      slug: item.slug,
      description: item.description || "",
      short_description: item.short_description || "",
      product_type: normalizeProductType(item.product_type),
      phone_brand: itemBrand,
      phone_models: reconciledModels,
      category: item.category || "Minimal",
      collection: item.collection || "Essentials",
      case_type: item.case_type || caseTypes[0]?.slug || "",
      material: item.material || "",
      price: String(item.price),
      sale_price: item.sale_price != null ? String(item.sale_price) : "",
      stock: String(item.stock ?? 0),
      variant_inventory: syncVariantRows(
        reconciledModels,
        item.variants?.length ? item.variants : item.variant_inventory,
        item.stock ?? 0
      ),
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
    loadMaterialGroup(item);
  };

  const loadMaterialGroup = async (item) => {
    try {
      const [groupRes, listRes] = await Promise.all([
        api.get(`/admin/template-products/${item.id}/material-variants`),
        api.get("/admin/template-products", { params: { page: 1, limit: 100, status: "all" } }),
      ]);
      const siblings = groupRes.data.items || [item];
      setMaterialSiblings(siblings);
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
    const skip = new Set(["phone_models", "tags", "variant_inventory"]);
    Object.entries(form).forEach(([k, v]) => {
      if (skip.has(k)) return;
      if (typeof v === "boolean") fd.append(k, String(v));
      else if (Array.isArray(v)) return;
      else fd.append(k, v ?? "");
    });
    fd.append("phone_models", JSON.stringify(form.phone_models));
    fd.append("tags", JSON.stringify(form.tags));
    fd.append("variant_inventory", JSON.stringify(
      (form.variant_inventory || []).map((row) => ({
        variant_id: row.variant_id,
        model_name: row.model_name,
        stock_quantity: Math.max(0, Math.floor(Number(row.stock_quantity) || 0)),
        is_out_of_stock: row.is_out_of_stock === true || Number(row.stock_quantity) <= 0,
      }))
    ));
    if (thumbnail) fd.append("thumbnail", thumbnail);
    gallery.forEach((f) => fd.append("gallery", f));
    if (removeImages.length) fd.append("remove_images", JSON.stringify(removeImages));
    return fd;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!editing && !thumbnail) {
      toast.error("Thumbnail image is required");
      return;
    }
    if (!form.phone_models || form.phone_models.length === 0) {
      toast.error("Please select at least one supported phone model");
      return;
    }
    const validModelNames = new Set(brandModels.map((m) => m.name.toLowerCase()));
    if (brandModels.length > 0) {
      const invalid = form.phone_models.filter((m) => !validModelNames.has(String(m).trim().toLowerCase()));
      if (invalid.length > 0) {
        toast.error(`The following models are not valid for ${form.phone_brand}: ${invalid.join(", ")}`);
        return;
      }
    }
    setSaving(true);
    try {
      const fd = buildFormData();
      if (editing) {
        await api.put(`/admin/template-products/${editing.id}`, fd);
        toast.success("Phone case updated");
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
                phone_models: Array.isArray(mat.phone_models) && mat.phone_models.length > 0 ? mat.phone_models : undefined,
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
    setPendingMaterials((prev) => [
      ...prev,
      {
        ...materialForm,
        phone_models: modelsToSave,
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
    (b) => b.name?.toLowerCase() === String(form.phone_brand || "").trim().toLowerCase()
  );

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

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => { setViewMode("active"); setSelected(new Set()); }}
          className={`px-4 py-2 rounded-xl text-sm ${viewMode === "active" ? "bg-brand text-white" : "glass-2 text-white/60"}`}
        >
          Active phone cases
        </button>
        <button
          type="button"
          onClick={() => { setViewMode("trash"); setSelected(new Set()); setStatusFilter("all"); }}
          className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 ${viewMode === "trash" ? "bg-red-600 text-white" : "glass-2 text-white/60"}`}
          data-testid="trash-view-tab"
        >
          <Trash2 className="w-4 h-4" /> Trash
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone cases…"
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm"
          />
        </div>
        {!isTrashView && (
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm"
            >
              <option value="all">All status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm"
              data-testid="filter-product-type"
            >
              <option value="all">All phone case types</option>
              {TEMPLATE_PRODUCT_TYPES.map((t) => (
                <option key={t.slug} value={t.slug}>{t.label}</option>
              ))}
            </select>
          </>
        )}
        {selected.size > 0 && (
          <div className="flex gap-2">
            {isTrashView ? (
              <>
                <button onClick={() => bulk("restore")} className="btn-secondary text-xs py-2">Restore</button>
                <button onClick={() => bulk("purge")} className="btn-secondary text-xs py-2 text-red-400">Delete permanently</button>
              </>
            ) : (
              <>
                <button onClick={() => bulk("publish")} className="btn-secondary text-xs py-2">Publish</button>
                <button onClick={() => bulk("unpublish")} className="btn-secondary text-xs py-2">Unpublish</button>
                <button onClick={() => bulk("feature")} className="btn-secondary text-xs py-2">Feature</button>
                <button onClick={() => bulk("trash")} className="btn-secondary text-xs py-2 text-red-400">Move to trash</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/50">
                <th className="p-4 w-10">
                  <input type="checkbox" checked={selected.size === data.items.length && data.items.length > 0} onChange={toggleAll} />
                </th>
                <th className="p-4">Image</th>
                <th className="p-4">Title</th>
                <th className="p-4">Case Type</th>
                <th className="p-4">Brand</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Featured</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="p-8 text-center text-white/40">Loading…</td></tr>
              ) : data.items.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-white/40">{isTrashView ? "Trash is empty" : "No phone cases yet"}</td></tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-4">
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                    </td>
                    <td className="p-4">
                      <img
                        src={resolveMediaUrl(item.thumbnail)}
                        alt=""
                        className="w-10 h-12 object-cover rounded-lg"
                      />
                    </td>
                    <td className="p-4 font-medium max-w-[180px]" title={item.title}>
                      <span className="truncate block">{displayTemplateTitle(item.title)}</span>
                      {item.design_id && (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-brand/80">
                          Linked design
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-white/60 text-xs max-w-[120px]">
                      {productTypeLabel(normalizeProductType(item.product_type))}
                    </td>
                    <td className="p-4 text-white/60">{item.phone_brand}</td>
                    <td className="p-4 text-white/60">{item.category}</td>
                    <td className="p-4">{formatPrice(item.sale_price || item.price)}</td>
                    <td className="p-4 align-top">
                      {(item.variants || []).length === 0 ? (
                        item.stock
                      ) : (
                        <ul className="space-y-1.5 min-w-[180px]">
                          {item.variants.map((variant) => {
                            const out = isVariantOut(variant);
                            return (
                              <li key={variant.variant_id} className="flex items-center justify-between gap-2">
                                <span className="min-w-0">
                                  <span className="block truncate text-xs">{variant.model_name}</span>
                                  <span className={`text-[10px] ${out ? "text-amber-400" : "text-emerald-400"}`}>
                                    {out ? "Out of stock" : `${variant.stock_quantity} in stock`}
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
                      )}
                    </td>
                    <td className="p-4">
                      {isTrashView ? (
                        <span className="text-white/20">—</span>
                      ) : (
                        <button
                          onClick={() => requestToggleFeature(item)}
                          className={item.featured ? "text-brand" : "text-white/30"}
                          title={item.featured ? "Remove from featured" : "Add to featured"}
                        >
                          <Star className={`w-4 h-4 ${item.featured ? "fill-current" : ""}`} />
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      {isTrashView ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">trashed</span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.status === "published"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-white/10 text-white/50"
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {isTrashView ? (
                          <>
                            <button onClick={() => requestRestore(item)} className="p-1.5 rounded hover:bg-white/10 text-emerald-400" title="Restore">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => requestPermanentDelete(item)} className="p-1.5 rounded hover:bg-white/10 text-red-400" title="Delete permanently">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => requestMoveToTrash(item)} className="p-1.5 rounded hover:bg-white/10 text-red-400" title="Move to trash">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => requestToggleFeature(item)} className={`p-1.5 rounded hover:bg-white/10 ${item.featured ? "text-brand" : "text-white/50"}`} title={item.featured ? "Remove from featured" : "Add to featured"}>
                              <Star className={`w-3.5 h-3.5 ${item.featured ? "fill-current" : ""}`} />
                            </button>
                            <button onClick={() => setPreviewItem(item)} className="p-1.5 rounded hover:bg-white/10" title="Preview">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-white/10" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => duplicate(item)} className="p-1.5 rounded hover:bg-white/10" title="Duplicate">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => requestToggleStatus(item)} className="p-1.5 rounded hover:bg-white/10" title={item.status === "published" ? "Unpublish" : "Publish"}>
                              {item.status === "published" ? <EyeOff className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data.pages > 1 && (
          <div className="p-4 flex justify-center gap-2">
            {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => load(p)}
                className={`w-8 h-8 rounded text-xs ${p === data.page ? "bg-brand text-white" : "glass-2"}`}
              >
                {p}
              </button>
            ))}
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
              <fieldset className="rounded-xl border border-white/10 p-4 sm:p-5 bg-white/[0.02] space-y-4">
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
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-brand flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> Compatible devices
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Phone brand" required hint="Changing brand clears models to prevent mismatched device saves.">
                    <select
                      value={form.phone_brand}
                      onChange={(e) => handleBrandChange(e.target.value)}
                      className="form-field"
                      data-testid="phone-brand-select"
                    >
                      {brands.length > 0 ? (
                        brands.map((b) => (
                          <option key={b.id || b.name} value={b.name}>
                            {b.name}
                          </option>
                        ))
                      ) : (
                        TEMPLATE_PHONE_BRANDS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))
                      )}
                    </select>
                  </Field>
                  <div className="flex items-end">
                    <div className="rounded-lg border border-white/10 p-2.5 bg-white/[0.02] w-full text-xs text-white/50">
                      Active brand: <span className="text-white font-medium">{form.phone_brand || "None"}</span> · Catalog models: <span className="text-brand font-medium">{brandModels.length}</span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <ModelMultiSelect
                      brandName={form.phone_brand}
                      brandId={selectedBrandObj?.id}
                      models={brandModels}
                      value={form.phone_models}
                      loading={loadingModels}
                      onManageClick={() => setShowBrandModelManager(true)}
                      onModelAdded={handleModelAdded}
                      onChange={(phone_models) => {
                        setForm((current) => ({
                          ...current,
                          phone_models,
                          variant_inventory: syncVariantRows(
                            phone_models,
                            current.variant_inventory,
                            current.stock
                          ),
                        }));
                      }}
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

                {/* Primary/root material indicator */}
                <div className="rounded-xl border border-brand/30 bg-brand/5 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-brand text-black">
                        Primary Material
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {caseTypes.find((c) => c.slug === form.case_type)?.name || form.case_type || "None selected"}
                      </span>
                    </div>
                    <span className="text-xs text-white/50">Default storefront option</span>
                  </div>
                  <div className="text-xs text-white/70">
                    Price: <span className="text-brand font-medium">{form.price ? formatPrice(form.sale_price || form.price) : "Not set"}</span>
                    {form.sku ? ` · SKU: ${form.sku}` : ""}
                    {form.stock ? ` · ${form.stock} units` : ""}
                  </div>
                  <div className="text-[11px] text-white/40">
                    Inherits all {form.phone_models.length} selected phone model(s). Set above in Product Details.
                  </div>
                </div>

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
                    const hasCustomModels = Array.isArray(row.phone_models) && row.phone_models.length > 0;
                    return (
                      <div key={row.id} className={`rounded-lg border px-3 py-2 space-y-1 ${isCurrent ? "border-brand/40 bg-brand/[0.03]" : "border-white/10 bg-white/[0.01]"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm truncate font-medium text-white">
                                {caseTypes.find((c) => c.slug === row.case_type)?.name || row.case_type}
                                {row.material ? ` (${row.material})` : ""}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand/20 text-brand font-medium">
                                  Currently Editing
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
                            {!isCurrent && (
                              <button
                                type="button"
                                className="text-[11px] text-white/60 hover:text-white"
                                onClick={() => openEdit(row)}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              className="text-[11px] text-white/60 hover:text-white"
                              onClick={() => toggleMaterialStatus(row)}
                            >
                              {row.status === "published" ? "Disable" : "Enable"}
                            </button>
                            {materialSiblings.length > 1 && (
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
                        <div className="space-y-1.5 bg-black/20 p-2.5 rounded-lg border border-white/5 max-h-36 overflow-y-auto custom-scrollbar">
                          <div className="text-[11px] text-white/50 mb-1">Select which models support this material:</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {form.phone_models.map((mName) => {
                              const checked = (materialForm.phone_models || []).includes(mName);
                              return (
                                <label key={mName} className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white cursor-pointer truncate">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...(materialForm.phone_models || []), mName]
                                        : (materialForm.phone_models || []).filter((m) => m !== mName);
                                      setMaterialForm((curr) => ({ ...curr, phone_models: next }));
                                    }}
                                    className="accent-brand rounded"
                                  />
                                  <span className="truncate">{mName}</span>
                                </label>
                              );
                            })}
                          </div>
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
                <div className="rounded-xl border border-brand/30 bg-brand/5 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-brand text-black">
                        Primary Material
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {caseTypes.find((c) => c.slug === form.case_type)?.name || form.case_type || "None selected"}
                      </span>
                    </div>
                    <span className="text-xs text-white/50">Default storefront option</span>
                  </div>
                  <div className="text-xs text-white/70">
                    Price: <span className="text-brand font-medium">{form.price ? formatPrice(form.sale_price || form.price) : "Not set"}</span>
                    {form.sku ? ` · SKU: ${form.sku}` : ""}
                    {form.stock ? ` · ${form.stock} units` : ""}
                  </div>
                  <div className="text-[11px] text-white/40">
                    Inherits all {form.phone_models.length} selected phone model(s). Set above in Product Details.
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
                        const hasCustomModels = Array.isArray(mat.phone_models) && mat.phone_models.length > 0;
                        return (
                          <div key={idx} className="rounded-lg border border-white/10 px-3 py-2 flex items-center justify-between gap-2 bg-white/[0.02]">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white truncate">{ctName}</span>
                                {mat.material && <span className="text-xs text-white/40">({mat.material})</span>}
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
                            <button
                              type="button"
                              onClick={() => removePendingMaterial(idx)}
                              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-500/20 hover:border-red-500/40"
                            >
                              Remove
                            </button>
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
                        <div className="space-y-1.5 bg-black/20 p-2.5 rounded-lg border border-white/5 max-h-36 overflow-y-auto custom-scrollbar">
                          <div className="text-[11px] text-white/50 mb-1">Select which models support this material:</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {form.phone_models.map((mName) => {
                              const checked = (materialForm.phone_models || []).includes(mName);
                              return (
                                <label key={mName} className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white cursor-pointer truncate">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...(materialForm.phone_models || []), mName]
                                        : (materialForm.phone_models || []).filter((m) => m !== mName);
                                      setMaterialForm((curr) => ({ ...curr, phone_models: next }));
                                    }}
                                    className="accent-brand rounded"
                                  />
                                  <span className="truncate">{mName}</span>
                                </label>
                              );
                            })}
                          </div>
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
                      <span className="text-xs font-semibold text-white/80">Model-specific inventory</span>
                      <span className="text-[11px] text-white/40">
                        Total stock: {form.variant_inventory.reduce((acc, r) => acc + (Number(r.stock_quantity) || 0), 0)} units
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40">
                      Each phone model has its own stock. Setting one model to 0 or out of stock leaves the other models and this product page available.
                    </p>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      {form.variant_inventory.map((row, index) => {
                        const out = isVariantOut(row);
                        return (
                          <div
                            key={row.variant_id || row.model_name}
                            className="grid grid-cols-[minmax(0,1fr)_5rem_auto] items-center gap-3 rounded-lg border border-white/10 px-3 py-2 bg-white/[0.01]"
                          >
                            <div className="min-w-0 overflow-hidden">
                              <div className="text-xs font-medium text-white truncate">{row.model_name}</div>
                              <div className={`text-[11px] ${out ? "text-amber-400" : "text-emerald-400"}`}>
                                {out ? "Out of stock" : "In stock"}
                              </div>
                            </div>
                            <div className="min-w-0">
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
                                className="form-field !w-full min-w-0 max-w-full text-center text-xs py-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                aria-label={`Stock for ${row.model_name}`}
                                data-testid={`variant-stock-${row.variant_id || index}`}
                              />
                            </div>
                            <div className="flex items-center gap-2 justify-self-end shrink-0">
                              <span className="text-[11px] text-white/45 whitespace-nowrap">Out</span>
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

      <BrandModelManagerModal
        isOpen={showBrandModelManager}
        onClose={() => setShowBrandModelManager(false)}
        initialBrandName={form.phone_brand}
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
