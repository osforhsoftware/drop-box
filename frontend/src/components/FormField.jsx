export function fieldInputClass(hasError, extra = "") {
  const base = "w-full bg-[#181818] border rounded-lg px-4 py-3 focus:outline-none transition-colors";
  const state = hasError
    ? "border-red-400/60 focus:ring-red-400/40"
    : "border-brand/20 focus:border-brand-light focus:shadow-[0_0_0_4px_rgba(132,204,71,0.15)]";
  return `${base} ${state}${extra ? ` ${extra}` : ""}`;
}

export function FieldError({ error, testid }) {
  if (!error) return null;
  return (
    <p className="text-red-400 text-xs mt-1" data-testid={testid}>
      {error}
    </p>
  );
}
