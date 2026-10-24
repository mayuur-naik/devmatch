import Link from "next/link";
import { createProject } from "@/app/actions";

export default function NewProjectPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        ← Back to Feed
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-950 sm:text-3xl">Create a New Project</h1>
        <p className="text-sm text-gray-500">
          Share what you are building and find contributors to join your team.
        </p>
      </div>

      <form action={createProject} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="title" className="block text-sm font-medium text-gray-900">
            Project Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={100}
            placeholder="e.g. DevMatch"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="block text-sm font-medium text-gray-900">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            maxLength={2000}
            placeholder="What does your project do? What problem does it solve?"
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="techStack" className="block text-sm font-medium text-gray-900">
            Tech Stack <span className="font-normal text-gray-400">(comma-separated)</span>
          </label>
          <input
            id="techStack"
            name="techStack"
            type="text"
            required
            placeholder="Next.js, TypeScript, Tailwind CSS, Prisma"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-900">
            GitHub Repository URL
          </label>
          <input
            id="repoUrl"
            name="repoUrl"
            type="url"
            required
            placeholder="https://github.com/username/repo"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Publish Project
        </button>
      </form>
    </main>
  );
}