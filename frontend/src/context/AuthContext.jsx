
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiPostJson, saveToken, removeToken, getStoredToken } from "../lib/api";


const AuthContext = createContext();

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  const signup = async ({ name, email, password }) => {
    setLoading(true);
    try {
      const res = await apiPostJson("/api/auth/signup", { name, email, password });
      if (res.token) {
        saveToken(res.token);
        setUser(res.user || null);
        setLoading(false);
        return { ok: true };
      }
      setLoading(false);
      return { ok: false, error: "Signup failed" };
    } catch (err) {
      setLoading(false);
      return { ok: false, error: err.body?.error || err.message };
    }
  };

  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      const res = await apiPostJson("/api/auth/login", { email, password });
      if (res.token) {
        saveToken(res.token);
        setUser(res.user || null);
        setLoading(false);
        return { ok: true };
      }
      setLoading(false);
      return { ok: false, error: "Login failed" };
    } catch (err) {
      setLoading(false);
      return { ok: false, error: err.body?.error || err.message };
    }
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  // if token exists but user null, you could optionally call /me endpoint to fetch user
  useEffect(() => {
    // nothing automatic for now
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
