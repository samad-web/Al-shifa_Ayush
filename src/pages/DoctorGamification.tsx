
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Panel } from "@/components/ui/panel";
import { ProgressRing } from "@/components/ui/progress-ring";
import { DoctorPerformanceBadge } from "@/components/ui/doctor-performance-badge";
import { Users, Award, TrendingUp, Activity } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DoctorGamification() {
  const { role } = useAuth();
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/user/doctor-gamification`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
    })
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then(setStats)
      .catch(() => setError("Failed to load clinical statistics"))
      .finally(() => setLoading(false));
  }, []);

  if (role !== "DOCTOR" && role !== "ADMIN_DOCTOR" && role !== "ADMIN") return <div>Access denied.</div>;

  if (loading) return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-8 h-8 text-primary animate-pulse" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Aggregating Clinical Data...</p>
        </div>
      </div>
    </AppLayout>
  );

  if (error) return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8 text-center text-attention font-bold">{error}</div>
    </AppLayout>
  );

  // --- Gamification logic ---
  const getLevel = (appointments: number): { label: string; band: "excellent" | "good" | "needs-attention"; next: string | null; nextAt: number | null; color: string } => {
    if (appointments >= 100) return { label: "Gold", band: "excellent", next: null, nextAt: null, color: "text-amber-500" };
    if (appointments >= 50) return { label: "Silver", band: "good", next: "Gold", nextAt: 100, color: "text-slate-400" };
    return { label: "Bronze", band: "needs-attention", next: "Silver", nextAt: 50, color: "text-amber-700" };
  };

  const totalAppointments = stats.reduce((sum, d) => sum + (d.appointmentCount || 0), 0);
  const activeDoctors = stats.length;
  const engagementScore = Math.min(totalAppointments * 10, 100);

  const topDoctor = stats[0] || {};
  const doctorAppointments = topDoctor.appointmentCount || 0;
  const level = getLevel(doctorAppointments);
  const progressToNext = level.nextAt ? Math.min(100, Math.round((doctorAppointments / level.nextAt) * 100)) : 100;
  const toNext = level.nextAt ? Math.max(0, level.nextAt - doctorAppointments) : 0;

  return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-10">
        <PageHeader
          title="Clinical Intelligence & Achievements"
          subtitle="Visualize performance bands, patient engagement metrics, and clinical rankings."
        />

        {/* Global Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Network Sittings" value={totalAppointments} icon={Activity} />
          <StatCard title="Provider Network" value={activeDoctors} icon={Users} />
          <StatCard title="Engagement Index" value={`${engagementScore}%`} icon={TrendingUp} description="Activity score" />
          <StatCard title="Primary Rank" value={level.label} icon={Award} description="Performance tier" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">

          {/* Left: Your Performance (2/5) */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-elevated bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Award className={`w-6 h-6 ${level.color}`} />
                  </div>
                  <Badge variant="outline" className="font-black uppercase tracking-widest text-[10px]">
                    Current Band
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-black">Tier: {level.label}</CardTitle>
                <CardDescription>Performance based on patient sittings completed</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-8 text-center">
                <div className="flex justify-center py-4">
                  <div className="relative group">
                    <ProgressRing
                      progress={progressToNext}
                      size={160}
                      variant="progress"
                      strokeWidth={12}
                      showLabel={false}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-foreground">{progressToNext}%</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">To Next Rank</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/20 border border-border/50 text-left space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Next Milestone:</span>
                    <span className="text-xs font-bold text-primary">{level.next || "Max Rank Reached"}</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                    {level.next ? (
                      toNext > 0
                        ? `Complete ${toNext} more patient sittings to unlock the ${level.next} rank.`
                        : "Threshold met. Promotion pending cycle refresh."
                    ) : (
                      "You have achieved the highest recognized clinical tier. Excellent patient dedication."
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-wellness/5">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="p-2 bg-wellness/10 rounded-lg shrink-0">
                    <TrendingUp className="w-4 h-4 text-wellness" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-wellness">Optimization Tip</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Detailed consultation notes and consistent follow-ups contribute to higher engagement scores.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Activity & Rankings (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="shadow-sm border-border/60">
              <CardHeader className="border-b border-border/50 bg-secondary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Clinician Rankings</CardTitle>
                    <CardDescription>Network-wide activity performance</CardDescription>
                  </div>
                  <div className="p-2 bg-background rounded-lg border border-border/50">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {stats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-secondary/5">
                    <Activity className="w-12 h-12 text-muted-foreground/20 mb-4" />
                    <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">No activity records found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {stats.map((doc, idx) => (
                      <div key={doc.id} className="flex items-center justify-between p-6 hover:bg-secondary/10 transition-colors group">
                        <div className="flex items-center gap-5">
                          <div className="w-10 h-10 rounded-full bg-secondary/40 flex items-center justify-center text-sm font-black text-muted-foreground border border-border/50 group-hover:border-primary/50 group-hover:text-primary transition-all">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                              {doc.fullName || doc.email || "Confidential Provider"}
                            </div>
                            <div className="text-[11px] font-black text-muted-foreground uppercase tracking-tighter">
                              {doc.specialization || "General Specialist"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-primary">{doc.appointmentCount}</div>
                          <div className="text-[9px] font-black text-muted-foreground uppercase">Sittings</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
