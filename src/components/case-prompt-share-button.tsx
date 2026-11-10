"use client";

import { useState } from "react";
import { trackShareActionCompleted } from "@/lib/analytics";

type CasePromptShareButtonProps = {
  title: string;
  prompt: string;
  href: string;
  campaign: string;
  className?: string;
};

export function CasePromptShareButton({ title, prompt, href, campaign, className }: CasePromptShareButtonProps) {
  const [message, setMessage] = useState("");

  function getTrackedUrl(): string {
    const url = new URL(href, window.location.origin);
    url.searchParams.set("utm_source", "techgotgan");
    url.searchParams.set("utm_medium", "team_prompt");
    url.searchParams.set("utm_campaign", campaign);
    return url.toString();
  }

  async function copyText(value: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Fall through to the compatibility path below.
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }

  async function handleShare() {
    const trackedUrl = getTrackedUrl();
    const text = `${prompt}\n\n참고 사례: ${trackedUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `팀에서 나눌 사례: ${title}`, text, url: trackedUrl });
        trackShareActionCompleted("web_share", "case_collection");
        setMessage("공유했어요.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    const copied = await copyText(text);
    if (copied) {
      trackShareActionCompleted("link_copy", "case_collection");
      setMessage("질문과 링크를 복사했어요.");
    } else {
      setMessage("복사하지 못했어요. 다시 시도해 주세요.");
    }
  }

  return (
    <div className={className}>
      <button type="button" onClick={() => void handleShare()}>
        회의 질문 공유
      </button>
      <span role="status" aria-live="polite">{message}</span>
    </div>
  );
}
