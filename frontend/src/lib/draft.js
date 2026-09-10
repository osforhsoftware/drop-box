// Simple sessionStorage-backed customization draft
const KEY = "form_draft";

export const getDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};

/** Merge patch into the current draft (step-by-step customize flow). */
export const setDraft = (patch) => {
  const cur = getDraft();
  const next = { ...cur, ...patch };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
};

/**
 * Replace the entire draft. Use when starting a new checkout path
 * (shop Buy Now, cart checkout, customize Continue) so a previous
 * custom design preview cannot leak into the order summary.
 */
export const replaceDraft = (data) => {
  const next = data && typeof data === "object" ? data : {};
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
};

export const clearDraft = () => sessionStorage.removeItem(KEY);
