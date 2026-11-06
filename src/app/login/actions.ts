"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { migrateVisitorDataToUser } from "@/lib/data/articles";
import { safeNextPath } from "@/lib/safe-next-path";
import { normalizeSignupReason, type SignupReason } from "@/lib/auth-funnel";
import type { AuthFlow } from "@/lib/analytics";
import { LEGACY_VISITOR_COOKIE_NAME, VISITOR_COOKIE_NAME } from "@/lib/visitor";

type OAuthProvider = "google";

function redirectToSignupError(message: string, next: string, reason?: SignupReason): never {
  const params = new URLSearchParams({ intent: "signup", error: message });
  if (next !== "/") params.set("next", next);
  if (reason) params.set("reason", reason);
  redirect(`/login?${params}`);
}

function redirectToSignupConfirmation(next: string, reason?: SignupReason): never {
  const params = new URLSearchParams({ intent: "signup", status: "confirmation_sent" });
  if (next !== "/") params.set("next", next);
  if (reason) params.set("reason", reason);
  redirect(`/login?${params}`);
}

// 로그인 전 익명 방문자 쿠키로 쌓아둔 읽음/즐겨찾기 기록을 최초 로그인 시 이 계정으로 옮긴다
// (docs/decisions.md 참고). 방문자 쿠키가 없으면(이미 옮겨졌거나 애초에 없던 경우) 아무 일도 안 한다.
async function migrateVisitorDataIfNeeded(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const visitorId =
    cookieStore.get(VISITOR_COOKIE_NAME)?.value ?? cookieStore.get(LEGACY_VISITOR_COOKIE_NAME)?.value;
  if (!visitorId) return;
  await migrateVisitorDataToUser(visitorId, userId);
}

// Vercel(프리뷰 배포 포함)과 로컬 개발 모두에서 정확한 절대 URL을 만들기 위해 실제 요청 헤더에서
// origin을 구성한다 — 하드코딩된 프로덕션 도메인 대신 이 방식을 쓰면 프리뷰 배포에서도 그대로 동작한다.
async function getOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}

export async function signInWithProviderAction(
  provider: OAuthProvider,
  next: string,
  flow: AuthFlow,
  signupReason: SignupReason | undefined,
  _formData: FormData,
) {
  void _formData;
  const origin = await getOrigin();
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", safeNextPath(next));
  if (flow === "signup") callbackUrl.searchParams.set("intent", "signup");
  if (flow === "signup" && signupReason) callbackUrl.searchParams.set("reason", signupReason);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl.toString(),
      // Signing out of this app does not sign out of Google; force its account chooser so users can switch accounts.
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    const params = new URLSearchParams({ error: error?.message ?? "로그인을 시작하지 못했어요" });
    if (flow === "signup") params.set("intent", "signup");
    if (next !== "/") params.set("next", safeNextPath(next));
    if (flow === "signup" && signupReason) params.set("reason", signupReason);
    redirect(`/login?${params}`);
  }
  redirect(data.url);
}

export async function signUpAction(formData: FormData) {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const next = safeNextPath(formData.get("next"));
  const signupReason = normalizeSignupReason(formData.get("reason"));

  if (!nickname || !email || !password) {
    redirectToSignupError("닉네임, 이메일, 비밀번호를 입력해주세요", next, signupReason);
  }
  if (password !== passwordConfirm) {
    redirectToSignupError("비밀번호가 서로 일치하지 않아요", next, signupReason);
  }

  const origin = await getOrigin();
  const emailRedirectTo = new URL("/auth/callback", origin);
  emailRedirectTo.searchParams.set("next", next);
  emailRedirectTo.searchParams.set("intent", "signup");
  if (signupReason) emailRedirectTo.searchParams.set("reason", signupReason);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname }, emailRedirectTo: emailRedirectTo.toString() },
  });

  if (error) {
    redirectToSignupError(error.message, next, signupReason);
  }
  // Supabase returns a user with no session when email confirmation is required. Do not
  // redirect as if the person were logged in; the email callback completes the actual session.
  if (!data.session) redirectToSignupConfirmation(next, signupReason);

  if (data.user) {
    await migrateVisitorDataIfNeeded(data.user.id);
  }
  redirect(next);
}

export async function signInWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    redirect("/login?error=이메일과 비밀번호를 입력해주세요");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  if (data.user) {
    await migrateVisitorDataIfNeeded(data.user.id);
  }
  redirect(next);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
