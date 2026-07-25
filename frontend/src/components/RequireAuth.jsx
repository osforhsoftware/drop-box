import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function RequireAuth({ children, customerOnly = true }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center text-white/60">
        Loading…
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (customerOnly && user.role !== "customer") {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-2xl">Customer account required</h2>
        <p className="text-white/60 mt-2">Sign in with a customer account to place orders.</p>
      </div>
    );
  }

  return children;
}
