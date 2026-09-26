import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();

  const links = [
    {
      href: "/reviewer",
      label: "AI Code Reviewer",
      desc: "Paste code, analyze issues across 13+ languages, and apply safe AI fixes.",
      icon: "⚡",
      badge: "Primary Tool",
    },
    {
      href: "/history",
      label: "Review History",
      desc: "Search, inspect, and reload past code submissions and solutions.",
      icon: "📜",
      badge: null,
    },
    {
      href: "/profile",
      label: "User Profile",
      desc: "View your verified account credentials, role permissions, and join date.",
      icon: "👤",
      badge: null,
    },
    {
      href: "/settings",
      label: "Account Settings",
      desc: "Update display name, request verified email change, or update password.",
      icon: "⚙️",
      badge: null,
    },
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
      <div className="mb-8">
        <p className="font-mono text-xs sm:text-sm text-black/50">Welcome back</p>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mt-0.5">
          {user.displayName || user.username}
        </h1>
        <p className="text-xs text-black/50 font-mono mt-1">
          {user.email} • {user.role === "ADMIN" ? "Administrator" : "Standard Account"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="card p-5 block bg-white hover:border-signal hover:shadow-sm transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{l.icon}</span>
              {l.badge && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-signal/10 text-signal">
                  {l.badge}
                </span>
              )}
            </div>
            <h3 className="font-display font-semibold text-base text-ink group-hover:text-signal transition">
              {l.label}
            </h3>
            <p className="text-xs sm:text-sm text-black/60 mt-1 leading-relaxed">{l.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
