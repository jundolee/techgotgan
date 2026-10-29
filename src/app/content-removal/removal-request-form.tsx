"use client";

import { useActionState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";
import { submitArticleRemovalRequest, type ArticleRemovalRequestState } from "./actions";

const INITIAL_STATE: ArticleRemovalRequestState = { status: "idle", message: "" };

export function RemovalRequestForm() {
  const [state, formAction, pending] = useActionState(submitArticleRemovalRequest, INITIAL_STATE);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 560 }}>
      <TextField name="articleUrl" label="삭제를 요청할 게시글 주소">
        <TextFieldInput
          type="url"
          placeholder="https://example.com/post"
          autoComplete="url"
          maxLength={2_048}
          required
        />
      </TextField>
      <TextField name="reason" label="요청 사유">
        <TextFieldTextarea
          placeholder="저작권, 개인정보, 잘못된 게시 정보 등 요청 사유를 적어 주세요."
          minLength={10}
          maxLength={2_000}
          required
          style={{ minHeight: 140 }}
        />
      </TextField>
      <TextField name="contactEmail" label="회신 이메일 (선택)">
        <TextFieldInput type="email" placeholder="you@example.com" autoComplete="email" maxLength={254} />
      </TextField>

      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}
      >
        <label>
          웹사이트
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <p style={{ margin: 0, color: "var(--seed-color-fg-neutral-muted)", lineHeight: 1.6 }}>
        요청 내용과 선택한 회신 이메일은 Resend를 통해 운영자에게 전달됩니다. 이메일을 적지 않아도 요청할 수 있습니다.
      </p>

      <ActionButton type="submit" size="small" disabled={pending}>
        {pending ? "전송 중…" : "삭제 요청 보내기"}
      </ActionButton>

      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          aria-live={state.status === "error" ? "assertive" : "polite"}
          style={{ margin: 0, color: state.status === "error" ? "var(--seed-color-fg-critical)" : "var(--seed-color-fg-positive)" }}
        >
          {state.message}
          {state.status === "error" && state.message.includes("이메일로 직접 문의") && (
            <> <a href="mailto:yijunsuc@gmail.com">이메일 보내기</a></>
          )}
          {state.status === "error" && state.message.includes("운영자 이메일로 문의") && (
            <> <a href="mailto:yijunsuc@gmail.com">이메일 보내기</a></>
          )}
        </p>
      )}
    </form>
  );
}
