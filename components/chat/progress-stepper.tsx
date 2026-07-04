"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressStep } from "@/lib/types";

const STEPS: { key: ProgressStep; label: string }[] = [
  { key: "resolving", label: "Resolving official website" },
  { key: "crawling", label: "Crawling website pages" },
  { key: "searching", label: "Searching public sources" },
  { key: "analyzing", label: "Analyzing with AI" },
  { key: "competitors", label: "Identifying competitors" },
];

export function ProgressStepper({ currentStep }: { currentStep: ProgressStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const effectiveIndex = currentStep === "done" ? STEPS.length : currentIndex;

  return (
    <div className="space-y-2.5">
      {STEPS.map((step, i) => {
        const isDone = i < effectiveIndex;
        const isCurrent = i === effectiveIndex;

        return (
          <div key={step.key} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                isDone && "border-primary bg-primary text-primary-foreground",
                isCurrent && "border-primary",
                !isDone && !isCurrent && "border-muted-foreground/30"
              )}
            >
              {isDone && <Check className="h-3 w-3" />}
              {isCurrent && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            </span>
            <span
              className={cn(
                "transition-colors",
                isDone && "text-foreground",
                isCurrent && "text-foreground font-medium",
                !isDone && !isCurrent && "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
