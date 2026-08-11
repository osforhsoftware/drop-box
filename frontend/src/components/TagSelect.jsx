import { useState } from "react";
import { Plus, X } from "lucide-react";
import ColorSwatch from "./ColorSwatch";
import { isColorTag } from "../constants/colorSwatch";

function normalizeTag(raw) {
  return String(raw || "").trim();
}

/**
 * Multi-value tag picker: type or pick suggestions, selected chips shown below.
 */
export default function TagSelect({
  label,
  value = [],
  onChange,
  suggestions = [],
  placeholder = "Type and press Enter",
  hint,
  testId,
  max = 50,
}) {
  const [draft, setDraft] = useState("");

  const selected = Array.isArray(value) ? value : [];
  const selectedLower = new Set(selected.map((t) => t.toLowerCase()));

  const available = suggestions.filter(
    (s) => !selectedLower.has(normalizeTag(s).toLowerCase())
  );

  const addTag = (raw) => {
    const tag = normalizeTag(raw);
    if (!tag) return;
    if (selected.length >= max) return;
    if (selectedLower.has(tag.toLowerCase())) return;
    onChange([...selected, tag]);
    setDraft("");
  };

  const removeTag = (tag) => {
    onChange(selected.filter((t) => t !== tag));
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(draft);
    }
    if (e.key === "Backspace" && !draft && selected.length) {
      removeTag(selected[selected.length - 1]);
    }
  };

  return (
    <div data-testid={testId}>
      {label && <label className="text-xs text-white/50 block mb-1">{label}</label>}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="form-field flex-1"
        />
        <button
          type="button"
          onClick={() => addTag(draft)}
          disabled={!normalizeTag(draft) || selected.length >= max}
          className="shrink-0 px-3 rounded-lg border border-white/10 text-white/70 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Add tag"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {hint && <p className="text-[11px] text-white/35 mt-1">{hint}</p>}

      {available.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1.5">Suggestions</div>
          <div className="flex flex-wrap gap-1.5">
            {available.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-white/10 text-white/55 hover:text-white hover:border-brand/40 hover:bg-brand/10 transition-colors"
              >
                {isColorTag(s) && <ColorSwatch color={s} size="sm" />}
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1.5">Selected</div>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs bg-brand/15 border border-brand/30 text-white"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="p-0.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
