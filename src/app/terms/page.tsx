"use client";

import AppLayout from "../../components/layout/AppLayout";

export default function TermsPage() {
  return (
    <AppLayout title="TERMS OF SERVICE">
      <div className="flex flex-col gap-6 md:gap-8">
        <div className="bg-space border border-border-default border-t-2 border-t-cyan-dim rounded-sm p-4 md:p-6">
          <div className="prose prose-invert max-w-4xl">
            <h1>Terms of Service (Draft)</h1>
            <p>
              These Terms of Service ("Terms") govern your use of the EVE Log
              Parser application. This is a draft — have legal counsel review
              before publishing.
            </p>

            <h2>1. Acceptance</h2>
            <p>
              By using the service you agree to these Terms. If you do not
              agree, do not use the service.
            </p>

            <h2>2. Service Description</h2>
            <p>
              The service parses and visualizes EVE Online combat logs you
              upload.
            </p>

            <h2>3. User Content</h2>
            <p>
              You grant us a non-exclusive license to process, store and display
              any logs you upload. You are responsible for any content you
              upload.
            </p>

            <h2>4. Account & SSO</h2>
            <p>
              Authentication uses CCP/EVE SSO. We only request scopes necessary
              to identify your character. We do not claim affiliation with CCP.
            </p>

            <h2>5. Liability & Warranty</h2>
            <p>
              The service is provided "as is" without warranties. Liability is
              limited to the maximum extent permitted by law.
            </p>

            <h2>6. Governing Law</h2>
            <p>These Terms are governed by the laws of [Your Jurisdiction].</p>

            <h2>7. Changes</h2>
            <p>
              We may modify these Terms. Material changes will be notified via
              the app or email.
            </p>

            <h2>Contact</h2>
            <p>
              Contact:{" "}
              <a href="mailto:legal@eve-log-parser.app">
                legal@eve-log-parser.app
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
