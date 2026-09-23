import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminPage() {
  // Redirects to /dashboard if the signed-in user isn't ADMIN — this check
  // happens here on the server, not by hiding a link in the navbar.
  await requireAdmin();

  const [userCount, reviewCount, users] = await Promise.all([
    prisma.user.count(),
    prisma.codeReview.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, username: true, email: true, role: true, emailVerified: true, createdAt: true },
    }),
  ]);

  return (
    <main className="max-w-4xl mx-auto px-8 py-14">
      <h1 className="font-display text-2xl font-semibold mb-6">Admin dashboard</h1>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <div className="card p-5">
          <p className="text-sm text-black/50">Users</p>
          <p className="font-display text-3xl font-semibold">{userCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-black/50">Reviews</p>
          <p className="font-display text-3xl font-semibold">{reviewCount}</p>
        </div>
      </div>

      <h2 className="font-display text-lg font-semibold mb-3">Users</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper2 text-left">
            <tr>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Verified</th>
              <th className="px-4 py-2">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 font-medium">{u.username}</td>
                <td className="px-4 py-2 text-black/60">{u.email}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2">{u.emailVerified ? "Yes" : "No"}</td>
                <td className="px-4 py-2 text-black/60">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
