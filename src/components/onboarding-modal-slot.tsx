import { OnboardingModal } from "@/components/onboarding-modal";
import { canViewArticleSummary } from "@/lib/article-summary-access";

export async function OnboardingModalSlot() {
  return <OnboardingModal showSummaryStep={canViewArticleSummary()} />;
}
