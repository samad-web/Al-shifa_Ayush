import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, Minus, Target, Clock, CheckCircle, Users } from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface LeaderboardDetailModalProps {
    participantId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LeaderboardDetailModal({ participantId, open, onOpenChange }: LeaderboardDetailModalProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (participantId && open) {
            setLoading(true);
            fetch(`${API_BASE_URL}/api/leaderboard/${participantId}/breakdown`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            })
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then(setData)
                .catch(() => setError("Failed to load performance breakdown"))
                .finally(() => setLoading(false));
        }
    }, [participantId, open]);

    if (!open) return null;

    const getTrendIcon = (trend: string) => {
        if (trend === 'up') return <TrendingUp className="w-4 h-4 text-wellness" />;
        if (trend === 'down') return <TrendingDown className="w-4 h-4 text-attention" />;
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-background border-border/60 shadow-elevated overflow-hidden p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-black flex items-center gap-3">
                        <Activity className="w-6 h-6 text-primary" />
                        Performance Architecture
                    </DialogTitle>
                    <DialogDescription className="font-medium text-muted-foreground uppercase tracking-widest text-[10px]">
                        Dynamic Score Breakdown & Trend Analysis
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Activity className="w-8 h-8 text-primary animate-pulse" />
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Fetching Real-time Metrics...</p>
                    </div>
                ) : data ? (
                    <div className="p-6 pt-2 space-y-8">
                        {/* Overall Score Header */}
                        <div className="flex items-center justify-between p-6 rounded-3xl bg-secondary/10 border border-border/50">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Composite Excellence Score</p>
                                <div className="text-5xl font-black text-primary">{data.currentScore}<span className="text-lg text-muted-foreground/50 ml-1">/100</span></div>
                            </div>
                            <div className="text-right">
                                <Badge variant="outline" className="bg-background text-[10px] font-bold py-1 px-3 rounded-full border-primary/20">
                                    TOP 5% IN NETWORK
                                </Badge>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2">Calculated: {new Date(data.calculatedAt).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Column 1: Core Performance */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Target className="w-3 h-3" /> Core Metrics
                                </h4>

                                <MetricItem
                                    label="Session Volume"
                                    value={data.metrics.appointments.value}
                                    target={data.metrics.appointments.target}
                                    score={data.metrics.appointments.score}
                                    icon={<CheckCircle className="w-4 h-4" />}
                                    weight={data.weights.appointmentWeight}
                                />

                                <MetricItem
                                    label="Patient Adherence"
                                    value={`${Math.round(data.metrics.adherence.value)}%`}
                                    target={`${data.metrics.adherence.target}%`}
                                    score={data.metrics.adherence.score}
                                    icon={<Users className="w-4 h-4" />}
                                    weight={data.weights.adherenceWeight}
                                />
                            </div>

                            {/* Column 2: Efficiency & Outcomes */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Efficiency & Outcomes
                                </h4>

                                <MetricItem
                                    label="Avg Response Time"
                                    value={`${data.metrics.responseTime.value}m`}
                                    target={`<${data.metrics.responseTime.target}m`}
                                    score={data.metrics.responseTime.score}
                                    icon={<Clock className="w-4 h-4" />}
                                    weight={data.weights.responseTimeWeight}
                                />

                                <MetricItem
                                    label="Recovery Success"
                                    value={`${Math.round(data.metrics.successRate.value)}%`}
                                    target={`${data.metrics.successRate.target}%`}
                                    score={data.metrics.successRate.score}
                                    icon={<TrendingUp className="w-4 h-4" />}
                                    weight={data.weights.successRateWeight}
                                />
                            </div>
                        </div>

                        {/* History Trend */}
                        <div className="pt-4 border-t border-border/50">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Performance Velocity (Last 5 Cycles)</h4>
                            <div className="flex items-end justify-between h-20 px-2">
                                {data.history.reverse().map((h: any, i: number) => (
                                    <div key={i} className="flex flex-col items-center gap-2 flex-1">
                                        <div
                                            className={`w-full max-w-[40px] rounded-t-lg bg-primary/20 group-hover:bg-primary transition-all duration-500`}
                                            style={{ height: `${h.score}%` }}
                                        >
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                {h.score}
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">
                                            {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-20 text-center text-muted-foreground text-xs uppercase tracking-widest font-black">
                        No performance history available
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function MetricItem({ label, value, target, score, icon, weight }: any) {
    return (
        <div className="space-y-2 group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-secondary/30 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {icon}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-foreground">{label}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Weight: {weight * 100}%</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-black text-primary">{value}</p>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Target: {target}</p>
                </div>
            </div>
            <div className="relative h-1.5 w-full bg-secondary/30 rounded-full overflow-hidden">
                <div
                    className="absolute inset-y-0 left-0 bg-primary/40 group-hover:bg-primary transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
}
