import { FlaskConical, Store } from "lucide-react";
import { CardAction } from "@/components/ui/card";

/**
 * There's no real payment provider yet. In demo mode, forms where a member pays money in
 * (voluntary deposit, share purchase) carry a small "Demo" tag in the card's corner; in
 * disabled mode the form is replaced by a one-line note.
 */
export function DemoBadge({ mode }: { mode: string | undefined }) {
  if (mode !== "demo") return null;
  return (
    <CardAction>
      <span
        title="Test payment only. No real money moves."
        className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
      >
        <FlaskConical className="size-3" aria-hidden="true" />
        Demo · no real money
      </span>
    </CardAction>
  );
}

export function DemoPaymentNotice({ mode }: { mode: string | undefined }) {
  if (mode !== "disabled") return null;
  return (
    <p role="note" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Store className="size-4 shrink-0" aria-hidden="true" />
      Pay at your cooperative&apos;s office for now.
    </p>
  );
}
