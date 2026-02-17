
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

  if (role !== "DOCTOR" && role !== "ADMIN_DOCTOR" && role !== "ADMIN" && role !== "THERAPIST") return <div>Access denied.</div>;

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
  const getLevel = (score: number): { label: string; band: "excellent" | "good" | "needs-attention"; next: string | null; nextAt: number | null; color: string } => {
    if (score >= 90) return { label: "Master of Wellness", band: "excellent", next: null, nextAt: null, color: "text-amber-500" };
    if (score >= 60) return { label: "Attending Physician", band: "good", next: "Master of Wellness", nextAt: 90, color: "text-slate-400" };
    return { label: "Clinical Resident", band: "needs-attention", next: "Attending Physician", nextAt: 60, color: "text-amber-700" };
  };

  const totalExcellence = stats.length > 0 ? Math.round(stats.reduce((sum, d) => sum + (d.excellenceScore || 0), 0) / stats.length) : 0;
  const avgRecovery = stats.length > 0 ? Math.round(stats.reduce((sum, d) => sum + (d.recoveryRate || 0), 0) / stats.length) : 0;
  const activeDoctors = stats.length;

  // Assuming the first doctor in the sorted list is the current "Top" or "Self" view
  // In a real app, we'd find the user's specific record
  const currentDoc = stats[0] || {};
  const docExcellence = currentDoc.excellenceScore || 0;
  const level = getLevel(docExcellence);
  const toNext = level.nextAt ? Math.max(0, level.nextAt - docExcellence) : 0;

  return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-10">
        <PageHeader
          title="Clinical Intelligence & Excellence"
          subtitle="Visualize clinical quality, patient recovery trajectories, and specialized performance bands."
        />

        {/* Global Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Network Excellence" value={`${totalExcellence}%`} icon={Award} description="Avg excellence score" />
          <StatCard title="Recovery Index" value={`${avgRecovery}%`} icon={Activity} description="Avg patient progress" />
          <StatCard title="Provider Network" value={activeDoctors} icon={Users} />
          <StatCard title="Primary Rank" value={level.label} icon={Award} description="Current prestige tier" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">

          {/* Left: Your Performance (2/5) */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-elevated bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden border-l-4 border-l-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Award className={`w-6 h-6 ${level.color}`} />
                  </div>
                  <Badge variant="outline" className="font-black uppercase tracking-widest text-[10px]">
                    Current Standing
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-black">{level.label}</CardTitle>
                <CardDescription>Based on clinical quality and patient volume</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                <div className="flex justify-around items-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <ProgressRing
                        progress={docExcellence}
                        size={120}
                        variant="progress"
                        strokeWidth={10}
                        showLabel={false}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-foreground">{docExcellence}%</span>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-2">Excellence Score</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <ProgressRing
                        progress={currentDoc.recoveryRate || 0}
                        size={100}
                        variant="recovery"
                        strokeWidth={8}
                        showLabel={false}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-wellness">{currentDoc.recoveryRate || 0}%</span>
                        <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Recovery Rate</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-secondary/20 border border-border/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Next Prestige Level:</span>
                    <span className="text-xs font-bold text-primary">{level.next || "Highest Achievement Unlocked"}</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                    {level.next ? (
                      `Increase your clinical excellence score by ${toNext} points through successful patient recoveries and consistent engagement.`
                    ) : (
                      "You have reached the peak of clinical excellence at Al-Shifa. Your patient dedication is exemplary."
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none shadow-sm bg-wellness/5">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Recovered Patients</p>
                  <p className="text-2xl font-black text-wellness">{currentDoc.completedJourneysCount || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-accent/5">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Unique Patients</p>
                  <p className="text-2xl font-black text-accent">{currentDoc.uniquePatientsCount || 0}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right: Activity & Rankings (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="shadow-sm border-border/60">
              <CardHeader className="border-b border-border/50 bg-secondary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Clinician Excellence Rankings</CardTitle>
                    <CardDescription>Ranked by outcome-weighted excellence scores</CardDescription>
                  </div>
                  <div className="p-2 bg-background rounded-lg border border-border/50">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {stats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-secondary/5">
                    <Activity className="w-12 h-12 text-muted-foreground/20 mb-4" />
                    <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">No clinical records found</p>
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
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                                {doc.specialization || "General Specialist"}
                              </span>
                              <div className="flex items-center gap-1">
                                <Activity className="w-3 h-3 text-wellness" />
                                <span className="text-[10px] font-bold text-wellness">{doc.recoveryRate}% Recovery</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-primary">{doc.excellenceScore}</div>
                          <div className="text-[9px] font-black text-muted-foreground uppercase">Score</div>
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
