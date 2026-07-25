import { api } from "./api";
import { startTemplateCheckout } from "./templateCheckout";

export async function resolveCatalogForTemplate(template) {
  const brandsRes = await api.get("/brands");
  const brand =
    brandsRes.data.find((b) => b.name === template.phone_brand) || brandsRes.data[0];
  if (!brand) throw new Error("No brands available");
  const modelsRes = await api.get("/models", { params: { brand_id: brand.id } });
  const modelName = template.phone_models?.[0];
  const model =
    modelsRes.data.find((m) => m.name === modelName) || modelsRes.data[0];
  if (!model) throw new Error("No models available");
  const productsRes = await api.get("/products", {
    params: { brand_id: brand.id, model_id: model.id },
  });
  const product =
    productsRes.data.find((p) => p.slug === template.case_type) || productsRes.data[0];
  if (!product) throw new Error("No products available");
  return { brand, model, product };
}

export function buildCartItem(template, { brand, model, product }) {
  const designUrl = template.thumbnail || template.images?.[0];
  const price = template.effective_price ?? template.sale_price ?? template.price;
  return {
    template_product: template,
    template_product_id: template.id,
    brand,
    model,
    product: { ...product, price },
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
