"use client";

import AppLayout from "../../components/layout/AppLayout";

export default function PrivacyPage() {
  return (
    <AppLayout title="PRIVACY">
      <div className="prose prose-invert max-w-4xl">
        <h1>Privacy Policy</h1>
        <p>
          This is a draft Privacy Policy for EVE Log Parser. It explains what
          data we collect, why, and how users can exercise their rights. This
          draft must be reviewed by legal counsel and adapted to your
          jurisdiction before publication.
        </p>

        <h2>Data We Collect</h2>
        <ul>
          <li>
            <strong>Authentication:</strong> CCP/EVE SSO character name and
            character ID when you login via EVE SSO.
          </li>
          <li>
            <strong>Uploaded logs:</strong> Raw combat log files you upload and
            derived parsed data used to provide the service.
          </li>
          <li>
            <strong>Analytics & Crash Reports:</strong> Anonymous usage metrics,
            device information and crash stacks (opt-in configurable).
          </li>
          <li>
            <strong>Support messages:</strong> Email and attachments when you
            contact support.
          </li>
        </ul>

        <h2>Purpose & Legal Basis</h2>
        <p>
          We process uploaded logs to provide parsing and visualization
          (contract performance). Analytics and crash reports are processed on
          consent.
        </p>

        <h2>Retention</h2>
        <p>
          Raw logs: default 1 year (configurable). Parsed aggregates: 2 years.
          Auth tokens are stored only as needed and rotated/expired.
        </p>

        <h2>Third-Party Processors</h2>
        <p>
          We may use processors such as AWS, Sentry and Stripe. We will enter
          DPAs where required by law.
        </p>

        <h2>Your Rights</h2>
        <p>
          You can request access, correction, deletion, or export of your data.
          Contact:{" "}
          <a href="mailto:privacy@eve-log-parser.app">
            privacy@eve-log-parser.app
          </a>
          .
        </p>

        <h2>Contact</h2>
        <p>
          Data controller: [Company Name], [Address]. Email:{" "}
          <a href="mailto:privacy@eve-log-parser.app">
            privacy@eve-log-parser.app
          </a>
          .
        </p>
      </div>
    </AppLayout>
  );
}
