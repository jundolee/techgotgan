import { OnboardingModal } from "@/components/onboarding-modal";
import { canViewArticleSummary } from "@/lib/article-summary-access";

export function OnboardingModalSlot({ initialOpen, showTrigger }: { initialOpen: boolean; showTrigger: boolean }) {
  return (
    <OnboardingModal
      showSummaryStep={canViewArticleSummary()}
      initialOpen={initialOpen}
      showTrigger={showTrigger}
    />
  );
}
