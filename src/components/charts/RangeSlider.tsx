"use client";

import React, { useEffect, useRef, useState } from "react";

export default function RangeSlider({
  length,
  startIndex,
  endIndex,
  onChangeComplete,
}: {
  length: number;
  startIndex?: number;
  endIndex?: number;
  // Called when user finishes dragging (mouse up / touch end)
  onChangeComplete: (start: number, end: number) => void;
}) {
  const clamp = (v: number) => Math.max(0, Math.min(length - 1, v));
  const [left, setLeft] = useState(startIndex ?? 0);
  const [right, setRight] = useState(endIndex ?? Math.max(0, length - 1));
  const draggingRef = useRef<"left" | "right" | null>(null);

  useEffect(() => {
    setLeft(startIndex ?? 0);
  }, [startIndex]);

  useEffect(() => {
    setRight(endIndex ?? Math.max(0, length - 1));
  }, [endIndex, length]);

  useEffect(() => {
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = null;
        onChangeComplete(clamp(left), clamp(right));
      }
    };
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [left, right, length]);

  const percent = (v: number) => (length <= 1 ? 0 : (v / (length - 1)) * 100);

  return (
    <div style={{ position: "relative", height: 36, padding: "6px 8px" }}>
      <div
        style={{
          position: "absolute",
          left: 8,
          right: 8,
          top: 12,
          height: 8,
          borderRadius: 6,
          background: "#0f172a",
          opacity: 0.08,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: `${8 + percent(left) * (1 / 100) * (100 - 16 / 1)}%`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: `${8 + percent(left)}%`,
          right: `${8 + (100 - percent(right))}%`,
          top: 12,
          height: 8,
          borderRadius: 6,
          background: "#005f65",
          opacity: 0.12,
          pointerEvents: "none",
        }}
      />

      {/* left handle */}
      <div
        role="slider"
        aria-valuemin={0}
        aria-valuemax={length - 1}
        aria-valuenow={left}
        onMouseDown={() => (draggingRef.current = "left")}
        onTouchStart={() => (draggingRef.current = "left")}
        onMouseMove={(e) => {
          if (draggingRef.current !== "left") return;
          const rect = (e.target as HTMLElement)
            .closest(".range-root")
            ?.getBoundingClientRect();
        }}
        style={{
          position: "absolute",
          top: 6,
          left: `calc(${percent(left)}% )`,
          transform: "translate(-50%, 0)",
          width: 18,
          height: 24,
          borderRadius: 4,
          background: "#fff",
          border: "2px solid #0b1220",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          cursor: "grab",
          zIndex: 3,
        }}
      />

      {/* right handle */}
      <div
        role="slider"
        aria-valuemin={0}
        aria-valuemax={length - 1}
        aria-valuenow={right}
        onMouseDown={() => (draggingRef.current = "right")}
        onTouchStart={() => (draggingRef.current = "right")}
        style={{
          position: "absolute",
          top: 6,
          left: `calc(${percent(right)}% )`,
          transform: "translate(-50%, 0)",
          width: 18,
          height: 24,
          borderRadius: 4,
          background: "#fff",
          border: "2px solid #0b1220",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          cursor: "grab",
          zIndex: 3,
        }}
      />

      {/* pointer move listener overlay */}
      <div
        className="range-root"
        style={{ position: "absolute", inset: 0, zIndex: 2 }}
        onMouseMove={(e) => {
          if (!draggingRef.current) return;
          const root = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - root.left - 8; // account for padding
          const pct = Math.max(0, Math.min(1, x / (root.width - 16)));
          const idx = Math.round(pct * (length - 1));
          if (draggingRef.current === "left") {
            const newLeft = Math.min(idx, right);
            setLeft(newLeft);
          } else {
            const newRight = Math.max(idx, left);
            setRight(newRight);
          }
        }}
        onTouchMove={(e) => {
          if (!draggingRef.current) return;
          const touch = e.touches[0];
          const root = e.currentTarget.getBoundingClientRect();
          const x = touch.clientX - root.left - 8;
          const pct = Math.max(0, Math.min(1, x / (root.width - 16)));
          const idx = Math.round(pct * (length - 1));
          if (draggingRef.current === "left") {
            const newLeft = Math.min(idx, right);
            setLeft(newLeft);
          } else {
            const newRight = Math.max(idx, left);
            setRight(newRight);
          }
        }}
      />
    </div>
  );
}
