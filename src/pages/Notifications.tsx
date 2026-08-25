import { Bell, HandCoins, CalendarDays, Megaphone, PiggyBank, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type NotificationDto,
} from "@/lib/api/notifications";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<NotificationDto["type"], LucideIcon> = {
  loan: HandCoins,
  meeting: CalendarDays,
  announcement: Megaphone,
  savings: PiggyBank,
  system: Settings2,
};

export default function MemberNotificationsPage() {
  const { user } = useCurrentUser();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (!user) return null;

  const sorted = [...notifications].sort((a, b) => (a.date > b.date ? -1 : 1));
  const unreadCount = sorted.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.` : "You're all caught up."}
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={unreadCount === 0} onClick={() => markAllRead.mutate()}>
          Mark all as read
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((n) => {
            const Icon = TYPE_ICON[n.type];
            return (
              <button
                key={n.id}
                onClick={() => markRead.mutate(n.id)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/40",
                  !n.read && "border-l-4 border-l-primary bg-primary/5"
                )}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <div className="flex-1">
                  <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium")}>{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.date)}</p>
                </div>
                {!n.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
