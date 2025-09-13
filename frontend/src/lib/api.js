const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, { method = "GET", headers = {}, body, json = false } = {}) {
  const token = getToken();
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  if (json) h["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: h,
    body,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data.error || data.message || "API error");
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function apiGet(path) { return request(path); }
export async function apiPostJson(path, payload) {
  return request(path, { method: "POST", json: true, body: JSON.stringify(payload) });
}
export async function apiPostForm(path, formData) {
  return request(path, { method: "POST", body: formData });
}

export async function apiPatch(path, payload) {
  return request(path, { method: "PATCH", json: true, body: JSON.stringify(payload) });
}

export async function apiDelete(path) { return request(path, { method: "DELETE" }); }

export function saveToken(token) { localStorage.setItem("token", token); }
export function removeToken() { localStorage.removeItem("token"); }
export function getStoredToken() { return getToken(); }
