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
    <div className="min-h-screen pb-20">
      {/* Sticky Glass Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-zinc-700/80 flex items-center justify-center shadow-inner group-hover:border-zinc-500 transition-colors">
              <svg className="w-4 h-4 text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-zinc-100 flex items-center gap-1.5">
                DevMatch
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-400 border border-zinc-700/50">Beta</span>
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {session ? (
              <>
                <Link
                  href={`/${currentGithubUser}`}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-md text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  @{currentGithubUser}
                </Link>

                <Link
                  href="/projects/new"
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-900 px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Post Project</span>
                </Link>

                <a
                  href="/api/auth/signout"
                  className="text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-all"
                >
                  Sign Out
                </a>
              </>
            ) : (
              <a
                href="/api/auth/signin/github"
                className="inline-flex items-center gap-2 text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>Continue with GitHub</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 space-y-10">
        {/* Hero Section */}
        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-[11px] font-mono text-zinc-400">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Ecosystem Discovery
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-100">
            Find collaborators. Ship fast.<br />
            <span className="text-zinc-500 font-normal">Build verified proof-of-work.</span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl font-light leading-relaxed">
            Discover open-source and side-project teams looking for builders. Join roles, submit PRs, and cement your contributions on your developer profile.
          </p>
        </section>

        {/* Project Feed Section */}
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs uppercase tracking-wider font-mono font-medium text-zinc-400">
                Explore Open Projects
              </h2>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
                {projects.length}
              </span>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-2xl p-12 text-center space-y-4 bg-zinc-900/20">
              <div className="h-10 w-10 mx-auto rounded-full bg-zinc-800/60 flex items-center justify-center text-zinc-400 border border-zinc-700/50">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-200">No projects posted yet</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Be the first developer to start a collaborative initiative and assemble your team.
                </p>
              </div>
              {session && (
                <Link
                  href="/projects/new"
                  className="inline-flex items-center gap-1 text-xs font-medium bg-zinc-100 text-zinc-950 px-3 py-1.5 rounded-lg hover:bg-white transition-all"
                >
                  + Post the First Project
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-5">
              {projects.map((project: any) => {
                const isOwner = currentGithubUser === project.owner.githubUser;
                const isMember = project.members.some((m: any) => m.user.githubUser === currentGithubUser);
                const userApplication = project.applications.find((a: any) => a.user.githubUser === currentGithubUser);
                const pendingApplications = project.applications.filter((a: any) => a.status === "PENDING");

                return (
                  <article
                    key={project.id}
                    className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700/80 transition-all duration-300 p-6 space-y-5 backdrop-blur-sm"
                  >
                    {/* Top Row: Title, Owner & GitHub Link */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold tracking-tight text-zinc-100 group-hover:text-white transition-colors">
                            {project.title}
                          </h3>
                        </div>
                        <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                          <span>Created by</span>
                          <Link
                            href={`/${project.owner.githubUser}`}
                            className="font-mono text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400 transition-colors"
                          >
                            @{project.owner.githubUser}
                          </Link>
                        </p>
                      </div>

                      {project.repoUrl && (
                        <a
                          href={project.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-300 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition-all w-fit self-start"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                          </svg>
                          <span>Repository</span>
                          <span className="text-zinc-500">↗</span>
                        </a>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-zinc-300 leading-relaxed font-light">
                      {project.description}
                    </p>

                    {/* Tech Stack Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {project.techStack.split(",").map((tech: string, i: number) => (
                        <span
                          key={i}
                          className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-950/60 border border-zinc-800 text-zinc-400"
                        >
                          {tech.trim()}
                        </span>
                      ))}
                    </div>

                    {/* Team & Application Row */}
                    <div className="border-t border-zinc-800/60 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Contributors listing */}
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span className="font-mono text-zinc-500 uppercase text-[10px] tracking-wider">
                          Builders ({project.members.length}):
                        </span>
                        {project.members.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {project.members.map((m: any, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/40 border border-zinc-800 text-zinc-300 text-[11px] font-mono"
                              >
                                @{m.user.githubUser}
                                <span className="text-zinc-500 text-[10px]">({m.role})</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic">No contributors yet</span>
                        )}
                      </div>

                      {/* User Actions / Status */}
                      {session && (
                        <div className="flex items-center justify-start md:justify-end">
                          {isOwner ? (
                            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                              Project Owner
                            </span>
                          ) : isMember ? (
                            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                              Active Member
                            </span>
                          ) : userApplication?.status === "PENDING" ? (
                            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/60 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                              Request Pending
                            </span>
                          ) : (
                            <form action={applyToProject} className="flex items-center gap-2 w-full sm:w-auto">
                              <input type="hidden" name="projectId" value={project.id} />
                              <input
                                type="text"
                                name="role"
                                placeholder="Role (e.g. Frontend, Rust Dev)"
                                required
                                className="text-xs font-mono bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-600 transition-colors w-full sm:w-56"
                              />
                              <button
                                type="submit"
                                className="text-xs font-medium whitespace-nowrap bg-zinc-100 hover:bg-white text-zinc-900 px-3 py-1.5 rounded-lg shadow-sm transition-all"
                              >
                                Join
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Owner Approval Panel */}
                    {isOwner && pendingApplications.length > 0 && (
                      <div className="border-t border-zinc-800/80 -mx-6 -mb-6 p-5 rounded-b-2xl bg-zinc-950/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-mono font-medium uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Pending Join Requests ({pendingApplications.length})
                          </p>
                        </div>

                        <div className="grid gap-2">
                          {pendingApplications.map((app: any) => (
                            <div
                              key={app.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/${app.user.githubUser}`}
                                  className="font-mono font-medium text-zinc-200 hover:text-white underline underline-offset-4 decoration-zinc-700"
                                >
                                  @{app.user.githubUser}
                                </Link>
                                <span className="text-zinc-500">•</span>
                                <span className="text-zinc-400 font-mono">
                                  Role: <strong className="text-zinc-200 font-medium">{app.role}</strong>
                                </span>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <form action={approveApplication.bind(null, app.id)}>
                                  <button
                                    type="submit"
                                    className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 px-3 py-1 rounded-lg text-xs font-medium transition-all"
                                  >
                                    Approve
                                  </button>
                                </form>
                                <form action={rejectApplication.bind(null, app.id)}>
                                  <button
                                    type="submit"
                                    className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-3 py-1 rounded-lg text-xs font-medium transition-all"
                                  >
                                    Decline
                                  </button>
                                </form>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
