import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { passwordChecks, passwordStrength } from "@/lib/validation";

const BAR_COLOR = ["bg-muted", "bg-destructive", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];
const TEXT_COLOR = ["", "text-destructive", "text-amber-600 dark:text-amber-400", "text-emerald-600 dark:text-emerald-400", "text-emerald-700 dark:text-emerald-400"];

/** Live guidance under a new-password field: a strength bar and the checks that make a good password. */
export function PasswordStrength({ password, id }: { password: string; id?: string }) {
  const { score, label } = passwordStrength(password);
  const checks = passwordChecks(password);

  return (
    <div id={id} className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= score ? BAR_COLOR[score] : "bg-muted")} />
          ))}
        </div>
        <span className={cn("w-16 text-right text-xs font-medium", TEXT_COLOR[score])}>{label}</span>
      </div>
      <ul className="grid gap-1 text-xs sm:grid-cols-2">
        {checks.map((c) => (
          <li
            key={c.label}
            className={cn("flex items-center gap-1.5", c.met ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}
          >
            {c.met ? <Check className="size-3.5 shrink-0" /> : <Circle className="size-3 shrink-0" />}
            <span>
              {c.label}
              {c.required ? "" : " (recommended)"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
