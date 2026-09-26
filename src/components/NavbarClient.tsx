"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavbarClientProps {
  user: {
    username: string;
    displayName?: string | null;
    email: string;
    role: string;
  } | null;
}

export default function NavbarClient({ user }: NavbarClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const closeMenu = () => setMobileOpen(false);

  return (
    <nav className="bg-ink text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link
            href="/"
            onClick={closeMenu}
            className="font-display font-semibold text-lg flex items-center gap-2.5 shrink-0 tracking-tight"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-signal inline-block animate-pulse" />
            <span>AI Code Reviewer</span>
          </Link>

          {/* Desktop Navigation Links (PC / tablet landscape) */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/reviewer"
              className={`transition hover:text-white ${
                isActive("/reviewer") ? "text-white font-semibold" : "text-white/70"
              }`}
            >
              Reviewer
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`transition hover:text-white ${
                    isActive("/dashboard") ? "text-white font-semibold" : "text-white/70"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/history"
                  className={`transition hover:text-white ${
                    isActive("/history") ? "text-white font-semibold" : "text-white/70"
                  }`}
                >
                  History
                </Link>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className={`transition hover:text-white ${
                      isActive("/admin") ? "text-white font-semibold" : "text-white/70"
                    }`}
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/settings"
                  className={`transition hover:text-white max-w-[150px] truncate ${
                    isActive("/settings") ? "text-white font-semibold" : "text-white/70"
                  }`}
                  title={user.displayName || user.username}
                >
                  {user.displayName || user.username}
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="border border-white/20 rounded px-3 py-1 text-xs hover:border-white/60 hover:bg-white/5 transition"
                  >
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`transition hover:text-white ${
                    isActive("/login") ? "text-white font-semibold" : "text-white/70"
                  }`}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="bg-signal text-white rounded px-3.5 py-1.5 font-semibold text-xs hover:bg-blue-700 shadow-sm transition"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button (Phone / small screen) */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <span className="text-xs text-white/60 max-w-[110px] truncate font-mono">
                {user.displayName || user.username}
              </span>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 focus:outline-none"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-ink px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top duration-200">
          <Link
            href="/reviewer"
            onClick={closeMenu}
            className={`block py-2 px-3 rounded text-sm ${
              isActive("/reviewer") ? "bg-white/10 text-white font-semibold" : "text-white/80 hover:bg-white/5"
            }`}
          >
            AI Reviewer
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={closeMenu}
                className={`block py-2 px-3 rounded text-sm ${
                  isActive("/dashboard") ? "bg-white/10 text-white font-semibold" : "text-white/80 hover:bg-white/5"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/history"
                onClick={closeMenu}
                className={`block py-2 px-3 rounded text-sm ${
                  isActive("/history") ? "bg-white/10 text-white font-semibold" : "text-white/80 hover:bg-white/5"
                }`}
              >
                History
              </Link>
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className={`block py-2 px-3 rounded text-sm ${
                    isActive("/admin") ? "bg-white/10 text-white font-semibold" : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  Admin
                </Link>
              )}
              <Link
                href="/settings"
                onClick={closeMenu}
                className={`block py-2 px-3 rounded text-sm ${
                  isActive("/settings") ? "bg-white/10 text-white font-semibold" : "text-white/80 hover:bg-white/5"
                }`}
              >
                Settings ({user.displayName || user.username})
              </Link>
              <div className="pt-2 border-t border-white/10">
                <form action="/api/auth/logout" method="post" onSubmit={closeMenu}>
                  <button
                    type="submit"
                    className="w-full text-left py-2 px-3 rounded text-sm text-crit hover:bg-crit/10 font-medium"
                  >
                    Log out
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={closeMenu}
                className={`block py-2 px-3 rounded text-sm ${
                  isActive("/login") ? "bg-white/10 text-white font-semibold" : "text-white/80 hover:bg-white/5"
                }`}
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={closeMenu}
                className="block text-center py-2 px-3 rounded text-sm bg-signal font-semibold text-white hover:bg-blue-700"
              >
                Create an account
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
