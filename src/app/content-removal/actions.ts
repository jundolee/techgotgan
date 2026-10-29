"use server";

export interface ArticleRemovalRequestState {
  status: "idle" | "success" | "error";
  message: string;
}

const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FEEDBACK_RECIPIENT = "yijunsuc@gmail.com";
const MAX_ARTICLE_URL_LENGTH = 2_048;
const MAX_REASON_LENGTH = 2_000;

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function failure(message: string): ArticleRemovalRequestState {
  return { status: "error", message };
}

export async function submitArticleRemovalRequest(
  _previousState: ArticleRemovalRequestState,
  formData: FormData,
): Promise<ArticleRemovalRequestState> {
  // Honeypot: bots that fill hidden fields receive a generic success response without an email being sent.
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "success", message: "요청을 접수했습니다. 확인 후 필요한 조치를 진행하겠습니다." };
  }

  const rawArticleUrl = String(formData.get("articleUrl") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();

  if (rawArticleUrl.length > MAX_ARTICLE_URL_LENGTH) {
    return failure("게시글 주소가 너무 깁니다. 주소를 확인해 주세요.");
  }

  let articleUrl: URL;
  try {
    articleUrl = new URL(rawArticleUrl);
  } catch {
    return failure("게시글의 전체 URL을 입력해 주세요.");
  }
  if (articleUrl.protocol !== "https:" || articleUrl.username || articleUrl.password) {
    return failure("https://로 시작하는 공개 게시글 주소를 입력해 주세요.");
  }

  if (reason.length < 10 || reason.length > MAX_REASON_LENGTH) {
    return failure("삭제 요청 사유를 10자 이상 2,000자 이하로 입력해 주세요.");
  }
  if (contactEmail && !isValidEmail(contactEmail)) {
    return failure("회신 이메일 주소를 확인해 주세요.");
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    console.error("Article removal email is not configured: RESEND_API_KEY or RESEND_FROM_EMAIL is missing.");
    return failure("삭제 요청 접수 메일이 아직 설정되지 않았습니다. yijunsuc@gmail.com으로 직접 문의해 주세요.");
  }
  if (/[\r\n]/.test(from) || from.length > 254) {
    console.error("Article removal email is not configured: RESEND_FROM_EMAIL is invalid.");
    return failure("삭제 요청을 전송하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  const text = [
    "테크곳간 게시글 삭제 요청",
    "",
    `원문 게시글 URL: ${articleUrl.toString()}`,
    "",
    "요청 사유:",
    reason,
    "",
    `회신 이메일: ${contactEmail || "입력하지 않음"}`,
  ].join("\n");

  try {
    const response = await fetch(RESEND_EMAILS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [process.env.FEEDBACK_TO_EMAIL?.trim() || DEFAULT_FEEDBACK_RECIPIENT],
        reply_to: contactEmail || undefined,
        subject: `게시글 삭제 요청: ${articleUrl.hostname}`,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error("Resend rejected an article removal request:", response.status);
      return failure("요청을 전송하지 못했습니다. 잠시 후 다시 시도하거나 운영자 이메일로 문의해 주세요.");
    }
  } catch (error) {
    console.error("Failed to send article removal request via Resend:", error instanceof Error ? error.name : "unknown_error");
    return failure("요청을 전송하지 못했습니다. 잠시 후 다시 시도하거나 운영자 이메일로 문의해 주세요.");
  }

  return { status: "success", message: "삭제 요청을 접수했습니다. 확인 후 필요한 조치를 진행하겠습니다." };
}
