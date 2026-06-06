import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../lib/api";
import { clearDraft } from "../lib/draft";
import { useDropzone } from "react-dropzone";
import { Check, Copy, Upload, MessageCircle } from "lucide-react";

export default function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  const [utr, setUtr] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get(`/orders/${orderId}`).then((r) => setOrder(r.data));
    api.get("/settings").then((r) => setSettings(r.data));
  }, [orderId]);

  const onDrop = async (files) => {
    const file = files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const r = await api.post("/upload/payment", form);
    setScreenshotUrl(r.data.url);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [] }, multiple: false,
  });

  if (!order || !settings)
    return <div className="max-w-xl mx-auto py-20 text-center text-white/60">Loading…</div>;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(settings.merchant_name)}&am=${order.amount}&cu=INR&tn=${order.order_id}`;
  const waMessage = encodeURIComponent(
    `Hi! I just placed order ${order.order_id} for ${order.product_name} (${order.brand_name} ${order.model_name}). UTR: ${utr || "[pending]"}`
  );
  const waUrl = `https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, "")}?text=${waMessage}`;

  const submit = async () => {
    if (!screenshotUrl || !utr) return;
    setSubmitting(true);
    try {
      await api.post(`/orders/${order.order_id}/payment-proof`, {
        utr, screenshot_url: screenshotUrl,
      });
      clearDraft();
      navigate(`/track/${order.order_id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const copyUpi = () => {
    navigator.clipboard.writeText(settings.upi_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div data-testid="payment-page" className="max-w-6xl mx-auto px-6 lg:px-10 py-12">
      <div className="label-eyebrow">Payment</div>
      <h1 className="font-display text-4xl lg:text-5xl mt-3 mb-2">Pay ₹{order.amount} via UPI</h1>
      <p className="text-white/60 mb-10">
        Order <span className="font-mono text-[#ff4f00]">{order.order_id}</span> — scan the QR using any UPI app, then upload proof below.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="glass rounded-2xl p-8 text-center">
          <div className="inline-block bg-white p-4 rounded-2xl">
            <QRCodeCanvas value={upiUrl} size={220} data-testid="upi-qr" />
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="font-mono text-sm text-white/70">{settings.upi_id}</span>
            <button data-testid="copy-upi" onClick={copyUpi}
              className="text-white/60 hover:text-white">
              {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="mt-4 text-xs text-white/40 uppercase tracking-widest font-mono">
            Works with GPay · PhonePe · Paytm · BHIM
          </div>
          <div className="mt-6 grid grid-cols-4 gap-2 text-xs text-white/50">
            {["GPay","PhonePe","Paytm","BHIM"].map((p) => (
              <div key={p} className="glass-2 rounded-lg py-2">{p}</div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-8 space-y-6">
          <div>
            <div className="label-eyebrow mb-3">Step 1 — Upload screenshot</div>
            <div {...getRootProps()} data-testid="proof-dropzone"
              className={`glass-2 rounded-xl p-8 text-center cursor-pointer border border-dashed ${isDragActive ? "border-[#ff4f00] bg-[#ff4f00]/5" : "border-white/15"}`}
            >
              <input {...getInputProps()} />
              {screenshotUrl ? (
                <div>
                  <Check className="w-6 h-6 mx-auto text-[#10B981]" />
                  <div className="text-sm mt-2">Screenshot uploaded</div>
                  <div className="text-xs text-white/40 mt-1">Click to replace</div>
                </div>
              ) : (
                <div>
                  <Upload className="w-6 h-6 mx-auto text-[#ff4f00]" />
                  <div className="text-sm mt-2">Drop payment screenshot</div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="label-eyebrow mb-3">Step 2 — Enter UTR / Transaction ID</div>
            <input data-testid="utr-input"
              value={utr} onChange={(e) => setUtr(e.target.value)}
              placeholder="e.g. 412345678901"
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#ff4f00] font-mono"
            />
            <div className="text-xs text-white/40 mt-1">Found in your UPI app's transaction details.</div>
          </div>

          <div className="flex gap-3">
            <button data-testid="submit-proof"
              disabled={!screenshotUrl || !utr || submitting} onClick={submit}
              className={`btn-primary flex-1 ${!screenshotUrl || !utr ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {submitting ? "Submitting…" : "Submit payment proof"}
            </button>
            <a data-testid="whatsapp-btn" href={waUrl} target="_blank" rel="noreferrer"
              className="btn-secondary flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
