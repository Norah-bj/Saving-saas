"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarPlus, NotebookPen, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ToneBadge, type Tone } from "@/components/shared/status-badge";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";
import type { Meeting } from "@/lib/types";

const MEETING_STATUS_TONE: Record<Meeting["status"], Tone> = {
  upcoming: "info",
  completed: "success",
  cancelled: "destructive",
};

const scheduleSchema = z.object({
  title: z.string().min(3, "Title is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  location: z.string().min(2, "Location is required"),
  agenda: z.string().min(3, "Add at least one agenda item"),
});
type ScheduleValues = z.infer<typeof scheduleSchema>;

const minutesSchema = z.object({
  minutesSummary: z.string().min(5, "Please summarize the meeting minutes"),
});
type MinutesValues = z.infer<typeof minutesSchema>;

export default function SecretaryMeetingsPage() {
  const { user } = useCurrentUser();
  const meetings = useDataStore((s) => s.meetings);
  const createMeeting = useDataStore((s) => s.createMeeting);
  const updateMeeting = useDataStore((s) => s.updateMeeting);

  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [minutesFor, setMinutesFor] = React.useState<Meeting | null>(null);

  const scheduleForm = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { title: "", date: "", time: "", location: "", agenda: "" },
  });

  const minutesForm = useForm<MinutesValues>({
    resolver: zodResolver(minutesSchema),
    defaultValues: { minutesSummary: "" },
  });

  if (!user) return null;

  const sorted = [...meetings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  function onSchedule(values: ScheduleValues) {
    createMeeting(
      {
        title: values.title,
        date: values.date,
        time: values.time,
        location: values.location,
        agenda: values.agenda
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      },
      user!.fullName
    );
    scheduleForm.reset({ title: "", date: "", time: "", location: "", agenda: "" });
    setScheduleOpen(false);
  }

  function onRecordMinutes(values: MinutesValues) {
    if (!minutesFor) return;
    updateMeeting(minutesFor.id, { minutesSummary: values.minutesSummary, status: "completed" });
    minutesForm.reset({ minutesSummary: "" });
    setMinutesFor(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Meetings</h1>
          <p className="text-sm text-muted-foreground">
            Schedule general assembly and committee meetings, and record minutes once held.
          </p>
        </div>
        <Button onClick={() => setScheduleOpen(true)}>
          <CalendarPlus className="size-4" /> Schedule Meeting
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">All Meetings ({sorted.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Title", cell: (r) => r.title },
              { header: "Date", cell: (r) => formatDate(r.date) },
              {
                header: "Time & Location",
                cell: (r) => (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3" /> {r.time}
                    <MapPin className="ml-2 size-3" /> {r.location}
                  </span>
                ),
              },
              { header: "Agenda Items", cell: (r) => r.agenda.length },
              { header: "Status", cell: (r) => <ToneBadge tone={MEETING_STATUS_TONE[r.status]} label={r.status[0].toUpperCase() + r.status.slice(1)} /> },
              {
                header: "Actions",
                cell: (r) =>
                  r.status === "upcoming" ? (
                    <Button size="sm" variant="outline" onClick={() => setMinutesFor(r)}>
                      <NotebookPen className="size-3.5" /> Record Minutes
                    </Button>
                  ) : r.minutesSummary ? (
                    <span className="line-clamp-1 max-w-[16rem] text-xs text-muted-foreground">{r.minutesSummary}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  ),
              },
            ]}
            rows={sorted}
            rowKey={(r) => r.id}
            emptyMessage="No meetings scheduled yet."
          />
        </CardContent>
      </Card>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>
              Set up a new meeting with an agenda. Members will see this on their calendar.
            </DialogDescription>
          </DialogHeader>
          <Form {...scheduleForm}>
            <form onSubmit={scheduleForm.handleSubmit(onSchedule)} className="grid gap-4">
              <FormField
                control={scheduleForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Q3 General Assembly" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={scheduleForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={scheduleForm.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={scheduleForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Main Hall, Head Office" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={scheduleForm.control}
                name="agenda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agenda (one item per line)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder={"Opening remarks\nReview of previous minutes\nLoan portfolio update"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Schedule Meeting</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!minutesFor} onOpenChange={(open) => !open && setMinutesFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Minutes</DialogTitle>
            <DialogDescription>
              {minutesFor ? `Summarize what was discussed at "${minutesFor.title}".` : ""}
            </DialogDescription>
          </DialogHeader>
          <Form {...minutesForm}>
            <form onSubmit={minutesForm.handleSubmit(onRecordMinutes)} className="grid gap-4">
              <FormField
                control={minutesForm.control}
                name="minutesSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutes summary</FormLabel>
                    <FormControl>
                      <Textarea rows={5} placeholder="Key decisions, attendance, and action items..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setMinutesFor(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Minutes &amp; Close Meeting</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
