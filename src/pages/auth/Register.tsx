import * as React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [submitted, setSubmitted] = React.useState(false);

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
            Onboard your SACCO, cooperative, or employee savings association onto
            the platform. Our team will verify your details and activate your
            workspace within one business day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <p className="font-medium">Application submitted</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Thank you. Our onboarding team will reach out to verify your
                organization and set up your workspace.
              </p>
              <Link to="/login" className="text-sm font-medium text-primary hover:underline">
                Return to login
              </Link>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="org-name">Organization name</Label>
                <Input id="org-name" required placeholder="e.g. Karongi Teachers SACCO" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="district">District</Label>
                  <Input id="district" required placeholder="e.g. Karongi" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="members">Estimated members</Label>
                  <Input id="members" type="number" required placeholder="e.g. 50" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="admin-name">Your full name</Label>
                <Input id="admin-name" required placeholder="Organization Admin" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" type="email" required placeholder="you@organization.rw" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" required placeholder="+250 788 000 000" />
                </div>
              </div>
              <Button type="submit" className="mt-2">
                Submit application
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already registered?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
