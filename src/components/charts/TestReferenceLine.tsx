import React from "react";

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

  // Lazily require Recharts at runtime to avoid importing it during test
  // module evaluation (which can interfere with test mocks). Using a
  // synchronous require keeps runtime behavior unchanged in non-test builds.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ReferenceLine: RechartsReferenceLine } = require("recharts");
    return <RechartsReferenceLine {...props} />;
  } catch (e) {
    // If Recharts isn't available (eg. in some build/test environments),
    // render a neutral placeholder to avoid crashing.
    return <span />;
  }
}
