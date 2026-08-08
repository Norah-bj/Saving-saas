"use client";

import Link from "next/link";
import { Users, LogOut, UserX, CalendarDays, Megaphone } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";

export default function SecretaryDashboardPage() {
  const { user } = useCurrentUser();
  const members = useDataStore((s) => s.members);
  const exitRequests = useDataStore((s) => s.exitRequests);
  const meetings = useDataStore((s) => s.meetings);
  const announcements = useDataStore((s) => s.announcements);

  if (!user) return null;

  const orgMembers = members.filter((m) => m.organizationId === user.organizationId);
  const pendingExits = exitRequests.filter((r) => r.status === "pending");
  const suspended = orgMembers.filter((m) => m.status === "suspended");
  const upcomingMeetings = meetings.filter((m) => m.status === "upcoming");

  const byMonth = new Map<string, { label: string; sortKey: string; count: number }>();
  const sortedByJoin = [...orgMembers].sort(
    (a, b) => new Date(a.dateJoined).getTime() - new Date(b.dateJoined).getTime()
  );
  for (const m of sortedByJoin) {
    const d = new Date(m.dateJoined);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-RW", { month: "short", year: "2-digit" });
    const existing = byMonth.get(key);
    if (existing) existing.count += 1;
    else byMonth.set(key, { label, sortKey: key, count: 1 });
  }
  const monthly = Array.from(byMonth.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  let cumulative = 0;
  const growthSeries = monthly.map((m) => {
    cumulative += m.count;
    return { month: m.label, members: cumulative };
  });

  const recentAnnouncements = announcements.slice(0, 3);
  const nextMeetings = upcomingMeetings.slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Secretary Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Membership records, meetings, announcements and documents at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Members" value={String(orgMembers.length)} icon={Users} description="Registered members" />
        <StatCard
          label="Pending Exit Requests"
          value={String(pendingExits.length)}
          icon={LogOut}
          description="Awaiting decision"
        />
        <StatCard
          label="Suspended Members"
          value={String(suspended.length)}
          icon={UserX}
          description="Currently suspended"
        />
        <StatCard
          label="Upcoming Meetings"
          value={String(upcomingMeetings.length)}
          icon={CalendarDays}
          description="Scheduled ahead"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Membership Growth" description="Cumulative members over time" className="lg:col-span-2">
          <TrendLineChart
            data={growthSeries}
            xKey="month"
            series={[{ key: "members", label: "Total Members", color: "var(--chart-1)" }]}
          />
        </ChartCard>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <CalendarDays className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {nextMeetings.length === 0 && (
              <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
            )}
            {nextMeetings.map((m) => (
              <div key={m.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(m.date)} at {m.time} — {m.location}
                </p>
              </div>
            ))}
            <Button variant="outline" size="sm" render={<Link href="/secretary/meetings" />}>
              View all meetings
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Recent Announcements</CardTitle>
          <Megaphone className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {recentAnnouncements.map((a) => (
            <div key={a.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{a.title}</p>
                {a.priority !== "normal" && (
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {a.priority}
                  </Badge>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(a.date)}</p>
            </div>
          ))}
          {recentAnnouncements.length === 0 && (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
