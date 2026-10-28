import { OnboardingModal } from "@/components/onboarding-modal";
import { canViewArticleSummary } from "@/lib/article-summary-access";
import { getCurrentUser } from "@/lib/supabase/current-user";

export async function OnboardingModalSlot() {
  const user = await getCurrentUser();
  return <OnboardingModal isSummaryAdmin={canViewArticleSummary(user?.email)} />;
}
