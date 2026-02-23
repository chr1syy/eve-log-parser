"use client";

import DataTable, { Column } from "@/components/ui/DataTable";
import { FleetParticipant } from "@/types/fleet";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface FleetParticipantsTableProps {
  participants: FleetParticipant[];
}

export default function FleetParticipantsTable({
  participants,
}: FleetParticipantsTableProps) {
  const getStatusDisplay = (status: FleetParticipant["status"]) => {
    switch (status) {
      case "active":
      case "ready":
        return {
          text: "Survived",
          className: "bg-green-900/20 text-green-400",
        };
      case "inactive":
        return { text: "Killed", className: "bg-red-900/20 text-red-400" };
      default:
        return { text: "Unknown", className: "bg-gray-900/20 text-gray-400" };
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "pilotName",
      label: "Pilot Name",
      sortable: true,
    },
    {
      key: "shipType",
      label: "Ship Type",
      sortable: true,
    },
    {
      key: "damageDealt",
      label: "DMG Dealt",
      sortable: true,
      numeric: true,
      render: (value) => (
        <span title={`(raw: ${value})`}>{formatNumber(value as number)}</span>
      ),
    },
    {
      key: "damageTaken",
      label: "DMG Taken",
      sortable: true,
      numeric: true,
      render: (value) => (
        <span title={`(raw: ${value})`}>{formatNumber(value as number)}</span>
      ),
    },
    {
      key: "repsGiven",
      label: "Reps Given",
      sortable: true,
      numeric: true,
      render: (value) => (
        <span title={`(raw: ${value})`}>{formatNumber(value as number)}</span>
      ),
    },
    {
      key: "repsTaken",
      label: "Reps Taken",
      sortable: true,
      numeric: true,
      render: (value) => (
        <span title={`(raw: ${value})`}>{formatNumber(value as number)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value, row) => {
        const { text, className } = getStatusDisplay(
          value as FleetParticipant["status"],
        );
        return (
          <span
            className={cn("px-2 py-1 rounded text-xs font-medium", className)}
          >
            {text}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={participants as unknown as Record<string, unknown>[]}
      searchable={false}
      rowKey={(row) => String((row as unknown as FleetParticipant).pilotName)}
      defaultSortKey="damageDealt"
      defaultSortDirection="desc"
    />
  );
}
