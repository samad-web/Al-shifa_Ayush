
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Activity, AlertCircle, Loader2, CheckCircle2, UserPlus } from "lucide-react";
import { useRef } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function AssignPatient() {
  const { role } = useAuth();
  const { toast } = useToast();

  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("No access token found");

      const headers = { Authorization: `Bearer ${token}` };

      const patientsRes = await fetch(`${API_BASE_URL}/api/user/list-patients`, { headers });

      if (!patientsRes.ok) {
        throw new Error("Failed to fetch patients");
      }

      const patientsData = await patientsRes.json();
      setPatients(patientsData);

      // If we already have a patient ID, fetch doctors for that branch
      if (patientId) {
        const patient = patientsData.find((p: any) => p.id === patientId);
        if (patient?.branchId) {
          fetchDoctors(patient.branchId);
        }
      }
    } catch (err: any) {
      console.error("Error fetching assignment data:", err);
      setError(err.message || "Failed to load data");
      toast({ title: "Error", description: "Failed to load assignment data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, patientId]);

  const fetchDoctors = async (branchId: string) => {
    setDoctorsLoading(true);
    setAvailableSlots([]);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/api/user/list-doctors?branchId=${branchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
    } finally {
      setDoctorsLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      const patient = patients.find((p: any) => p.id === patientId);
      if (patient?.branchId) {
        fetchDoctors(patient.branchId);
      }
    } else {
      setDoctors([]);
    }
  }, [patientId, patients]);

  useEffect(() => {
    if (role === "ADMIN" || role === "ADMIN_DOCTOR") {
      fetchData();
    }
  }, [role, fetchData]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[AssignPatient] Starting assignment...");
    setError("");
    setSuccess("");
    setAssigning(true);

    try {
      if (!patientId || !doctorId) {
        throw new Error("Please select both a doctor and a patient.");
      }

      const token = localStorage.getItem("accessToken");
      console.log("[AssignPatient] Token available:", !!token);

      const res = await fetch(`${API_BASE_URL}/api/user/assign-patient`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ patientId, doctorId }),
      });

      console.log("[AssignPatient] Response status:", res.status);

      const data = await res.json();
      console.log("[AssignPatient] Response data:", data);

      if (!res.ok) {
        if (data.availableSlots) {
          setAvailableSlots(data.availableSlots);
        }
        throw new Error(data.message || data.error || "Failed to assign patient");
      }

      setSuccess("Patient assigned successfully!");
      toast({ title: "Success", description: "Patient assigned successfully!" });

      // Clear selection
      setDoctorId("");
      setPatientId("");
      setAvailableSlots([]);

      // Delay refresh to allow success message to be seen and avoid immediate unmount/remount race conditions
      // Also, we don't want to flash the full page loader just for a refresh.
      // Better to fetch silently or just don't fetch if not strictly necessary for the immediate view.
      // If we must fetch, verify fetchData safety.
      // verify fetchData exists in scope (it does)
      console.log("[AssignPatient] Refreshing data...");
      // We will NOT trigger full loading state for this refresh to prevent UI flash/unmount
      // We'll call a silent refresh version or just fetch and update state without setLoading(true)

      const refreshData = async () => {
        try {
          const headers = { Authorization: `Bearer ${token}` };
          const patientsRes = await fetch(`${API_BASE_URL}/api/user/list-patients`, { headers });
          if (patientsRes.ok) {
            const p = await patientsRes.json();
            if (Array.isArray(p)) setPatients(p);
          }
        } catch (refreshErr) {
          console.error("Silent refresh failed", refreshErr);
        }
      };

      await refreshData();

    } catch (err: any) {
      console.error("[AssignPatient] Assignment error:", err);
      setError(err.message || "An unexpected error occurred");
      toast({
        title: "Assignment failed",
        description: err.message || "Could not assign patient",
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };

  if (role !== "ADMIN" && role !== "ADMIN_DOCTOR") return <div className="p-8 text-center text-muted-foreground">Access denied.</div>;

  // --- Patient search logic (debounced, client-side) ---
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 200);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  const filteredPatients = patients.filter((p: any) => {
    const name = p.fullName?.toLowerCase() || "";
    const email = p.user?.email?.toLowerCase() || "";
    const phone = p.phoneNumber?.toLowerCase() || "";
    const id = (p.id || "").toLowerCase();
    const q = debouncedSearch.toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q) || id.includes(q);
  });

  // --- Doctor display helpers ---
  const getDoctorLabel = (d: any) => d.fullName || d.user?.email || d.id;
  const getDoctorSub = (d: any) => d.specialization ? ` (${d.specialization})` : "";

  // --- Edge states ---
  const noDoctors = doctors.length === 0;
  const noPatients = patients.length === 0;
  const noPatientMatches = filteredPatients.length === 0 && !noPatients;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-medium italic">Loading assignment data...</p>
        </div>
      </AppLayout>
    );
  }

  if (error && !doctors.length && !patients.length) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
          <div className="p-4 rounded-full bg-attention/10 mb-4">
            <AlertCircle className="w-10 h-10 text-attention" />
          </div>
          <h3 className="text-xl font-bold mb-2">Unavailable</h3>
          <p className="text-muted-foreground max-w-md mb-6">{error}</p>
          <Button variant="outline" onClick={fetchData}>Try Again</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <PageHeader
          title="Clinical Assignment"
          subtitle="Map patients to healthcare providers and manage doctor workload."
        />

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-5 gap-10 items-start animate-in slide-in-from-bottom-4 duration-700">

          {/* Left Column: Context / Doctor Overviews (2/5 width) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm bg-secondary/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  Healthcare Providers
                </CardTitle>
                <CardDescription>Current workload across clinical staff</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {noDoctors ? (
                    <p className="text-sm text-muted-foreground italic">No doctors available to display.</p>
                  ) : (
                    doctors.slice(0, 6).map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50 transition-all hover:bg-secondary/10">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-foreground">{d.fullName || d.user?.email}</span>
                          <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-tight">
                            {d.specialization || "General Medicine"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-12 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.min((d._count?.patients || 0) * 10, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-primary">
                            {d._count?.patients || 0}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  {doctors.length > 6 && (
                    <p className="text-[11px] text-center text-muted-foreground uppercase font-black tracking-widest pt-2">
                      + {doctors.length - 6} more providers
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-primary/5">
              <CardContent className="pt-6">
                <p className="text-xs text-primary/80 font-medium leading-relaxed">
                  <strong>Tip:</strong> Assignments are recorded immediately. Doctors will see the new patient in their "My Patients" dashboard upon their next refresh.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Assignment Form (3/5 width) */}
          <div className="lg:col-span-3">
            <Card className="shadow-elevated border-border/60">
              <CardHeader className="bg-secondary/10 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-lg shadow-sm">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">New Patient Assignment</CardTitle>
                    <CardDescription>Link a patient record to a specific doctor</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={handleAssign} className="space-y-6">
                <CardContent className="space-y-8 pt-8">
                  {/* Doctor Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="doctor" className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                      Provider Selection
                    </Label>
                    <Select value={doctorId} onValueChange={setDoctorId} disabled={noDoctors || doctorsLoading} required>
                      <SelectTrigger id="doctor" className="h-12 bg-secondary/30 border-secondary focus:bg-background transition-all rounded-xl">
                        <SelectValue placeholder={doctorsLoading ? "Filtering active staff..." : noDoctors ? (patientId ? "No doctors available in this branch" : "Select patient first") : "Select clinician..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>
                            {getDoctorLabel(d)}{getDoctorSub(d)} {d.branchName ? `— ${d.branchName}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Patient Selection with Search */}
                  <div className="space-y-3">
                    <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                      Patient Identification
                    </label>
                    <div className="grid gap-4">
                      <Input
                        id="patient-search"
                        placeholder={noPatients ? "No records found" : "Search by name, phone, or ID..."}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onFocus={() => { setAvailableSlots([]); setError(""); }}
                        disabled={noPatients}
                        className="h-12 bg-secondary/30 border-secondary focus:bg-background transition-all rounded-xl"
                      />

                      <Select value={patientId} onValueChange={setPatientId} disabled={noPatients || noPatientMatches} required>
                        <SelectTrigger id="patient" className="h-12 bg-secondary/30 border-secondary focus:bg-background transition-all rounded-xl">
                          <SelectValue placeholder={noPatients ? "List empty" : noPatientMatches ? "No matches found" : "Select from results..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredPatients.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex flex-col">
                                <span className="font-bold">{p.fullName || p.user?.email || p.id}</span>
                                <span className="text-[10px] opacity-70 uppercase font-black">
                                  {p.branch?.name || "Global Branch"} {p.phoneNumber ? ` • ${p.phoneNumber}` : ""}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Status Messages */}
                  <div className="min-h-[20px] space-y-4">
                    {error && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-attention text-sm font-bold animate-shake bg-attention/10 p-3 rounded-lg border border-attention/20">
                          <AlertCircle className="w-4 h-4" />
                          {error}
                        </div>
                        {availableSlots.length > 0 && (
                          <div className="p-4 rounded-xl bg-wellness/5 border border-wellness/20">
                            <p className="text-xs font-black uppercase tracking-widest text-wellness mb-3">
                              Suggested Available Slots Today:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {availableSlots.map((slot, i) => (
                                <span key={i} className="px-3 py-1 bg-wellness/10 text-wellness text-[10px] font-bold rounded-full">
                                  {slot}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {success && (
                      <div className="flex items-center gap-2 text-wellness text-sm font-bold animate-fade-in bg-wellness/10 p-3 rounded-lg border border-wellness/20">
                        <CheckCircle2 className="w-4 h-4" />
                        {success}
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="bg-secondary/5 border-t border-border/50 p-6 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground font-medium italic">
                    All fields are required
                  </div>
                  <Button
                    type="submit"
                    className="h-12 px-10 text-lg font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02]"
                    disabled={!doctorId || !patientId || assigning || noDoctors || noPatients}
                  >
                    {assigning ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Complete Assignment"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
