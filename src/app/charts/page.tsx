import { Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ChartsClient from "./ChartsClient";

export default function ChartsPage() {
  return (
    <AppLayout title="COMBINED CHART">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-text-muted font-mono text-sm animate-pulse">
              LOADING CHARTS...
            </p>
          </div>
        }
      >
        <ChartsClient />
      </Suspense>
    </AppLayout>
  );
}
