import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

interface PatientCardProps {
  name: string;
  reason?: string;
  status?: "on-track" | "needs-attention" | "completed" | "at-risk";
  sittings?: { current: number; total: number };
  variant?: "default" | "compact" | "highlight";
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function PatientCard({
  name,
  reason,
  status,
  sittings,
  variant = "default",
  className,
  onClick,
  children,
}: PatientCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-card transition-all duration-200",
        variant === "highlight" && "border-primary/20 bg-primary/5",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/30",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-foreground truncate">{name}</h4>
          {reason && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {reason}
            </p>
          )}
          {sittings && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Sitting {sittings.current} of {sittings.total}
            </p>
          )}
        </div>
        {status && <StatusBadge status={status} />}
      </div>
      {children && (
        <div className="mt-3 flex gap-2 border-t border-border/50 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}
