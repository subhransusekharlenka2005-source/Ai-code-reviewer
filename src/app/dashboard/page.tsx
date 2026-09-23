import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();

  const links = [
    { href: "/reviewer", label: "AI Code Reviewer", desc: "Paste code, review it quickly, and apply safe fixes." },
    { href: "/history", label: "History", desc: "Past reviews tied to your account." },
    { href: "/profile", label: "Profile", desc: "Your account details." },
    { href: "/settings", label: "Settings", desc: "Preferences for your account." },
  ];

  return (
    <main className="max-w-4xl mx-auto px-8 py-14">
      <p className="font-mono text-sm text-black/50 mb-1">Welcome back</p>
      <h1 className="font-display text-2xl font-semibold mb-8">{user.username}</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="card p-5 block hover:border-signal">
            <h3 className="font-display font-semibold mb-1">{l.label}</h3>
            <p className="text-sm text-black/60">{l.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
