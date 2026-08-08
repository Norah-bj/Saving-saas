"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useSessionStore } from "@/lib/store/session-store";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { HOME_PAGE } from "@/lib/nav-config";
import type { Role } from "@/lib/types";

const ROLE_SEGMENTS: Role[] = [
  "member",
  "secretary",
  "accountant",
  "loan-committee",
  "hr",
  "org-admin",
  "super-admin",
];

function FullScreenLoader() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const pathname = usePathname();
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const activeRole = useSessionStore((s) => s.activeRole);
  const switchRole = useSessionStore((s) => s.switchRole);
  const { user } = useCurrentUser();

  const segment = pathname.split("/")[1] as Role;
  const isRoleSegment = ROLE_SEGMENTS.includes(segment);

  React.useEffect(() => {
    if (!mounted) return;
    if (!userId || !user) {
      router.replace("/login");
      return;
    }
    if (isRoleSegment && !user.roles.includes(segment)) {
      router.replace(HOME_PAGE[user.roles[0]]);
      return;
    }
    if (isRoleSegment && activeRole !== segment) {
      switchRole(segment);
    }
  }, [mounted, userId, user, segment, isRoleSegment, activeRole, router, switchRole]);

  if (!mounted || !userId || !user) {
    return <FullScreenLoader />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
