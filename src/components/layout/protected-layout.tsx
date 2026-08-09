import * as React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
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

export function ProtectedLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const userId = useSessionStore((s) => s.userId);
  const activeRole = useSessionStore((s) => s.activeRole);
  const switchRole = useSessionStore((s) => s.switchRole);
  const { user } = useCurrentUser();

  const segment = pathname.split("/")[1] as Role;
  const isRoleSegment = ROLE_SEGMENTS.includes(segment);

  React.useEffect(() => {
    if (!userId || !user) {
      navigate("/login", { replace: true });
      return;
    }
    if (isRoleSegment && !user.roles.includes(segment)) {
      navigate(HOME_PAGE[user.roles[0]], { replace: true });
      return;
    }
    if (isRoleSegment && activeRole !== segment) {
      switchRole(segment);
    }
  }, [userId, user, segment, isRoleSegment, activeRole, navigate, switchRole]);

  if (!userId || !user) {
    return <FullScreenLoader />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <div className="flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
