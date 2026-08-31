import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyToProject, approveApplication, rejectApplication } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const currentGithubUser = (session?.user as any)?.githubUser;

  const projects = await prisma.project.findMany({
    include: {
      owner: true,
      members: { include: { user: true } },
      applications: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">DevMatch</h1>
          <p className="text-gray-500 text-sm">Build projects together & earn verified proof-of-work</p>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link href={`/${currentGithubUser}`} className="text-sm font-semibold hover:underline">
                @{currentGithubUser}
              </Link>
              <Link
                href="/projects/new"
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700"
              >
                + Post Project
              </Link>
              <a
                href="/api/auth/signout"
                className="text-xs text-gray-500 hover:text-black border px-2 py-1.5 rounded"
              >
                Sign Out
              </a>
            </>
          ) : (
            <a
              href="/api/auth/signin/github"
              className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800"
            >
              Sign In with GitHub
            </a>
          )}
        </div>
      </header>

      <div className="grid gap-6">
        {projects.length === 0 && (
          <p className="text-gray-500">No projects yet. Sign in to post the first one!</p>
        )}

        {projects.map((project: any) => {
          const isOwner = currentGithubUser === project.owner.githubUser;
          const isMember = project.members.some((m: any) => m.user.githubUser === currentGithubUser);
          const userApplication = project.applications.find((a: any) => a.user.githubUser === currentGithubUser);
          const pendingApplications = project.applications.filter((a: any) => a.status === "PENDING");

          return (
            <div key={project.id} className="border rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">{project.title}</h2>
                  <p className="text-sm text-gray-500">
                    Posted by{" "}
                    <Link href={`/${project.owner.githubUser}`} className="text-blue-600 underline">
                      @{project.owner.githubUser}
                    </Link>
                  </p>
                </div>
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs bg-gray-100 hover:bg-gray-200 border px-2.5 py-1 rounded"
                >
                  GitHub Repo ↗
                </a>
              </div>

              <p className="text-gray-700">{project.description}</p>

              <div className="flex flex-wrap gap-2">
                {project.techStack.split(",").map((tech: string, i: number) => (
                  <span key={i} className="bg-gray-100 text-xs px-2.5 py-1 rounded-full font-medium">
                    {tech.trim()}
                  </span>
                ))}
              </div>

              <div className="border-t pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-gray-500">
                  <strong>Contributors ({project.members.length}):</strong>{" "}
                  {project.members.map((m: any) => `@${m.user.githubUser} (${m.role})`).join(", ") || "None yet"}
                </div>

                {session && (
                  <div>
                    {isOwner ? (
                      <span className="text-xs bg-gray-200 text-gray-700 px-2.5 py-1 rounded font-medium">
                        Project Owner
                      </span>
                    ) : isMember ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded font-medium">
                        Joined ✓
                      </span>
                    ) : userApplication?.status === "PENDING" ? (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded font-medium">
                        Application Pending ⏳
                      </span>
                    ) : (
                      <form action={applyToProject} className="flex gap-2">
                        <input type="hidden" name="projectId" value={project.id} />
                        <input
                          type="text"
                          name="role"
                          placeholder="Role (e.g. Frontend Dev)"
                          required
                          className="text-xs border rounded px-2 py-1"
                        />
                        <button
                          type="submit"
                          className="text-xs bg-black text-white px-3 py-1 rounded hover:bg-gray-800"
                        >
                          Request to Join
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Owner Approval Panel */}
              {isOwner && pendingApplications.length > 0 && (
                <div className="border-t pt-3 bg-gray-50 -mx-5 -mb-5 p-4 rounded-b-lg space-y-2">
                  <p className="text-xs font-semibold text-gray-700">
                    Pending Join Requests ({pendingApplications.length})
                  </p>
                  <div className="space-y-2">
                    {pendingApplications.map((app: any) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between bg-white border p-2.5 rounded text-xs"
                      >
                        <div>
                          <Link href={`/${app.user.githubUser}`} className="font-semibold text-blue-600 underline">
                            @{app.user.githubUser}
                          </Link>
                          <span className="text-gray-600 ml-1">applied for <strong>{app.role}</strong></span>
                        </div>

                        <div className="flex gap-2">
                          <form action={approveApplication.bind(null, app.id)}>
                            <button
                              type="submit"
                              className="bg-green-600 text-white px-2.5 py-1 rounded text-xs hover:bg-green-700 font-medium"
                            >
                              Approve
                            </button>
                          </form>
                          <form action={rejectApplication.bind(null, app.id)}>
                            <button
                              type="submit"
                              className="bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded text-xs hover:bg-red-100 font-medium"
                            >
                              Reject
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
