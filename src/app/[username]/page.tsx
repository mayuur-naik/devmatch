import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { User, Project, ProjectMember, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type PageProps = {
  params: Promise<{ username: string }>;
};

const profileInclude = {
  projects: {
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true } },
    },
  },
  joined: {
    orderBy: { project: { createdAt: "desc" } },
    include: {
      project: {
        include: {
          owner: { select: { githubUser: true } },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

type ProfileUser = Prisma.UserGetPayload<{ include: typeof profileInclude }>;
type OwnedProject = ProfileUser["projects"][number];
type Membership = ProfileUser["joined"][number];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function safeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function getInitials(name: string | null, githubUser: string): string {
  const source = (name?.trim() || githubUser).replace(/^@/, "");
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function plural(count: number, singular: string, pluralForm?: string): string {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`);
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { githubUser: username },
    select: { githubUser: true, name: true },
  });

  if (!user) {
    return { title: "User not found | DevMatch" };
  }

  const displayName = user.name?.trim() || `@${user.githubUser}`;

  return {
    title: `${displayName} (@${user.githubUser}) | DevMatch`,
    description: `Verified proof-of-work portfolio for @${user.githubUser} on DevMatch.`,
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { githubUser: username },
    include: profileInclude,
  });

  if (!user) {
    notFound();
  }

  const displayName = user.name?.trim() || user.githubUser;
  const contributorsOnboarded = user.projects.reduce(
  (total: number, project: any) => total + (project._count?.members || 0),
  0
);

  return (
    <div className="min-h-screen pb-20">
      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
        {/* Navigation back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors group"
        >
          <span className="text-zinc-600 group-hover:text-zinc-300 transition-colors">←</span>
          <span>Back to Feed</span>
        </Link>

        {/* ------------------------------ Header ------------------------------ */}
        <header className="relative rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-md shadow-2xl overflow-hidden space-y-8">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar
              avatarUrl={user.avatarUrl}
              initials={getInitials(user.name, user.githubUser)}
              alt={`${displayName}'s avatar`}
            />

            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
                  {displayName}
                </h1>
                <p className="text-sm font-mono text-zinc-400">@{user.githubUser}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 text-xs font-mono font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Verified Proof-of-Work
                </span>

                <a
                  href={`https://github.com/${encodeURIComponent(user.githubUser)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 hover:bg-white px-3 py-1.5 text-xs font-medium text-zinc-950 shadow-sm transition-all"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub Profile</span>
                  <span className="text-zinc-500">↗</span>
                </a>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 border-t border-zinc-800/80 pt-6 sm:grid-cols-4">
            <Stat label="Projects Founded" value={user.projects.length.toString()} />
            <Stat label="Teams Joined" value={user.joined.length.toString()} />
            <Stat label="Contributors Onboarded" value={contributorsOnboarded.toString()} />
            <Stat label="Member Since" value={formatMonthYear(user.createdAt)} />
          </dl>
        </header>

        {/* ------------------- Section 1: Verified Proof-of-Work ------------------- */}
        <section aria-labelledby="proof-of-work-heading" className="space-y-4">
          <SectionHeading
            id="proof-of-work-heading"
            title="Verified Proof-of-Work"
            subtitle="Teams where this developer was approved as an active contributor."
            count={user.joined.length}
          />

          {user.joined.length === 0 ? (
            <EmptyState
              title="No verified contributions yet"
              description={`@${user.githubUser} hasn't been approved onto any teams yet. Approved roles will appear here as proof-of-work.`}
            />
          ) : (
            <ul className="grid gap-4">
              {user.joined.map((membership: any) => (
                <li key={membership.id}>
                  <JoinedProjectCard membership={membership} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ----------------------- Section 2: Created Projects ----------------------- */}
        <section aria-labelledby="created-projects-heading" className="space-y-4">
          <SectionHeading
            id="created-projects-heading"
            title="Created Projects"
            subtitle="Projects this developer founded and leads."
            count={user.projects.length}
          />

          {user.projects.length === 0 ? (
            <EmptyState
              title="No projects created yet"
              description={`@${user.githubUser} hasn't posted any projects. Check back soon.`}
            />
          ) : (
            <ul className="grid gap-4">
              {user.projects.map((project: any) => (
                <li key={project.id}>
                  <OwnedProjectCard project={project} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Presentational components                                                 */
/* -------------------------------------------------------------------------- */

function Avatar({
  avatarUrl,
  initials,
  alt,
}: {
  avatarUrl: string | null;
  initials: string;
  alt: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={alt}
        width={96}
        height={96}
        className="h-24 w-24 shrink-0 rounded-2xl border border-zinc-700/80 bg-zinc-900 object-cover shadow-xl ring-1 ring-zinc-800"
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-zinc-700/80 text-2xl font-bold font-mono text-zinc-100 shadow-xl"
    >
      {initials}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 space-y-1">
      <dt className="text-[10px] font-mono font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="text-xl font-semibold tracking-tight text-zinc-100">{value}</dd>
    </div>
  );
}

function SectionHeading({
  id,
  title,
  subtitle,
  count,
}: {
  id: string;
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div className="border-b border-zinc-800/80 pb-3">
      <div className="flex items-center gap-2">
        <h2 id={id} className="text-lg font-semibold tracking-tight text-zinc-100">
          {title}
        </h2>
        <span className="rounded-md bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
          {count}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-zinc-400 font-light">{subtitle}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center space-y-2">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      <p className="mx-auto max-w-sm text-xs text-zinc-500 font-light">{description}</p>
    </div>
  );
}

function parseTechStack(techStack: string | string[]): string[] {
  if (Array.isArray(techStack)) {
    return techStack.flatMap((t) => t.split(",")).map((tag) => tag.trim()).filter(Boolean);
  }
  return techStack
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function TechTags({ techStack }: { techStack: string | string[] }) {
  const tags = parseTechStack(techStack);

  if (tags.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Tech stack">
      {tags.map((tag) => (
        <li
          key={tag}
          className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-950/60 border border-zinc-800 text-zinc-400"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

function RepoLink({ repoUrl, label }: { repoUrl: string; label: string }) {
  const href = safeExternalUrl(repoUrl);

  if (!href) {
    return <span className="text-xs font-mono text-zinc-600">Unavailable</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-white transition-all"
    >
      <span>{label}</span>
      <span className="text-zinc-500">↗</span>
    </a>
  );
}

function JoinedProjectCard({ membership }: { membership: Membership }) {
  const { project, role } = membership;

  return (
    <article className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-sm transition-all hover:border-zinc-700/80 hover:bg-zinc-900/70 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-0.5 text-[11px] font-mono font-medium text-indigo-300">
              <span aria-hidden="true" className="text-emerald-400">✓</span>
              {role}
            </span>
          </div>
          <h3 className="text-base font-semibold text-zinc-100">{project.title}</h3>
          <p className="text-xs text-zinc-400">
            Founded by{" "}
            <Link
              href={`/${encodeURIComponent(project.owner.githubUser)}`}
              className="font-mono text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
            >
              @{project.owner.githubUser}
            </Link>
          </p>
        </div>
        <RepoLink repoUrl={project.repoUrl} label="View Code" />
      </div>

      <p className="text-xs text-zinc-300 leading-relaxed font-light">{project.description}</p>

      <div className="pt-1">
        <TechTags techStack={project.techStack} />
      </div>
    </article>
  );
}

function OwnedProjectCard({ project }: { project: OwnedProject }) {
  const contributorCount = project._count.members;

  return (
    <article className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-sm transition-all hover:border-zinc-700/80 hover:bg-zinc-900/70 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-semibold text-zinc-100">{project.title}</h3>
          <p className="text-xs font-mono text-zinc-500">
            Created {formatMonthYear(project.createdAt)}
          </p>
        </div>
        <RepoLink repoUrl={project.repoUrl} label="GitHub Repo" />
      </div>

      <p className="text-xs text-zinc-300 leading-relaxed font-light">{project.description}</p>

      <div className="pt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TechTags techStack={project.techStack} />
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 text-[11px] font-mono text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {contributorCount} active {plural(contributorCount, "contributor")}
        </span>
      </div>
    </article>
  );
}