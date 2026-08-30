"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const githubUser = formData.get("githubUser") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const techStack = formData.get("techStack") as string;
  const repoUrl = formData.get("repoUrl") as string;

  const user = await prisma.user.upsert({
    where: { githubUser },
    update: {},
    create: { githubUser, name: githubUser },
  });

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
  const projectId = formData.get("projectId") as string;
  const githubUser = formData.get("githubUser") as string;
  const role = formData.get("role") as string;

  const user = await prisma.user.upsert({
    where: { githubUser },
    update: {},
    create: { githubUser, name: githubUser },
  });

  await prisma.projectMember.create({
    data: {
      projectId,
      userId: user.id,
      role: role || "Contributor",
    },
  });

  revalidatePath("/");
  revalidatePath(`/${githubUser}`);
}