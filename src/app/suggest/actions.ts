"use server";

import { redirect } from "next/navigation";
import { insertSourceSuggestion } from "@/lib/data/source-suggestions";

export async function suggestSourceAction(formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!url) {
    redirect("/suggest?error=블로그 주소를 입력해주세요");
  }

  try {
    await insertSourceSuggestion(url, note || null);
  } catch {
    redirect(`/suggest?error=${encodeURIComponent("추천을 저장하지 못했어요. 잠시 후 다시 시도해주세요")}`);
  }
  redirect("/suggest?done=1");
}

export async function sendFeatureFeedbackAction(formData: FormData) {
  const message = String(formData.get("message") ?? "").trim();
  const replyEmail = String(formData.get("replyEmail") ?? "").trim();

  if (!message) {
    redirect("/suggest?feedbackError=의견을 입력해주세요#feature-feedback");
  }
  if (message.length > 10_000) {
    redirect("/suggest?feedbackError=의견은%2010%2C000자%20이내로%20작성해주세요#feature-feedback");
  }
  if (replyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail)) {
    redirect("/suggest?feedbackError=답변받을%20이메일%20주소를%20확인해주세요#feature-feedback");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    redirect("/suggest?feedbackError=메일%20접수%20설정이%20아직%20완료되지%20않았습니다.#feature-feedback");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [process.env.FEEDBACK_TO_EMAIL || "yijunsuc@gmail.com"],
      subject: "[테크곳간] 기능 피드백",
      text: `${message}${replyEmail ? `\n\n답변받을 이메일: ${replyEmail}` : ""}`,
      ...(replyEmail ? { reply_to: replyEmail } : {}),
    }),
  }).catch(() => null);

  if (!response?.ok) {
    redirect("/suggest?feedbackError=메일%20전송에%20실패했어요.%20잠시%20후%20다시%20시도해주세요.#feature-feedback");
  }

  redirect("/suggest?feedbackDone=1#feature-feedback");
}
