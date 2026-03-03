"use client";

import AppLayout from "../../components/layout/AppLayout";

export default function ImpressumPage() {
  return (
    <AppLayout title="IMPRESSUM">
      <div className="flex flex-col gap-6 md:gap-8">
        <div className="bg-space border border-border-default border-t-2 border-t-cyan-dim rounded-sm p-4 md:p-6">
          <div className="prose prose-invert max-w-2xl">
            <h1>Impressum</h1>
            <p>
              This is a draft Impressum. Fill in the company details before
              publishing.
            </p>

            <h2>Provider</h2>
            <p>
              [Company Name]
              <br />
              [Street Address]
              <br />
              [Postal Code] [City]
              <br />
              Country: [Country]
            </p>

            <h2>Contact</h2>
            <p>
              Email:{" "}
              <a href="mailto:contact@eve-log-parser.app">
                contact@eve-log-parser.app
              </a>
              <br />
              Phone: [Phone Number]
            </p>

            <h2>Company Details</h2>
            <p>
              Legal form: [e.g., GmbH] <br /> Commercial register: [Number]{" "}
              <br /> VAT ID: [VAT ID]
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
