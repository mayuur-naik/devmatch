"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  const projectId = formData.get("projectId") as string;
  const role = (formData.get("role") as string) || "Contributor";
  const message = formData.get("message") as string;

  // Check if project exists and user isn't the owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) throw new Error("Project not found.");
  if (project.ownerId === user.id) throw new Error("You are the owner of this project.");

  // Create pending application
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
}
