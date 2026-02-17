import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar, ClipboardList, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Metric {
    label: string;
    change: number;
    current: number;
    previous: number;
}

interface ProgressReportProps {
    data: {
        patientName: string;
        totalPreviousSittings: number;
        previousData: {
            averages: {
                avgPain: number;
                avgMobility: number;
                avgSleep: number;
            };
            recordCount: number;
            breakdown: Array<{
                date: string;
                pain: number;
                mobility: number;
                sleep: number;
            }>;
        };
        currentSession: {
            metrics: {
                pain: number;
                mobility: number;
                sleep: number;
                date: string;
            };
            notes: string;
        };
        progressAnalysis: {
            metrics: Metric[];
            summary: string;
        };
    };
}

export function ProgressAnalysisReport({ data }: ProgressReportProps) {
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-8 p-1">
            {/* Summary Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-primary">
                    <Activity className="w-5 h-5" />
                    <h3 className="font-bold uppercase tracking-wider text-sm">Clinical Progress Summary</h3>
                </div>
                <p className="text-lg font-medium text-foreground leading-relaxed">
                    "{data.progressAnalysis.summary}"
                </p>
                <div className="flex gap-4 pt-2">
                    <Badge variant="outline" className="bg-background/50">
                        Total Completed Sittings: {data.totalPreviousSittings + 1}
                    </Badge>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Previous Data */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <h4 className="font-bold text-lg">Previous Data</h4>
                        <span className="text-xs text-muted-foreground ml-auto">Avg. over {data.previousData.recordCount} records</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <MetricCard label="Avg. Pain" value={data.previousData.averages.avgPain.toFixed(1)} />
                        <MetricCard label="Avg. Mobility" value={data.previousData.averages.avgMobility.toFixed(1)} />
                        <MetricCard label="Avg. Sleep" value={data.previousData.averages.avgSleep.toFixed(1)} />
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recent History Breakdown</p>
                        {data.previousData.breakdown.map((record, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl text-sm">
                                <span className="font-medium">{formatDate(record.date)}</span>
                                <div className="flex gap-4 text-xs">
                                    <span>Pain: <b>{record.pain}</b></span>
                                    <span>Mobility: <b>{record.mobility}</b></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Current Session */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <ClipboardList className="w-5 h-5 text-wellness" />
                        <h4 className="font-bold text-lg text-wellness">Current Session</h4>
                        <span className="text-xs text-muted-foreground ml-auto">{formatDate(data.currentSession.metrics.date)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <MetricCard label="Pain Level" value={data.currentSession.metrics.pain} variant="highlight" />
                        <MetricCard label="Mobility" value={data.currentSession.metrics.mobility} variant="highlight" />
                        <MetricCard label="Sleep Hr" value={data.currentSession.metrics.sleep} variant="highlight" />
                    </div>

                    <Card className="p-4 bg-wellness/5 border-wellness/20">
                        <p className="text-xs font-bold text-wellness uppercase tracking-widest mb-2">Session Clinical Notes</p>
                        <p className="text-sm text-foreground/80 italic">
                            {data.currentSession.notes || "No clinical notes provided for this session."}
                        </p>
                    </Card>
                </div>
            </div>

            {/* Progress Analysis Comparison */}
            <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h4 className="font-bold text-lg">Detailed Progress Analysis</h4>
                </div>

                <div className="grid gap-4">
                    {data.progressAnalysis.metrics.map((metric, i) => (
                        <div key={i} className="flex items-center p-4 bg-card rounded-2xl border border-border hover:border-primary/30 transition-colors">
                            <div className="flex-1">
                                <p className="font-bold text-foreground">{metric.label}</p>
                                <p className="text-xs text-muted-foreground">Compared to previous sitting average</p>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground uppercase">Previous</p>
                                    <p className="font-bold">{metric.previous.toFixed(1)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground uppercase">Current</p>
                                    <p className="font-bold text-primary">{metric.current}</p>
                                </div>
                                <div className={cn(
                                    "flex items-center gap-1 px-4 py-2 rounded-xl font-bold",
                                    metric.change > 2 ? "bg-wellness/10 text-wellness" :
                                        metric.change < -2 ? "bg-risk/10 text-risk" : "bg-muted text-muted-foreground"
                                )}>
                                    {metric.change > 2 ? <TrendingUp className="w-4 h-4" /> :
                                        metric.change < -2 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                                    {Math.abs(metric.change).toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, variant = "default" }: { label: string; value: string | number; variant?: "default" | "highlight" }) {
    return (
        <Card className={cn("p-4 text-center space-y-1", variant === "highlight" ? "bg-primary/5 border-primary/20" : "bg-card")}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-black text-foreground">{value}</p>
        </Card>
    );
}
