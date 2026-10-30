import { api } from "./api";
import { startTemplateCheckout } from "./templateCheckout";
import { isModelOutOfStock, productHasAvailableStock, getModelPrice } from "../constants/templateProducts";

export async function resolveCatalogForTemplate(template) {
  if (!productHasAvailableStock(template)) {
    throw new Error("This product is out of stock");
  }
  const brandsRes = await api.get("/brands");
  const allBrands = brandsRes.data || [];

  const compat = Array.isArray(template.compatibility) && template.compatibility.length > 0
    ? template.compatibility
    : (template.phone_brand ? [{ brand: template.phone_brand, models: template.phone_models || [] }] : []);

  let brand = null;
  let preferred = null;

  if (compat.length > 0) {
    for (const group of compat) {
      const match = allBrands.find(
        (b) => b.name?.toLowerCase() === group.brand?.toLowerCase() || b.id === group.brand
      );
      if (match) {
        brand = match;
        preferred = group.models?.[0];
        break;
      }
    }
  }
  if (!brand) {
    brand = allBrands.find((b) => b.name === template.phone_brand) || allBrands[0];
  }
  if (!brand) throw new Error("No brands available");

  const modelsRes = await api.get("/models", { params: { brand_id: brand.id } });
  if (!preferred) preferred = template.phone_models?.[0];
  if (preferred && isModelOutOfStock(template, preferred)) {
    throw new Error(`${preferred} is out of stock`);
  }
  const model = (preferred && modelsRes.data.find((entry) => entry.name === preferred))
    || modelsRes.data.find((entry) => !isModelOutOfStock(template, entry.name));
  if (!model) throw new Error("No models available");
  if (isModelOutOfStock(template, model.name)) {
    throw new Error(`${model.name} is out of stock`);
  }
  const productsRes = await api.get("/products", {
    params: { brand_id: brand.id, model_id: model.id },
  });
  const caseKey = String(template.case_type || "").replace(/-case$/, "");
  const product =
    productsRes.data.find((p) => p.slug === template.case_type)
    || productsRes.data.find((p) => String(p.slug || "").replace(/-case$/, "") === caseKey)
    || productsRes.data[0];
  if (!product) throw new Error("No products available");
  return { brand, model, product };
}

export function buildCartItem(template, { brand, model, product }) {
  const designUrl = template.thumbnail || template.images?.[0];
  const pricing = getModelPrice(template, model?.name);
  const price = pricing.effective_price;
  return {
    template_product: {
      ...template,
      price: pricing.price,
      sale_price: pricing.sale_price,
      effective_price: pricing.effective_price,
    },
    template_product_id: template.id,
    brand,
    model,
    product: { ...product, price },
    price,
    design_url: designUrl,
    preview_url: designUrl,
    quantity: 1,
  };
}

export async function checkoutTemplate(template, { user, navigate }) {
  const { brand, model, product } = await resolveCatalogForTemplate(template);
  startTemplateCheckout({ template, brand, model, product });
  if (!user) {
    navigate("/login?next=/checkout");
    return;
  }
  navigate("/checkout");
}
