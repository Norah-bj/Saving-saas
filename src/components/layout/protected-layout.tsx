import * as React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSessionStore } from "@/lib/store/session-store";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useResendVerification } from "@/lib/api/auth";
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

/**
 * Shown instead of the app shell for an authenticated-but-unverified user —
 * the backend's EmailVerificationFilter 403s almost everything else, so
 * rendering the normal sidebar/pages here would just mean every page's data
 * fetch failing individually. See docs/BUSINESS_RULES.md.
 */
function EmailVerificationRequired({ email, logout }: { email: string; logout: () => void }) {
  const resend = useResendVerification();

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/30 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border bg-card p-8 text-center shadow-sm">
        <MailCheck className="size-10 text-primary" />
        <p className="font-medium">Verify your email address</p>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to <span className="font-medium text-foreground">{email}</span>.
          Click it to unlock your workspace.
        </p>
        {resend.isSuccess && (
          <p className="text-sm text-emerald-600">Verification email sent again — check your inbox.</p>
        )}
        {resend.isError && (
          <p className="text-sm text-destructive">
            {resend.error instanceof Error ? resend.error.message : "Could not resend the email."}
          </p>
        )}
        <Button
          onClick={() => resend.mutate()}
          disabled={resend.isPending}
          className="mt-1"
        >
          {resend.isPending && <Loader2 className="size-4 animate-spin" />}
          Resend verification email
        </Button>
        <Button variant="ghost" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );
}

export function ProtectedLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const activeRole = useSessionStore((s) => s.activeRole);
  const switchRole = useSessionStore((s) => s.switchRole);
  const clearRole = useSessionStore((s) => s.clearRole);
  const { user, isLoading, emailVerified } = useCurrentUser();

  const segment = pathname.split("/")[1] as Role;
  const isRoleSegment = ROLE_SEGMENTS.includes(segment);

  React.useEffect(() => {
    if (!accessToken) {
      navigate("/login", { replace: true });
      return;
    }
    if (!user) return; // still loading /me
    if (isRoleSegment && !user.roles.includes(segment)) {
      navigate(HOME_PAGE[user.roles[0]], { replace: true });
      return;
    }
    if (isRoleSegment && activeRole !== segment) {
      switchRole(segment);
    }
  }, [accessToken, user, segment, isRoleSegment, activeRole, navigate, switchRole]);

  if (!accessToken || !user || isLoading) {
    return <FullScreenLoader />;
  }

  if (!emailVerified) {
    return (
      <EmailVerificationRequired
        email={user.email}
        logout={() => {
          logout();
          clearRole();
        }}
      />
    );
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
