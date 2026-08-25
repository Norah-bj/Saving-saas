import { Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ToneBadge, type Tone } from "@/components/shared/status-badge";
import { useAnnouncements } from "@/lib/api/secretary-ops";
import { formatDate } from "@/lib/format";
import type { AnnouncementPriority } from "@/lib/types";

const PRIORITY_TONE: Record<AnnouncementPriority, Tone> = {
  urgent: "destructive",
  important: "warning",
  normal: "neutral",
};

const PRIORITY_LABEL: Record<AnnouncementPriority, string> = {
  urgent: "Urgent",
  important: "Important",
  normal: "Normal",
};

export default function MemberAnnouncementsPage() {
  const { data: announcements = [] } = useAnnouncements();
  const sorted = [...announcements].sort((a, b) => (a.date > b.date ? -1 : 1));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          Updates and notices from the cooperative leadership, newest first.
        </p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-sm font-medium">{a.title}</CardTitle>
                <ToneBadge tone={PRIORITY_TONE[a.priority]} label={PRIORITY_LABEL[a.priority]} className="shrink-0" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">{a.body}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(a.date)} · {a.author}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
