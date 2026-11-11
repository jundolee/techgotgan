import Link from "next/link";
import { problemGuides } from "@/lib/content/problem-guides";

export function RelatedProblemGuides({ category }: { category: string }) {
  const guides = problemGuides.filter((guide) => guide.categories.includes(category));
  if (guides.length === 0) return null;
  return (
    <aside aria-label="관련 문제 해결 가이드" style={{ display: "grid", gap: 8, padding: 18, border: "1px solid #fed7aa", borderRadius: 12, background: "#fffaf5" }}>
      <p style={{ fontWeight: 700 }}>사례를 우리 팀에 적용하기 전에</p>
      {guides.map((guide) => <Link key={guide.slug} href={`/guides/${guide.slug}`} style={{ display: "inline-flex", alignItems: "center", minHeight: 44, color: "#9a3412", textDecoration: "underline", textUnderlineOffset: 4 }}>{guide.title} →</Link>)}
    </aside>
  );
}
