"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import type { SignupReason } from "@/lib/auth-funnel";
import { signUpAction } from "./actions";

// 회원가입 경로로 직접 들어온 경우 이메일 가입 폼을 바로 펼친다.
export function SignUpSection({ next, reason, initiallyOpen = false }: {
  next: string;
  reason?: SignupReason;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  if (!open) {
    return (
      <ActionButton type="button" variant="neutralOutline" size="small" onClick={() => setOpen(true)}>
        회원가입
      </ActionButton>
    );
  }

  return (
    <form action={signUpAction} className="auth-signup-form" data-auth-method="email_password" data-auth-flow="signup" data-auth-reason={reason}>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="reason" value={reason ?? ""} />
      <TextField name="nickname" label="닉네임">
        <TextFieldInput type="text" autoComplete="nickname" required />
      </TextField>
      <TextField name="email" label="이메일">
        <TextFieldInput type="email" autoComplete="email" placeholder="you@example.com" required />
      </TextField>
      <TextField name="password" label="비밀번호 (6자 이상)">
        <TextFieldInput type="password" autoComplete="new-password" required minLength={6} />
      </TextField>
      <TextField name="passwordConfirm" label="비밀번호 확인">
        <TextFieldInput type="password" autoComplete="new-password" required minLength={6} />
      </TextField>
      <ActionButton type="submit" variant="brandSolid" size="medium">
        {reason === "favorite_save" ? "즐겨찾기 저장하고 가입" : reason === "reading_progress" ? "읽음 기록 저장하고 가입" : "회원가입"}
      </ActionButton>
    </form>
  );
}
