import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { getTemplateImageUrl } from "../../lib/templateImage";
import { normalizeMaskZones } from "../../lib/cameraZone";
import { UploadModal } from "./Templates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EMPTY = {
  upi_id: "",
  merchant_name: "",
  whatsapp_number: "",
  currency: "INR",
  payment_method: "manual_upi",
  razorpay_key_id: "",
};

export default function AdminSettings() {
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [defaultTemplate, setDefaultTemplate] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const loadDefaultOverlay = useCallback(() => {
    api
      .get("/admin/templates")
      .then((r) => {
        const found = (r.data || []).find((t) => t.is_default) || null;
        setDefaultTemplate(found);
      })
      .catch(() => setDefaultTemplate(null));
  }, []);

  useEffect(() => {
    api.get("/settings").then((r) => setForm({
      upi_id: r.data.upi_id || "",
      merchant_name: r.data.merchant_name || "",
      whatsapp_number: r.data.whatsapp_number || "",
      currency: r.data.currency || "INR",
      payment_method: r.data.payment_method || "manual_upi",
      razorpay_key_id: r.data.razorpay_key_id || "",
    }));
    loadDefaultOverlay();
  }, [loadDefaultOverlay]);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        upi_id: form.upi_id,
        merchant_name: form.merchant_name,
        whatsapp_number: form.whatsapp_number,
        currency: form.currency,
        payment_method: form.payment_method,
      };
      // Public key only — never send secrets from the admin UI
      if (form.razorpay_key_id) {
        payload.razorpay_key_id = form.razorpay_key_id;
      }
      const r = await api.put("/settings", payload);
      setForm({
        upi_id: r.data.upi_id || "",
        merchant_name: r.data.merchant_name || "",
        whatsapp_number: r.data.whatsapp_number || "",
        currency: r.data.currency || "INR",
        payment_method: r.data.payment_method || "manual_upi",
        razorpay_key_id: r.data.razorpay_key_id || "",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save settings");
    }
  };

  const removeDefault = async () => {
    if (!defaultTemplate) return;
    try {
      await api.delete(`/admin/templates/${defaultTemplate.id}`);
      setDefaultTemplate(null);
      toast.success("Default overlay removed");
    } catch {
      toast.error("Could not remove default overlay");
    } finally {
      setConfirmRemove(false);
    }
  };

  const zoneCount = defaultTemplate ? normalizeMaskZones(defaultTemplate).length : 0;

  return (
    <div data-testid="admin-settings">
      <div className="label-eyebrow">Settings</div>
      <h1 className="font-display text-3xl mt-2 mb-8">Payment & Communication</h1>
      <form onSubmit={save} className="glass rounded-2xl p-8 max-w-2xl space-y-5">
        <div>
          <div className="label-eyebrow mb-2">Payment method</div>
          <select
            data-testid="settings-payment_method"
            value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:ring-1 focus:ring-brand focus:outline-none"
          >
            <option value="manual_upi">Manual UPI (screenshot + UTR)</option>
            <option value="razorpay">Razorpay Checkout</option>
          </select>
          <p className="text-xs text-white/40 mt-2">
            Razorpay requires <span className="font-mono">RAZORPAY_KEY_ID</span>,{" "}
            <span className="font-mono">RAZORPAY_KEY_SECRET</span>, and{" "}
            <span className="font-mono">RAZORPAY_WEBHOOK_SECRET</span> in backend env.
            Secrets are never stored in settings.
          </p>
        </div>

        {[
          { k: "merchant_name", l: "Merchant Name" },
          { k: "upi_id", l: "UPI ID (manual UPI fallback)", mono: true },
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

        {form.payment_method === "razorpay" && (
          <div>
            <div className="label-eyebrow mb-2">Razorpay Key ID (public)</div>
            <input
              data-testid="settings-razorpay_key_id"
              value={form.razorpay_key_id}
              onChange={(e) => setForm({ ...form, razorpay_key_id: e.target.value })}
              placeholder="rzp_live_… (from server env)"
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:ring-1 focus:ring-brand focus:outline-none font-mono"
            />
            <p className="text-xs text-white/40 mt-2">
              Loaded from <span className="font-mono">RAZORPAY_KEY_ID</span> when set on the server.
              Use live keys (<span className="font-mono">rzp_live_…</span>) in production. Never enter the key secret here.
            </p>
          </div>
        )}

        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button data-testid="save-settings" className="btn-primary">Save changes</button>
        {saved && <div className="text-emerald-400 text-sm" data-testid="saved-msg">Saved ✓</div>}
      </form>

      <section className="glass rounded-2xl p-8 max-w-2xl mt-8" data-testid="settings-default-overlay">
        <div className="label-eyebrow mb-2">Catalog</div>
        <h2 className="font-display text-xl">Default case overlay</h2>
        <p className="text-sm text-white/45 mt-2 mb-5">
          Fallback for phones that do not have a model-specific template. After adding the PNG, set print area and camera cutouts.
        </p>

        {defaultTemplate ? (
          <div className="flex items-start gap-4">
            <img
              src={getTemplateImageUrl(defaultTemplate.file_path)}
              alt=""
              className="w-14 h-14 object-contain rounded border border-white/10 bg-black/40 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-white/80">
                {defaultTemplate.canvas_width}×{defaultTemplate.canvas_height}px
                <span className="text-white/40"> · {zoneCount} camera zone(s) · v{defaultTemplate.version}</span>
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                <button
                  type="button"
                  data-testid="settings-edit-default-overlay"
                  className="text-sm text-brand hover:underline"
                  onClick={() => {
                    setReplaceTarget(defaultTemplate);
                    setUploadOpen(true);
                  }}
                >
                  Edit print &amp; camera
                </button>
                <button
                  type="button"
                  data-testid="settings-remove-default-overlay"
                  className="text-sm text-red-400/80 hover:underline"
                  onClick={() => setConfirmRemove(true)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            data-testid="settings-add-default-overlay"
            className="text-sm text-white/70 hover:text-white underline underline-offset-4"
            onClick={() => {
              setReplaceTarget(null);
              setUploadOpen(true);
            }}
          >
            Add default overlay
          </button>
        )}
      </section>

      <UploadModal
        open={uploadOpen}
        onOpenChange={(v) => {
          setUploadOpen(v);
          if (!v) setReplaceTarget(null);
        }}
        onSuccess={loadDefaultOverlay}
        replaceTemplate={replaceTarget}
        forceDefault
      />

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent className="bg-[#09090B] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove default overlay?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Models without their own template will use the built-in demo until you add another default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeDefault}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
