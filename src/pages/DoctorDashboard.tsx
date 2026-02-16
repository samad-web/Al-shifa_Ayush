import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatCard } from "@/components/ui/stat-card";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { PatientCard } from "@/components/ui/patient-card";
import { MultiplePrescriptionForm } from "@/components/prescription/MultiplePrescriptionForm";
import { EncouragementText } from "@/components/ui/encouragement-text";
import { useAuth } from "@/hooks/useAuth";
import { Users, AlertTriangle, Sparkles, CheckCircle2, Pill } from "lucide-react";

import { useEffect, useState } from "react";
const initialStats = {
  recoveryProgress: 0,
  medicationAdherence: 0,
  activeJourneys: 0,
  atRisk: 0,
  wellnessEligible: 0,
  completed: 0,
  patientsNeedingAttention: [],
  patientsNearingWellness: [],
};



// Encouragement messages based on performance
const getEncouragementMessage = (recoveryProgress: number): string => {
  if (recoveryProgress >= 80) {
    return "Excellent work! Your patients are progressing well. Keep up the great care.";
  }
  if (recoveryProgress >= 60) {
    return "You're doing well. Maintaining this rhythm helps patients heal faster.";
  }
  return "Every patient interaction matters. Small consistent care leads to big outcomes.";
};

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/doctor/stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch doctor stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <PageHeader
            title="Your Clinical Progress"
            subtitle={profile?.full_name
              ? `Dr. ${profile.full_name} • Small consistency leads to better patient outcomes`
              : "Small consistency leads to better patient outcomes"
            }
            className="text-center"
          />
        </div>

        {/* Progress Rings - Based on journey and medication data */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-6">
          <div className="text-center space-y-3">
            <ProgressRing
              progress={stats.recoveryProgress}
              size={140}
              strokeWidth={10}
              variant="recovery"
              label="Recovery"
            />
            <p className="text-sm font-medium text-muted-foreground">
              Recovery Progress
            </p>
            <p className="text-xs text-muted-foreground/70">
              Journeys on track or completed
            </p>
          </div>
          <div className="text-center space-y-3">
            <ProgressRing
              progress={stats.medicationAdherence}
              size={140}
              strokeWidth={10}
              variant="adherence"
              label="Adherence"
            />
            <p className="text-sm font-medium text-muted-foreground">
              Medication Adherence
            </p>
            <p className="text-xs text-muted-foreground/70">
              Based on medication logs
            </p>
          </div>
        </div>

        {/* Encouragement - Dynamic based on performance */}
        <div className="bg-wellness/5 border border-wellness/20 rounded-xl p-5 text-center">
          <EncouragementText
            message={getEncouragementMessage(stats.recoveryProgress)}
            variant="prominent"
          />
        </div>

        {/* Stats Grid - Based on Journey model */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Journeys"
            value={stats.activeJourneys}
            icon={Users}
          />
          <StatCard
            title="At Risk"
            value={stats.atRisk}
            icon={AlertTriangle}
            variant="attention"
          />
          <StatCard
            title="Wellness Eligible"
            value={stats.wellnessEligible}
            icon={Sparkles}
            variant="wellness"
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle2}
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
                fetchStats(); // Refresh stats if it affects dashboards
              }}
              onCancel={() => setSelectedPatient(null)}
            />
          </Panel>
        )}

        {/* Panels - No alerts, no comparison with other doctors */}
        <div className="grid md:grid-cols-2 gap-6">
          <Panel
            title="Patients who may need attention"
            subtitle="Journeys with AT_RISK status"
            variant="attention"
          >
            <div className="space-y-3">
              {(stats.patientsNeedingAttention || []).length > 0 ? (
                stats.patientsNeedingAttention.map((patient: any) => (
                  <PatientCard
                    key={patient.id}
                    name={patient.name}
                    reason={patient.reason}
                    status="needs-attention"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[10px] font-bold uppercase tracking-wider gap-2 w-full"
                      onClick={() => setSelectedPatient({ id: patient.id, name: patient.name })}
                    >
                      <Pill className="w-3 h-3" /> Prescribe
                    </Button>
                  </PatientCard>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All patients are on track 🌿
                </p>
              )}
            </div>
          </Panel>

          <Panel
            title="Patients nearing Wellness"
            subtitle="Journeys close to completion"
            variant="wellness"
          >
            <div className="space-y-3">
              {(stats.patientsNearingWellness || []).length > 0 ? (
                stats.patientsNearingWellness.map((patient: any) => (
                  <PatientCard
                    key={patient.id}
                    name={patient.name}
                    sittings={patient.sittings}
                    status="on-track"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[10px] font-bold uppercase tracking-wider gap-2 w-full"
                      onClick={() => setSelectedPatient({ id: patient.id, name: patient.name })}
                    >
                      <Pill className="w-3 h-3" /> Prescribe
                    </Button>
                  </PatientCard>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No patients nearing wellness yet ✨
                </p>
              )}
            </div>
          </Panel>
        </div>

        {/* Footer message */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            This view focuses on your patients only. No comparison with other doctors.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
