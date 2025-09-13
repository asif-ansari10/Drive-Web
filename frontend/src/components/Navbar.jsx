import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // sync with URL q param
  const params = new URLSearchParams(location.search);
  const urlQ = params.get("q") || "";

  const [query, setQuery] = useState(urlQ);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => setQuery(urlQ), [location.search]);

  useEffect(() => {
    if (mobileSearchOpen) setTimeout(() => inputRef.current?.focus(), 40);
  }, [mobileSearchOpen]);

  // close mobile menu on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!mobileMenuOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) setMobileMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [mobileMenuOpen]);

  const goToSearchUrl = (q, replace = true) => {
    const trimmed = (q || "").trim();
    const path = trimmed ? `/?q=${encodeURIComponent(trimmed)}` : `/`;
    navigate(path, { replace });
  };

  const onChange = (value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => goToSearchUrl(value), 250);
  };

  const onSubmit = (e) => {
    e?.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    goToSearchUrl(query, false);
    setMobileSearchOpen(false);
  };

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    goToSearchUrl("", false);
    setMobileSearchOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      clearSearch();
      setMobileSearchOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm px-4 sm:px-6 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link to="/" className="text-2xl font-extrabold text-indigo-600 flex-shrink-0">
            Drive
          </Link>

          {/* Desktop search (visible on sm+) */}
          <form onSubmit={onSubmit} className="hidden sm:flex items-center flex-1 max-w-xl" role="search">
  <div className="relative flex-1">
    <input
      ref={inputRef}
      type="search"
      value={query}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Search files and folders..."
      className="w-full px-3 py-2 border border-r-0 rounded-l-md focus:outline-none text-sm"
      aria-label="Search"
    />
    {query ? (
      <button
        type="button"
        onClick={clearSearch}
        className="absolute right-3 top-1/2 -translate-y-1/2 px-1 text-gray-500"
        aria-label="Clear search"
      >
        ✕
      </button>
    ) : null}
  </div>

  <button
    type="submit"
    className="px-3 py-2 bg-indigo-600 text-white rounded-r-md text-sm"
    aria-label="Search"
  >
    Search
  </button>
</form>

        </div>

        {/* Right side: mobile toggles + auth (desktop) */}
        <div className="flex items-center gap-2">
          {/* mobile search toggle */}
          <button
            className="inline-flex sm:hidden p-2 rounded-md hover:bg-gray-100"
            onClick={() => {
              setMobileSearchOpen((s) => !s);
              // close menu when opening search
              if (!mobileSearchOpen) setMobileMenuOpen(false);
            }}
            aria-label={mobileSearchOpen ? "Close search" : "Open search"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
          </button>

          {/* mobile hamburger menu */}
          <div className="relative sm:hidden" ref={menuRef}>
            <button
              className="p-2 rounded-md hover:bg-gray-100"
              onClick={() => {
                setMobileMenuOpen((s) => !s);
                if (!mobileMenuOpen) setMobileSearchOpen(false);
              }}
              aria-expanded={mobileMenuOpen}
              aria-label="Open menu"
            >
              {/* hamburger or X */}
              {mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* mobile menu panel */}
            {mobileMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded-md shadow-lg z-50">
                <div className="py-1">
                  {!isAuthenticated ? (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Login
                      </Link>
                      <Link
                        to="/signup"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Signup
                      </Link>
                    </>
                  ) : (
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Logout
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop auth buttons (sm+) */}
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="hidden sm:inline text-sm px-3 py-2 text-indigo-600 hover:underline">
                Login
              </Link>
              <Link to="/signup" className="hidden sm:inline text-sm px-3 py-2 border rounded-md hover:bg-gray-50">
                Signup
              </Link>
            </>
          ) : (
            <button onClick={handleLogout} className="hidden sm:inline text-sm px-3 sm:px-4 py-2 border rounded-md hover:bg-gray-50">
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="sm:hidden fixed left-4 right-4 top-16 z-50 bg-white px-3 py-2 rounded-md shadow border"
          role="search"
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search files and folders..."
              className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none"
            />
            {query ? (
              <button type="button" onClick={clearSearch} className="px-3 py-2 bg-gray-100 rounded text-sm">
                ✕
              </button>
            ) : null}
            <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded text-sm">
              Go
            </button>
          </div>
        </form>
      )}
    </nav>
  );
}
