import assert from "node:assert/strict";
import test from "node:test";
import { resolveArticleTags } from "../src/lib/ingestion/category-classifier";

test("fills empty AI tags from article text before using category fallback", () => {
  assert.deepEqual(resolveArticleTags("ai_ml", [], "OpenClaw agent workflow", null), ["agent"]);
});

test("recognizes EKS as a Kubernetes tag", () => {
  assert.deepEqual(resolveArticleTags("devops", [], "AWS EKS blue-green deployment", null), ["k8s", "cloud"]);
});

test("uses a category fallback when a specific category has no detectable term", () => {
  assert.deepEqual(resolveArticleTags("backend", [], "A team's internal playbook", null), ["backend"]);
});

test("keeps general articles untagged when there is no technical signal", () => {
  assert.deepEqual(resolveArticleTags("general", [], "A team story", null), []);
});

test("preserves rule-detected tags even when the stored category is general", () => {
  assert.deepEqual(resolveArticleTags("general", [], "React and TypeScript", null), ["react", "typescript"]);
});

test("normalizes, deduplicates, and caps supplied model tags", () => {
  assert.deepEqual(resolveArticleTags("general", [" React ", "react", "TypeScript", "CSS", "web"], "", null), [
    "react",
    "typescript",
    "css",
  ]);
});
