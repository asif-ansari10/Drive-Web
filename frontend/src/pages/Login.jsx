import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.email || !form.password) {
      return setError("Please fill both email and password.");
    }

    setWorking(true);
    try {
      const res = await login(form);
      setWorking(false);
      if (!res.ok) return setError(res.error || "Login failed");
      nav("/", { replace: true });
    } catch (err) {
      setWorking(false);
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="text-3xl font-extrabold text-indigo-600">Drive</div>
            <div className="text-sm text-gray-500">Secure file storage</div>
          </div>

          <h2 className="text-2xl font-semibold mb-2">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-4">Sign in to access your Drive account.</p>

          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </label>

            <label className="block relative">
              <span className="text-sm font-medium text-gray-700">Password</span>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md pr-10 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-2 flex items-center px-2 text-gray-500"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    // simple eye-slash
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-3.5-10-8 1.13-2.95 3.36-5.17 6.07-6.23M3 3l18 18" />
                    </svg>
                  ) : (
                    // simple eye
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center text-sm">
                <input type="checkbox" className="form-checkbox h-4 w-4 text-indigo-600" />
                <span className="ml-2 text-gray-600">Remember me</span>
              </label>
              <Link to="/forgot" className="text-sm text-indigo-600 hover:underline">Forgot?</Link>
            </div>

            <button
              disabled={working}
              type="submit"
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-md text-white ${
                working ? "bg-indigo-400 cursor-wait" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {working ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-gray-600">
            Don’t have an account?{" "}
            <Link to="/signup" className="text-indigo-600 font-medium hover:underline">Create one</Link>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 text-xs text-gray-500 text-center">
          By continuing you agree to our terms & privacy.
        </div>
      </div>
    </div>
  );
}
