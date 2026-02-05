import { AppLayout } from "@/components/layout/app-layout";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Flame, Calendar, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

// Fetch assigned patients from backend
const fetchAssignedPatients = async () => {
  const res = await fetch("/api/user/assigned-patients", { credentials: "include" });
  if (!res.ok) return [];
  return await res.json();
};

// From TherapistStats model
const therapistStats = {
  currentStreak: 6,
  bestStreak: 14,
};

export default function TherapistScreen() {
  const { profile } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [currentPatient, setCurrentPatient] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);

  useEffect(() => {
    fetchAssignedPatients().then((data) => {
      setPatients(data);
      if (data.length > 0) {
        setSelectedPatientId(data[0].id);
        setCurrentPatient(data[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      const patient = patients.find((p) => p.id === selectedPatientId);
      setCurrentPatient(patient);
      // TODO: fetch journey/progress for selected patient
    }
  }, [selectedPatientId, patients]);

  const handleMarkComplete = () => {
    // In real app: Update Sitting.completed = true, Sitting.date = now()
    // Then update TherapistStats.current_streak
    setShowSuccess(true);
    setCompletedToday((prev) => prev + 1);
    setTimeout(() => {
      setShowSuccess(false);
      // Optionally refresh patient data
    }, 1500);
  }

  // All done state
  if (!currentPatient) {
    return (
      <AppLayout>
        <div className="min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
          <div className="max-w-sm w-full text-center space-y-6">
            <h1 className="text-2xl font-bold text-foreground">No assigned patients</h1>
            <p className="text-muted-foreground">You have no patients assigned at this time.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="max-w-5xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

            {/* Left Column: Patient List & Info */}
            <div className="space-y-6">
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h2 className="text-lg font-bold text-foreground mb-4">Patient Queue</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Select Patient
                    </label>
                    <Select
                      value={selectedPatientId}
                      onValueChange={setSelectedPatientId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose from queue..." />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.fullName || p.email || p.patientId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Patients waiting:</span>
                      <span className="font-bold text-foreground">{patients.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Streak Indicator - From TherapistStats */}
              <div className="bg-attention/5 border border-attention/20 rounded-2xl p-6 flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-attention/10 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-attention" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{therapistStats.currentStreak} Days</p>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Consistency Streak</p>
                </div>
                <p className="text-[11px] text-muted-foreground pt-2">
                  Best streak: {therapistStats.bestStreak} days
                </p>
              </div>
            </div>

            {/* Right Column: Session Controls (Main Action View) */}
            <div className="lg:col-span-2">
              <div
                className={cn(
                  "bg-card rounded-3xl border border-border shadow-elevated p-8 md:p-12 space-y-8 transition-all duration-300 min-h-[400px] flex flex-col justify-center",
                  showSuccess && "border-wellness/50 bg-wellness/5 ring-8 ring-wellness/5"
                )}
              >
                {showSuccess ? (
                  <div className="py-12 text-center animate-fade-in-up">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-wellness/10 mb-6 animate-check-pop">
                      <CheckCircle2 className="w-12 h-12 text-wellness" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground">
                      Sitting Completed!
                    </h2>
                    <p className="text-muted-foreground text-lg mt-2">
                      Great session with {currentPatient.fullName || "the patient"}.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Patient Info Header */}
                    <div className="text-center space-y-3">
                      <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
                        Live Session
                      </div>
                      <h2 className="text-4xl font-black text-foreground tracking-tight">
                        {currentPatient.fullName || currentPatient.email}
                      </h2>
                      <div className="flex items-center justify-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <Activity className="w-4 h-4" />
                          {currentPatient.journeyType} Journey
                        </span>
                        <div className="w-1 h-1 rounded-full bg-border" />
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <Calendar className="w-4 h-4" />
                          Sitting {currentPatient.nextSittingNumber || 1} of {currentPatient.totalSittings || 20}
                        </span>
                      </div>
                    </div>

                    {/* Progress Visualization */}
                    <div className="space-y-4 max-w-md mx-auto w-full">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-muted-foreground tracking-tight uppercase">Treatment Progress</span>
                        <span className="text-primary">{Math.round(((currentPatient.completedSittings || 0) / (currentPatient.totalSittings || 20)) * 100)}%</span>
                      </div>
                      <div className="h-4 bg-muted rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary-foreground rounded-full transition-all duration-700 ease-out shadow-lg"
                          style={{
                            width: `${((currentPatient.completedSittings || 0) / (currentPatient.totalSittings || 20)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Main Action Call to Care */}
                    <div className="pt-4 max-w-md mx-auto w-full">
                      <button
                        onClick={handleMarkComplete}
                        className="w-full h-16 rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-[0.97] flex items-center justify-center gap-3 group"
                      >
                        <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        Mark Sitting Complete
                      </button>
                      <p className="text-center text-xs text-muted-foreground mt-4">
                        Tapping this records the sitting and updates patient wellness stats.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
