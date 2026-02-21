import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2, Video, MapPin, ChevronRight, ChevronLeft, User, Activity, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { TriageQuestionnaire } from "../triage/TriageQuestionnaire";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface ClientBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

type Step = "type" | "clinician" | "triage" | "time" | "confirm";

export function ClientBookingModal({
    isOpen,
    onClose,
    onSuccess,
}: ClientBookingModalProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<Step>("type");
    const [doctors, setDoctors] = useState<any[]>([]);
    const [therapists, setTherapists] = useState<any[]>([]);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [fetchingSlots, setFetchingSlots] = useState(false);
    const [triageSessionId, setTriageSessionId] = useState<string | null>(null);
    const [triageResult, setTriageResult] = useState<any>(null);

    const [formData, setFormData] = useState({
        consultationType: "DOCTOR" as "DOCTOR" | "THERAPIST" | "COMBINED",
        consultationMode: "OFFLINE" as "OFFLINE" | "ONLINE",
        doctorId: "",
        therapistId: "",
        date: undefined as Date | undefined,
        slot: "",
        notes: "",
    });

    const { profile } = useAuth();

    useEffect(() => {
        if (isOpen) {
            fetchStaff();
            setStep("type");
            setTriageSessionId(null);
            setTriageResult(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (formData.date && (formData.doctorId || formData.therapistId)) {
            fetchSlots();
        }
    }, [formData.date, formData.doctorId, formData.therapistId]);

    const fetchStaff = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/appointments/available-staff`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                const data = await res.json();
                setDoctors(data.doctors || []);
                setTherapists(data.therapists || []);
            }
        } catch (error) {
            console.error("Failed to fetch staff:", error);
        }
    };

    const fetchSlots = async () => {
        if (!formData.date) return;
        setFetchingSlots(true);
        try {
            const clinicianId = formData.consultationType === "THERAPIST" ? formData.therapistId : formData.doctorId;
            const res = await fetch(`${API_BASE_URL}/api/appointments/available-slots?clinicianId=${clinicianId}&date=${formData.date.toISOString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                const slots = await res.json();
                setAvailableSlots(slots);
            }
        } catch (error) {
            console.error("Failed to fetch slots:", error);
            toast.error("Failed to fetch available time slots");
        } finally {
            setFetchingSlots(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.date || !formData.slot) {
            toast.error("Please select a date and time slot");
            return;
        }

        setLoading(true);
        try {
            const [startTime] = formData.slot.split(" - ");
            const appointmentDate = new Date(formData.date);
            const [hours, minutes] = startTime.split(":");
            appointmentDate.setHours(parseInt(hours), parseInt(minutes));

            const res = await fetch(`${API_BASE_URL}/api/appointments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                },
                body: JSON.stringify({
                    consultationType: formData.consultationType,
                    consultationMode: formData.consultationMode,
                    doctorId: formData.doctorId || null,
                    therapistId: formData.therapistId || null,
                    date: appointmentDate.toISOString(),
                    notes: formData.notes,
                    triageSessionId: triageSessionId
                }),
            });

            if (res.ok) {
                toast.success("Appointment request submitted successfully!");
                onSuccess?.();
                onClose();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to book appointment");
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (step === "type") setStep("triage");
        else if (step === "triage") setStep("clinician");
        else if (step === "clinician") setStep("time");
        else if (step === "time") setStep("confirm");
    };

    const prevStep = () => {
        if (step === "triage") setStep("type");
        else if (step === "clinician") setStep("triage");
        else if (step === "time") setStep("clinician");
        else if (step === "confirm") setStep("time");
    };

    const selectedDoctor = doctors.find(d => d.id === formData.doctorId);
    const selectedTherapist = therapists.find(t => t.id === formData.therapistId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 bg-card border border-border shadow-elevated rounded-xl max-h-[92vh] overflow-y-auto [&>button]:hidden">
                <div className="px-5 pt-5 pb-3 border-b border-border/50 relative">
                    <div className="flex justify-between items-start mb-2">
                        <DialogHeader className="text-left flex-1">
                            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-primary" />
                                Book Appointment
                            </DialogTitle>
                        </DialogHeader>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-muted shrink-0"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex gap-1.5 mt-4">
                        {(["type", "triage", "clinician", "time", "confirm"] as Step[]).map((s, i) => (
                            <div
                                key={s}
                                className={cn(
                                    "h-1 flex-1 rounded-full transition-all duration-300",
                                    step === s ? "bg-primary" : (i < ["type", "triage", "clinician", "time", "confirm"].indexOf(step) ? "bg-primary/40" : "bg-muted")
                                )}
                            />
                        ))}
                    </div>
                </div>

                <div className="p-5 space-y-6">
                    {step === "type" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <Label className="text-base font-bold text-foreground">What type of consultation do you need?</Label>
                            <div className="grid gap-2.5">
                                {[
                                    { id: "DOCTOR", label: "Consult a Doctor", icon: User, desc: "Primary care and medical consultation" },
                                    { id: "THERAPIST", label: "Talk to a Therapist", icon: Video, desc: "Emotional wellness and therapy sessions" },
                                    { id: "COMBINED", label: "Combined Care", icon: ChevronRight, desc: "Both Doctor and Therapist (Recommended)" }
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            setFormData({ ...formData, consultationType: t.id as any });
                                            nextStep();
                                        }}
                                        className={cn(
                                            "flex items-center gap-3.5 p-3.5 rounded-lg border transition-all hover:border-primary/50 hover:bg-primary/5",
                                            formData.consultationType === t.id ? "border-primary bg-primary/5 shadow-sm" : "border-border"
                                        )}
                                    >
                                        <div className="p-2 bg-primary/10 rounded-md text-primary">
                                            <t.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{t.label}</p>
                                            <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="pt-4 border-t border-border/50">
                                <Label className="block mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Preferred Mode</Label>
                                <div className="flex gap-2.5">
                                    <button
                                        onClick={() => setFormData({ ...formData, consultationMode: "OFFLINE" })}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all",
                                            formData.consultationMode === "OFFLINE" ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background border-border hover:bg-muted"
                                        )}
                                    >
                                        <MapPin className="w-4 h-4" /> In-person
                                    </button>
                                    <button
                                        onClick={() => setFormData({ ...formData, consultationMode: "ONLINE" })}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all",
                                            formData.consultationMode === "ONLINE" ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background border-border hover:bg-muted"
                                        )}
                                    >
                                        <Video className="w-4 h-4" /> Online
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === "triage" && (
                        <div className="animate-in fade-in slide-in-from-right-2">
                            <TriageQuestionnaire
                                onComplete={(session) => {
                                    setTriageSessionId(session.id);
                                    setTriageResult(session);
                                    nextStep();
                                }}
                                onCancel={onClose}
                            />
                        </div>
                    )}

                    {step === "clinician" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                            {triageResult && (
                                <div className={cn(
                                    "p-3 rounded-lg border text-[11px] leading-relaxed",
                                    triageResult.classification === 'Escalation Required'
                                        ? "bg-risk/10 border-risk/20 text-risk"
                                        : "bg-primary/5 border-primary/20 text-primary"
                                )}>
                                    <p className="font-bold flex items-center gap-1.5 mb-1 uppercase">
                                        <Activity className="w-3 h-3" />
                                        Assessment Result: {triageResult.classification || 'Standard'}
                                    </p>
                                    <p>{triageResult.reasoning || `Based on your responses, we recommend a ${triageResult.suggestedSpecialty || 'General Physician'}.`}</p>
                                </div>
                            )}

                            <Label className="text-base font-bold text-foreground">
                                {triageResult?.classification === 'Escalation Required'
                                    ? "Consult with a Senior Specialist"
                                    : (formData.consultationType === "DOCTOR" ? "Choose your Doctor" : "Choose your Therapist")}
                            </Label>

                            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 customize-scrollbar">
                                {(formData.consultationType === "THERAPIST" ? therapists : doctors)
                                    .filter(staff => {
                                        if (!triageResult) return true;

                                        // 1. Escalation enforcement
                                        if (triageResult.classification === 'Escalation Required') {
                                            return staff.user?.role === 'ADMIN_DOCTOR';
                                        }

                                        // 2. Specialist Preference (Non-mandatory filtering for standard/specialist cases)
                                        // We show the specialized ones first or exclusively if specified
                                        if (triageResult.classification === 'Specialist Required' && triageResult.suggestedSpecialty) {
                                            return staff.specialization?.toLowerCase() === triageResult.suggestedSpecialty.toLowerCase() ||
                                                staff.specialization?.toLowerCase().includes(triageResult.suggestedSpecialty.toLowerCase());
                                        }

                                        return true;
                                    })
                                    .map((staff) => (
                                        <button
                                            key={staff.id}
                                            onClick={() => {
                                                if (formData.consultationType === "THERAPIST") {
                                                    setFormData({ ...formData, therapistId: staff.id });
                                                } else {
                                                    setFormData({ ...formData, doctorId: staff.id });
                                                }
                                                nextStep();
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3.5 rounded-lg border transition-all hover:border-primary/50",
                                                (formData.doctorId === staff.id || formData.therapistId === staff.id) ? "border-primary bg-primary/5 shadow-sm" : "border-border"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-primary font-bold text-sm">
                                                    {staff.fullName?.charAt(0) || "C"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">{staff.fullName}</p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {staff.specialization || (staff.user?.role === 'ADMIN_DOCTOR' ? 'Senior Consultant' : (formData.consultationType === "THERAPIST" ? "Wellness Specialist" : "Medical Practitioner"))}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                    ))}
                            </div>

                            <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground" onClick={prevStep}>
                                <ChevronLeft className="w-3.5 h-3.5" /> Back to assessment
                            </Button>
                        </div>
                    )}

                    {step === "time" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                            <div className="flex flex-col items-center">
                                <Label className="text-base font-bold mb-4 self-start">Select Date & Time</Label>
                                <CalendarComponent
                                    mode="single"
                                    selected={formData.date}
                                    onSelect={(d) => setFormData({ ...formData, date: d, slot: "" })}
                                    className="rounded-lg border shadow-sm mb-5 bg-card"
                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                />

                                {formData.date && (
                                    <div className="w-full space-y-2.5">
                                        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Available Time Slots for {format(formData.date, "PPP")}</Label>
                                        {fetchingSlots ? (
                                            <div className="flex items-center justify-center p-8">
                                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                            </div>
                                        ) : availableSlots.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {availableSlots.map(slot => (
                                                    <Button
                                                        key={slot}
                                                        variant={formData.slot === slot ? "default" : "outline"}
                                                        onClick={() => setFormData({ ...formData, slot })}
                                                        className="rounded-md text-xs font-bold transition-all"
                                                        size="sm"
                                                    >
                                                        {slot}
                                                    </Button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center p-4 bg-muted/50 rounded-lg text-[11px] font-medium text-muted-foreground">
                                                No slots available for this day. Try another date.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 pt-4">
                                <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground" onClick={prevStep}>
                                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                                </Button>
                                <Button
                                    className="flex-1 text-xs font-bold rounded-lg shadow-sm"
                                    size="sm"
                                    disabled={!formData.date || !formData.slot}
                                    onClick={nextStep}
                                >
                                    Review Details
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === "confirm" && (
                        <div className="space-y-6 animate-in fade-in zoom-in-98">
                            <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-3">
                                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Consultation</span>
                                    <span className="text-sm font-bold">{formData.consultationType} ({formData.consultationMode})</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Clinician</span>
                                    <span className="text-sm font-bold">{selectedDoctor?.fullName || selectedTherapist?.fullName}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Date</span>
                                    <span className="text-sm font-bold">{formData.date ? format(formData.date, "PPP") : ""}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Time Slot</span>
                                    <span className="text-sm font-bold text-primary">{formData.slot}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Additional Information (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Briefly describe your concern..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="min-h-[100px] rounded-lg focus-visible:ring-primary text-sm bg-card border-border/60"
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button variant="ghost" className="flex-1 text-xs font-bold" onClick={prevStep} disabled={loading}>
                                    Back
                                </Button>
                                <Button
                                    className="flex-[2] text-xs font-bold rounded-lg shadow-md h-11"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Confirm Booking"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
