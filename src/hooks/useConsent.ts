"use client";

import { useState } from "react";

const KEY = "eve_consent_analytics";

export function useConsent() {
  const [consent, setConsent] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === "true") return true;
      if (raw === "false") return false;
      return null;
    } catch {
      return null;
    }
  });

  function giveConsent() {
    try {
      localStorage.setItem(KEY, "true");
      // Expose a global flag so other modules can check
      // (minimal integration for gating analytics)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.__EVE_CONSENT_ANALYTICS = true;
      setConsent(true);
    } catch {
      setConsent(true);
    }
  }

  function revokeConsent() {
    try {
      localStorage.setItem(KEY, "false");
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.__EVE_CONSENT_ANALYTICS = false;
      setConsent(false);
    } catch {
      setConsent(false);
    }
  }

  return { consent, giveConsent, revokeConsent } as const;
}
