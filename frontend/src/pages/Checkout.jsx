import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { getDraft, setDraft } from "../lib/draft";
import { ArrowRight, MapPin, User, Phone } from "lucide-react";

const STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh",
  "Uttarakhand","West Bengal",
];

export default function Checkout() {
  const navigate = useNavigate();
  const draft = getDraft();
  const [form, setForm] = useState({
    customer_name: "", phone: "", email: "", address: "",
    state: "", pincode: "", notes: "",
  });
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!draft.brand || !draft.model || !draft.product || !draft.design_url) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-2xl">Your design is missing.</h2>
        <p className="text-white/60 mt-2">Start a new customization to continue.</p>
        <button onClick={() => navigate("/customize")} className="btn-primary mt-6">
          Start designing
        </button>
      </div>
    );
  }

  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.customer_name || !form.phone || !form.address || !form.state || !form.pincode) {
      setErr("Please complete all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customer_name: form.customer_name,
        phone: form.phone,
        email: form.email || null,
        address: form.address,
        state: form.state,
        pincode: form.pincode,
        notes: form.notes || null,
        brand_id: draft.brand.id,
        brand_name: draft.brand.name,
        model_id: draft.model.id,
        model_name: draft.model.name,
        product_id: draft.product.id,
        product_name: draft.product.name,
        amount: draft.product.price,
        design_url: draft.design_url,
        preview_url: draft.preview_url || null,
      };
      const { data } = await api.post("/orders", payload);
      setDraft({ order: data });
      navigate(`/payment/${data.order_id}`);
    } catch (e) {
      setErr(e.response?.data?.detail || "Order creation failed");
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
            value={form.customer_name} onChange={(v) => set("customer_name", v)} />
          <div className="grid sm:grid-cols-2 gap-5">
            <Field icon={Phone} label="Phone number" testid="checkout-phone"
              value={form.phone} onChange={(v) => set("phone", v)} />
            <Field label="Email (optional)" testid="checkout-email" type="email"
              value={form.email} onChange={(v) => set("email", v)} />
          </div>
          <Field icon={MapPin} label="Delivery address" testid="checkout-address"
            value={form.address} onChange={(v) => set("address", v)} textarea />
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="label-eyebrow block mb-2">State</label>
              <select
                data-testid="checkout-state"
                value={form.state} onChange={(e) => set("state", e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
              >
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Field label="Pincode" testid="checkout-pincode"
              value={form.pincode} onChange={(v) => set("pincode", v)} />
          </div>
          <Field label="Order notes (optional)" testid="checkout-notes"
            value={form.notes} onChange={(v) => set("notes", v)} textarea />
          {err && <div className="text-sm text-red-400" data-testid="checkout-err">{err}</div>}
          <button data-testid="place-order-btn"
            disabled={submitting} type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting ? "Placing order…" : "Continue to payment"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <aside className="glass rounded-2xl p-6 h-fit sticky top-24">
          <div className="label-eyebrow">Summary</div>
          <div className="mt-4 flex gap-4">
            {draft.preview_url ? (
              <img src={draft.preview_url} alt="" className="w-20 h-32 object-cover rounded-lg border border-white/10" />
            ) : (
              <div className="w-20 h-32 bg-zinc-900 rounded-lg" />
            )}
            <div className="flex-1 text-sm">
              <div className="font-medium">{draft.product.name}</div>
              <div className="text-white/50 mt-1">{draft.brand.name} · {draft.model.name}</div>
              <div className="mt-3 font-mono text-[#ff4f00]">₹{draft.product.price}</div>
            </div>
          </div>
          <div className="border-t border-white/10 mt-6 pt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={`₹${draft.product.price}`} />
            <Row label="Shipping" value="Free" />
            <div className="border-t border-white/10 my-2" />
            <Row label="Total" value={`₹${draft.product.price}`} bold />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, type = "text", textarea, testid }) {
  return (
    <div>
      <label className="label-eyebrow block mb-2 flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5" />}{label}
      </label>
      {textarea ? (
        <textarea data-testid={testid}
          value={value} onChange={(e) => onChange(e.target.value)} rows={3}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
        />
      ) : (
        <input data-testid={testid} type={type}
          value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
        />
      )}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? "font-medium text-white" : "text-white/60"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
