"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const MAX_UPDATE_LENGTH = 2000;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_ROLE_LENGTH = 60;

// Helper to get authenticated user
async function getAuthUser() {
  const session = await getServerSession(authOptions);
  const githubUser = (session?.user as any)?.githubUser;
  if (!githubUser) return null;

  return await prisma.user.findUnique({
    where: { githubUser },
  });
}

export async function createProject(formData: FormData) {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("You must be logged in with GitHub to create a project.");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const techStack = formData.get("techStack") as string;
  const repoUrl = formData.get("repoUrl") as string;

  await prisma.project.create({
    data: {
      title,
      description,
      techStack,
      repoUrl,
      ownerId: user.id,
    },
  });

  revalidatePath("/");
  redirect("/");
}

// 1. Submit Join Request (Application)
export async function applyToProject(formData: FormData) {
  const user = await getAuthUser();
  if (!user) throw new Error("You must be logged in.");

  const projectId = String(formData.get("projectId") ?? "");
  const role = String(formData.get("role") ?? "").trim() || "Contributor";
  const message = String(formData.get("message") ?? "").trim();

  if (!projectId) throw new Error("Missing project.");
  if (role.length > MAX_ROLE_LENGTH) throw new Error("Role is too long.");
  if (message.length > MAX_MESSAGE_LENGTH) throw new Error("Message is too long.");

  // Check if project exists and user isn't the owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) throw new Error("Project not found.");
  if (project.ownerId === user.id) throw new Error("You are the owner of this project.");

  // Guard: members (and accepted applicants) must not be reset back to PENDING
  const [existingMember, existingApplication] = await Promise.all([
    prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: user.id, projectId } },
    }),
    prisma.application.findUnique({
      where: { userId_projectId: { userId: user.id, projectId } },
    }),
  ]);

  if (existingMember || existingApplication?.status === "ACCEPTED") {
    throw new Error("You are already a member of this project.");
  }

  // Create pending application (re-applying after a rejection is allowed)
  await prisma.application.upsert({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId,
      },
    },
    update: {
      role,
      message,
      status: "PENDING",
    },
    create: {
      projectId,
      userId: user.id,
      role,
      message,
      status: "PENDING",
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
}

// 2. Owner Approves Application
export async function approveApplication(applicationId: string) {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized.");

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { project: true },
  });

  if (!app || app.project.ownerId !== user.id) {
    throw new Error("Only the project owner can approve applications.");
  }

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: { status: "ACCEPTED" },
    }),
    prisma.projectMember.upsert({
      where: {
        userId_projectId: {
          userId: app.userId,
          projectId: app.projectId,
        },
      },
      update: { role: app.role },
      create: {
        userId: app.userId,
        projectId: app.projectId,
        role: app.role,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath(`/projects/${app.projectId}`);
}

// 3. Owner Rejects Application
export async function rejectApplication(applicationId: string) {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized.");

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { project: true },
  });

  if (!app || app.project.ownerId !== user.id) {
    throw new Error("Only the project owner can reject applications.");
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: { status: "REJECTED" },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${app.projectId}`);
}

// 4. Owner / Member Posts a Progress Update
export async function addProjectUpdate(formData: FormData) {
  const user = await getAuthUser();
  if (!user) throw new Error("You must be logged in.");

  const projectId = String(formData.get("projectId") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!projectId) throw new Error("Missing project.");
  if (content.length === 0) throw new Error("Update cannot be empty.");
  if (content.length > MAX_UPDATE_LENGTH) {
    throw new Error(`Update must be ${MAX_UPDATE_LENGTH} characters or fewer.`);
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      members: { where: { userId: user.id }, select: { id: true } },
    },
  });

  if (!project) throw new Error("Project not found.");

  const canPost = project.ownerId === user.id || project.members.length > 0;
  if (!canPost) {
    throw new Error("Only the owner or team members can post updates.");
  }

  await prisma.projectUpdate.create({
    data: {
      projectId,
      authorId: user.id,
      content,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}
