import { AppLayout } from "@/components/layout/app-layout";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { EncouragementText } from "@/components/ui/encouragement-text";
import { NotificationPlaceholder } from "@/components/ui/notification-placeholder";
import { useState, useEffect } from "react";
import { CheckCircle2, Pill, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PrescriptionList } from "@/components/prescription-list";
import { AdherenceTracker } from "@/components/adherence-tracker";

// Mock data aligned with backend models
type JourneyStatus = "ON_TRACK" | "AT_RISK" | "COMPLETED";

const patientData = {
  journeyId: "j1",
  journeyType: "OP",
  status: "ON_TRACK" as JourneyStatus,
  totalSittings: 20,
  completedSittings: 13,
  medicineTakenToday: false,
};

// Map journey status to StatusBadge status
const mapJourneyStatus = (status: JourneyStatus) => {
  switch (status) {
    case "ON_TRACK": return "on-track" as const;
    case "AT_RISK": return "needs-attention" as const;
    case "COMPLETED": return "completed" as const;
  }
};

export default function PatientScreen() {
  const { profile } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ medicationName: "", dosage: "", frequency: "", duration: "", notes: "", file: null as File | null });
  const [medicineTaken, setMedicineTaken] = useState(patientData.medicineTakenToday);
  const [showMedicineSuccess, setShowMedicineSuccess] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    async function fetchPrescriptions() {
      const res = await fetch(`/api/prescriptions/patient/${profile?.patient?.id || profile?.id}/view`, { credentials: "include" });
      if (res.ok) setPrescriptions(await res.json());
    }
    if (profile?.id) {
      fetchPrescriptions();
    }
  }, [profile]);

  const progress = Math.round((patientData.completedSittings / patientData.totalSittings) * 100);

  const handleMarkMedicine = () => {
    setShowMedicineSuccess(true);
    setTimeout(() => {
      setMedicineTaken(true);
      setShowMedicineSuccess(false);
    }, 1200);
  };

  const getGreeting = () => {
    if (patientData.status === "COMPLETED") {
      return { title: "Congratulations! 🎉", subtitle: "You've completed your journey to wellness." };
    }
    if (patientData.status === "AT_RISK") {
      return { title: "We're here for you 💙", subtitle: "Let's get back on track together." };
    }
    return { title: "You're doing well 🌿", subtitle: "Healing is a journey. You're on track." };
  };

  const greeting = getGreeting();
  const activeNudge = {
    id: "n1",
    type: "encouragement",
    message: "You've completed over half your treatment. Keep going 🌱",
  };

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Main Content */}
        <div className="flex-1 flex items-start justify-center px-4 py-8">
          <div className="max-w-5xl w-full">
            {/* Greeting - Always centered at top */}
            <div className="text-center space-y-2 mb-8 md:mb-12">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {greeting.title}
              </h1>
              <p className="text-lg text-muted-foreground">
                {greeting.subtitle}
              </p>
              {profile?.full_name && (
                <p className="text-base text-primary font-medium mt-2">
                  {profile.full_name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
              {/* Left Column: Progress */}
              <div className="space-y-8 flex flex-col items-center lg:items-center">
                <div className="flex flex-col items-center space-y-6 w-full py-8 bg-card rounded-3xl border border-border/50 shadow-sm">
                  <ProgressRing
                    progress={progress}
                    size={220}
                    strokeWidth={14}
                    variant="progress"
                  />
                  <div className="text-center">
                    <p className="text-base font-medium text-foreground">
                      {patientData.completedSittings} of {patientData.totalSittings} sittings completed
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Keep up the momentum!
                    </p>
                  </div>
                  <StatusBadge status={mapJourneyStatus(patientData.status)} />
                </div>

                {/* Active Nudge - Integrated here on desktop */}
                <div className="w-full bg-wellness/5 border border-wellness/20 rounded-2xl p-6">
                  <EncouragementText
                    message={activeNudge.message}
                    variant="prominent"
                  />
                </div>
              </div>

              {/* Right Column: Today's Care & Prescriptions */}
              <div className="space-y-6">
                {/* Today's Care Section */}
                <div className="bg-card rounded-2xl border border-border shadow-card p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Pill className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold text-foreground">Today's Medication</h2>
                    </div>
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors"
                      aria-label="View notifications"
                    >
                      <Bell className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  <AdherenceTracker patientId={profile?.patient?.id || ""} />
                </div>

                {/* Prescription Section */}
                <div className="bg-card rounded-2xl border border-border shadow-card p-6 space-y-5">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-foreground">Prescriptions</h2>
                    {(profile?.role === "ADMIN_DOCTOR" || profile?.role === "DOCTOR") && (
                      <button className="text-sm font-semibold text-primary hover:underline" onClick={() => setShowAddModal(true)}>
                        + Add Prescription
                      </button>
                    )}
                  </div>
                  <PrescriptionList prescriptions={prescriptions} />
                </div>

                {/* Notification Placeholders */}
                {showNotifications && (
                  <div className="space-y-4 animate-fade-in-up">
                    <NotificationPlaceholder type="medication" />
                    <NotificationPlaceholder type="sitting" />
                    <p className="text-xs text-center text-muted-foreground">
                      Real-time notifications coming soon
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Encouragement */}
        <footer className="py-6 px-4">
          <EncouragementText
            message="Small steps taken daily lead to complete wellness."
            variant="subtle"
          />
        </footer>


        {/* Add Prescription Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <h3 className="font-semibold mb-2">Add Prescription</h3>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.append("patientId", profile?.patient?.id || profile?.id);
                fd.append("medicationName", form.medicationName);
                fd.append("dosage", form.dosage);
                fd.append("frequency", form.frequency);
                fd.append("duration", form.duration);
                fd.append("notes", form.notes);
                if (form.file) fd.append("file", form.file);
                const res = await fetch("/api/prescriptions/add", {
                  method: "POST",
                  body: fd,
                  credentials: "include",
                });
                if (res.ok) {
                  setShowAddModal(false);
                  setForm({ medicationName: "", dosage: "", frequency: "", duration: "", notes: "", file: null });
                  // Refresh prescriptions
                  const rxRes = await fetch(`/api/prescriptions/patient/${profile?.patient?.id || profile?.id}`, { credentials: "include" });
                  if (rxRes.ok) setPrescriptions(await rxRes.json());
                }
              }}
            >
              <Input placeholder="Medicine Name" value={form.medicationName} onChange={e => setForm(f => ({ ...f, medicationName: e.target.value }))} required />
              <Input placeholder="Dosage" value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} required />
              <Input placeholder="Frequency" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} required />
              <Input placeholder="Duration" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required />
              <Input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <input type="file" accept=".pdf,image/*" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
              <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium">Save Prescription</button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
