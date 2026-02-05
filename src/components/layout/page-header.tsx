import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, className }: PageHeaderProps) {
  return (
    <header className={cn("space-y-1.5", className)}>
      <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="text-muted-foreground text-sm md:text-base">{subtitle}</p>
      )}
    </header>
  );
}
