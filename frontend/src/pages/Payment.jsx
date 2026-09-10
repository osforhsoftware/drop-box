import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { api, resolveMediaUrl } from "../lib/api";
import { clearDraft } from "../lib/draft";
import { useDropzone } from "react-dropzone";
import { Check, Copy, Upload, MessageCircle, CreditCard } from "lucide-react";
import { SHIPPING_FEE } from "../constants/shipping";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  const [utr, setUtr] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  const refreshOrder = useCallback(async () => {
    const { data } = await api.get(`/orders/${orderId}`);
    setOrder(data);
    return data;
  }, [orderId]);

  useEffect(() => {
    refreshOrder().catch(() => {});
    api.get("/settings").then((r) => setSettings(r.data));
  }, [orderId, refreshOrder]);

  const onDrop = async (files) => {
    const file = files[0];
    if (!file) return;
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await api.post("/upload/payment", form);
      setScreenshotUrl(r.data.url);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not upload screenshot");
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [] }, multiple: false,
  });

  const payWithRazorpay = useCallback(async () => {
    if (!order) return;
    setError("");
    setPaying(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Could not load Razorpay Checkout. Please try again.");
      }

      const { data } = await api.post(`/orders/${order.order_id}/razorpay-order`);
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency || "INR",
        name: settings?.merchant_name || "CASEBOX",
        description: `Order ${order.order_id}`,
        order_id: data.razorpay_order_id,
        prefill: {
          name: order.customer_name || "",
          email: order.email || "",
          contact: order.phone || "",
        },
        notes: {
          order_id: order.order_id,
        },
        theme: { color: "#e85d4c" },
        modal: {
          ondismiss: async () => {
            setPaying(false);
            try {
              await api.post(`/orders/${order.order_id}/report-payment`, { outcome: "cancelled" });
            } catch { /* keep local cancelled copy */ }
            try {
              const fresh = await refreshOrder();
              if (fresh?.payment_status === "approved") {
                clearDraft();
                navigate(`/track/${order.order_id}`);
                return;
              }
            } catch { /* keep cancelled copy */ }
            setError("Payment cancelled. You can try again when ready.");
          },
        },
        handler: async (response) => {
          try {
            await api.post(`/orders/${order.order_id}/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            clearDraft();
            navigate(`/track/${order.order_id}`);
          } catch (err) {
            try {
              const fresh = await refreshOrder();
              if (fresh?.payment_status === "approved") {
                clearDraft();
                navigate(`/track/${order.order_id}`);
                return;
              }
            } catch { /* fall through to verify error */ }
            setError(err.response?.data?.detail || "Payment verification failed. Contact support if amount was deducted.");
            setPaying(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", async (response) => {
        const desc = response?.error?.description || response?.error?.reason || "Payment failed";
        try {
          await api.post(`/orders/${order.order_id}/report-payment`, { outcome: "failed", reason: desc });
        } catch { /* webhook may still mark failed */ }
        try {
          const fresh = await refreshOrder();
          if (fresh?.payment_status === "approved") {
            clearDraft();
            navigate(`/track/${order.order_id}`);
            return;
          }
        } catch { /* show gateway error */ }
        setError(desc);
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      setError(
        err.response?.data?.detail
        || (err.response?.status === 404 ? "Payment service is unavailable. Please try again." : null)
        || err.message
        || "Could not start Razorpay checkout"
      );
      setPaying(false);
    }
  }, [order, settings, navigate, refreshOrder]);

  if (!order || !settings)
    return <div className="max-w-xl mx-auto py-20 text-center text-white/60">Loading…</div>;

  const useRazorpay = settings.payment_method === "razorpay";
  const alreadyPaid = order.payment_status === "approved";

  if (alreadyPaid) {
    return (
      <div data-testid="payment-page" className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="label-eyebrow">Payment</div>
        <h1 className="font-display text-4xl mt-3 mb-4">Payment received</h1>
        <p className="text-white/60 mb-8">
          Order <span className="font-mono text-brand">{order.order_id}</span> is confirmed.
        </p>
        <button className="btn-primary" onClick={() => navigate(`/track/${order.order_id}`)}>
          Track order
        </button>
      </div>
    );
  }

  if (useRazorpay) {
    return (
      <div data-testid="payment-page" className="max-w-xl mx-auto px-6 lg:px-10 py-12">
        <div className="label-eyebrow">Payment</div>
        <h1 className="font-display text-4xl lg:text-5xl mt-3 mb-2">Pay ₹{order.amount}</h1>
        <div className="text-sm text-white/60 mb-2 space-y-0.5">
          <div>Subtotal ₹{order.subtotal} · Shipping ₹{order.shipping_fee ?? SHIPPING_FEE}</div>
          {order.promo_code && (
            <div>
              Promo <span className="font-mono text-brand">{order.promo_code}</span> (−₹{order.discount_amount})
            </div>
          )}
        </div>
        <p className="text-white/60 mb-8">
          Order <span className="font-mono text-brand">{order.order_id}</span> — pay securely with Razorpay (UPI, cards, netbanking).
        </p>

        <div className="glass rounded-2xl p-8 space-y-6">
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3" data-testid="payment-error">
              {error}
            </div>
          )}
          <button
            data-testid="razorpay-pay-btn"
            disabled={paying}
            onClick={payWithRazorpay}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${paying ? "opacity-60" : ""}`}
          >
            <CreditCard className="w-4 h-4" />
            {paying ? "Opening checkout…" : `Pay ₹${order.amount} with Razorpay`}
          </button>
          <p className="text-xs text-white/40 text-center">
            You will be redirected to Razorpay&apos;s secure checkout. Do not refresh until payment completes.
          </p>
        </div>
      </div>
    );
  }

  const upiUrl = `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(settings.merchant_name)}&am=${order.amount}&cu=INR&tn=${order.order_id}`;
  const waMessage = encodeURIComponent(
    `Hi! I just placed order ${order.order_id} for ${order.product_name} (${order.brand_name} ${order.model_name}). UTR: ${utr || "[pending]"}`
  );
  const waUrl = `https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, "")}?text=${waMessage}`;

  const submit = async () => {
    if (!screenshotUrl || !utr) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post(`/orders/${order.order_id}/payment-proof`, {
        utr, screenshot_url: screenshotUrl,
      });
      clearDraft();
      navigate(`/track/${order.order_id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not submit payment proof");
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
      <div className="text-sm text-white/60 mb-2 space-y-0.5">
        <div>Subtotal ₹{order.subtotal} · Shipping ₹{order.shipping_fee ?? SHIPPING_FEE}</div>
        {order.promo_code && (
          <div>
            Promo <span className="font-mono text-brand">{order.promo_code}</span> (−₹{order.discount_amount})
          </div>
        )}
      </div>
      <p className="text-white/60 mb-10">
        Order <span className="font-mono text-brand">{order.order_id}</span> — scan the QR using any UPI app, then upload proof below.
      </p>

      {error && (
        <div className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3" data-testid="payment-error">
          {error}
        </div>
      )}

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
              className={`glass-2 rounded-xl p-8 text-center cursor-pointer border border-dashed ${isDragActive ? "border-brand bg-brand/5" : "border-white/15"}`}
            >
              <input {...getInputProps()} />
              {screenshotUrl ? (
                <div>
                  <img src={resolveMediaUrl(screenshotUrl)} alt="Payment screenshot" className="mx-auto max-h-40 rounded-lg border border-white/10 object-contain" />
                  <div className="text-sm mt-2 text-[#10B981] flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Screenshot uploaded</div>
                  <div className="text-xs text-white/40 mt-1">Click to replace</div>
                </div>
              ) : (
                <div>
                  <Upload className="w-6 h-6 mx-auto text-brand" />
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
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-brand font-mono"
            />
            <div className="text-xs text-white/40 mt-1">Found in your UPI app&apos;s transaction details.</div>
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
