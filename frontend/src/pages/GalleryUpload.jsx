import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { Upload, X, Loader2, Camera, ArrowLeft, Package, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMAGE_ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export default function GalleryUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const selectedOrder = eligibleOrders.find((o) => o.order_id === selectedOrderId);

  useEffect(() => {
    api
      .get("/gallery/eligible-orders")
      .then((r) => {
        const orders = r.data || [];
        setEligibleOrders(orders);
        if (orders.length === 1) setSelectedOrderId(orders[0].order_id);
      })
      .catch((err) => {
        toast.error(err.response?.data?.detail || "Could not load your orders");
      })
      .finally(() => setLoadingOrders(false));
  }, []);

  const onDrop = (accepted) => {
    const remaining = MAX_IMAGES - files.length;
    const toAdd = accepted.slice(0, remaining);
    if (!toAdd.length) {
      if (accepted.length) toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }
    const newFiles = [...files, ...toAdd];
    setFiles(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((f) => f.filter((_, i) => i !== index));
    setPreviews((p) => p.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0];
      if (err?.code === "file-too-large") {
        toast.error("Each image must be under 5 MB");
      } else {
        toast.error("Only JPG, PNG, or WEBP images are allowed");
      }
    },
    accept: IMAGE_ACCEPT,
    multiple: true,
    maxFiles: MAX_IMAGES,
    maxSize: MAX_FILE_SIZE,
    disabled: files.length >= MAX_IMAGES,
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedOrderId) {
      toast.error("Select the order you want to share photos for");
      return;
    }
    if (!files.length) {
      toast.error("Add at least one photo");
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("order_id", selectedOrderId);
      files.forEach((file) => body.append("images", file));

      await api.post("/gallery/submit", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Thanks! We'll review your photos soon.");
      navigate("/gallery");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="gallery-upload-page" className="max-w-2xl mx-auto px-6 lg:px-10 py-12">
      <Link
        to="/gallery"
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Gallery
      </Link>

      <div className="label-eyebrow flex items-center gap-2">
        <Camera className="w-4 h-4 text-brand" />
        Share Your CASEBOX
      </div>
      <h1 className="font-display text-4xl mt-3 mb-2">Upload Photos</h1>
      <p className="text-white/60 mb-10">
        Signed in as <span className="text-white/80">{user?.email}</span>. Pick your delivered order and upload images only — no extra details needed.
      </p>

      {loadingOrders ? (
        <div className="glass rounded-2xl p-12 flex justify-center">
          <Loader2 className="w-6 h-6 text-brand animate-spin" />
        </div>
      ) : eligibleOrders.length === 0 ? (
        <div className="glass rounded-2xl p-8 sm:p-10 text-center">
          <Package className="w-10 h-10 text-white/25 mx-auto" />
          <h2 className="font-display text-xl mt-4">No orders ready yet</h2>
          <p className="text-white/50 text-sm mt-2 max-w-md mx-auto">
            Gallery uploads become available after your order has been delivered and your payment has been successfully confirmed.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link to="/profile" className="btn-primary text-sm px-5 py-2.5">
              View My Orders
            </Link>
            <Link to="/gallery" className="btn-secondary text-sm px-5 py-2.5">
              Browse Gallery
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <div className="glass rounded-2xl p-6 sm:p-8 space-y-4">
            <label className="text-sm text-white/60 mb-2 block">Select order *</label>
            <div className="space-y-2">
              {eligibleOrders.map((order) => {
                const active = selectedOrderId === order.order_id;
                return (
                  <button
                    key={order.order_id}
                    type="button"
                    data-testid={`order-option-${order.order_id}`}
                    onClick={() => setSelectedOrderId(order.order_id)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                      active
                        ? "border-brand/40 bg-brand/10"
                        : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium truncate">{order.product_name}</div>
                      {active && <Check className="w-4 h-4 text-brand flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedOrder && (
              <p className="text-sm text-white/50">
                Uploading for <span className="text-white/80">{selectedOrder.product_name}</span>
              </p>
            )}
          </div>

          <div className="glass rounded-2xl p-6 sm:p-8 space-y-5">
            <div>
              <label className="text-sm text-white/60 mb-2 block">
                Photos * <span className="text-white/40">(images only, max 5 MB each)</span>
              </label>
              <div
                {...getRootProps()}
                data-testid="gallery-photo-dropzone"
                className={`glass-2 rounded-xl p-8 text-center cursor-pointer border border-dashed transition-colors ${
                  isDragActive ? "border-brand bg-brand/5" : "border-white/15"
                } ${files.length >= MAX_IMAGES ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto text-brand" />
                <div className="text-sm mt-2">Drop photos here or click to browse</div>
                <div className="text-xs text-white/40 mt-1">
                  {files.length} / {MAX_IMAGES} · JPG, PNG, WEBP only
                </div>
              </div>

              {previews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4">
                  {previews.map((src, i) => (
                    <div key={src} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !files.length || !selectedOrderId}
              className="btn-primary w-full flex items-center justify-center gap-2"
              data-testid="submit-gallery-btn"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Submit Photos
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
