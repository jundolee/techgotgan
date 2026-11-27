import assert from "node:assert/strict";
import test from "node:test";
import { resolveArticleTags } from "../src/lib/ingestion/category-classifier";

test("fills empty AI tags from article text before using category fallback", () => {
  assert.deepEqual(resolveArticleTags("ai_ml", [], "OpenClaw agent workflow", null), ["agent"]);
});

test("recognizes EKS as a Kubernetes tag", () => {
  assert.deepEqual(resolveArticleTags("devops", [], "AWS EKS blue-green deployment", null), ["k8s", "cloud"]);
});

test("recognizes One UI articles as mobile", () => {
  assert.deepEqual(resolveArticleTags("general", [], "Samsung One UI 9.5", "A camera feature update"), ["android"]);
});

test("adds UI and typography tags to font articles", () => {
  assert.deepEqual(resolveArticleTags("general", [], "Allo, a free UI font", null), ["ui", "typography"]);
});

test("tags data-center GPU coverage with infrastructure terms", () => {
  assert.deepEqual(resolveArticleTags("general", [], "GPU infrastructure and data center supply", null), ["gpu", "infrastructure"]);
});

test("tags article classification tooling", () => {
  assert.deepEqual(resolveArticleTags("general", [], "Oxlint and Knip checks for PR diffs", null), ["devtools"]);
});

test("tags matrix multiplication theory as an algorithm topic", () => {
  assert.deepEqual(resolveArticleTags("general", [], "Matrix multiplication exponent reaches 9/4", null), ["algorithm"]);
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
