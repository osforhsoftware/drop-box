// Simple sessionStorage-backed customization draft
const KEY = "form_draft";

export const getDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};

export const setDraft = (patch) => {
  const cur = getDraft();
  const next = { ...cur, ...patch };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
};

export const clearDraft = () => sessionStorage.removeItem(KEY);
