import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  variant?: "default" | "wellness" | "attention" | "risk";
  className?: string;
}

const variantStyles = {
  default: "bg-card border-border",
  wellness: "bg-wellness/5 border-wellness/20",
  attention: "bg-attention/5 border-attention/20",
  risk: "bg-risk/5 border-risk/20",
};

export function Panel({
  title,
  subtitle,
  children,
  variant = "default",
  className,
}: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border shadow-card overflow-hidden",
        variantStyles[variant],
        className
      )}
    >
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
