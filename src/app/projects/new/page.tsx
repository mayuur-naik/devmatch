import { createProject } from "../../actions";
import Link from "next/link";

export default function NewProjectPage() {
  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <Link href="/" className="text-sm text-blue-600">← Back to Feed</Link>
      <h1 className="text-2xl font-bold">Post a New Project</h1>

      <form action={createProject} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Your GitHub Username</label>
          <input
            name="githubUser"
            required
            placeholder="e.g. octocat"
            className="w-full border rounded p-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Project Title</label>
          <input
            name="title"
            required
            placeholder="e.g. Open Source Markdown Editor"
            className="w-full border rounded p-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description & Help Needed</label>
          <textarea
            name="description"
            rows={3}
            required
            placeholder="What are you building? What kind of contributors are you looking for?"
            className="w-full border rounded p-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tech Stack (comma-separated)</label>
          <input
            name="techStack"
            required
            placeholder="Next.js, TypeScript, Tailwind, SQLite"
            className="w-full border rounded p-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">GitHub Repo URL</label>
          <input
            name="repoUrl"
            type="url"
            required
            placeholder="https://github.com/username/repo"
            className="w-full border rounded p-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700"
        >
          Publish Project
        </button>
      </form>
    </main>
  );
}