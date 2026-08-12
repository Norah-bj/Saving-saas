import * as React from "react";
import { Check, ChevronDown, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { LOAN_STATUS_LABEL, LOAN_STATUS_ORDER, type Loan, type LoanStatus } from "@/lib/types";

interface StageGroup {
  label: string;
  stages: LoanStatus[];
}

const STAGE_GROUPS: StageGroup[] = [
  { label: "Application", stages: ["submitted", "under-review"] },
  { label: "Approval", stages: ["guarantor-approval", "committee-review"] },
  { label: "Disbursement", stages: ["approved", "contract-generated", "disbursed"] },
  { label: "Repayment", stages: ["repaying", "completed"] },
];

type Progress = "done" | "current" | "upcoming";

export function LoanStagePipeline({ loan }: { loan: Loan }) {
  if (loan.status === "rejected") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
        <X className="size-4 shrink-0" />
        <span>This application was rejected. See notes below.</span>
      </div>
    );
  }

  const currentIndex = LOAN_STATUS_ORDER.indexOf(loan.status);

  function stageProgress(stage: LoanStatus): Progress {
    const idx = LOAN_STATUS_ORDER.indexOf(stage);
    if (idx < currentIndex) return "done";
    if (idx === currentIndex) return "current";
    return "upcoming";
  }

  function groupProgress(group: StageGroup): Progress {
    const indices = group.stages.map((s) => LOAN_STATUS_ORDER.indexOf(s));
    if (indices.every((i) => i < currentIndex)) return "done";
    if (indices.includes(currentIndex)) return "current";
    return "upcoming";
  }

  function stageDate(stage: LoanStatus) {
    return loan.timeline.find((e) => e.stage === stage)?.date;
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
      {STAGE_GROUPS.map((group, gi) => {
        const progress = groupProgress(group);
        return (
          <React.Fragment key={group.label}>
            <div
              className={cn(
                "flex-1 rounded-lg border p-3",
                progress === "current" && "border-primary/30 bg-primary/5 shadow-soft",
                progress === "done" && "border-border bg-muted/30",
                progress === "upcoming" && "border-border/60"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                    progress === "done" && "bg-primary text-primary-foreground",
                    progress === "current" && "border-2 border-primary bg-primary/10 text-primary",
                    progress === "upcoming" && "border border-border bg-muted/40 text-muted-foreground"
                  )}
                >
                  {progress === "done" ? <Check className="size-3.5" /> : gi + 1}
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    progress === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {group.label}
                </span>
              </div>

              <ul className="mt-2.5 flex flex-col gap-1.5">
                {group.stages.map((stage) => {
                  const stageState = stageProgress(stage);
                  const date = stageDate(stage);
                  return (
                    <li key={stage} className="flex items-center gap-2 text-xs">
                      <span
                        className={cn(
                          "flex size-3.5 shrink-0 items-center justify-center rounded-full",
                          stageState === "done" && "bg-primary/20 text-primary",
                          stageState === "current" && "bg-primary text-primary-foreground",
                          stageState === "upcoming" && "bg-muted"
                        )}
                      >
                        {stageState === "done" && <Check className="size-2.5" />}
                      </span>
                      <span
                        className={cn(
                          "truncate",
                          stageState === "current" && "font-medium text-foreground",
                          stageState === "upcoming" && "text-muted-foreground",
                          stageState === "done" && "text-foreground/80"
                        )}
                      >
                        {LOAN_STATUS_LABEL[stage]}
                      </span>
                      {stageState === "current" && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          Current
                        </span>
                      )}
                      {date && stageState !== "current" && (
                        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                          {formatDate(date)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {gi < STAGE_GROUPS.length - 1 && (
              <>
                <div className="flex items-center justify-center sm:hidden">
                  <ChevronDown className="size-4 text-muted-foreground" />
                </div>
                <div className="hidden items-center justify-center sm:flex">
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </div>
              </>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function LoanTimelineList({ loan }: { loan: Loan }) {
  return (
    <ol className="flex flex-col gap-4">
      {loan.timeline.map((event, idx) => (
        <li key={idx} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="size-2 rounded-full bg-primary" />
            {idx < loan.timeline.length - 1 && <div className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              {LOAN_STATUS_LABEL[event.stage]}
              <span className="font-normal text-muted-foreground">· {formatDate(event.date)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{event.officer}</p>
            {event.notes && <p className="mt-1 text-sm">{event.notes}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
