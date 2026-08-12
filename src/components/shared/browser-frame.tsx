import { cn } from "@/lib/utils";

interface BrowserFrameProps {
  url: string;
  src: string;
  alt: string;
  className?: string;
}

export function BrowserFrame({ url, src, alt, className }: BrowserFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft",
        className
      )}
    >
      <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        </div>
        <div className="flex-1 truncate rounded-md bg-background px-3 py-1 text-center text-xs text-muted-foreground">
          {url}
        </div>
      </div>
      <img src={src} alt={alt} className="w-full" />
    </div>
  );
}
