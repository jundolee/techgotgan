"use client";

import { useEffect } from "react";
import { trackAuthAttemptStarted, trackAuthPageViewed, type AuthFlow, type AuthMethod } from "@/lib/analytics";

function isAuthMethod(value: string | undefined): value is AuthMethod {
  return value === "google" || value === "email_password";
}

function isAuthFlow(value: string | undefined): value is AuthFlow {
  return value === "login" || value === "signup";
}

export function AuthFormTracking({ flow }: { flow: AuthFlow }) {
  useEffect(() => {
    trackAuthPageViewed(flow);

    function onSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const method = form.dataset.authMethod;
      const authFlow = form.dataset.authFlow;
      if (isAuthMethod(method) && isAuthFlow(authFlow)) {
        trackAuthAttemptStarted(method, authFlow);
      }
    }

    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, [flow]);

  return null;
}
