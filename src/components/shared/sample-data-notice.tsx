import { FlaskConical } from "lucide-react";

/**
 * Banner for pages that were deliberately never connected to a real backend
 * (super-admin Monitoring, Settings, Support — see docs/KNOWN_ISSUES.md), so
 * no one mistakes their illustrative figures for live platform data.
 */
export function SampleDataNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-medium">Preview with sample data.</span>{" "}
        {children ?? "This page isn't connected to a real system yet — nothing shown here is live, and changes aren't saved."}
      </p>
    </div>
  );
}
