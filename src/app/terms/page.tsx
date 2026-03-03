"use client";

import AppLayout from "../../components/layout/AppLayout";

export default function TermsPage() {
  return (
    <AppLayout title="Terms">
      <div className="flex flex-col gap-6 md:gap-8">
        <div className="bg-space border border-border-default border-t-2 border-t-cyan-dim rounded-sm p-6">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-bold mb-2">
              Terms of Service (Draft)
            </h1>

            <p className="text-text-secondary mb-4">
              These Terms of Service ("Terms") govern your use of the EVE Log
              Parser application. This is a draft — have legal counsel review
              before publishing.
            </p>

            <section className="mb-4">
              <h3 className="font-semibold">1. Acceptance</h3>
              <p className="text-text-secondary">
                By using the service you agree to these Terms. If you do not
                agree, do not use the service.
              </p>
            </section>

            <section className="mb-4">
              <h3 className="font-semibold">2. Service</h3>
              <p className="text-text-secondary">
                The service parses and visualizes EVE Online combat logs you
                upload.
              </p>
            </section>

            <section className="mb-4">
              <h3 className="font-semibold">3. User content</h3>
              <p className="text-text-secondary">
                You grant us a non-exclusive license to process, store and
                display any logs you upload. You are responsible for any content
                you upload.
              </p>
            </section>

            <section className="mb-4">
              <h3 className="font-semibold">4. Account & SSO</h3>
              <p className="text-text-secondary">
                Authentication uses CCP/EVE SSO. We only request scopes
                necessary to identify your character. We do not claim
                affiliation with CCP. All intellectual property rights in the
                EVE Online game, including the EVE name, logos, and in-game
                content, are the property of CCP hf. For more information see
                <a
                  className="ml-1 text-cyan-glow"
                  href="https://www.ccpgames.com/"
                >
                  CCP
                </a>
                .
              </p>
            </section>

            <section className="mb-4">
              <h3 className="font-semibold">5. Liability & warranty</h3>
              <p className="text-text-secondary">
                The service is provided "as is" without warranties. Liability is
                limited to the maximum extent permitted by law.
              </p>
            </section>

            <section className="mb-4">
              <h3 className="font-semibold">6. Governing law</h3>
              <p className="text-text-secondary">
                These Terms are governed by the laws of [Your Jurisdiction].
              </p>
            </section>

            <section>
              <h3 className="font-semibold">Contact</h3>
              <p className="text-text-secondary">
                Contact:{" "}
                <a
                  className="text-cyan-glow"
                  href="mailto:legal@eve-log-parser.app"
                >
                  legal@eve-log-parser.app
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
