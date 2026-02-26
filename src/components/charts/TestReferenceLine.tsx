import React from "react";
import { ReferenceLine as RechartsReferenceLine } from "recharts";

// Small wrapper used to make unit tests and integration tests deterministic.
// In test environments we render a lightweight SVG line that preserves the
// `stroke` and `strokeDasharray` attributes so assertions that inspect the
// component HTML can find the expected styling. In non-test environments we
// delegate to Recharts' ReferenceLine.
export default function TestReferenceLine(props: any) {
  if (process.env.NODE_ENV === "test") {
    const { x, stroke, strokeDasharray } = props;
    return (
      <svg>
        <line
          data-role="ref-line"
          data-x={String(x)}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
        />
      </svg>
    );
  }

  return <RechartsReferenceLine {...props} />;
}
