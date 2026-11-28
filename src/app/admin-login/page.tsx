import type { Metadata } from "next";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { safeNextPath } from "@/lib/safe-next-path";
import { adminLoginAction } from "./actions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const redirectTo = safeNextPath(next ?? "/sources");
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim()).filter(Boolean);
  const adminPasswordConfigured = Boolean(process.env.ADMIN_PASSWORD);
  const missingAdminConfiguration = error === "configuration" ||
    (process.env.NODE_ENV === "production" && adminEmails.length === 0 && !adminPasswordConfigured);

  return (
    <main style={{ maxWidth: 360, margin: "120px auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <Text as="h1" textStyle="t7Bold" color="fg.neutral">
        관리자 로그인
      </Text>

      {missingAdminConfiguration ? (
        <Text as="p" textStyle="t3Regular" color="fg.critical">
          관리자 인증 설정이 아직 완료되지 않았습니다.
        </Text>
      ) : adminEmails.length > 0 ? (
        <Text as="p" textStyle="t3Regular" color="fg.neutral">
          관리자 계정으로 로그인해 주세요.
        </Text>
      ) : (
        <form action={adminLoginAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input type="hidden" name="next" value={redirectTo} />
          <TextField name="password" label="비밀번호">
            <TextFieldInput type="password" required autoFocus />
          </TextField>
          <ActionButton type="submit" size="small">
            로그인
          </ActionButton>
        </form>
      )}

      {error && !missingAdminConfiguration && (
        <Text as="p" textStyle="t3Regular" color="fg.critical">
          비밀번호가 올바르지 않습니다.
        </Text>
      )}
    </main>
  );
}
