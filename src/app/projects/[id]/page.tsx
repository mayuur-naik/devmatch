import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { addProjectUpdate, applyToProject } from "@/app/actions";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  Types & data access                                                       */
/* -------------------------------------------------------------------------- */

// `params` is a Promise in Next.js 15+. Awaiting it is also harmless on 14.
type PageProps = {
  params: Promise<{ id: string }>;
};

async function getViewer() {
  const session = await getServerSession(authOptions);
  const githubUser = (session?.user as { githubUser?: string } | undefined)?.githubUser;
  if (!githubUser) return null;

  return prisma.user.findUnique({ where: { githubUser } });
}

/**
 * Only the viewer's OWN application is loaded, so other applicants'
 * messages are never sent to the page.
 */
async function getProject(id: string, viewerId: string | null) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      owner: true,
      members: {
        include: { user: true },
        orderBy: { user: { githubUser: "asc" } },
      },
      applications: {
        where: { userId: viewerId ?? "" },
      },
      updates: {
        orderBy: { createdAt: "desc" },
        include: { author: true },
      },
    },
  });
}

type ProjectData = NonNullable<Awaited<ReturnType<typeof getProject>>>;
type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;
type MemberData = ProjectData["members"][number];
type UpdateData = ProjectData["updates"][number];
type ApplicationData = ProjectData["applications"][number];

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

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function profileHref(githubUser: string): string {
  return `/${encodeURIComponent(githubUser)}`;
}

