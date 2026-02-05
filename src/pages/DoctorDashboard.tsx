import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatCard } from "@/components/ui/stat-card";
import { Panel } from "@/components/ui/panel";
import { PatientCard } from "@/components/ui/patient-card";
import { EncouragementText } from "@/components/ui/encouragement-text";
import { useAuth } from "@/hooks/useAuth";
import { Users, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";

// Mock data aligned with backend models
// Recovery Progress = % of journeys with status ON_TRACK or COMPLETED
// Medication Adherence = calculated from MedicationLog entries
const doctorStats = {
  recoveryProgress: 78,
  medicationAdherence: 85,
  activeJourneys: 42, // Count of journeys where status != COMPLETED
  atRisk: 5, // Count of journeys where status = AT_RISK
  wellnessEligible: 12, // Journeys nearing completion with good adherence
  completed: 34, // Count of journeys where status = COMPLETED
};

// Patients needing attention - journeys with AT_RISK status
const patientsNeedingAttention = [
  { id: "1", name: "Fatima Ahmed", reason: "Missed 2 sittings this week" },
  { id: "2", name: "Hassan Ali", reason: "Medication gap detected" },
];

// Patients nearing wellness - journeys close to total_sittings
const patientsNearingWellness = [
  { id: "1", name: "Sarah Khan", sittings: { current: 18, total: 20 } },
  { id: "2", name: "Imran Qureshi", sittings: { current: 9, total: 10 } },
  { id: "3", name: "Zara Malik", sittings: { current: 14, total: 15 } },
];

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
              progress={doctorStats.recoveryProgress}
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
              progress={doctorStats.medicationAdherence}
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
            message={getEncouragementMessage(doctorStats.recoveryProgress)}
            variant="prominent"
          />
        </div>

        {/* Stats Grid - Based on Journey model */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Journeys"
            value={doctorStats.activeJourneys}
            icon={Users}
          />
          <StatCard
            title="At Risk"
            value={doctorStats.atRisk}
            icon={AlertTriangle}
            variant="attention"
          />
          <StatCard
            title="Wellness Eligible"
            value={doctorStats.wellnessEligible}
            icon={Sparkles}
            variant="wellness"
          />
          <StatCard
            title="Completed"
            value={doctorStats.completed}
            icon={CheckCircle2}
          />
        </div>

        {/* Panels - No alerts, no comparison with other doctors */}
        <div className="grid md:grid-cols-2 gap-6">
          <Panel
            title="Patients who may need attention"
            subtitle="Journeys with AT_RISK status"
            variant="attention"
          >
            <div className="space-y-3">
              {patientsNeedingAttention.length > 0 ? (
                patientsNeedingAttention.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    name={patient.name}
                    reason={patient.reason}
                    status="needs-attention"
                  />
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
              {patientsNearingWellness.map((patient) => (
                <PatientCard
                  key={patient.id}
                  name={patient.name}
                  sittings={patient.sittings}
                  status="on-track"
                />
              ))}
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
