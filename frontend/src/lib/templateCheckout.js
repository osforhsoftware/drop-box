import { replaceDraft } from "./draft";

/** Prepare session draft for checkout from a template product purchase. */
export function startTemplateCheckout({
  template,
  brand,
  model,
  product,
  mockupTemplateId = null,
  quantity = 1,
  price: explicitPrice,
}) {
  if (!brand?.id || !model?.id || !product?.id) {
    throw new Error("Selected device (brand, model) and case type are required");
  }

  const designUrl = template.thumbnail || template.images?.[0];
  const price = explicitPrice ?? product.price ?? template.effective_price ?? template.sale_price ?? template.price;
  const pricedProduct = { ...product, price };
  const line = {
    cart_id: crypto.randomUUID(),
    template_product: template,
    template_product_id: template.id,
    brand,
    model,
    product: pricedProduct,
    design_url: designUrl,
    preview_url: designUrl,
    design_transform: null,
    template_id: mockupTemplateId,
    quantity,
  };

  // Full replace — keep selected device at top-level AND in items[]
  // so checkout/order always use Brand + Model from "Select your device"
  return replaceDraft({
    source: "template_product",
    brand,
    model,
    product: pricedProduct,
    template_product: template,
    template_product_id: template.id,
    design_url: designUrl,
    preview_url: designUrl,
    design_transform: null,
    template_id: mockupTemplateId,
    items: [line],
  });
}
