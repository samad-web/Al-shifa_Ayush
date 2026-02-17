import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, className, children }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8", className)}>
      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm md:text-base">{subtitle}</p>
        )}
      </header>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
