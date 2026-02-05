
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Button } from "@/components/common/button";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Activity, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
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
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Fetch doctors and patients
    fetch(`${API_BASE_URL}/api/user/list-doctors`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
    })
      .then((res) => res.json())
      .then(setDoctors);
    fetch(`${API_BASE_URL}/api/user/list-patients`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
    })
      .then((res) => res.json())
      .then(setPatients);
  }, []);
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAssigning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/assign-patient`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({ patientId, doctorId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to assign");
        toast({ title: "Assignment failed", description: data.error || "Failed to assign", variant: "destructive" });
      } else {
        setSuccess("Patient assigned successfully!");
        toast({ title: "Success", description: "Patient assigned successfully!" });
        setDoctorId("");
        setPatientId("");
      }
    } catch {
      setError("Network error");
      toast({ title: "Network error", description: "Could not assign patient", variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  if (role !== "ADMIN" && role !== "ADMIN_DOCTOR") return <div>Access denied.</div>;

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

  return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <PageHeader
          title="Clinical Assignment"
          description="Map patients to healthcare providers and manage doctor workload."
        />

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">

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
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50">
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
                <CardTitle className="text-xl">New Patient Assignment</CardTitle>
                <CardDescription>Link a patient record to a specific doctor</CardDescription>
              </CardHeader>
              <form onSubmit={handleAssign} className="space-y-6">
                <CardContent className="space-y-8 pt-8">
                  {/* Doctor Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="doctor" className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                      Provider Selection
                    </Label>
                    <Select value={doctorId} onValueChange={setDoctorId} disabled={noDoctors} required>
                      <SelectTrigger id="doctor" className="h-12 bg-secondary/30 border-secondary focus:bg-background transition-all rounded-xl">
                        <SelectValue placeholder={noDoctors ? "No doctors available" : "Select from active staff..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>
                            {getDoctorLabel(d)}{getDoctorSub(d)}
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
                              {p.fullName || p.user?.email || p.id}
                              {p.phoneNumber ? ` — ${p.phoneNumber}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Status Messages */}
                  <div className="min-h-[20px]">
                    {error && (
                      <div className="flex items-center gap-2 text-attention text-sm font-bold animate-shake">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="flex items-center gap-2 text-wellness text-sm font-bold animate-fade-in">
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
                    className="h-12 px-10 text-lg font-bold rounded-xl shadow-lg"
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
