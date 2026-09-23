import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export default async function Navbar() {
  const user = await getSessionUser();

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-ink text-white">
      <Link href="/" className="font-display font-semibold text-lg flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-signal inline-block" />
        AI Code Reviewer
      </Link>
      <div className="flex items-center gap-5 text-sm">
        {user ? (
          <>
            <Link href="/dashboard" className="opacity-80 hover:opacity-100">Dashboard</Link>
            <Link href="/reviewer" className="opacity-80 hover:opacity-100">Reviewer</Link>
            <Link href="/history" className="opacity-80 hover:opacity-100">History</Link>
            {user.role === "ADMIN" && (
              <Link href="/admin" className="opacity-80 hover:opacity-100">Admin</Link>
            )}
            <Link href="/settings" className="opacity-80 hover:opacity-100">{user.displayName || user.username}</Link>
            <form action="/api/auth/logout" method="post">
              <button className="border border-white/20 rounded px-3 py-1 hover:border-white/50">
                Log out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="opacity-80 hover:opacity-100">Log in</Link>
            <Link href="/register" className="bg-signal rounded px-3 py-1.5 font-semibold">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
