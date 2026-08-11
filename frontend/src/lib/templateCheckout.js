import { setDraft } from "./draft";

/** Prepare session draft for checkout from a template product purchase. */
export function startTemplateCheckout({
  template,
  brand,
  model,
  product,
  mockupTemplateId = null,
  quantity = 1,
}) {
  const designUrl = template.thumbnail || template.images?.[0];
  const price = template.effective_price ?? template.sale_price ?? template.price;
  return setDraft({
    source: "template_product",
    items: [
      {
        cart_id: crypto.randomUUID(),
        template_product: template,
        template_product_id: template.id,
        brand,
        model,
        product: { ...product, price },
        design_url: designUrl,
        preview_url: designUrl,
        design_transform: null,
        template_id: mockupTemplateId,
        quantity,
      },
    ],
  });
}
