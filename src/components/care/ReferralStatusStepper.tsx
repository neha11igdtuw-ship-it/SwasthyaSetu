import React from "react";
import { ReferralStep } from "@/lib/mockData";
import { Check } from "lucide-react";

interface StepItem {
  name: ReferralStep;
  status: "completed" | "current" | "pending";
  date?: string;
}

interface ReferralStatusStepperProps {
  steps: StepItem[];
}

export function ReferralStatusStepper({ steps }: ReferralStatusStepperProps) {
  return (
    <div className="w-full py-4 overflow-x-auto">
      <div className="min-w-[620px] flex items-center justify-between relative">
        {/* Connecting Line Background */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-10" />

        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";

          return (
            <div key={index} className="flex flex-col items-center text-center space-y-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isCompleted
                    ? "bg-teal-700 text-white shadow-xs"
                    : isCurrent
                    ? "bg-amber-400 text-slate-950 ring-4 ring-amber-100 font-extrabold"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : index + 1}
              </div>

              <div className="max-w-[85px]">
                <span
                  className={`text-[11px] font-bold block leading-tight ${
                    isCurrent
                      ? "text-amber-900 font-extrabold"
                      : isCompleted
                      ? "text-teal-900"
                      : "text-slate-400"
                  }`}
                >
                  {step.name}
                </span>
                {step.date && (
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                    {step.date}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
