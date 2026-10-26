import type { Metadata } from "next";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";
import { PageHeader } from "@/components/page-header";
import { SITE_NAME } from "@/app/seo";
import { sendFeatureFeedbackAction, suggestSourceAction } from "./actions";

export const metadata: Metadata = {
  title: "블로그 제안 및 기능 피드백",
  description: `${SITE_NAME}에 추가할 테크 블로그를 제안하거나 기능 의견을 보내주세요.`,
  robots: { index: false, follow: true },
  alternates: { canonical: "/suggest" },
};

export default async function SuggestPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string; feedbackDone?: string; feedbackError?: string }>;
}) {
  const { done, error, feedbackDone, feedbackError } = await searchParams;

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader navHref="/" navLabel="글 목록" />

      <Text as="h1" textStyle="t8Bold" color="fg.neutral">
        블로그 제안 및 기능 피드백
      </Text>
      <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
        {SITE_NAME}이 모았으면 하는 테크 블로그가 있나요? 주소를 남겨주시면 검토 후 추가할게요.
      </Text>

      <form
        action={suggestSourceAction}
        style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}
      >
        <TextField name="url" label="블로그 주소">
          <TextFieldInput type="url" placeholder="https://example.com" required />
        </TextField>
        <TextField name="note" label="한마디 (선택)">
          <TextFieldTextarea placeholder="어떤 점이 좋은지 알려주시면 검토에 도움이 돼요" style={{ minHeight: 80 }} />
        </TextField>
        <ActionButton type="submit" size="small">
          추천하기
        </ActionButton>
      </form>

      {done && (
        <Text as="p" textStyle="t3Regular" color="fg.positive">
          제안해주셔서 감사합니다. 검토 후 추가할게요.
        </Text>
      )}
      {error && (
        <Text as="p" textStyle="t3Regular" color="fg.critical">
          {error}
        </Text>
      )}

      <section id="feature-feedback" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        <Text as="h2" textStyle="t6Bold" color="fg.neutral">
          기능 피드백
        </Text>
        <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          불편한 점이나 추가되었으면 하는 기능을 보내주세요. 어떤 상황에서 필요했는지 함께 적어주시면 검토에 도움이 됩니다.
        </Text>
        <form action={sendFeatureFeedbackAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
          <TextField name="message" label="기능 의견">
            <TextFieldTextarea placeholder="불편한 점이나 추가되었으면 하는 기능을 적어주세요" required maxLength={10_000} style={{ minHeight: 120 }} />
          </TextField>
          <TextField name="replyEmail" label="답변받을 이메일 (선택)">
            <TextFieldInput type="email" autoComplete="email" placeholder="you@example.com" />
          </TextField>
          <ActionButton type="submit" size="small">
            피드백 보내기
          </ActionButton>
        </form>
        {feedbackDone && (
          <Text as="p" textStyle="t3Regular" color="fg.positive">
            의견을 보내주셔서 감사합니다. 검토할게요.
          </Text>
        )}
        {feedbackError && (
          <Text as="p" textStyle="t3Regular" color="fg.critical">
            {feedbackError}
          </Text>
        )}
      </section>
    </main>
  );
}
