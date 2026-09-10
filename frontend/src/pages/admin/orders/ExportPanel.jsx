import { Loader2 } from "lucide-react";
import { EXPORT_COLUMNS, EXPORT_FORMATS, EXPORT_SCOPES } from "./orderConstants";

export default function ExportPanel({
  scope,
  format,
  columns,
  exporting,
  onScope,
  onFormat,
  onToggleColumn,
  onSelectAll,
  onExport,
}) {
  const allSelected = columns.length === EXPORT_COLUMNS.length;

  return (
    <div
      data-testid="orders-export-panel"
      className="w-full max-w-xl glass rounded-2xl border border-white/10 p-5 ml-auto"
    >
      <div className="label-eyebrow mb-1">Export</div>
      <p className="text-sm text-white/55 mb-4">Choose a scope, format, and columns. Filtered export includes every matching order, not just this page.</p>

      <div className="space-y-2 mb-4">
        {EXPORT_SCOPES.map((opt) => (
          <label key={opt.value} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${scope === opt.value ? "border-brand/40 bg-brand/10" : "border-white/10 hover:border-white/20"}`}>
            <input
              type="radio"
              name="export-scope"
              className="mt-1 accent-emerald-500"
              checked={scope === opt.value}
              onChange={() => onScope(opt.value)}
              data-testid={`export-scope-${opt.value}`}
            />
            <span>
              <span className="block text-sm text-white/90">{opt.label}</span>
              <span className="block text-xs text-white/45 mt-0.5">{opt.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="text-[11px] uppercase tracking-wider font-mono text-white/40 mb-2">Format</div>
      <div className="flex gap-2 mb-4">
        {EXPORT_FORMATS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            data-testid={`export-format-${opt.value}`}
            onClick={() => onFormat(opt.value)}
            className={`flex-1 px-2 py-2 rounded-lg text-xs border ${format === opt.value ? "bg-brand-gradient border-brand text-white" : "border-white/10 text-white/60 hover:text-white"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-wider font-mono text-white/40">Columns</div>
        <button type="button" data-testid="export-select-all" onClick={onSelectAll} className="text-xs text-brand-light hover:text-brand">
          {allSelected ? "Clear columns" : "Select All Columns"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-4 max-h-48 overflow-y-auto pr-1">
        {EXPORT_COLUMNS.map((col) => {
          const checked = columns.includes(col.key);
          return (
            <label key={col.key} className="flex items-center gap-2 text-xs text-white/75 py-1">
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={checked}
                onChange={() => onToggleColumn(col.key)}
                data-testid={`export-col-${col.key}`}
              />
              {col.label}
            </label>
          );
        })}
      </div>

      <button
        type="button"
        data-testid="export-download"
        disabled={exporting || columns.length === 0}
        onClick={onExport}
        className="btn-primary w-full text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {exporting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Preparing export…</>
        ) : (
          "Download export"
        )}
      </button>
    </div>
  );
}
