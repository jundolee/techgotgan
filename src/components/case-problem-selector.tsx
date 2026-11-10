"use client";

import Link from "next/link";
import { trackCaseProblemSelected } from "@/lib/analytics";

const options = [
  { kind: "workflow_automation", label: "반복 업무 줄이기", href: "#banksalad-case" },
  { kind: "quality_checks", label: "실수 줄이기", href: "#kurly-case" },
  { kind: "search_experience", label: "검색 결과 개선", href: "#naver-case" },
] as const;

export function CaseProblemSelector({ className }: { className: string }) {
  return (
    <nav className={className} aria-label="문제 유형별 사례">
      {options.map((option) => (
        <Link
          key={option.kind}
          href={option.href}
          onClick={() => trackCaseProblemSelected(option.kind)}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
