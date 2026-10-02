"use client";

import React from "react";
import type { TourRect } from "@/lib/tour/tourDom";

const SPOTLIGHT_PADDING = 6;

/** Dims the page, cuts a spotlight around the target, and blocks clicks on
 * the page underneath while the tour is open. */
export function TourOverlay({ rect }: { rect: TourRect | null }) {
  return (
    <>
      <div className="fixed inset-0 z-[100]" aria-hidden="true" data-tour-blocker />
      {rect ? (
        <div
          aria-hidden="true"
          className="fixed z-[101] pointer-events-none rounded-2xl ring-4 ring-teal-300 transition-all duration-200 motion-reduce:transition-none"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(8, 28, 33, 0.65)",
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[101] pointer-events-none bg-[rgba(8,28,33,0.65)]" aria-hidden="true" />
      )}
    </>
  );
}
