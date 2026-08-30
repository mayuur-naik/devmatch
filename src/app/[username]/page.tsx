import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: { username: string };
}

export default async function ProfilePage({ params }: Props) {
  const user = await prisma.user.findUnique({
    where: { githubUser: params.username },
    include: {
      projects: true,
      joined: {
        include: { project: true },
      },
    },
  });

  if (!user) {
    return (
      <main className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <h1 className="text-xl font-bold">User @{params.username} not found</h1>
        <Link href="/" className="text-blue-600 text-sm">Return Home</Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <Link href="/" className="text-sm text-blue-600">← Back to Feed</Link>

      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">@{user.githubUser}</h1>
        <p className="text-gray-500 text-sm">Verified Proof-of-Work Portfolio</p>
      </div>

      {/* Projects Created */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Projects Founded ({user.projects.length})</h2>
        {user.projects.length === 0 ? (
          <p className="text-sm text-gray-500">Has not posted any projects.</p>
        ) : (
          <div className="grid gap-3">
            {user.projects.map((p) => (
              <div key={p.id} className="border p-4 rounded space-y-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{p.title}</h3>
                  <a href={p.repoUrl} target="_blank" className="text-xs text-blue-600 underline">
                    Repo ↗
                  </a>
                </div>
                <p className="text-sm text-gray-600">{p.description}</p>
                <span className="text-xs text-gray-400">Stack: {p.techStack}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Projects Contributed To */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Contributions & Roles ({user.joined.length})</h2>
        {user.joined.length === 0 ? (
          <p className="text-sm text-gray-500">Has not joined any external projects yet.</p>
        ) : (
          <div className="grid gap-3">
            {user.joined.map((membership) => (
              <div key={membership.id} className="border p-4 rounded bg-gray-50 space-y-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{membership.project.title}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded">
                    {membership.role}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{membership.project.description}</p>
                <a
                  href={membership.project.repoUrl}
                  target="_blank"
                  className="text-xs text-blue-600 underline block"
                >
                  View Code Repository ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}