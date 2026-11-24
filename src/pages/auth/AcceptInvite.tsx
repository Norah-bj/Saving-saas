import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiClient, ApiError } from "@/lib/api/client";
import { useAuthStore, type AuthResponse } from "@/lib/store/auth-store";
import { useSessionStore } from "@/lib/store/session-store";
import { HOME_PAGE } from "@/lib/nav-config";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Repeat your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "The passwords don't match",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

/**
 * Public route (no ProtectedLayout): the invite link a secretary or admin
 * sent when adding this member. Choosing a password consumes the single-use
 * token and signs the member straight in — see POST /auth/accept-invite.
 */
export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const switchRole = useSessionStore((s) => s.switchRole);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!token) return;
    setError(null);
    try {
      const response = await apiClient.post<AuthResponse>("/auth/accept-invite", {
        token,
        password: values.password,
      });
      setTokens(response);
      const homeRole = response.user.roles[0];
      switchRole(homeRole);
      navigate(HOME_PAGE[homeRole]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            IK
          </div>
          <span className="text-lg font-semibold">IkiminaConnect</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Welcome to your cooperative</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Choose a password to finish setting up your account.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        {!token ? (
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <XCircle className="size-10 text-destructive" />
            <CardDescription>
              This invitation link is incomplete. Open the link from your invitation again, or ask your
              organization's secretary for a new one.
            </CardDescription>
            <Button variant="outline" render={<Link to="/login" />}>
              Go to sign in
            </Button>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Set your password</CardTitle>
              <CardDescription>You'll use it with your email address to sign in.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New password</FormLabel>
                        <FormControl>
                          <PasswordInput autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm password</FormLabel>
                        <FormControl>
                          <PasswordInput autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" disabled={form.formState.isSubmitting} className="mt-1">
                    {form.formState.isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <KeyRound className="size-4" />
                    )}
                    Set password and sign in
                  </Button>
                </form>
              </Form>
            </CardContent>
          </>
        )}
      </Card>

      <p className="mt-8 text-xs text-muted-foreground">
        Already set your password?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
