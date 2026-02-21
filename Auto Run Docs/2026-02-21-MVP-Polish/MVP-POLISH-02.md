# MVP Polish — Phase 02: Weapon Breakdown Donut — Damage Percentage

Add damage-share percentages to the "Weapon Breakdown" donut chart on the Dashboard.
Currently the chart shows hit count per weapon. We want each weapon's slice to also display
its share of **total damage dealt** as a percentage.

## Context

- Component: `src/components/dashboard/DamageBreakdownChart.tsx`
- The chart is a Recharts `<PieChart>` donut. `data[]` items already carry `totalDamage`.
- We need to compute `pct = (weapon.totalDamage / grandTotalDamage) * 100` and surface it in
  the tooltip and the legend table below the donut.

## Tasks

- [x] **Add damage-share percentage to the donut chart tooltip and legend**

  In `src/components/dashboard/DamageBreakdownChart.tsx`:

  1. **Compute the grand total damage** right after the `weapons` slice, before building `data[]`:
     ```ts
     const grandTotalDamage = weapons.reduce((sum, w) => sum + w.totalDamage, 0);
     ```

  2. **Add `pct` to each data item** in the `.map()`:
     ```ts
     const data = weapons.map((w) => ({
       name: w.name,
       value: w.count,
       count: w.count,
       totalDamage: w.totalDamage,
       pct: grandTotalDamage > 0 ? (w.totalDamage / grandTotalDamage) * 100 : 0,
     }));
     ```

  3. **Update `CustomTooltip`** to show the percentage below the hit count line:
     ```tsx
     <p style={{ color: d.payload.fill }}>
       Hits: {d.payload.count.toLocaleString()}
     </p>
     <p className="text-text-primary font-bold">
       {d.payload.pct.toFixed(1)}% of damage
     </p>
     <p className="text-text-secondary">
       Damage: {d.payload.totalDamage.toLocaleString()}
     </p>
     ```

  4. **Update the legend table** to show the percentage after the hit count. Replace the
     existing legend `<div>` row content so each row becomes:
     ```tsx
     <div
       className="w-2 h-2 rounded-full flex-shrink-0"
       style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
     />
     <span className="flex-1 text-text-secondary text-xs font-mono truncate">{w.name}</span>
     <span className="text-text-muted text-xs font-mono">{w.count.toLocaleString()} hits</span>
     <span className="text-cyan-glow text-xs font-mono w-12 text-right">
       {w.pct.toFixed(1)}%
     </span>
     ```
     Note: `w.pct` here must come from the `data[]` array (use `data[i].pct` in the `.map()`).

  Verify: `npx tsc --noEmit` passes. Visually, hovering a donut slice now shows the damage
  percentage, and the legend column shows percentage alongside hit count.
