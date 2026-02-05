import { cn } from "@/lib/utils";

type StatusType = "on-track" | "needs-attention" | "completed" | "at-risk";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  "on-track": {
    label: "On Track",
    className: "bg-wellness/10 text-wellness border-wellness/20",
  },
  "needs-attention": {
    label: "Needs Attention",
    className: "bg-attention/10 text-attention border-attention/20",
  },
  completed: {
    label: "Completed",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  "at-risk": {
    label: "At Risk",
    className: "bg-risk/10 text-risk border-risk/20",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
