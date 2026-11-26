import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSessionStore } from "@/lib/store/session-store";
import { apiClient, ApiError } from "@/lib/api/client";
import { HOME_PAGE } from "@/lib/nav-config";
import type { AuthResponse } from "@/lib/store/auth-store";
import { PasswordStrength } from "@/components/shared/password-strength";
import {
  applyServerFieldErrors,
  emailSchema,
  employeeIdSchema,
  nationalIdSchema,
  newPasswordFields,
  passwordsMatch,
  passwordsMatchError,
  phoneSchema,
  requiredText,
} from "@/lib/validation";

const schema = z
  .object({
    organizationName: requiredText("Organization name", 2, 120),
    organizationShortName: requiredText("Short name", 2, 40),
    district: requiredText("District", 1, 60),
    sector: requiredText("Sector", 1, 60),
    address: requiredText("Address", 1, 200),
    contactEmail: emailSchema,
    contactPhone: phoneSchema,
    adminFullName: requiredText("Your full name", 2, 120),
    adminNationalId: nationalIdSchema,
    adminEmployeeId: employeeIdSchema,
    adminEmail: emailSchema,
    adminPhone: phoneSchema,
    ...newPasswordFields,
  })
  .refine(passwordsMatch, passwordsMatchError);
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const switchRole = useSessionStore((s) => s.switchRole);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      organizationName: "",
      organizationShortName: "",
      district: "",
      sector: "",
      address: "",
      contactEmail: "",
      contactPhone: "",
      adminFullName: "",
      adminNationalId: "",
      adminEmployeeId: "",
      adminEmail: "",
      adminPhone: "",
      password: "",
      confirmPassword: "",
    },
  });
  const passwordValue = form.watch("password");

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...body } = values;
      const response = await apiClient.post<AuthResponse>("/auth/register", body);
      setTokens(response);
      const homeRole = response.user.roles[0];
      switchRole(homeRole);
      setSubmitted(true);
    } catch (err) {
      if (applyServerFieldErrors(err, form.setError)) {
        setError("Please correct the highlighted fields.");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              IK
            </div>
            <span className="font-semibold">IkiminaConnect</span>
          </div>
          <CardTitle>Register your organization</CardTitle>
          <CardDescription>
            Onboard your SACCO, cooperative, or employee savings association onto the platform.
            Your workspace is created immediately — you'll be signed in as its first
            administrator as soon as you submit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <p className="font-medium">Your organization is ready</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                You're signed in as the organization administrator. We've sent a verification link
                to your email — confirm it to unlock your workspace.
              </p>
              <Button onClick={() => navigate(HOME_PAGE["org-admin"])}>Continue</Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Karongi Teachers SACCO" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="organizationShortName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. KTS" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>District</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Karongi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="sector"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sector</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Rubengera" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Karongi, Rwanda" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="info@organization.rw" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+250 788 000 000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="my-1 border-t pt-4">
                  <p className="mb-3 text-sm font-medium">Your administrator account</p>
                </div>

                <FormField
                  control={form.control}
                  name="adminFullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Organization Administrator" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="adminNationalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>National ID</FormLabel>
                        <FormControl>
                          <Input inputMode="numeric" placeholder="16 digits" maxLength={20} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adminEmployeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@organization.rw" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adminPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+250 788 000 000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="new-password" aria-describedby="register-password-help" {...field} />
                      </FormControl>
                      <PasswordStrength id="register-password-help" password={passwordValue ?? ""} />
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
                <Button type="submit" disabled={form.formState.isSubmitting} className="mt-2">
                  {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Create organization
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Already registered?{" "}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