function plural(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: { title: true, description: true },
  });

  if (!project) {
    return { title: "Project not found | DevMatch" };
  }

  return {
    title: `${project.title} | DevMatch`,
    description: project.description.slice(0, 160),
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;

  const viewer = await getViewer();
  const project = await getProject(id, viewer?.id ?? null);

  if (!project) {
    notFound();
  }

  const isOwner = viewer?.id === project.ownerId;
  const membership = viewer
    ? project.members.find((member) => member.userId === viewer.id) ?? null
    : null;
  const application = project.applications[0] ?? null;
  const canPostUpdates = isOwner || membership !== null;

  const pendingCount = isOwner
    ? await prisma.application.count({
        where: { projectId: project.id, status: "PENDING" },
      })
    : 0;

  // Used to label each update's author with their role on this project.
  const roleByUserId = new Map<string, string>(
    project.members.map((member) => [member.userId, member.role])
  );
  roleByUserId.set(project.ownerId, "Founder");

  const repoHref = safeExternalUrl(project.repoUrl);
  const teamSize = project.members.length + 1; // members + founder

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        ← Back to Feed
      </Link>

      {/* ------------------------------ Header ------------------------------ */}
      <header className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{project.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <Link
                href={profileHref(project.owner.githubUser)}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-1 pr-3 font-medium text-gray-700 transition hover:bg-gray-200"
              >
                <SmallAvatar
                  avatarUrl={project.owner.avatarUrl}
                  initials={getInitials(project.owner.name, project.owner.githubUser)}
                  size="sm"
                />
                <span>@{project.owner.githubUser}</span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                  Owner
                </span>
              </Link>
              <span>Created {formatDate(project.createdAt)}</span>
            </div>
          </div>

          {repoHref ? (
            <a
              href={repoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
            >
              GitHub Repo ↗
            </a>
          ) : (
            <span className="text-xs text-gray-400">Repository unavailable</span>
          )}
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 sm:text-base">
          {project.description}
        </p>

        <TechTags techStack={project.techStack} />
      </header>

      {/* ----------------------- Join Action / Status ----------------------- */}
      <JoinPanel
        projectId={project.id}
        viewer={viewer}
        isOwner={isOwner}
        membership={membership}
        application={application}
        pendingCount={pendingCount}
      />

      {/* --------------------------- Team / Contributors --------------------------- */}
      <section aria-labelledby="team-heading" className="space-y-4">
        <SectionHeading
          id="team-heading"
          title="Team"
          subtitle="The founder and approved contributors."
          count={teamSize}
        />

        <ul className="grid gap-3 sm:grid-cols-2">
          <li>
            <TeamCard
              githubUser={project.owner.githubUser}
              name={project.owner.name}
              avatarUrl={project.owner.avatarUrl}
              role="Founder"
              highlight
            />
          </li>
          {project.members.map((member: MemberData) => (
            <li key={member.id}>
              <TeamCard
                githubUser={member.user.githubUser}
                name={member.user.name}
                avatarUrl={member.user.avatarUrl}
                role={member.role}
              />
            </li>
          ))}
        </ul>

        {project.members.length === 0 && (
          <p className="text-sm text-gray-500">
            No contributors have joined yet. Roles are added as the founder approves applications.
          </p>
        )}
      </section>

      {/* --------------------------- Activity Feed --------------------------- */}
      <section aria-labelledby="activity-heading" className="space-y-4">
        <SectionHeading
          id="activity-heading"
          title="Activity & Progress"
          subtitle="Updates posted by the team, newest first."
          count={project.updates.length}
        />

        {canPostUpdates && (
          <form
            action={addProjectUpdate}
            className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <input type="hidden" name="projectId" value={project.id} />
            <label htmlFor="update-content" className="block text-sm font-medium text-gray-900">
              Post a progress update
            </label>
            <textarea
              id="update-content"
              name="content"
              required
              maxLength={2000}
              rows={3}
              placeholder="What did the team ship, fix, or learn?"
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Up to 2,000 characters.</span>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Post update
              </button>
            </div>
          </form>
        )}

        {project.updates.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No updates yet"
            description={
              canPostUpdates
                ? "Share the first progress update to show what the team is building."
                : "The team hasn't posted any progress updates yet."
            }
          />
        ) : (
          <ol className="relative space-y-6 border-l-2 border-gray-200 pl-6">
            {project.updates.map((update: UpdateData) => (
              <li key={update.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[33px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 ring-2 ring-blue-200"
                />
                <UpdateCard
                  update={update}
                  authorRole={roleByUserId.get(update.authorId) ?? null}
                />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Join panel                                                                */
/* -------------------------------------------------------------------------- */

function JoinPanel({
  projectId,
  viewer,
  isOwner,
  membership,
  application,
  pendingCount,
}: {
  projectId: string;
  viewer: Viewer | null;
  isOwner: boolean;
  membership: MemberData | null;
  application: ApplicationData | null;
  pendingCount: number;
}) {
  if (isOwner) {
    return (
      <Banner tone="amber" icon="👑" title="You own this project">
        {pendingCount > 0 ? (
          <>
            You have <strong>{pendingCount}</strong> pending join{" "}
            {plural(pendingCount, "request")}. Review them from the{" "}
            <Link href="/" className="font-medium underline">
              homepage
            </Link>
            .
          </>
        ) : (
          "No pending join requests right now."
        )}
      </Banner>
    );
  }

  if (membership) {
    return (
      <Banner tone="green" icon="✓" title="You're on the team">
        You joined as <strong>{membership.role}</strong>. You can post progress updates below.
      </Banner>
    );
  }

  if (!viewer) {
    return (
      <Banner tone="gray" icon="🔒" title="Want to contribute?">
        <a
          href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/projects/${projectId}`)}`}
          className="font-medium text-blue-600 underline"
        >
          Sign in with GitHub
        </a>{" "}
        to apply for a role on this project.
      </Banner>
    );
  }

  if (application?.status === "PENDING") {
    return (
      <Banner tone="blue" icon="⏳" title="Application pending">
        Your request to join as <strong>{application.role}</strong> is waiting for the
        founder&apos;s review.
      </Banner>
    );
  }

  return (
    <section
      aria-labelledby="apply-heading"
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="space-y-1">
        <h2 id="apply-heading" className="text-lg font-bold text-gray-900">
          Join this project
        </h2>
        {application?.status === "REJECTED" ? (
          <p className="text-sm text-red-600">
            Your previous application as <strong>{application.role}</strong> wasn&apos;t accepted.
            You&apos;re welcome to apply again with a different role or message.
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            Tell the founder which role you&apos;d like to take on.
          </p>
        )}
      </div>

      <form action={applyToProject} className="space-y-3">
        <input type="hidden" name="projectId" value={projectId} />

        <div className="space-y-1">
          <label htmlFor="apply-role" className="block text-sm font-medium text-gray-900">
            Role
          </label>
          <input
            id="apply-role"
            name="role"
            type="text"
            required
            maxLength={60}
            placeholder="e.g. Frontend Engineer"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="apply-message" className="block text-sm font-medium text-gray-900">
            Message <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="apply-message"
            name="message"
            rows={3}
            maxLength={1000}
            placeholder="Why are you a good fit? Link relevant work."
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Send join request
        </button>
      </form>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Presentational components                                                 */
/* -------------------------------------------------------------------------- */

const bannerTones = {
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  green: "border-green-200 bg-green-50 text-green-900",
  blue: "border-blue-200 bg-blue-50 text-blue-900",
  gray: "border-gray-200 bg-gray-50 text-gray-800",
} as const;

function Banner({
  tone,
  icon,
  title,
  children,
}: {
  tone: keyof typeof bannerTones;
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border px-5 py-4 ${bannerTones[tone]}`}
    >
      <span className="text-xl leading-none" aria-hidden="true">
        {icon}
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm">{children}</p>
      </div>
    </div>
  );
}

function SmallAvatar({
  avatarUrl,
  initials,
  size,
}: {
  avatarUrl: string | null;
  initials: string;
  size: "sm" | "md";
}) {
  const dimension = size === "sm" ? "h-6 w-6 text-[10px]" : "h-10 w-10 text-sm";
  const pixels = size === "sm" ? 24 : 40;

  if (avatarUrl) {
    return (
      // Plain <img> avoids needing next/image remotePatterns for avatars.githubusercontent.com
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={pixels}
        height={pixels}
        className={`${dimension} shrink-0 rounded-full object-cover ring-1 ring-gray-200`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white`}
    >
      {initials}
    </span>
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

function TeamCard({
  githubUser,
  name,
  avatarUrl,
  role,
  highlight = false,
}: {
  githubUser: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={profileHref(githubUser)}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md"
    >
      <SmallAvatar avatarUrl={avatarUrl} initials={getInitials(name, githubUser)} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{name?.trim() || githubUser}</p>
        <p className="truncate text-xs text-gray-500">@{githubUser}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
          highlight
            ? "bg-amber-50 text-amber-800 ring-amber-600/20"
            : "bg-blue-50 text-blue-700 ring-blue-600/20"
        }`}
      >
        {role}
      </span>
    </Link>
  );
}

function UpdateCard({
  update,
  authorRole,
}: {
  update: UpdateData;
  authorRole: string | null;
}) {
  const author = update.author;

  return (
    <article className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <SmallAvatar
          avatarUrl={author.avatarUrl}
          initials={getInitials(author.name, author.githubUser)}
          size="sm"
        />
        <Link
          href={profileHref(author.githubUser)}
          className="text-sm font-semibold text-gray-900 hover:underline"
        >
          @{author.githubUser}
        </Link>
        {authorRole && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {authorRole}
          </span>
        )}
        <time dateTime={update.createdAt.toISOString()} className="ml-auto text-xs text-gray-400">
          {formatDate(update.createdAt)}
        </time>
      </header>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{update.content}</p>
    </article>
  );
}
