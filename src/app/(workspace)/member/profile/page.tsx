"use client";

import * as React from "react";
import { Mail, Phone, IdCard, Building2, Briefcase, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { formatDate } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/types";

export default function MemberProfilePage() {
  const { user } = useCurrentUser();
  const [emailNotifs, setEmailNotifs] = React.useState(true);
  const [smsNotifs, setSmsNotifs] = React.useState(false);

  if (!user) return null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Profile & Settings</h1>
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
