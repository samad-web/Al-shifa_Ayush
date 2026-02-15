import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Panel } from "@/components/ui/panel";
import {
    Award,
    TrendingUp,
    Activity,
    Moon,
    Smile,
    Plus,
    PlayCircle,
    ChevronRight
} from "lucide-react";
import { Button } from "@/components/common/button";
import { DailyCheckIn } from "@/components/wellness/DailyCheckIn";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function PatientWellness() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showCheckIn, setShowCheckIn] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/wellness/stats`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch wellness stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading Wellness Data...</div>;

    return (
        <AppLayout>
            <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <PageHeader
                        title="My Wellness Journey"
                        subtitle="Track your progress, earn Zen Points, and heal faster."
                    />
                    <Button
                        className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 h-12 px-6 rounded-2xl font-bold flex items-center gap-2"
                        onClick={() => setShowCheckIn(true)}
                    >
                        <Plus className="w-5 h-5" />
                        Daily Check-in
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Points & Level Card */}
                    <div className="lg:col-span-1">
                        <Panel title="Zen Status" className="h-full bg-gradient-to-br from-primary/5 via-background to-background border-primary/10 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Award className="w-48 h-48" />
                            </div>

                            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                                <div className="p-4 bg-primary/10 rounded-3xl">
                                    <Award className="w-12 h-12 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black text-foreground">{stats?.zenPoints || 0}</h2>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Zen Points Earned</p>
                                </div>

                                <ProgressRing
                                    progress={((stats?.zenPoints || 0) % 500) / 5}
                                    size={160}
                                    strokeWidth={12}
                                    variant="progress"
                                >
                                    <div className="flex flex-col items-center justify-center">
                                        <span className="text-xl font-black">{stats?.level || "Beginner"}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Current Tier</span>
                                    </div>
                                </ProgressRing>

                                <div className="w-full p-4 bg-secondary/20 rounded-2xl border border-border/50 text-sm">
                                    Next tier at <strong>500 points</strong>
                                    <p className="text-muted-foreground text-xs mt-1">Keep checking in daily to level up!</p>
                                </div>
                            </div>
                        </Panel>
                    </div>

                    {/* Activity Trends */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StatCard
                                title="Recent Mood"
                                value={stats?.dailyCheckIns?.[0]?.mood || "N/A"}
                                icon={Smile}
                                variant="wellness"
                            />
                            <StatCard
                                title="Sleep Avg (7d)"
                                value={`${(stats?.dailyCheckIns && stats.dailyCheckIns.length > 0) ? (stats.dailyCheckIns.reduce((a: any, b: any) => a + (b.sleepHours || 0), 0) / stats.dailyCheckIns.length).toFixed(1) : 0}h`}
                                icon={Moon}
                            />
                        </div>

                        <Panel title="Weekly Health Pulse" subtitle="Monitoring your pain and sleep trends">
                            <div className="h-64 flex items-end justify-between gap-2 px-4">
                                {(stats?.dailyCheckIns || []).slice().reverse().map((day: any, idx: number) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div className="w-full flex flex-col-reverse items-center gap-1 h-48">
                                            {/* Pain level visualization */}
                                            <div
                                                className="w-4 bg-destructive/20 rounded-t-full transition-all group-hover:bg-destructive/40"
                                                style={{ height: `${(day.painLevel || 0) * 10}%` }}
                                                title={`Pain: ${day.painLevel || 0}`}
                                            />
                                            {/* Sleep hours visualization */}
                                            <div
                                                className="w-4 bg-primary/20 rounded-t-full transition-all group-hover:bg-primary/40"
                                                style={{ height: `${((day.sleepHours || 0) / 12) * 100}%` }}
                                                title={`Sleep: ${day.sleepHours || 0}h`}
                                            />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase truncate w-full text-center">
                                            {day.createdAt ? new Date(day.createdAt).toLocaleDateString(undefined, { weekday: 'short' }) : 'N/A'}
                                        </span>
                                    </div>
                                ))}
                                {(!stats?.dailyCheckIns || stats.dailyCheckIns.length === 0) && (
                                    <div className="w-full flex items-center justify-center text-muted-foreground italic h-full">
                                        No data recorded yet.
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-center gap-6 mt-6 border-t border-border pt-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                    <div className="w-3 h-3 bg-primary/30 rounded-full" /> Sleep (Hrs)
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                    <div className="w-3 h-3 bg-destructive/30 rounded-full" /> Pain (0-10)
                                </div>
                            </div>
                        </Panel>

                        <Link to="/exercise-library">
                            <Panel title="Exercises" className="group hover:border-primary/30 transition-all cursor-pointer">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-accent/10 rounded-2xl group-hover:scale-110 transition-transform">
                                            <PlayCircle className="w-6 h-6 text-accent" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Prescribed Exercises</h3>
                                            <p className="text-sm text-muted-foreground">Activities assigned by your clinical team</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Panel>
                        </Link>
                    </div>
                </div>

                <DailyCheckIn
                    isOpen={showCheckIn}
                    onClose={() => setShowCheckIn(false)}
                    onSuccess={(points) => {
                        fetchStats();
                    }}
                />
            </div>
        </AppLayout>
    );
}
