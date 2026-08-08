import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { LOAN_STATUS_LABEL, LOAN_STATUS_ORDER, type Loan } from "@/lib/types";

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

  return (
    <ol className="flex flex-wrap gap-y-4">
      {LOAN_STATUS_ORDER.map((stage, idx) => {
        const done = idx < currentIndex;
        const current = idx === currentIndex;
        return (
          <li key={stage} className="flex flex-1 min-w-[7rem] items-center">
            <div className="flex flex-col items-center gap-1.5 px-1 text-center">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-[11px] font-medium",
                  done && "border-primary bg-primary text-primary-foreground",
                  current && "border-primary text-primary",
                  !done && !current && "border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3.5" /> : idx + 1}
              </div>
              <span
                className={cn(
                  "text-[11px] leading-tight",
                  current ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {LOAN_STATUS_LABEL[stage]}
              </span>
            </div>
            {idx < LOAN_STATUS_ORDER.length - 1 && (
              <div className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
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
