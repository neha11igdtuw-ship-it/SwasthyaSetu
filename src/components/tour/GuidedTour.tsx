"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/languageContext";
import { ensureTargetInView, findTourTarget, toTourRect, type TourRect } from "@/lib/tour/tourDom";
import type { TourStepDef } from "@/lib/tour/tourSteps";
import { TourOverlay } from "./TourOverlay";
import { TourStep } from "./TourStep";

interface GuidedTourProps {
  steps: TourStepDef[];
  /** User reached the end (Finish). */
  onFinish: () => void;
  /** User chose Skip Tour / pressed Escape. */
  onSkip: () => void;
  /** The tour cannot continue (targets vanished). Closes without recording completion. */
  onAbort: () => void;
}

export function GuidedTour({ steps, onFinish, onSkip, onAbort }: GuidedTourProps) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<TourRect | null>(null);
  const directionRef = useRef<1 | -1>(1);
  const step = steps[index];

  // Locate + scroll to the target whenever the step changes. A target that
  // has disappeared since the tour started is skipped, never pointed at.
  useEffect(() => {
    const el = findTourTarget(step.target);
    if (!el) {
      const next = index + directionRef.current;
      if (next >= 0 && next < steps.length) setIndex(next);
      else if (directionRef.current === 1) onFinish();
      else onAbort();
      return;
    }
    ensureTargetInView(el);
    setRect(toTourRect(el.getBoundingClientRect()));
  }, [index, step.target, steps.length, onFinish, onAbort]);

  // Keep the spotlight on the element through resize, scroll and layout changes.
  useEffect(() => {
    const update = () => {
      const el = findTourTarget(step.target);
      if (el) setRect(toTourRect(el.getBoundingClientRect()));
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const el = findTourTarget(step.target);
    let observer: ResizeObserver | undefined;
    if (el && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(el);
    }
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer?.disconnect();
    };
  }, [step.target, index]);

  const handleNext = useCallback(() => {
    directionRef.current = 1;
    if (index >= steps.length - 1) onFinish();
    else setIndex(index + 1);
  }, [index, steps.length, onFinish]);

  const handleBack = useCallback(() => {
    directionRef.current = -1;
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  return (
    <>
      <TourOverlay rect={rect} />
      <TourStep
        rect={rect}
        title={t(step.titleKey)}
        description={t(step.descriptionKey)}
        current={index + 1}
        total={steps.length}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={onSkip}
      />
    </>
  );
}
