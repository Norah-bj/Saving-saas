import * as React from "react";
import { Link } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, ApiError } from "@/lib/api/client";

/**
 * POST /auth/forgot-password answers the same way whether or not the address
 * has an account, so this page always shows the same confirmation.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post<void>("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              IK
            </div>
            <span className="font-semibold">IkiminaConnect</span>
          </div>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter the email linked to your account and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <MailCheck className="size-10 text-primary" />
              <p className="font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground">
                If an account exists for that address, a reset link is on its way. It works once and
                expires in 1 hour.
              </p>
              <p className="text-xs text-muted-foreground">
                Added by your cooperative but never set a password? Ask your secretary to resend your
                invitation instead.
              </p>
              <Link to="/login" className="text-sm font-medium text-primary hover:underline">
                Return to login
              </Link>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={onSubmit}>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@organization.rw"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Send reset link
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
