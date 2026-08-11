import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const ALL = "__all__";

/**
 * Dark-themed select matching the FORM glass UI (fixes native white dropdown on Windows).
 */
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
        className="h-10 w-full rounded-xl border-white/10 bg-white/[0.04] text-sm text-white shadow-none focus:ring-1 focus:ring-brand data-[placeholder]:text-white/40 hover:bg-white/[0.06] transition-colors"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className="z-[60] rounded-xl border border-white/10 bg-[#121214]/95 text-white shadow-xl backdrop-blur-xl"
        position="popper"
      >
        {allowAll && (
          <SelectItem
            value={ALL}
            className="rounded-lg text-white/80 focus:bg-brand/15 focus:text-white data-[highlighted]:bg-brand/15 data-[highlighted]:text-white"
          >
            {allLabel}
          </SelectItem>
        )}
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="rounded-lg text-white/80 focus:bg-brand/15 focus:text-white data-[highlighted]:bg-brand/15 data-[highlighted]:text-white"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
