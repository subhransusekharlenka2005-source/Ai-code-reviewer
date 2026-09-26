import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminPage() {
  // Redirects to /dashboard if the signed-in user isn't ADMIN
  await requireAdmin();

  let userCount = 0;
  let reviewCount = 0;
  let users: Array<{
    id: string;
    username: string;
    email: string;
    role: string;
    emailVerified: boolean;
    createdAt: Date;
  }> = [];

  try {
    const results = await Promise.all([
      prisma.user.count(),
      prisma.codeReview.count(),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      }),
    ]);
    userCount = results[0];
    reviewCount = results[1];
    users = results[2];
  } catch (err) {
    console.warn("Could not query database in AdminPage:", err);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold mb-6 text-ink">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="card p-5 bg-white">
          <p className="text-xs sm:text-sm text-black/50 font-mono uppercase tracking-wider">Total Registered Users</p>
          <p className="font-display text-3xl font-semibold mt-1 text-ink">{userCount}</p>
        </div>
        <div className="card p-5 bg-white">
          <p className="text-xs sm:text-sm text-black/50 font-mono uppercase tracking-wider">Total Code Reviews</p>
          <p className="font-display text-3xl font-semibold mt-1 text-ink">{reviewCount}</p>
        </div>
      </div>

      <h2 className="font-display text-lg font-semibold mb-3 text-ink">Recent Users</h2>
      <div className="card overflow-x-auto min-w-0 max-w-full bg-white shadow-sm">
        <table className="w-full text-xs sm:text-sm whitespace-nowrap">
          <thead className="bg-paper2 text-left text-ink font-semibold">
            <tr>
              <th className="px-4 py-2.5">Username</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Verified</th>
              <th className="px-4 py-2.5">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-black/50">
                  No users found in database.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-paper2/20 transition">
                  <td className="px-4 py-2.5 font-medium">{u.username}</td>
                  <td className="px-4 py-2.5 text-black/60">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      u.role === "ADMIN" ? "bg-signal/10 text-signal" : "bg-black/5 text-black/70"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs ${u.emailVerified ? "text-good font-medium" : "text-black/40"}`}>
                      {u.emailVerified ? "✓ Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-black/60">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
