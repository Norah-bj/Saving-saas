import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, CheckCircle2, Copy, Loader2, MailWarning, Send, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DataTable } from "@/components/shared/data-table";
import { MemberStatusBadge } from "@/components/shared/status-badge";
import { useMembers, useCreateMember, useResendInvite, type InviteResult } from "@/lib/api/members";
import { useOrganization } from "@/lib/api/organization";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { ROLE_LABEL, type Role } from "@/lib/types";

const schema = z.object({
  nationalId: z.string().min(6, "National ID is required"),
  employeeId: z.string().min(2, "Employee ID is required"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(8, "Enter a valid phone number"),
  department: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  monthlySalary: z.number().min(1, "Monthly salary is required"),
});

type FormValues = z.infer<typeof schema>;

/** What the dialog shows after creating a member or re-sending their invite. */
interface InviteOutcome extends InviteResult {
  fullName: string;
  resent: boolean;
}

function InviteOutcomePanel({ outcome, onDone }: { outcome: InviteOutcome; onDone: () => void }) {
  const [copied, setCopied] = React.useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(outcome.inviteLink);
      setCopied(true);
    } catch {
      setCopied(false); // clipboard blocked: the link is still selectable below
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      {outcome.inviteEmailSent ? (
        <CheckCircle2 className="size-10 text-emerald-500" />
      ) : (
        <MailWarning className="size-10 text-amber-500" />
      )}
      <p className="font-medium">
        {outcome.resent ? `New invitation for ${outcome.fullName}` : `${outcome.fullName} has been registered`}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {outcome.inviteEmailSent
          ? "We've emailed them a link to choose their password and sign in. You can also share the link below directly."
          : "We couldn't send the invitation email. Share this link with them directly (for example by WhatsApp or SMS) so they can choose their password."}
      </p>
      <code className="w-full max-w-sm break-all rounded-lg border bg-muted px-3 py-2 text-left text-xs select-all">
        {outcome.inviteLink}
      </code>
      <p className="max-w-sm text-xs text-muted-foreground">
        The link works once and expires in 72 hours. Only share it with this member.
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" onClick={copyLink}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}

export default function SecretaryMembersPage() {
  const { data: organization } = useOrganization();
  const { data: members = [] } = useMembers();
  const createMember = useCreateMember();
  const resendInvite = useResendInvite();

  const [open, setOpen] = React.useState(false);
  const [created, setCreated] = React.useState<InviteOutcome | null>(null);
  const [resendError, setResendError] = React.useState<string | null>(null);

  function onResend(memberId: string, fullName: string) {
    setResendError(null);
    resendInvite.mutate(memberId, {
      onSuccess: (result) => {
        setCreated({ ...result, fullName, resent: true });
        setOpen(true);
      },
      onError: (err) =>
        setResendError(err instanceof ApiError ? err.message : "Couldn't resend the invitation. Please try again."),
    });
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nationalId: "",
      employeeId: "",
      fullName: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      monthlySalary: 200000,
    },
  });

  function onSubmit(values: FormValues) {
    createMember.mutate(
      {
        nationalId: values.nationalId,
        employeeId: values.employeeId,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        department: values.department,
        position: values.position,
        monthlySalaryRwf: values.monthlySalary,
      },
      {
        onSuccess: (result) => {
          setCreated({
            fullName: result.member.fullName,
            inviteLink: result.inviteLink,
            inviteEmailSent: result.inviteEmailSent,
            resent: false,
          });
          form.reset({
            nationalId: "",
            employeeId: "",
            fullName: "",
            email: "",
            phone: "",
            department: "",
            position: "",
            monthlySalary: 200000,
          });
        },
      }
    );
  }

  function closeDialog() {
    setOpen(false);
    setCreated(null);
    createMember.reset();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">
            All registered members of {organization?.name ?? "your organization"}. Search or register a new member.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="size-4" /> Add Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">All Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {resendError && <p className="mb-3 text-sm text-destructive">{resendError}</p>}
          <DataTable
            columns={[
              { header: "Name", cell: (r) => r.fullName },
              { header: "Employee ID", cell: (r) => r.employeeId },
              { header: "National ID", cell: (r) => r.nationalId },
              { header: "Department", cell: (r) => r.department },
              {
                header: "Status",
                cell: (r) => (
                  <div className="flex flex-wrap items-center gap-1">
                    <MemberStatusBadge status={r.status as never} />
                    {r.invitePending && (
                      <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300">
                        Invite pending
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                header: "Roles",
                cell: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {r.roles.map((role) => (
                      <Badge key={role} variant="outline" className="capitalize">
                        {ROLE_LABEL[role as Role]}
                      </Badge>
                    ))}
                  </div>
                ),
              },
              { header: "Date Joined", cell: (r) => formatDate(r.dateJoined) },
              {
                header: "",
                headClassName: "w-px",
                cell: (r) =>
                  r.invitePending ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={resendInvite.isPending && resendInvite.variables === r.id}
                      onClick={() => onResend(r.id, r.fullName)}
                    >
                      <Send className="size-3.5" /> Resend invite
                    </Button>
                  ) : null,
              },
            ]}
            rows={members}
            rowKey={(r) => r.id}
            getSearchText={(r) => `${r.fullName} ${r.employeeId} ${r.nationalId}`}
            searchPlaceholder="Search by name, employee ID or national ID..."
            emptyMessage="No members registered yet."
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent className="sm:max-w-lg">
          {created ? (
            <InviteOutcomePanel outcome={created} onDone={closeDialog} />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add Member</DialogTitle>
                <DialogDescription>Register a new member of the organization.</DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Full name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Jeanne Uwimana" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nationalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>National ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="employeeId"
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
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="name@apupeka.rw" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+250..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="monthlySalary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly salary (RWF)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step={1000}
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll email them an invitation link to choose their own password. You'll also get the
                    link to share directly in case the email doesn't arrive.
                  </p>
                  {createMember.isError && (
                    <p className="text-sm text-destructive">
                      {createMember.error instanceof ApiError
                        ? createMember.error.message
                        : "Something went wrong. Please try again."}
                    </p>
                  )}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMember.isPending}>
                      {createMember.isPending && <Loader2 className="size-4 animate-spin" />}
                      Register Member
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
