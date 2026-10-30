import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { toast } from "sonner";

import { api, resolveMediaUrl } from "../lib/api";

import { getDraft, setDraft, replaceDraft } from "../lib/draft";

import { useAuth } from "../lib/auth";

import { SHIPPING_FEE } from "../constants/shipping";
import { formatPrice, materialLabel } from "../constants/templateProducts";
import { INDIAN_PHONE_LEN, PHONE_HINT, sanitizePhoneInput } from "../lib/phone";
import {
  collectErrors,
  hasErrors,
  validatePhone,
  validatePincode,
  validateRequired,
} from "../lib/formValidation";
import { fieldInputClass, FieldError } from "../components/FormField";
import IndianAddressFields from "../components/IndianAddressFields";

import { ArrowRight, User, Phone, X } from "lucide-react";



export default function Checkout() {

  const navigate = useNavigate();

  const { user, refreshUser } = useAuth();

  const draft = getDraft();

  const [form, setForm] = useState({

    customer_name: "", phone: "", email: "",
    house_no_flat: "", building_name: "", street: "", landmark: "",
    country: "", state: "", district: "", city_area: "", post_office: "",
    pincode: "", notes: "",

  });

  const [fieldErrors, setFieldErrors] = useState({});

  const [submitting, setSubmitting] = useState(false);

  const [promoInput, setPromoInput] = useState("");

  const [promo, setPromo] = useState(null);

  const [promoErr, setPromoErr] = useState("");

  const [applyingPromo, setApplyingPromo] = useState(false);



  useEffect(() => {

    if (!user) return;

    setForm((prev) => ({

      ...prev,

      customer_name: user.name || prev.customer_name,

      phone: user.phone || prev.phone,

      email: user.email || prev.email,

      house_no_flat: user.house_no_flat || user.address || prev.house_no_flat,
      building_name: user.building_name || prev.building_name,
      street: user.street || prev.street,
      landmark: user.landmark || prev.landmark,
      country: user.country || prev.country,
      state: user.state || prev.state,
      district: user.district || prev.district,
      city_area: user.city_area || prev.city_area,
      post_office: user.post_office || prev.post_office,
      pincode: user.pincode || prev.pincode,

    }));

  }, [user]);



  if (!draft.items && (!draft.brand || !draft.model || !draft.product || !draft.design_url)) {

    return (

      <div className="max-w-xl mx-auto px-6 py-20 text-center">

        <h2 className="font-display text-2xl">Your design is missing.</h2>

        <p className="text-white/60 mt-2">Browse the shop or start a custom design to continue.</p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button onClick={() => navigate("/shop")} className="btn-secondary">
            Browse templates
          </button>
          <button onClick={() => navigate("/customize")} className="btn-primary">
            Start designing
          </button>
        </div>

      </div>

    );

  }



  const set = (keyOrPatch, value) => {
    const patch = typeof keyOrPatch === "string" ? { [keyOrPatch]: value } : keyOrPatch;
    setForm((prev) => ({ ...prev, ...patch }));
    const changedKeys = Object.keys(patch);
    if (changedKeys.some((key) => fieldErrors[key])) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        changedKeys.forEach((key) => delete next[key]);
        return next;
      });
    }
  };



  const applyPromo = async () => {

    const code = promoInput.trim();

    if (!code) return;

    setPromoErr("");

    setApplyingPromo(true);

    try {
      const selection = isCart
        ? {
            items: draft.items.map((item) => ({
              brand_id: item.brand.id,
              model_id: item.model.id,
              product_id: item.product.id,
              template_product_id: item.template_product_id || null,
              quantity: item.quantity || 1,
            })),
          }
        : {
            brand_id: draft.brand.id,
            model_id: draft.model.id,
            product_id: draft.product.id,
            template_product_id: draft.template_product_id || null,
            quantity: 1,
          };
      const { data } = await api.post("/promo-codes/validate", { code, ...selection });

      setPromo(data);

      setPromoInput(data.code);

    } catch (e) {

      setPromo(null);

      setPromoErr(e.response?.data?.detail || "Invalid promo code");

    } finally {

      setApplyingPromo(false);

    }

  };



  const removePromo = () => {

    setPromo(null);

    setPromoInput("");

    setPromoErr("");

  };



  // Shop Buy Now uses source "template_product" with items; cart uses "cart".
  // Both must use items[] — never fall back to a stale top-level customize draft.
  const useItems =
    Array.isArray(draft.items) &&
    draft.items.length > 0 &&
    (draft.source === "cart" || draft.source === "template_product");
  const isCart = useItems;

  const unitPrice = isCart
    ? draft.items.reduce((acc, i) => acc + (i.product.price * i.quantity), 0)
    : (draft.template_product?.effective_price ??
       draft.template_product?.sale_price ??
       draft.template_product?.price ??
       draft.product?.price);

  const discountedSubtotal = promo ? promo.final_amount : unitPrice;
  const total = discountedSubtotal + SHIPPING_FEE;



  const submit = async (e) => {
    e.preventDefault();
    const errors = collectErrors({
      customer_name: validateRequired(form.customer_name, "Full name"),
      phone: validatePhone(form.phone),
      house_no_flat: validateRequired(form.house_no_flat, "House no. / Flat"),
      street: validateRequired(form.street, "Street / Road"),
      country: validateRequired(form.country, "Country"),
      state: validateRequired(form.state, "State"),
      district: validateRequired(form.district, "District"),
      city_area: validateRequired(form.city_area, "City / Area"),
      post_office: validateRequired(form.post_office, "Post office"),
      pincode: validatePincode(form.pincode),
    });
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      toast.error("Please fix the errors below");
      return;
    }

    setSubmitting(true);

    try {
      const session = await refreshUser();
      if (!session || session.role !== "customer") {
        toast.error("Please sign in with Google to place this order.");
        navigate(`/login?next=${encodeURIComponent("/checkout")}`);
        return;
      }

      const payload = {
        customer_name: form.customer_name,
        phone: form.phone,
        email: form.email || user?.email || null,
        house_no_flat: form.house_no_flat,
        building_name: form.building_name || null,
        street: form.street,
        landmark: form.landmark || null,
        country: form.country,
        state: form.state,
        district: form.district,
        city_area: form.city_area,
        post_office: form.post_office,
        pincode: form.pincode,
        notes: form.notes || null,
      };

      if (isCart) {
        // Multi-item order:
        // We'll pass the first item's details for backwards compatibility
        // And pass the full items array for the new backend implementation
        const firstItem = draft.items[0];

        Object.assign(payload, {
          brand_id: firstItem.brand.id,
          brand_name: firstItem.brand.name,
          model_id: firstItem.model.id,
          model_name: firstItem.model.name,
          product_id: firstItem.product.id,
          product_name: firstItem.product.name,
          design_url: firstItem.design_url,
          preview_url: firstItem.preview_url || null,
          design_transform: firstItem.design_transform || null,
          template_id: firstItem.template_id || null,
          template_product_id: firstItem.template_product_id || null,
          template_product_title: firstItem.template_product?.title || null,
          case_color: firstItem.case_color || null,
          case_type: firstItem.template_product?.case_type || firstItem.product?.slug || null,
          case_type_label: firstItem.template_product?.case_type_label || materialLabel(firstItem) || firstItem.product?.name || null,
          material: firstItem.template_product?.material || firstItem.product?.material || firstItem.template_product?.case_type_label || firstItem.product?.name || null,

          items: draft.items.map(i => ({
            template_product_id: i.template_product_id || null,
            template_product_title: i.template_product?.title || null,
            brand_id: i.brand.id,
            brand_name: i.brand.name,
            model_id: i.model.id,
            model_name: i.model.name,
            product_id: i.product.id,
            product_name: i.product.name,
            case_type: i.template_product?.case_type || i.product?.slug || null,
            case_type_label: i.template_product?.case_type_label || materialLabel(i) || i.product?.name || null,
            material: i.template_product?.material || i.product?.material || i.template_product?.case_type_label || i.product?.name || null,
            design_url: i.design_url,
            preview_url: i.preview_url || i.design_url,
            quantity: i.quantity || 1,
            price: i.product.price,
            design_transform: i.design_transform || null,
            template_id: i.template_id || null,
            case_color: i.case_color || null,
          }))
        });
      } else {
        // Single item checkout
        Object.assign(payload, {
          brand_id: draft.brand.id,
          brand_name: draft.brand.name,
          model_id: draft.model.id,
          model_name: draft.model.name,
          product_id: draft.product.id,
          product_name: draft.product.name,
          design_url: draft.design_url,
          preview_url: draft.preview_url || null,
          design_transform: draft.design_transform || null,
          template_id: draft.template_id || null,
          template_product_id: draft.template_product_id || null,
          template_product_title: draft.template_product?.title || null,
          case_color: draft.case_color || null,
          case_type: draft.template_product?.case_type || draft.product?.slug || null,
          case_type_label: draft.template_product?.case_type_label || materialLabel(draft) || draft.product?.name || null,
          material: draft.template_product?.material || draft.product?.material || draft.template_product?.case_type_label || draft.product?.name || null,
        });
      }

      if (promo?.code) payload.promo_code = promo.code;

      const { data } = await api.post("/orders", payload);

      await refreshUser();
      replaceDraft({ order: data, source: draft.source || "order" });
      navigate(`/payment/${data.order_id}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Order creation failed");
    } finally {
      setSubmitting(false);
    }
  };



  return (

    <div data-testid="checkout-page" className="max-w-6xl mx-auto px-6 lg:px-10 py-12">

      <div className="label-eyebrow">Checkout</div>

      <h1 className="font-display text-4xl lg:text-5xl mt-3 mb-10">Where should we send it?</h1>



      <div className="grid lg:grid-cols-3 gap-8">

        <form onSubmit={submit} className="lg:col-span-2 glass rounded-2xl p-8 space-y-5">

          <Field icon={User} label="Full name" testid="checkout-name"

            value={form.customer_name} onChange={(v) => set("customer_name", v)} error={fieldErrors.customer_name} />

          <div className="grid sm:grid-cols-2 gap-5">

            <PhoneField icon={Phone} label="Phone number" testid="checkout-phone"

              value={form.phone} onChange={(v) => set("phone", v)} error={fieldErrors.phone} />

            <Field label="Email" testid="checkout-email" type="email"

              value={form.email} onChange={(v) => set("email", v)} readOnly />

          </div>

          <IndianAddressFields
            prefix="checkout"
            value={form}
            onChange={set}
            errors={fieldErrors}
          />

          <Field label="Order notes (optional)" testid="checkout-notes"

            value={form.notes} onChange={(v) => set("notes", v)} textarea />

          <button data-testid="place-order-btn"

            disabled={submitting} type="submit"

            className="btn-primary w-full flex items-center justify-center gap-2"

          >

            {submitting ? "Placing order…" : "Continue to payment"} <ArrowRight className="w-4 h-4" />

          </button>

        </form>



        <aside className="glass rounded-2xl p-6 h-fit sticky top-24">
          <div className="label-eyebrow">Summary</div>
          <div className="mt-4 flex flex-col gap-4">
            {isCart ? (
              draft.items.map((item) => (
                <div key={item.cart_id} className="flex gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                  {item.preview_url ? (
                    <img src={resolveMediaUrl(item.preview_url)} alt="" className="w-16 h-24 object-cover rounded-lg border border-white/10 shrink-0" />
                  ) : (
                    <div className="w-16 h-24 bg-zinc-900 rounded-lg shrink-0" />
                  )}
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{item.template_product?.title || item.product.name}</div>
                    <div className="text-white/50 mt-1">
                      {materialLabel(item) ? `${materialLabel(item)} · ` : ""}
                      {item.brand?.name} · {item.model?.name}
                    </div>
                    <div className="text-white/40 mt-0.5">Qty: {item.quantity}</div>
                    <div className="mt-2 font-mono text-brand">₹{item.product.price * item.quantity}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex gap-4">
                {draft.preview_url ? (
                  <img src={resolveMediaUrl(draft.preview_url)} alt="" className="w-20 h-32 object-cover rounded-lg border border-white/10 shrink-0" />
                ) : (
                  <div className="w-20 h-32 bg-zinc-900 rounded-lg shrink-0" />
                )}
                <div className="flex-1 text-sm">
                  <div className="font-medium">{draft.template_product?.title || draft.product?.name}</div>
                  <div className="text-white/50 mt-1">
                    {materialLabel(draft) ? `${materialLabel(draft)} · ` : ""}
                    {draft.brand?.name} · {draft.model?.name}
                  </div>
                  <div className="mt-3 font-mono text-brand">₹{unitPrice}</div>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-white/10 mt-6 pt-4 space-y-3 text-sm">

            {!promo ? (

              <div>

                <div className="label-eyebrow mb-2">Promo code</div>

                <div className="flex gap-2">

                  <input

                    data-testid="promo-input"

                    value={promoInput}

                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}

                    placeholder="Enter code"

                    className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand font-mono text-sm"

                  />

                  <button

                    type="button"

                    data-testid="apply-promo"

                    onClick={applyPromo}

                    disabled={applyingPromo || !promoInput.trim()}

                    className="btn-secondary text-sm px-4"

                  >

                    {applyingPromo ? "…" : "Apply"}

                  </button>

                </div>

                {promoErr && <div className="text-red-400 text-xs mt-2" data-testid="promo-err">{promoErr}</div>}

              </div>

            ) : (

              <div className="flex items-center justify-between glass-2 rounded-lg px-3 py-2">

                <div>

                  <span className="font-mono text-brand">{promo.code}</span>

                  <span className="text-white/50 ml-2">−{promo.discount_percent}%</span>

                </div>

                <button type="button" onClick={removePromo} className="text-white/50 hover:text-white">

                  <X className="w-4 h-4" />

                </button>

              </div>

            )}

            <Row label="Subtotal" value={formatPrice(unitPrice)} />

            {promo && (

              <Row label={`Discount (${promo.discount_percent}%)`} value={`-₹${promo.discount_amount}`} accent />

            )}

            <Row label="Shipping" value={formatPrice(SHIPPING_FEE)} />

            <div className="border-t border-white/10 my-2" />

            <Row label="Total" value={formatPrice(total)} bold />

          </div>

        </aside>

      </div>

    </div>

  );

}

function PhoneField({ icon: Icon, label, value, onChange, testid, error }) {

  return (

    <div>

      <label className="label-eyebrow block mb-2 flex items-center gap-2">

        {Icon && <Icon className="w-3.5 h-3.5" />}{label}

      </label>

      <input

        data-testid={testid}

        type="tel"

        inputMode="numeric"

        autoComplete="tel-national"

        maxLength={INDIAN_PHONE_LEN}

        value={value}

        onChange={(e) => onChange(sanitizePhoneInput(e.target.value))}

        className={fieldInputClass(error)}

      />

      {error ? (
        <FieldError error={error} />
      ) : (
        <p className="text-white/40 text-xs mt-1">{PHONE_HINT}</p>
      )}

    </div>

  );

}



function Field({ icon: Icon, label, value, onChange, type = "text", textarea, testid, readOnly, error }) {

  const cls = fieldInputClass(error, readOnly ? "opacity-70 cursor-not-allowed" : "");

  return (

    <div>

      <label className="label-eyebrow block mb-2 flex items-center gap-2">

        {Icon && <Icon className="w-3.5 h-3.5" />}{label}

      </label>

      {textarea ? (

        <textarea data-testid={testid}

          value={value} onChange={(e) => onChange(e.target.value)} rows={3}

          className={cls}

        />

      ) : (

        <input data-testid={testid} type={type} readOnly={readOnly}

          value={value} onChange={(e) => onChange(e.target.value)}

          className={cls}

        />

      )}

      <FieldError error={error} />

    </div>

  );

}



function Row({ label, value, bold, accent }) {
  return (
    <div className={`flex justify-between ${bold ? "font-medium text-white" : accent ? "text-emerald-400" : "text-white/60"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

