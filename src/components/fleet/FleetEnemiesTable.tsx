"use client";

import DataTable, { Column } from "@/components/ui/DataTable";
import { EnemyStats } from "@/types/fleet";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface FleetEnemiesTableProps {
  enemies: EnemyStats[];
}

export default function FleetEnemiesTable({ enemies }: FleetEnemiesTableProps) {
  const getStatusDisplay = (enemy: EnemyStats) => {
    // Assuming if kills > 0, Killed, else Survived
    const isKilled = enemy.kills > 0;
    return {
      text: isKilled ? "Killed" : "Survived",
      className: isKilled
        ? "bg-red-900/20 text-red-400"
        : "bg-green-900/20 text-green-400",
    };
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "name",
      label: "Enemy Pilot",
      sortable: true,
    },
    {
      key: "corp",
      label: "Corp",
      sortable: true,
    },
    {
      key: "kills",
      label: "Kills (vs fleet)",
      sortable: true,
      numeric: true,
    },
    {
      key: "damageDealt",
      label: "Damage Dealt",
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
        const enemy = row as unknown as EnemyStats;
        const { text, className } = getStatusDisplay(enemy);
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
      data={enemies as unknown as Record<string, unknown>[]}
      searchable={false}
      rowKey={(row) => String((row as unknown as EnemyStats).name)}
      defaultSortKey="damageDealt"
      defaultSortDirection="desc"
    />
  );
}
