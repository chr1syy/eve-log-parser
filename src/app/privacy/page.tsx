"use client";

import AppLayout from "../../components/layout/AppLayout";

export default function PrivacyPage() {
  return (
    <AppLayout title="Privacy">
      <div className="flex flex-col gap-6 md:gap-8">
        <div className="bg-space border border-border-default border-t-2 border-t-cyan-dim rounded-sm p-6">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>

            <p className="text-base text-text-secondary mb-4">
              This Privacy Policy explains what data we collect, why we collect
              it, and how you can exercise your rights. Please review with legal
              counsel if you need legal advice.
            </p>

            <section className="mb-4">
              <h2 className="text-xl font-semibold">Summary</h2>
              <p className="text-text-secondary">
                We collect the minimum information necessary to provide the
                service: authentication via EVE SSO, any combat logs you upload
                (and derived parse data), optional analytics/crash reports
                (consented), and support messages.
              </p>
            </section>

            <section className="mb-4">
              <h3 className="font-semibold">Data categories</h3>
              <ul className="list-disc list-inside text-text-secondary">
                <li>
                  <strong>Authentication</strong> — CCP/EVE SSO character name
                  and character ID to associate uploads with your account.
                </li>
                <li>
                  <strong>Uploaded logs</strong> — raw log files and parsed
                  /derived data used to produce analyses and visualisations.
                </li>
                <li>
                  <strong>Analytics & crash reports</strong> — anonymized usage
                  metrics and optional crash stacks to improve the product
                  (collected only with consent where required).
                </li>
                <li>
                  <strong>Support messages</strong> — emails and attachments you
                  provide when contacting support.
                </li>
              </ul>
            </section>

            <section className="mb-4">
              <h3 className="font-semibold">Purpose & legal basis</h3>
              <p className="text-text-secondary">
                Uploaded logs and authentication are processed to deliver the
                core functionality (parsing, visualisation, optional storage).
                Analytics and crash reporting are processed to improve the
                product and are collected on the basis of consent where
                required.
              </p>
            </section>

            <section className="mb-4">
              <h3 className="font-semibold">Retention</h3>
              <p className="text-text-secondary">
                We do not set a fixed automatic deletion schedule for uploaded
                logs. If you wish to have your logs or account data removed,
                please contact us and request deletion. We are currently
                establishing a dedicated contact address — for now email
                <a
                  className="ml-1 text-cyan-glow"
                  href="mailto:logs@bleuel-it.de"
                >
                  logs@bleuel-it.de
                </a>
                .
              </p>
            </section>

            <section className="mb-4">
              <h3 className="font-semibold">Third-party processors</h3>
              <p className="text-text-secondary">
                We may use processors such as AWS (storage), Sentry (error
                reporting) and Stripe (payments). Data Processing Agreements
                (DPAs) will be executed where required by law.
              </p>
            </section>

            <section className="mb-4">
              <h3 className="font-semibold">Your rights</h3>
              <p className="text-text-secondary">
                You can request access, correction, deletion or export of your
                personal data. To exercise these rights contact
                <a
                  className="ml-1 text-cyan-glow"
                  href="mailto:logs@bleuel-it.de"
                >
                  logs@bleuel-it.de
                </a>
                .
              </p>
            </section>

            <section>
              <h3 className="font-semibold">Contact</h3>
              <p className="text-text-secondary">
                Contact:{" "}
                <a className="text-cyan-glow" href="mailto:logs@bleuel-it.de">
                  logs@bleuel-it.de
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
