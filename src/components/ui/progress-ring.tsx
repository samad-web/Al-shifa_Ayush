import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  variant?: "recovery" | "adherence" | "progress";
  className?: string;
  showLabel?: boolean;
  label?: string;
  children?: React.ReactNode;
}

const variantColors = {
  recovery: "stroke-wellness",
  adherence: "stroke-accent",
  progress: "stroke-primary",
};

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  variant = "progress",
  className,
  showLabel = true,
  label,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn("transition-all duration-1000 ease-out progress-ring-animate", variantColors[variant])}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {(showLabel || children) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children ? (
            children
          ) : (
            <>
              <span className="text-2xl font-semibold text-foreground">
                {Math.round(progress)}%
              </span>
              {label && (
                <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
