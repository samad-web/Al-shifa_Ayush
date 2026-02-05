import { cn } from "@/lib/utils";

interface EncouragementTextProps {
  message: string;
  emoji?: string;
  variant?: "default" | "subtle" | "prominent";
  className?: string;
}

const variantStyles = {
  default: "text-muted-foreground text-sm",
  subtle: "text-muted-foreground/80 text-xs",
  prominent: "text-foreground text-base font-medium",
};

export function EncouragementText({
  message,
  emoji,
  variant = "default",
  className,
}: EncouragementTextProps) {
  return (
    <p className={cn(variantStyles[variant], "text-center text-balance", className)}>
      {emoji && <span className="mr-1">{emoji}</span>}
      {message}
    </p>
  );
}
