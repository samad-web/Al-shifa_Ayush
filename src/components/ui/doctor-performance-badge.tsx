import { cn } from "@/lib/utils";
import { TrendingUp, Award, AlertCircle } from "lucide-react";

export type PerformanceBand = "excellent" | "good" | "needs-attention";

interface DoctorPerformanceBadgeProps {
  band: PerformanceBand;
  className?: string;
}

const bandConfig = {
  excellent: {
    label: "Excellent",
    icon: Award,
    className: "bg-wellness/10 text-wellness border-wellness/20",
  },
  good: {
    label: "Good",
    icon: TrendingUp,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  "needs-attention": {
    label: "Needs Attention",
    icon: AlertCircle,
    className: "bg-attention/10 text-attention border-attention/20",
  },
};

export function DoctorPerformanceBadge({ band, className }: DoctorPerformanceBadgeProps) {
  const config = bandConfig[band];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </div>
  );
}

// Utility function to convert metrics to performance band
export function getPerformanceBand(completionRate: number, conversionRate: number): PerformanceBand {
  const avgScore = (completionRate + conversionRate) / 2;
  
  if (avgScore >= 85) return "excellent";
  if (avgScore >= 70) return "good";
  return "needs-attention";
}
