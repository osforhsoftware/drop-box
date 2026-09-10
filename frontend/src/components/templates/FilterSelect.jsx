import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const ALL = "__all__";

/** Light storefront select with a portal-safe dropdown surface. */
export default function FilterSelect({
  value,
  onChange,
  placeholder = "Select…",
  options = [],
  allowAll = false,
  allLabel = "All",
  testId,
  disabled = false,
}) {
  const selectValue = allowAll ? (value || ALL) : (value || undefined);

  const handleChange = (v) => {
    onChange(allowAll && v === ALL ? "" : v);
  };

  return (
    <Select value={selectValue} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger
        data-testid={testId}
        className="h-10 w-full rounded-xl border-neutral-200 bg-white text-sm text-neutral-900 shadow-none focus:ring-1 focus:ring-brand data-[placeholder]:text-neutral-400 hover:bg-neutral-50 transition-colors"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className="z-[60] rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-xl"
        position="popper"
      >
        {allowAll && (
          <SelectItem
            value={ALL}
            className="rounded-lg text-neutral-700 focus:bg-brand/15 focus:text-neutral-950 data-[highlighted]:bg-brand/15 data-[highlighted]:text-neutral-950"
          >
            {allLabel}
          </SelectItem>
        )}
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="rounded-lg text-neutral-700 focus:bg-brand/15 focus:text-neutral-950 data-[highlighted]:bg-brand/15 data-[highlighted]:text-neutral-950"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
