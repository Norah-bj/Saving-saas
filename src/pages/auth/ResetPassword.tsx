import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, KeyRound, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiClient, ApiError } from "@/lib/api/client";
import { PasswordStrength } from "@/components/shared/password-strength";
import { newPasswordFields, passwordsMatch, passwordsMatchError } from "@/lib/validation";

const schema = z.object({ ...newPasswordFields }).refine(passwordsMatch, passwordsMatchError);
type FormValues = z.infer<typeof schema>;

/** Public route: the link from a password reset email (POST /auth/reset-password). */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!token) return;
    setError(null);
    try {
      await apiClient.post<void>("/auth/reset-password", { token, password: values.password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
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
          <CardTitle>Choose a new password</CardTitle>
          {!done && token && <CardDescription>You'll be signed out of other devices.</CardDescription>}
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <XCircle className="size-10 text-destructive" />
              <p className="text-sm text-muted-foreground">
                This reset link is incomplete. Open the link from your email again, or request a new one.
              </p>
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <p className="font-medium">Your password has been changed</p>
              <Button render={<Link to="/login" />}>Sign in</Button>
            </div>
          ) : (
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
                        <PasswordStrength password={field.value ?? ""} />
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
                {error && (
                  <p className="text-sm text-destructive">
                    {error}{" "}
                    <Link to="/forgot-password" className="font-medium underline">
                      Request a new link
                    </Link>
                  </p>
                )}
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  Change password
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
