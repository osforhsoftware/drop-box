import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, resolveMediaUrl } from "../lib/api";
import { useAuth } from "../lib/auth";
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
import { User, Package, Save, ArrowRight, Search } from "lucide-react";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: "", phone: "",
    house_no_flat: "", building_name: "", street: "", landmark: "",
    country: "", state: "", district: "", city_area: "", post_office: "",
    pincode: "",
  });
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      phone: user.phone || "",
      house_no_flat: user.house_no_flat || user.address || "",
      building_name: user.building_name || "",
      street: user.street || "",
      landmark: user.landmark || "",
      country: user.country || "",
      state: user.state || "",
      district: user.district || "",
      city_area: user.city_area || "",
      post_office: user.post_office || "",
      pincode: user.pincode || "",
    });
  }, [user]);

  useEffect(() => {
    api
      .get("/orders/mine")
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, []);

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

  const saveProfile = async (e) => {
    e.preventDefault();
    const errors = collectErrors({
      name: validateRequired(form.name, "Full name"),
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
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success("Profile saved.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="profile-page" className="max-w-5xl mx-auto px-6 lg:px-10 py-12">
      <div className="label-eyebrow">Account</div>
      <h1 className="font-display text-4xl lg:text-5xl mt-3 mb-10">My profile</h1>

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <section className="glass rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-4 h-4 text-brand" />
              <h2 className="font-display text-xl">Account details</h2>
            </div>
            <div className="label-eyebrow mb-2">Email</div>
            <div className="text-white/80 mb-6 font-mono text-sm">{user?.email}</div>
          </section>

          <form onSubmit={saveProfile} className="glass rounded-2xl p-8 space-y-5">
            <p className="text-white/50 text-sm mb-4">
              Saved here and auto-filled at checkout on your next order.
            </p>
            <Field label="Full name" testid="profile-name"
              value={form.name} onChange={(v) => set("name", v)} error={fieldErrors.name} />
            <PhoneField label="Phone number" testid="profile-phone"
              value={form.phone} onChange={(v) => set("phone", v)} error={fieldErrors.phone} />
            <IndianAddressFields
              prefix="profile"
              value={form}
              onChange={set}
              errors={fieldErrors}
            />
            <button
              type="submit"
              data-testid="profile-save"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save address"}
            </button>
          </form>
        </div>

        <aside id="orders" className="lg:col-span-2">
          <div className="glass rounded-2xl p-6 sticky top-24">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-brand" />
                <h2 className="font-display text-xl">My orders</h2>
              </div>
              <Link
                to="/track"
                data-testid="profile-track-order"
                className="flex items-center gap-1.5 text-xs font-medium text-brand-light hover:text-brand-accent transition-colors shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                Track order
              </Link>
            </div>
            {loadingOrders ? (
              <div className="text-white/50 text-sm">Loading orders…</div>
            ) : orders.length === 0 ? (
              <div className="text-white/50 text-sm">
                No confirmed orders yet.{" "}
                <Link to="/customize" className="text-brand-light hover:text-brand-accent">
                  Start designing
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {orders.map((o) => (
                  <li key={o.order_id}>
                    <Link
                      to={`/track/${o.order_id}`}
                      data-testid={`profile-order-${o.order_id}`}
                      className="block glass-2 rounded-xl p-4 hover:border-white/20 transition-colors group"
                    >
                      <div className="flex gap-3">
                        {o.preview_url ? (
                          <img
                            src={resolveMediaUrl(o.preview_url)}
                            alt=""
                            className="w-12 h-16 object-cover rounded-md border border-white/10"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-zinc-900 rounded-md" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs text-brand">{o.order_id}</div>
                          <div className="text-sm truncate mt-0.5">{o.product_name}</div>
                          <div className="text-xs text-white/50 mt-1 capitalize">
                            {o.delivery_status?.replace(/_/g, " ")}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 shrink-0 mt-1" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PhoneField({ label, value, onChange, testid, error }) {
  return (
    <div>
      <label className="label-eyebrow block mb-2">{label}</label>
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

function Field({ label, value, onChange, textarea, testid, error }) {
  const cls = fieldInputClass(error);
  return (
    <div>
      <label className="label-eyebrow block mb-2">{label}</label>
      {textarea ? (
        <textarea
          data-testid={testid}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={cls}
        />
      ) : (
        <input
          data-testid={testid}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
      <FieldError error={error} />
    </div>
  );
}
