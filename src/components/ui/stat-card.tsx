import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: "default" | "wellness" | "attention" | "risk";
  description?: string;
  className?: string;
}

const variantStyles = {
  default: "bg-card border-border",
  wellness: "bg-wellness/5 border-wellness/20",
  attention: "bg-attention/5 border-attention/20",
  risk: "bg-risk/5 border-risk/20",
};

const iconStyles = {
  default: "bg-secondary text-secondary-foreground",
  wellness: "bg-wellness/10 text-wellness",
  attention: "bg-attention/10 text-attention",
  risk: "bg-risk/10 text-risk",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  variant = "default",
  description,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-card transition-all duration-200 hover:shadow-md",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "rounded-lg p-2.5",
              iconStyles[variant]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
