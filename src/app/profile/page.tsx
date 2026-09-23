import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireUser();

  const rows: [string, string][] = [
    ["Name", user.displayName || user.username],
    ["Username", user.username],
    ["Email", user.email],
    ["Email verified", user.emailVerified ? "Yes" : "No"],
    ["Role", user.role],
    ["Member since", new Date(user.createdAt).toLocaleDateString()],
  ];

  return (
    <main className="max-w-2xl mx-auto px-8 py-14">
      <h1 className="font-display text-2xl font-semibold mb-6">Profile</h1>
      <div className="card divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-5 py-3 text-sm">
            <span className="text-black/50">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
