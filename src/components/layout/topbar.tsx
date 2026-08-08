"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { NAV_CONFIG } from "@/lib/nav-config";
import { ROLE_LABEL } from "@/lib/types";

export function Topbar() {
  const pathname = usePathname();
  const { user, activeRole } = useCurrentUser();
  const notifications = useDataStore((s) => s.notifications);

  if (!user || !activeRole) return null;

  const items = NAV_CONFIG[activeRole].flatMap((g) => g.items);
  const current = items.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const unread = notifications.filter((n) => n.userId === user.id && !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <div className="flex flex-1 items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">{ROLE_LABEL[activeRole]}</span>
        {current && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{current.title}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        {user.roles.includes("member") && (
          <Button variant="ghost" size="icon-sm" render={<Link href="/member/notifications" />}>
            <span className="relative">
              <Bell className="size-4" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-destructive-foreground">
                  {unread}
                </span>
              )}
            </span>
          </Button>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
