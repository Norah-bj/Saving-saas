import * as React from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  IdCard,
  Building2,
  Briefcase,
  CalendarDays,
  ShieldAlert,
  LogOut,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RequestStatusBadge } from "@/components/shared/status-badge";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/types";

export default function MemberProfilePage() {
  const { user } = useCurrentUser();
  const exitRequests = useDataStore((s) => s.exitRequests);
  const exitEligibility = useDataStore((s) => s.exitEligibility);
  const requestExit = useDataStore((s) => s.requestExit);
  const [emailNotifs, setEmailNotifs] = React.useState(true);
  const [smsNotifs, setSmsNotifs] = React.useState(false);
  const [exitDialogOpen, setExitDialogOpen] = React.useState(false);
  const [exitReason, setExitReason] = React.useState("");

  if (!user) return null;

  const eligibility = exitEligibility(user.id);
  const myExitRequest = exitRequests.find(
    (r) => r.memberId === user.id && (r.status === "pending" || r.status === "approved")
  );

  function submitExit() {
    if (!exitReason.trim()) return;
    requestExit(user!.id, exitReason.trim());
    setExitDialogOpen(false);
    setExitReason("");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Profile & Settings</h1>
        <p className="text-sm text-muted-foreground">Your membership details and notification preferences.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-base">{user.avatarInitials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base">{user.fullName}</CardTitle>
            <CardDescription>{user.position} · {user.department}</CardDescription>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.roles.map((r) => (
                <Badge key={r} variant="outline">{ROLE_LABEL[r]}</Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <ProfileField icon={IdCard} label="National ID" value={user.nationalId} />
            <ProfileField icon={IdCard} label="Employee ID" value={user.employeeId} />
            <ProfileField icon={Building2} label="Department" value={user.department} />
            <ProfileField icon={Briefcase} label="Position" value={user.position} />
            <ProfileField icon={Mail} label="Email" value={user.email} />
            <ProfileField icon={Phone} label="Phone" value={user.phone} />
            <ProfileField icon={CalendarDays} label="Date Joined" value={formatDate(user.dateJoined)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Preferences</CardTitle>
          <CardDescription>Choose how you&apos;d like to be notified about activity on your account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="email-notifs">Email notifications</Label>
              <p className="text-xs text-muted-foreground">Receive updates about loans, savings and meetings by email.</p>
            </div>
            <Switch id="email-notifs" checked={emailNotifs} onCheckedChange={setEmailNotifs} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="sms-notifs">SMS notifications</Label>
              <p className="text-xs text-muted-foreground">Receive urgent alerts via SMS to your registered phone number.</p>
            </div>
            <Switch id="sms-notifs" checked={smsNotifs} onCheckedChange={setSmsNotifs} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Membership</CardTitle>
          <CardDescription>Request to exit your cooperative membership.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {myExitRequest ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Exit request submitted</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(myExitRequest.requestedDate)} — {myExitRequest.reason}
                </p>
              </div>
              <RequestStatusBadge status={myExitRequest.status} />
            </div>
          ) : eligibility.eligible ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                You have no outstanding loans or active guarantees, so you&apos;re eligible to
                request an exit.
              </p>
              <Button variant="destructive" size="sm" onClick={() => setExitDialogOpen(true)}>
                <LogOut className="size-3.5" /> Request Exit
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="font-medium">You can&apos;t exit membership yet.</p>
                {eligibility.outstandingLoans.map((l) => (
                  <p key={l.id}>
                    Outstanding loan {l.contractNumber} — remaining balance{" "}
                    {formatRwf(l.remainingBalance)}. Fully repay it before requesting exit.
                  </p>
                ))}
                {eligibility.activeGuarantees.map(({ guarantee, loan }) => (
                  <p key={guarantee.id}>
                    You&apos;re currently guaranteeing loan {loan.contractNumber}
                    {" "}({formatRwf(guarantee.amountGuaranteed)}). You can exit once that loan
                    is fully repaid.
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to exit membership</DialogTitle>
            <DialogDescription>
              This sends a request to the Secretary for review. Your membership stays active
              until it&apos;s approved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exit-reason">Reason</Label>
            <Textarea
              id="exit-reason"
              rows={3}
              placeholder="e.g. Relocating, changing employer..."
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!exitReason.trim()} onClick={submitExit}>
              <FileText className="size-4" /> Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium">{value}</dd>
      </div>
    </div>
  );
}
