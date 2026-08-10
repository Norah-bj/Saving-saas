import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/types";

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
  const { user } = useCurrentUser();
  const organization = useDataStore((s) => s.organization);
  const members = useDataStore((s) => s.members);
  const employeeRegistry = useDataStore((s) => s.employeeRegistry);
  const addMember = useDataStore((s) => s.addMember);

  const [open, setOpen] = React.useState(false);

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

  if (!user) return null;

  const orgMembers = members.filter((m) => m.organizationId === user.organizationId);
  const candidates = employeeRegistry.filter((e) => !e.registered);

  function applyCandidate(employeeId: string) {
    const candidate = candidates.find((c) => c.employeeId === employeeId);
    if (!candidate) return;
    form.setValue("nationalId", candidate.nationalId);
    form.setValue("employeeId", candidate.employeeId);
    form.setValue("fullName", candidate.fullName);
    form.setValue("department", candidate.department);
    form.setValue("position", candidate.position);
    form.setValue("monthlySalary", candidate.monthlySalary);
  }

  function onSubmit(values: FormValues) {
    addMember(values, user!.fullName);
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
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">
            All registered members of {organization.name}. Search or register a new member.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="size-4" /> Add Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">All Members ({orgMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Name", cell: (r) => r.fullName },
              { header: "Employee ID", cell: (r) => r.employeeId },
              { header: "National ID", cell: (r) => r.nationalId },
              { header: "Department", cell: (r) => r.department },
              { header: "Status", cell: (r) => <MemberStatusBadge status={r.status} /> },
              {
                header: "Roles",
                cell: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {r.roles.map((role) => (
                      <Badge key={role} variant="outline" className="capitalize">
                        {ROLE_LABEL[role]}
                      </Badge>
                    ))}
                  </div>
                ),
              },
              { header: "Date Joined", cell: (r) => formatDate(r.dateJoined) },
            ]}
            rows={orgMembers}
            rowKey={(r) => r.id}
            getSearchText={(r) => `${r.fullName} ${r.employeeId} ${r.nationalId}`}
            searchPlaceholder="Search by name, employee ID or national ID..."
            emptyMessage="No members registered yet."
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Register a new member. You can pick a pre-verified employee to auto-fill their details.
            </DialogDescription>
          </DialogHeader>

          {candidates.length > 0 && (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Pre-fill from employee registry</label>
              <Select
                onValueChange={(v: string | null) => {
                  if (v) applyCandidate(v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an unregistered employee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.employeeId} value={c.employeeId}>
                      {c.fullName} — {c.employeeId} ({c.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                New members start with a 5-share allocation ({formatRwf(25000)}) and an active status.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Register Member</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
