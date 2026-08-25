import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, UserPlus } from "lucide-react";
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
import { useMembers, useCreateMember } from "@/lib/api/members";
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

export default function SecretaryMembersPage() {
  const { data: organization } = useOrganization();
  const { data: members = [] } = useMembers();
  const createMember = useCreateMember();

  const [open, setOpen] = React.useState(false);
  const [created, setCreated] = React.useState<{ fullName: string; temporaryPassword: string } | null>(null);

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
          setCreated({ fullName: result.member.fullName, temporaryPassword: result.temporaryPassword });
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
          <DataTable
            columns={[
              { header: "Name", cell: (r) => r.fullName },
              { header: "Employee ID", cell: (r) => r.employeeId },
              { header: "National ID", cell: (r) => r.nationalId },
              { header: "Department", cell: (r) => r.department },
              { header: "Status", cell: (r) => <MemberStatusBadge status={r.status as never} /> },
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
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <p className="font-medium">{created.fullName} has been registered</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Share this temporary password with them — it won't be shown again.
              </p>
              <code className="rounded-lg border bg-muted px-3 py-1.5 text-sm font-medium">
                {created.temporaryPassword}
              </code>
              <Button onClick={closeDialog} className="mt-2">
                Done
              </Button>
            </div>
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
                    A temporary login password is generated automatically — you'll see it once, right
                    after this member is created.
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
