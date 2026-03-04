"use client";

import React from "react";
import { useConsent } from "@/hooks/useConsent";

export default function ConsentBanner() {
  const { consent, giveConsent, revokeConsent } = useConsent();

  // If consent known and true/false, don't show the banner
  if (consent !== null) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 z-50">
      <div className="bg-panel border border-border p-4 rounded-sm shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-sm">
              We use anonymized analytics to improve the product. You can opt in
              to analytics and crash reporting. No tracking is enabled by
              default.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={giveConsent}
                className="px-3 py-1 bg-cyan-glow text-void rounded-sm text-sm"
              >
                Accept
              </button>
              <button
                onClick={revokeConsent}
                className="px-3 py-1 border border-border text-sm rounded-sm"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
