import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { PatientCard } from "@/components/ui/patient-card";
import { MultiplePrescriptionForm } from "@/components/prescription/MultiplePrescriptionForm";
import { DoctorPerformanceBadge, getPerformanceBand } from "@/components/ui/doctor-performance-badge";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertTriangle,
  Sparkles,
  Activity,
  CheckCircle2,
  Users,
  UserPlus,
  Pill,
} from "lucide-react";

import { useEffect, useState } from "react";
const initialStats = {
  atRisk: 0,
  wellnessEligible: 0,
  activeJourneys: 0,
  completed: 0,
  atRiskJourneys: [],
  wellnessEligibleJourneys: [],
  recentAlerts: [],
};



export default function DoctorAdminDashboard() {
  const { profile } = useAuth();
  const [dashboardStats, setDashboardStats] = useState(initialStats);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    fetchStats();
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await fetch("/api/user/doctor-gamification", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/admin/stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
        <PageHeader
          title="Clinical Intelligence Dashboard"
          subtitle={`Illness → Wellness overview${profile?.full_name ? ` • Welcome, ${profile.full_name}` : ""}`}
        />

        {/* Top Stats - Aligned with Journey model */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="At Risk Journeys"
            value={dashboardStats.atRisk}
            icon={AlertTriangle}
            variant="attention"
          />
          <StatCard
            title="Wellness Eligible"
            value={dashboardStats.wellnessEligible}
            icon={Sparkles}
            variant="wellness"
          />
          <StatCard
            title="Active Journeys"
            value={dashboardStats.activeJourneys}
            icon={Activity}
          />
          <StatCard
            title="Completed Journeys"
            value={dashboardStats.completed}
            icon={CheckCircle2}
            variant="wellness"
          />
        </div>

        {/* Prescription Form Overlay/Modal-like Panel */}
        {selectedPatient && (
          <Panel
            title={`Prescribe Medicine`}
            subtitle={`For ${selectedPatient.name}`}
            className="border-primary/30 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <MultiplePrescriptionForm
              patientId={selectedPatient.id}
              patientName={selectedPatient.name}
              onSuccess={() => {
                setSelectedPatient(null);
                fetchStats();
              }}
              onCancel={() => setSelectedPatient(null)}
            />
          </Panel>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* At-Risk Journeys (based on Journey.status = AT_RISK) */}
          <Panel
            title="At-Risk Journeys"
            subtitle="Journeys requiring attention"
            variant="attention"
          >
            <div className="space-y-3">
              {(dashboardStats.atRiskJourneys || []).length > 0 ? (
                dashboardStats.atRiskJourneys.map((journey: any) => (
                  <PatientCard
                    key={journey.id}
                    name={journey.patientName}
                    reason={journey.reason}
                    status="at-risk"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[10px] font-bold uppercase tracking-wider gap-2 w-full"
                      onClick={() => setSelectedPatient({ id: journey.patientId, name: journey.patientName })}
                    >
                      <Pill className="w-3 h-3" /> Prescribe
                    </Button>
                  </PatientCard>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No at-risk journeys detected.
                </p>
              )}
            </div>
          </Panel>

          {/* Wellness Eligible (journeys nearing completion with good adherence) */}
          <Panel
            title="Wellness Eligible"
            subtitle="Ready for Illness → Wellness upgrade"
            variant="wellness"
          >
            <div className="space-y-3">
              {(dashboardStats.wellnessEligibleJourneys || []).length > 0 ? (
                dashboardStats.wellnessEligibleJourneys.map((journey: any) => (
                  <PatientCard
                    key={journey.id}
                    name={journey.patientName}
                    sittings={journey.sittings}
                    status="on-track"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[10px] font-bold uppercase tracking-wider gap-2 w-full"
                      onClick={() => setSelectedPatient({ id: journey.patientId, name: journey.patientName })}
                    >
                      <Pill className="w-3 h-3" /> Prescribe
                    </Button>
                  </PatientCard>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No wellness eligible journeys.
                </p>
              )}
            </div>
          </Panel>
        </div>

        {/* Quick Actions */}
        <Panel title="Quick Actions" subtitle="Common administrative tasks">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/create-user"
              className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg shadow hover:shadow-lg transition font-semibold"
            >
              <UserPlus className="w-5 h-5" />
              Create User
            </Link>
            <Link
              to="/manage-users"
              className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-risk to-risk/80 text-risk-foreground rounded-lg shadow hover:shadow-lg transition font-semibold"
            >
              <Users className="w-5 h-5" />
              Manage Users
            </Link>
            <Link
              to="/assign-patient"
              className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-wellness to-wellness/80 text-wellness-foreground rounded-lg shadow hover:shadow-lg transition font-semibold"
            >
              <Users className="w-5 h-5" />
              Assign Patient
            </Link>
            <Link
              to="/doctor-gamification"
              className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground rounded-lg shadow hover:shadow-lg transition font-semibold"
            >
              <Activity className="w-5 h-5" />
              Doctor Gamification
            </Link>
          </div>
        </Panel>

        {/* Recent Alerts (from Alerts table) */}
        <Panel title="Recent Alerts" subtitle="Priority-based signals">
          <div className="space-y-3">
            {(dashboardStats.recentAlerts || []).length > 0 ? (
              dashboardStats.recentAlerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${alert.priority === 1
                    ? "bg-attention/5 border-attention/20"
                    : alert.priority === 2
                      ? "bg-secondary border-border"
                      : "bg-wellness/5 border-wellness/20"
                    }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${alert.priority === 1
                      ? "bg-attention"
                      : alert.priority === 2
                        ? "bg-muted-foreground"
                        : "bg-wellness"
                      }`}
                  />
                  <span className="text-sm text-foreground">{alert.message}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent alerts.
              </p>
            )}
          </div>
        </Panel>

        {/* Doctor Comparison - Using qualitative bands for mentoring */}
        <Panel
          title="Clinical Team Overview"
          subtitle="Supporting growth and improvement • Non-competitive assessment"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Doctor
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Performance
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Wellness Conversion
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => {
                  const completionSpeed = 75; // Placeholder
                  const wellnessConversion = 80; // Placeholder
                  return (
                    <tr key={doctor.id} className="border-b border-border/50">
                      <td className="py-3 px-4 font-medium text-foreground">
                        {doctor.fullName || "Unnamed Doctor"}
                      </td>
                      <td className="py-3 px-4">
                        <DoctorPerformanceBadge
                          band={getPerformanceBand(completionSpeed, wellnessConversion)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-wellness rounded-full"
                              style={{ width: `${wellnessConversion}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {wellnessConversion}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {doctor.specialization || "General"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4 px-4">
            Performance is based on journey completion speed and wellness conversion rate.
            This view supports mentoring and growth, not competition.
          </p>
        </Panel>
      </div>
    </AppLayout>
  );
}
