import { Bell, Pill, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationPlaceholderProps {
  type: "medication" | "sitting";
  className?: string;
}

export function NotificationPlaceholder({ type, className }: NotificationPlaceholderProps) {
  const config = {
    medication: {
      icon: Pill,
      title: "Medication Reminder",
      message: "Time to take your medicine. Your wellness matters.",
      time: "Just now",
    },
    sitting: {
      icon: Calendar,
      title: "Sitting Reminder",
      message: "You have a therapy session scheduled. We're here for you.",
      time: "1 hour ago",
    },
  };

  const { icon: Icon, title, message, time } = config[type];

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl bg-card border border-border",
        "transition-all duration-200",
        className
      )}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-foreground text-sm">{title}</p>
          <span className="text-xs text-muted-foreground shrink-0">{time}</span>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

interface NotificationCenterPlaceholderProps {
  className?: string;
}

export function NotificationCenterPlaceholder({ className }: NotificationCenterPlaceholderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Notifications</h3>
        </div>
        <span className="text-xs text-muted-foreground">Preview</span>
      </div>

      <div className="space-y-3">
        <NotificationPlaceholder type="medication" />
        <NotificationPlaceholder type="sitting" />
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Push notifications coming soon
      </p>
    </div>
  );
}
