import { FlaskConical, Store } from "lucide-react";

/**
 * Shown on every form where a member would pay money in (voluntary deposit,
 * share purchase). There's no real payment provider yet, so in demo mode
 * these record test money only, and in disabled mode they're switched off.
 */
export function DemoPaymentNotice({ mode }: { mode: string | undefined }) {
  if (mode === "disabled") {
    return (
      <div role="note" className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
        <Store className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          Online payments aren&apos;t available yet. Pay at your cooperative&apos;s office and the accountant will
          record it here.
        </p>
      </div>
    );
  }
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-medium">Demo only: no real money moves.</span> This records a test payment so the app
        can be tried out. Real payments will need a mobile money connection (e.g. MTN MoMo) before launch.
      </p>
    </div>
  );
}
