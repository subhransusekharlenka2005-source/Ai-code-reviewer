export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireUser();

  const rows: [string, string][] = [
    ["Display Name", user.displayName || user.username],
    ["Username", user.username],
    ["Email", user.email],
    ["Email Verified", user.emailVerified ? "✓ Yes" : "Pending"],
    ["Account Role", user.role],
    ["Member Since", new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })],
  ];

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">User Profile</h1>
        <p className="text-xs sm:text-sm text-black/60 mt-1">
          Review your account credentials and system authorization.
        </p>
      </div>

      <div className="card bg-white divide-y divide-line overflow-hidden shadow-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col sm:flex-row sm:justify-between px-4 sm:px-5 py-3.5 text-xs sm:text-sm gap-1 sm:gap-4">
            <span className="text-black/50 font-medium">{label}</span>
            <span className="font-semibold text-ink break-all">{value}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
