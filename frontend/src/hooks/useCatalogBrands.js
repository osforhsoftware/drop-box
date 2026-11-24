import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

/**
 * Live brand list from /admin/catalog (GET /brands).
 * Refetches on mount and when the window regains focus so admin
 * add/edit/delete of brands or logos shows up without a hard reload.
 */
export default function useCatalogBrands({ enabled = true } = {}) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await api.get("/brands");
      setBrands(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err) {
      setBrands([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api.get("/brands");
        if (!cancelled) {
          setBrands(Array.isArray(res.data) ? res.data : []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setBrands([]);
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onFocus = () => {
      refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, refresh]);

  return { brands, loading, error, refresh };
}
