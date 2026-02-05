import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Panel } from "@/components/ui/panel";
import { PatientCard } from "@/components/ui/patient-card";
import { DoctorPerformanceBadge, getPerformanceBand } from "@/components/ui/doctor-performance-badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  AlertTriangle, 
  Sparkles, 
  Activity, 
  CheckCircle2,
} from "lucide-react";

// Mock data aligned with backend models
const stats = {
  atRisk: 12,
  wellnessEligible: 28,
  activeJourneys: 156,
  completed: 89,
};

const atRiskJourneys = [
  { id: "1", patientName: "Fatima Ahmed", reason: "Missed 3 consecutive sittings", journeyType: "OP" },
  { id: "2", patientName: "Mohammad Khan", reason: "Medication not marked for 5 days", journeyType: "OP" },
  { id: "3", patientName: "Ayesha Siddiqui", reason: "Journey progress stalled", journeyType: "OP" },
  { id: "4", patientName: "Ali Hassan", reason: "Missed last 2 appointments", journeyType: "OP" },
];

const wellnessEligibleJourneys = [
  { id: "1", patientName: "Sarah Rahman", sittings: { current: 18, total: 20 }, journeyType: "OP" },
  { id: "2", patientName: "Imran Malik", sittings: { current: 14, total: 15 }, journeyType: "OP" },
  { id: "3", patientName: "Zara Qureshi", sittings: { current: 9, total: 10 }, journeyType: "OP" },
];

const recentAlerts = [
  { id: "1", type: "urgent", message: "3 patients need immediate attention", priority: 1 },
  { id: "2", type: "info", message: "Weekly wellness conversion below target", priority: 2 },
  { id: "3", type: "success", message: "5 journeys completed this week", priority: 3 },
];

// Doctor comparison with qualitative bands instead of numeric rankings
const doctorPerformance = [
  { 
    name: "Dr. Ahmed", 
    completionSpeed: 92, // % of journeys completed on time
    wellnessConversion: 88, // % journeys reaching COMPLETED
    providesTherapy: true,
  },
  { 
    name: "Dr. Fatima", 
    completionSpeed: 85, 
    wellnessConversion: 82,
    providesTherapy: false,
  },
  { 
    name: "Dr. Hassan", 
    completionSpeed: 78, 
    wellnessConversion: 75,
    providesTherapy: true,
  },
  { 
    name: "Dr. Zara", 
    completionSpeed: 68, 
    wellnessConversion: 65,
    providesTherapy: false,
  },
];

export default function DoctorAdminDashboard() {
  const { profile } = useAuth();

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
            title="Active OP Journeys"
            value={stats.activeJourneys}
            icon={Activity}
          />
          <StatCard
            title="Completed Journeys"
            value={stats.completed}
            icon={CheckCircle2}
            variant="wellness"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* At-Risk Journeys (based on Journey.status = AT_RISK) */}
          <Panel
            title="At-Risk Journeys"
            subtitle="Journeys requiring attention"
            variant="attention"
          >
            <div className="space-y-3">
              {atRiskJourneys.map((journey) => (
                <PatientCard
                  key={journey.id}
                  name={journey.patientName}
                  reason={journey.reason}
                  status="at-risk"
                />
              ))}
            </div>
          </Panel>

          {/* Wellness Eligible (journeys nearing completion with good adherence) */}
          <Panel
            title="Wellness Eligible"
            subtitle="Ready for Illness → Wellness upgrade"
            variant="wellness"
          >
            <div className="space-y-3">
              {wellnessEligibleJourneys.map((journey) => (
                <PatientCard
                  key={journey.id}
                  name={journey.patientName}
                  sittings={journey.sittings}
                  status="on-track"
                />
              ))}
            </div>
          </Panel>
        </div>

        {/* Recent Alerts (from Alerts table) */}
        <Panel title="Recent Alerts" subtitle="Priority-based signals">
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  alert.priority === 1
                    ? "bg-attention/5 border-attention/20"
                    : alert.priority === 2
                    ? "bg-secondary border-border"
                    : "bg-wellness/5 border-wellness/20"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    alert.priority === 1
                      ? "bg-attention"
                      : alert.priority === 2
                      ? "bg-muted-foreground"
                      : "bg-wellness"
                  }`}
                />
                <span className="text-sm text-foreground">{alert.message}</span>
              </div>
            ))}
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
                {doctorPerformance.map((doctor) => (
                  <tr key={doctor.name} className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium text-foreground">
                      {doctor.name}
                    </td>
                    <td className="py-3 px-4">
                      <DoctorPerformanceBadge 
                        band={getPerformanceBand(doctor.completionSpeed, doctor.wellnessConversion)} 
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-wellness rounded-full"
                            style={{ width: `${doctor.wellnessConversion}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {doctor.wellnessConversion}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground">
                        {doctor.providesTherapy ? "Prescribes & Therapy" : "Prescribes Only"}
                      </span>
                    </td>
                  </tr>
                ))}
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
