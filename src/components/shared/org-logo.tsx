import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * An organization's uploaded logo, or its initials when none is set (or the
 * image fails to load). Size and shape come from `className`.
 */
export function OrgLogo({
  src,
  initials,
  name,
  className,
  initialsClassName,
  style,
}: {
  src: string | null | undefined;
  initials: string;
  name?: string;
  className?: string;
  /** Styling for the initials fallback (background and text colour). */
  initialsClassName?: string;
  style?: React.CSSProperties;
}) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  if (showImage) {
    return (
      <img
        src={src!}
        alt={name ? `${name} logo` : "Organization logo"}
        onError={() => setFailedSrc(src!)}
        className={cn("shrink-0 bg-white object-contain", className)}
      />
    );
  }
  return (
    <div
      aria-hidden={name ? undefined : true}
      aria-label={name ? `${name} logo` : undefined}
      style={style}
      className={cn("flex shrink-0 items-center justify-center font-semibold", initialsClassName, className)}
    >
      {initials}
    </div>
  );
}
