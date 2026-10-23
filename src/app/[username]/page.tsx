import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

// `params` is a Promise in Next.js 15+. Awaiting it is also harmless on 14.
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

function parseTechStack(techStack: string): string[] {
  return techStack
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

/** Only allow http(s) links so a stored `javascript:` URL can never be rendered as an href. */
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
    (total, project) => total + project._count.members,
    0
  );

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        ← Back to Feed
      </Link>

      {/* ------------------------------ Header ------------------------------ */}
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar
            avatarUrl={user.avatarUrl}
            initials={getInitials(user.name, user.githubUser)}
            alt={`${displayName}'s avatar`}
          />

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <h1 className="truncate text-2xl font-bold text-gray-900 sm:text-3xl">
                {displayName}
              </h1>
              <p className="text-sm text-gray-500">@{user.githubUser}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                ✓ Verified Proof-of-Work Portfolio
              </span>
              <a
                href={`https://github.com/${encodeURIComponent(user.githubUser)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-gray-700"
              >
                View GitHub ↗
              </a>
            </div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-gray-100 pt-6 sm:grid-cols-4">
          <Stat label="Projects founded" value={user.projects.length.toString()} />
          <Stat label="Teams joined" value={user.joined.length.toString()} />
          <Stat label="Contributors onboarded" value={contributorsOnboarded.toString()} />
          <Stat label="Member since" value={formatMonthYear(user.createdAt)} />
        </dl>
      </header>

      {/* ------------------- Section 1: Verified Proof-of-Work ------------------- */}
      <section aria-labelledby="proof-of-work-heading" className="space-y-4">
        <SectionHeading
          id="proof-of-work-heading"
          title="Verified Proof-of-Work"
          subtitle="Teams where this developer was approved as a contributor."
          count={user.joined.length}
        />

        {user.joined.length === 0 ? (
          <EmptyState
            icon="🤝"
            title="No verified contributions yet"
            description={`@${user.githubUser} hasn't been approved onto any teams yet. Approved roles will appear here as proof-of-work.`}
          />
        ) : (
          <ul className="grid gap-4">
            {user.joined.map((membership) => (
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
            icon="🚀"
            title="No projects created yet"
            description={`@${user.githubUser} hasn't posted any projects. Check back soon.`}
          />
        ) : (
          <ul className="grid gap-4">
            {user.projects.map((project) => (
              <li key={project.id}>
                <OwnedProjectCard project={project} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
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
      // Plain <img> avoids needing next/image remotePatterns for avatars.githubusercontent.com
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={alt}
        width={96}
        height={96}
        className="h-24 w-24 shrink-0 rounded-full border-2 border-white object-cover shadow ring-1 ring-gray-200"
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow ring-1 ring-gray-200"
    >
      {initials}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-gray-900">{value}</dd>
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
    <div className="border-b border-gray-200 pb-3">
      <div className="flex items-center gap-2">
        <h2 id={id} className="text-xl font-bold text-gray-900">
          {title}
        </h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
          {count}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
      <div className="text-3xl" aria-hidden="true">
        {icon}
      </div>
      <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{description}</p>
    </div>
  );
}

function TechTags({ techStack }: { techStack: string }) {
  const tags = parseTechStack(techStack);

  if (tags.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Tech stack">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
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
    return <span className="text-xs text-gray-400">Repository unavailable</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
    >
      {label} ↗
    </a>
  );
}

function JoinedProjectCard({ membership }: { membership: Membership }) {
  const { project, role } = membership;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
              <span aria-hidden="true">✓</span>
              {role}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
          <p className="text-xs text-gray-500">
            Founded by{" "}
            <Link
              href={`/${encodeURIComponent(project.owner.githubUser)}`}
              className="font-medium text-blue-600 hover:underline"
            >
              @{project.owner.githubUser}
            </Link>
          </p>
        </div>
        <RepoLink repoUrl={project.repoUrl} label="View Code" />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-gray-600">{project.description}</p>

      <div className="mt-4">
        <TechTags techStack={project.techStack} />
      </div>
    </article>
  );
}

function OwnedProjectCard({ project }: { project: OwnedProject }) {
  const contributorCount = project._count.members;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
          <p className="text-xs text-gray-500">
            Created {formatMonthYear(project.createdAt)}
          </p>
        </div>
        <RepoLink repoUrl={project.repoUrl} label="GitHub Repo" />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-gray-600">{project.description}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TechTags techStack={project.techStack} />
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <span aria-hidden="true">👥</span>
          {contributorCount} active {plural(contributorCount, "contributor")}
        </span>
      </div>
    </article>
  );
}
