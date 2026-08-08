"use client";

import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";

export default function MemberMeetingsPage() {
  const meetings = useDataStore((s) => s.meetings);

  const upcoming = meetings
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const past = meetings
    .filter((m) => m.status !== "upcoming")
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Meetings</h1>
        <p className="text-sm text-muted-foreground">
          Upcoming general assemblies and committee meetings, plus minutes from past sessions.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Upcoming Meetings</h2>
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No upcoming meetings" description="You'll be notified as soon as a new meeting is scheduled." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((m) => (
              <Card key={m.id}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">{m.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" /> {formatDate(m.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" /> {m.time}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" /> {m.location}
                    </span>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-foreground">Agenda</p>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                      {m.agenda.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Past Meetings</h2>
        {past.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No past meetings recorded" />
        ) : (
          <div className="flex flex-col gap-3">
            {past.map((m) => (
              <Card key={m.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium">{m.title}</CardTitle>
                  <span className="text-xs text-muted-foreground">{formatDate(m.date)} · {m.location}</span>
                </CardHeader>
                <CardContent>
                  {m.minutesSummary ? (
                    <p className="text-sm text-muted-foreground">{m.minutesSummary}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Minutes have not been published for this meeting.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
