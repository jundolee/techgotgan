import { execFileSync } from "node:child_process";

function isDocumentationOnly(path) {
  return path.startsWith("docs/") ||
    ["README.md", "AGENTS.md", "CLAUDE.md"].includes(path);
}

try {
  const changedFiles = execFileSync("git", ["diff", "--name-only", "HEAD^", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim().split("\n").filter(Boolean);

  if (changedFiles.length > 0 && changedFiles.every(isDocumentationOnly)) {
    process.stdout.write("Skipping Vercel build for documentation-only changes.\n");
    process.exit(0);
  }
} catch {
  // If Vercel's checkout does not include the parent commit, build to stay safe.
}

process.stdout.write("Building because application or build inputs changed.\n");
process.exit(1);
