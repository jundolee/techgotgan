import "server-only";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/supabase/current-user";
import {
  ADMIN_COOKIE_NAME,
  LEGACY_ADMIN_COOKIE_NAME,
  isAdminEmailAllowed,
  isAdminGateConfigured,
  isAdminPasswordCookieAllowed,
} from "@/lib/admin-auth";

/** Check authorization at the operation boundary, even when a page proxy also gates the UI. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const adminEmails = process.env.ADMIN_EMAILS;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!isAdminGateConfigured(adminEmails, adminPassword)) {
    return process.env.NODE_ENV !== "production";
  }

  if ((adminEmails ?? "").split(",").some((email) => email.trim().length > 0)) {
    const user = await getCurrentUser().catch(() => null);
    return isAdminEmailAllowed(adminEmails, user?.email);
  }

  const cookieStore = await cookies();
  const cookieValue =
    cookieStore.get(ADMIN_COOKIE_NAME)?.value ?? cookieStore.get(LEGACY_ADMIN_COOKIE_NAME)?.value;
  return isAdminPasswordCookieAllowed(adminPassword, cookieValue);
}

export async function assertAdminAccess(): Promise<void> {
  if (!(await isCurrentUserAdmin())) {
    throw new Error("Admin access required");
  }
}

export type AdminAccessResult<T> = { authorized: true; value: T } | { authorized: false };

export async function withAdminAccess<T>(
  operation: () => T | Promise<T>,
): Promise<AdminAccessResult<Awaited<T>>> {
  try {
    await assertAdminAccess();
  } catch {
    return { authorized: false };
  }
  return { authorized: true, value: await operation() };
}
