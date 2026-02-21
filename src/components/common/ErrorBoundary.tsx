import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center p-8 min-h-[200px] text-center bg-destructive/5 rounded-xl border border-destructive/20 animate-in fade-in zoom-in-95">
                    <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                    <h2 className="text-lg font-bold text-foreground mb-2">Something went wrong</h2>
                    <p className="text-sm text-muted-foreground mb-6 max-w-[300px]">
                        The application encountered an unexpected error. Please try refreshing.
                    </p>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="gap-2 border-destructive/20 hover:bg-destructive/10"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Reload Page
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
