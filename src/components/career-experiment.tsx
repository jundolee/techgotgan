"use client";

import { useState } from "react";
import { track } from "@amplitude/analytics-browser";

function record(action: string, detail: string) {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" || !process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) return;
  track("career_guide_interaction", { guide: "toss_frontend", action, detail });
}

export function CareerLink({ href, id, children }: { href: string; id: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => record("source_click", id)} style={{ color: "#b44d11", fontWeight: 700 }}>{children} ↗</a>;
}

export function CareerFeedback() {
  const [answer, setAnswer] = useState<string | null>(null);
  return <div>
    <p style={{ marginBottom: 12 }}>이 페이지가 기업과 직무를 이해하는 데 도움이 됐나요?</p>
    {answer ? <p role="status">의견을 남겨주셔서 감사합니다.</p> : <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {[{ label: "도움됐어요", value: "helpful" }, { label: "아쉬워요", value: "not_helpful" }].map((item) => <button key={item.value} type="button" onClick={() => { record("feedback", item.value); setAnswer(item.value); }} style={{ padding: "10px 16px", border: "1px solid #d6d6d6", borderRadius: 8, background: "white", cursor: "pointer", font: "inherit" }}>{item.label}</button>)}
    </div>}
  </div>;
}
