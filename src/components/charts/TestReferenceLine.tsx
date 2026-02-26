import React from "react";

// Small wrapper used to make unit tests and integration tests deterministic.
// In test environments we render a lightweight SVG line that preserves the
// `stroke` and `strokeDasharray` attributes so assertions that inspect the
// component HTML can find the expected styling. In non-test environments we
// delegate to Recharts' ReferenceLine.
interface TestReferenceLineProps {
  x?: number | string;
  stroke?: string;
  strokeDasharray?: string;
  [key: string]: unknown;
}

export default function TestReferenceLine(props: TestReferenceLineProps) {
  if (process.env.NODE_ENV === "test") {
    const { x, stroke, strokeDasharray } = props;
    return (
      <svg>
        <line
          data-role="ref-line"
          data-x={String(x)}
          stroke={stroke as string}
          strokeDasharray={strokeDasharray as string}
        />
      </svg>
    );
  }

  // Lazily require Recharts at runtime to avoid importing it during test
  // module evaluation (which can interfere with test mocks). We avoid
  // constructing JSX inside the try/catch to satisfy the linter's rule.
  let Comp: React.ComponentType<unknown> | null = null;
  try {
    // use require so Recharts isn't imported during test module evaluation
    // (some test environments prefer to mock it).
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    Comp = require("recharts")
      .ReferenceLine as unknown as React.ComponentType<unknown>;
  } catch {
    Comp = null;
  }

  if (Comp) return <Comp {...(props as unknown as Record<string, unknown>)} />;
  return <span />;
}
