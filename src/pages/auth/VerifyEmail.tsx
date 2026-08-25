import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { HOME_PAGE } from "@/lib/nav-config";

/**
 * Public route (no ProtectedLayout) — the link in the verification email may
 * be opened on a different device/browser than the one the user registered
 * or is currently logged in on.
 */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const attempted = React.useRef(false);

  const mutation = useMutation({ mutationFn: (t: string) => verifyEmail(t) });

  React.useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    mutation.mutate(token);
    // Runs once per mount, keyed off the token in the URL — not the
    // mutation object itself, which is a new reference every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Email verification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 pb-8">
          {!token && (
            <>
              <XCircle className="size-10 text-destructive" />
              <CardDescription>This verification link is missing its token.</CardDescription>
              <Button variant="outline" onClick={() => navigate("/login")}>
                Back to login
              </Button>
            </>
          )}
          {token && mutation.isPending && (
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          )}
          {token && mutation.isSuccess && (
            <>
              <CheckCircle2 className="size-10 text-emerald-500" />
              <CardDescription>Your email is verified. You're all set.</CardDescription>
              <Button
                onClick={() => navigate(accessToken && user ? HOME_PAGE[user.roles[0]] : "/login")}
              >
                {accessToken ? "Continue to dashboard" : "Continue to login"}
              </Button>
            </>
          )}
          {token && mutation.isError && (
            <>
              <XCircle className="size-10 text-destructive" />
              <CardDescription>
                {mutation.error instanceof ApiError
                  ? mutation.error.message
                  : "This link is invalid or has expired."}
              </CardDescription>
              <Button variant="outline" onClick={() => navigate("/login")}>
                Back to login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
