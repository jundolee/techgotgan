import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { GoogleIcon } from "@/components/google-icon";
import { AuthFormTracking } from "@/components/auth-form-tracking";
import { safeNextPath } from "@/lib/safe-next-path";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { signInWithPasswordAction, signInWithProviderAction } from "./actions";
import { SignUpSection } from "./signup-section";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; intent?: string; status?: string }>;
}) {
  const { next, error, intent, status } = await searchParams;
  const redirectTo = safeNextPath(next);
  const isSignupIntent = intent === "signup";
  const confirmationSent = status === "confirmation_sent";
  const signupParams = new URLSearchParams({ intent: "signup" });
  if (next) signupParams.set("next", redirectTo);
  const signupHref = `/login?${signupParams}`;
  const loginHref = next ? `/login?next=${encodeURIComponent(redirectTo)}` : "/login";

  const user = await getCurrentUser();
  if (user) redirect(redirectTo);

  return (
    <main className={`auth-page${isSignupIntent ? " auth-page--signup" : ""}`}>
      <AuthFormTracking flow={isSignupIntent ? "signup" : "login"} />
      <div className="auth-heading">
        <Text as="h1" textStyle="t9Bold" color="fg.neutral">
          {isSignupIntent ? "회원가입" : "로그인"}
        </Text>

        {isSignupIntent ? (
          <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
            계정을 만들면 읽음 표시와 즐겨찾기를 저장하고, 다른 기기에서도 이어서 볼 수 있어요.
          </Text>
        ) : null}
      </div>

      {error && (
        <Text as="p" role="alert" textStyle="t3Regular" color="fg.critical">
          {error}
        </Text>
      )}

      {confirmationSent && (
        <Text as="p" role="status" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          주소가 가입 가능한 이메일이라면 확인 메일을 보냈습니다. 메일의 확인 링크를 누르면 로그인 상태로 돌아오고, 읽던 페이지를 이어볼 수 있어요.
        </Text>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <form
          action={signInWithProviderAction.bind(null, "google", redirectTo)}
          data-auth-method="google"
          data-auth-flow={isSignupIntent ? "signup" : "login"}
        >
          <ActionButton
            type="submit"
            size="medium"
            variant="neutralOutline"
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <GoogleIcon />
            {isSignupIntent ? "Google로 시작하기" : "Google로 계속하기"}
          </ActionButton>
        </form>
      </div>

      {isSignupIntent ? (
        confirmationSent ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <Link href={loginHref} className="auth-account-switch-link">
              이미 이메일을 확인하셨나요? 로그인
            </Link>
            <Link href={signupHref} className="auth-account-switch-link">
              다른 이메일로 가입하기
            </Link>
          </div>
        ) : (
          <>
            <div className="auth-email-section">
              <div className="auth-divider-label"><span>또는</span></div>
              <Text as="h2" textStyle="t6Bold" color="fg.neutral">
                이메일로 가입
              </Text>
              <SignUpSection next={redirectTo} initiallyOpen />
            </div>
            <Link href={loginHref} className="auth-account-switch-link">
              이미 계정이 있나요? 로그인
            </Link>
          </>
        )
      ) : (
        <>
          <div className="auth-email-section">
            <div className="auth-divider-label"><span>또는</span></div>
            <Text as="h2" textStyle="t6Bold" color="fg.neutral">
              이메일로 로그인
            </Text>
            <form action={signInWithPasswordAction} data-auth-method="email_password" data-auth-flow="login" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input type="hidden" name="next" value={redirectTo} />
              <TextField name="email" label="이메일">
                <TextFieldInput type="email" autoComplete="email" placeholder="you@example.com" required />
              </TextField>
              <TextField name="password" label="비밀번호">
                <TextFieldInput type="password" autoComplete="current-password" required minLength={6} />
              </TextField>
              <ActionButton type="submit" size="medium">
                로그인
              </ActionButton>
            </form>
          </div>
          <Link href={signupHref} className="auth-account-switch-link">
            처음 오셨나요? 무료 회원가입
          </Link>
        </>
      )}
    </main>
  );
}
