import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

function isValidSessionUser(data) {
  return (
    data &&
    typeof data === "object" &&
    typeof data.id === "string" &&
    typeof data.email === "string" &&
    (data.role === "customer" || data.role === "admin")
  );
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = () =>
    api
      .get("/auth/me")
      .then((r) => {
        if (isValidSessionUser(r.data)) {
          setUser(r.data);
          return r.data;
        }
        localStorage.removeItem("form_token");
        setUser(null);
        return null;
      })
      .catch(() => {
        localStorage.removeItem("form_token");
        setUser(null);
        return null;
      });

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const login = async (email, password, security = {}) => {
    const { data } = await api.post("/auth/login", { email, password, ...security });
    if (data.access_token) localStorage.setItem("form_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  const completeGoogleLogin = async (code) => {
    const { data } = await api.post("/auth/google/exchange", { code });
    if (data.access_token) localStorage.setItem("form_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  const updateProfile = async (profile) => {
    const { data } = await api.patch("/profile", profile);
    setUser(data);
    return data;
  };

  const logout = async ({ redirectTo } = {}) => {
    await api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("form_token");
    setUser(null);
    if (redirectTo) window.location.replace(redirectTo);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, completeGoogleLogin, updateProfile, logout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
