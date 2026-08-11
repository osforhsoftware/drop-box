import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function AdminSettings() {
  const [form, setForm] = useState({ upi_id: "", merchant_name: "", whatsapp_number: "", currency: "INR" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/settings").then((r) => setForm({
      upi_id: r.data.upi_id, merchant_name: r.data.merchant_name,
      whatsapp_number: r.data.whatsapp_number, currency: r.data.currency,
    }));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.put("/settings", form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div data-testid="admin-settings">
      <div className="label-eyebrow">Settings</div>
      <h1 className="font-display text-3xl mt-2 mb-8">Payment & Communication</h1>
      <form onSubmit={save} className="glass rounded-2xl p-8 max-w-2xl space-y-5">
        {[
          { k: "merchant_name", l: "Merchant Name" },
          { k: "upi_id", l: "UPI ID", mono: true },
          { k: "whatsapp_number", l: "WhatsApp Number (with country code)", mono: true },
          { k: "currency", l: "Currency", mono: true },
        ].map((f) => (
          <div key={f.k}>
            <div className="label-eyebrow mb-2">{f.l}</div>
            <input data-testid={`settings-${f.k}`}
              value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
              className={`w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:ring-1 focus:ring-brand focus:outline-none ${f.mono ? "font-mono" : ""}`}
            />
          </div>
        ))}
        <button data-testid="save-settings" className="btn-primary">Save changes</button>
        {saved && <div className="text-emerald-400 text-sm" data-testid="saved-msg">Saved ✓</div>}
      </form>
    </div>
  );
}
