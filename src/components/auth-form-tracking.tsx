"use client";

import { useEffect } from "react";
import { trackAuthAttemptStarted, trackAuthPageViewed, type AuthFlow, type AuthMethod } from "@/lib/analytics";
import { normalizeSignupReason, type SignupReason } from "@/lib/auth-funnel";

function isAuthMethod(value: string | undefined): value is AuthMethod {
  return value === "google" || value === "email_password";
}

function isAuthFlow(value: string | undefined): value is AuthFlow {
  return value === "login" || value === "signup";
}

export function AuthFormTracking({ flow, signupReason }: { flow: AuthFlow; signupReason?: SignupReason }) {
  useEffect(() => {
    trackAuthPageViewed(flow, signupReason);

    function onSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const method = form.dataset.authMethod;
      const authFlow = form.dataset.authFlow;
      if (isAuthMethod(method) && isAuthFlow(authFlow)) {
        const reason = authFlow === "signup" ? normalizeSignupReason(form.dataset.authReason) : undefined;
        trackAuthAttemptStarted(method, authFlow, reason);
      }
    }

    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, [flow, signupReason]);

  return null;
}
