import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MapPin } from "lucide-react";

import { api } from "../lib/api";
import { fieldInputClass, FieldError } from "./FormField";

const LOCATION_FIELDS = ["country", "state", "district", "city_area", "post_office"];

export default function IndianAddressFields({ value, onChange, errors = {}, prefix }) {
  const [lookup, setLookup] = useState({ status: "idle", message: "" });
  const [postOffices, setPostOffices] = useState([]);
  const onChangeRef = useRef(onChange);
  const postOfficeRef = useRef(value.post_office);

  useEffect(() => {
    onChangeRef.current = onChange;
    postOfficeRef.current = value.post_office;
  });

  useEffect(() => {
    if (!/^\d{6}$/.test(value.pincode || "")) {
      setLookup({ status: "idle", message: "" });
      setPostOffices([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLookup({ status: "loading", message: "Finding your delivery area…" });
      try {
        const { data } = await api.get(`/postal/pincode/${value.pincode}`, {
          signal: controller.signal,
        });
        const offices = data.post_offices || [];
        const previous = offices.find((office) => office.name === postOfficeRef.current);
        const selected = previous || offices[0] || {
          name: data.post_office,
          city_area: data.city_area,
        };
        setPostOffices(offices);
        onChangeRef.current({
          country: data.country || "India",
          state: data.state || "",
          district: data.district || "",
          city_area: selected.city_area || data.city_area || "",
          post_office: selected.name || data.post_office || "",
        });
        setLookup({
          status: "success",
          message: `${offices.length || 1} delivery post office${offices.length === 1 ? "" : "s"} found`,
        });
      } catch (error) {
        if (error.code === "ERR_CANCELED") return;
        setPostOffices([]);
        setLookup({
          status: "error",
          message:
            error.response?.data?.detail ||
            "We couldn't verify this PIN code. Check it and try again.",
        });
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value.pincode]);

  const updatePincode = (raw) => {
    const pincode = raw.replace(/\D/g, "").slice(0, 6);
    onChange({
      pincode,
      ...Object.fromEntries(LOCATION_FIELDS.map((field) => [field, ""])),
    });
  };

  const selectPostOffice = (name) => {
    const office = postOffices.find((item) => item.name === name);
    onChange({
      post_office: name,
      city_area: office?.city_area || value.city_area,
    });
  };

  const testId = (name) => `${prefix}-${name}`;
  const readOnlyClass = "opacity-80 cursor-default bg-white/[0.025]";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 pt-1">
        <MapPin className="w-4 h-4 text-brand" />
        <h2 className="font-display text-xl">Delivery address</h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <AddressField
          label="House no. / Flat"
          testid={testId("house-no-flat")}
          value={value.house_no_flat}
          onChange={(house_no_flat) => onChange({ house_no_flat })}
          error={errors.house_no_flat}
          autoComplete="address-line1"
        />
        <AddressField
          label="Building name (optional)"
          testid={testId("building-name")}
          value={value.building_name}
          onChange={(building_name) => onChange({ building_name })}
          autoComplete="address-line2"
        />
      </div>

      <AddressField
        label="Street / Road"
        testid={testId("street")}
        value={value.street}
        onChange={(street) => onChange({ street })}
        error={errors.street}
        autoComplete="address-line2"
      />

      <AddressField
        label="Landmark (optional)"
        testid={testId("landmark")}
        value={value.landmark}
        onChange={(landmark) => onChange({ landmark })}
      />

      <div className="grid sm:grid-cols-2 gap-5 items-start">
        <div>
          <label className="label-eyebrow block mb-2">PIN code</label>
          <div className="relative">
            <input
              data-testid={testId("pincode")}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={value.pincode}
              onChange={(event) => updatePincode(event.target.value)}
              className={`${fieldInputClass(errors.pincode)} pr-11`}
              aria-describedby={`${testId("pincode")}-status`}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {lookup.status === "loading" && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
              {lookup.status === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {lookup.status === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}
            </div>
          </div>
          <FieldError error={errors.pincode} />
          {lookup.message && (
            <p
              id={`${testId("pincode")}-status`}
              className={`text-xs mt-1 ${
                lookup.status === "error"
                  ? "text-red-400"
                  : lookup.status === "success"
                    ? "text-emerald-400"
                    : "text-white/45"
              }`}
              role={lookup.status === "error" ? "alert" : "status"}
            >
              {lookup.message}
            </p>
          )}
        </div>

        <ReadOnlyField
          label="Country"
          testid={testId("country")}
          value={value.country}
          error={errors.country}
          className={readOnlyClass}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <ReadOnlyField
          label="State"
          testid={testId("state")}
          value={value.state}
          error={errors.state}
          className={readOnlyClass}
        />
        <ReadOnlyField
          label="District"
          testid={testId("district")}
          value={value.district}
          error={errors.district}
          className={readOnlyClass}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <ReadOnlyField
          label="City / Area"
          testid={testId("city-area")}
          value={value.city_area}
          error={errors.city_area}
          className={readOnlyClass}
        />
        <div>
          <label className="label-eyebrow block mb-2">Post office</label>
          {postOffices.length > 1 ? (
            <select
              data-testid={testId("post-office")}
              value={value.post_office}
              onChange={(event) => selectPostOffice(event.target.value)}
              className={fieldInputClass(errors.post_office)}
            >
              {postOffices.map((office) => (
                <option key={`${office.name}-${office.city_area}`} value={office.name}>
                  {office.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              data-testid={testId("post-office")}
              value={value.post_office}
              readOnly
              className={fieldInputClass(errors.post_office, readOnlyClass)}
            />
          )}
          <FieldError error={errors.post_office} />
          {postOffices.length > 1 && (
            <p className="text-white/40 text-xs mt-1">Choose the post office serving your address.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AddressField({ label, value, onChange, testid, error, autoComplete }) {
  return (
    <div>
      <label className="label-eyebrow block mb-2">{label}</label>
      <input
        data-testid={testid}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className={fieldInputClass(error)}
      />
      <FieldError error={error} />
    </div>
  );
}

function ReadOnlyField({ label, value, testid, error, className }) {
  return (
    <div>
      <label className="label-eyebrow block mb-2">{label}</label>
      <input
        data-testid={testid}
        value={value || ""}
        readOnly
        aria-readonly="true"
        className={fieldInputClass(error, className)}
      />
      <FieldError error={error} />
    </div>
  );
}
