import { ReactNode } from "react";
import { Navigation } from "./navigation";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className={cn("pt-14 md:pt-16", className)}>
        {children}
      </main>
    </div>
  );
}
