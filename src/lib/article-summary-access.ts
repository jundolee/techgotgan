import "server-only";

const ARTICLE_SUMMARY_ADMIN_EMAIL = "yijunsuc@gmail.com";

export function canViewArticleSummary(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ARTICLE_SUMMARY_ADMIN_EMAIL;
}
