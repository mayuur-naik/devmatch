"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const session = await getServerSession(authOptions);
  const githubUser = (session?.user as any)?.githubUser;

  if (!githubUser) {
    throw new Error("You must be logged in with GitHub to create a project.");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const techStack = formData.get("techStack") as string;
  const repoUrl = formData.get("repoUrl") as string;

  const user = await prisma.user.findUnique({
    where: { githubUser },
  });

  if (!user) throw new Error("User record not found.");

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

export async function joinProject(formData: FormData) {
  const session = await getServerSession(authOptions);
  const githubUser = (session?.user as any)?.githubUser;

  if (!githubUser) {
    throw new Error("You must be logged in to join projects.");
  }

  const projectId = formData.get("projectId") as string;
  const role = formData.get("role") as string;

  const user = await prisma.user.findUnique({
    where: { githubUser },
  });

  if (!user) throw new Error("User not found.");

  const existingMember = await prisma.projectMember.findFirst({
    where: { userId: user.id, projectId },
  });

  if (!existingMember) {
    await prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        role: role || "Contributor",
      },
    });
  }

  revalidatePath("/");
  revalidatePath(`/${githubUser}`);
}
