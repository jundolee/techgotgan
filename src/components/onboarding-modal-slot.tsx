import { cookies } from "next/headers";
import { OnboardingModal } from "@/components/onboarding-modal";
import { canViewArticleSummary } from "@/lib/article-summary-access";

const ONBOARDING_DISMISSED_KEY = "techgotgan_onboarding_dismissed";

export async function OnboardingModalSlot({ forcePreview = false }: { forcePreview?: boolean }) {
  const cookieStore = await cookies();
  const hasDismissedOnboarding = cookieStore.get(ONBOARDING_DISMISSED_KEY)?.value === "true";

  return (
    <OnboardingModal
      showSummaryStep={canViewArticleSummary()}
      initialOpen={forcePreview || !hasDismissedOnboarding}
    />
  );
}
