import { Navigate, useSearchParams } from "react-router-dom";

export default function Register() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");
  const to = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  return <Navigate to={to} replace />;
}
