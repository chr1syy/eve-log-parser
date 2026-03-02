"use client";

import { FleetProvider } from "@/contexts/FleetContext";

export default function FleetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FleetProvider>{children}</FleetProvider>;
}
