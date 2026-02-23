import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2, Video, MapPin, ChevronRight, ChevronLeft, User, Activity, X, Lock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { TriageQuestionnaire } from "../triage/TriageQuestionnaire";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface ClientBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

type Step = "branch" | "type" | "clinician" | "triage" | "time" | "confirm";

export function ClientBookingModal({
    isOpen,
    onClose,
    onSuccess,
}: ClientBookingModalProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<Step>("branch");
    const [branches, setBranches] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [therapists, setTherapists] = useState<any[]>([]);
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [fetchingSlots, setFetchingSlots] = useState(false);
    const [triageSessionId, setTriageSessionId] = useState<string | null>(null);
    const [triageResult, setTriageResult] = useState<any>(null);
    const [suggestedSlot, setSuggestedSlot] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        branchId: "",
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
            fetchBranches();
            setStep("branch");
            setTriageSessionId(null);
            setTriageResult(null);
            setFormData({
                branchId: "",
                consultationType: "DOCTOR",
                consultationMode: "OFFLINE",
                doctorId: "",
                therapistId: "",
                date: undefined,
                slot: "",
                notes: "",
            });
            setSuggestedSlot(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (formData.branchId && (step === "clinician" || (formData.date && formData.slot))) {
            fetchStaff();
        }
    }, [formData.branchId, formData.date, formData.slot, step]);

    useEffect(() => {
        if (formData.date && (formData.doctorId || formData.therapistId)) {
            fetchSlots();
        }
    }, [formData.date, formData.doctorId, formData.therapistId]);

    const fetchBranches = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/branches`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                const data = await res.json();
                setBranches(data || []);
            }
        } catch (error) {
            console.error("Failed to fetch branches:", error);
        }
    };

    const fetchStaff = async () => {
        try {
            const params = new URLSearchParams();
            if (formData.branchId) params.append("branchId", formData.branchId);
            if (formData.date) params.append("date", formData.date.toISOString());
            if (formData.slot) params.append("slot", formData.slot);

            const res = await fetch(`${API_BASE_URL}/api/appointments/available-staff?${params.toString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                const data = await res.json();
                setDoctors(data.doctors || []);
                setTherapists(data.therapists || []);

                // If currently selected doctor/therapist is no longer in the list, clear it
                if (formData.doctorId && !data.doctors.some((d: any) => d.id === formData.doctorId)) {
                    setFormData(prev => ({ ...prev, doctorId: "" }));
                    if (step === "confirm") {
                        toast.error("Selected doctor is no longer available for this time. Please choose another.");
                        setStep("clinician");
                    }
                }
                if (formData.therapistId && !data.therapists.some((t: any) => t.id === formData.therapistId)) {
                    setFormData(prev => ({ ...prev, therapistId: "" }));
                    if (step === "confirm") {
                        toast.error("Selected therapist is no longer available for this time. Please choose another.");
                        setStep("clinician");
                    }
                }
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
                    triageSessionId: triageSessionId,
                    branchId: formData.branchId
                }),
            });
            if (res.ok) {
                toast.success("Appointment request submitted successfully!");
                onSuccess?.();
                onClose();
            } else if (res.status === 409) {
                const err = await res.json();
                setSuggestedSlot(err.suggestedSlot || null);
                toast.error("That slot was just taken! We found another one for you.");
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
        if (step === "branch") setStep("type");
        else if (step === "type") setStep("triage");
        else if (step === "triage") setStep("time");
        else if (step === "time") setStep("clinician");
        else if (step === "clinician") setStep("confirm");
    };

    const prevStep = () => {
        if (step === "type") setStep("branch");
        else if (step === "triage") setStep("type");
        else if (step === "time") setStep("triage");
        else if (step === "clinician") setStep("time");
        else if (step === "confirm") setStep("clinician");
    };

    const selectedDoctor = doctors.find(d => d.id === formData.doctorId);
    const selectedTherapist = therapists.find(t => t.id === formData.therapistId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 bg-card border border-border shadow-elevated rounded-xl max-h-[92vh] overflow-y-auto">
                <div className="px-5 pt-5 pb-3 border-b border-border/50 relative">
                    <DialogHeader className="text-left mb-2">
                        <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            Book Appointment
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex gap-1.5 mt-4">
                        {(["branch", "type", "triage", "time", "clinician", "confirm"] as Step[]).map((s, i) => (
                            <div
                                key={s}
                                className={cn(
                                    "h-1 flex-1 rounded-full transition-all duration-300",
                                    step === s ? "bg-primary" : (i < ["branch", "type", "triage", "time", "clinician", "confirm"].indexOf(step) ? "bg-primary/40" : "bg-muted")
                                )}
                            />
                        ))}
                    </div>
                </div>

                <div className="p-5 space-y-6">
                    {step === "branch" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <Label className="text-base font-bold text-foreground">Select a Branch</Label>
                            <div className="grid gap-2.5">
                                {branches.map((b) => (
                                    <button
                                        key={b.id}
                                        onClick={() => {
                                            setFormData({ ...formData, branchId: b.id });
                                            nextStep();
                                        }}
                                        className={cn(
                                            "flex items-center gap-3.5 p-3.5 rounded-lg border transition-all hover:border-primary/50 hover:bg-primary/5 text-left",
                                            formData.branchId === b.id ? "border-primary bg-primary/5 shadow-sm" : "border-border"
                                        )}
                                    >
                                        <div className="p-2 bg-primary/10 rounded-md text-primary">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{b.name}</p>
                                            <p className="text-[11px] text-muted-foreground">{b.address}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
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
                                            <TooltipProvider>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {availableSlots.map(slotData => {
                                                        const slotLabel = typeof slotData === 'string' ? slotData : slotData.slot;
                                                        const isBlocked = slotData.status === 'BLOCKED' || slotData.status === 'BOOKED';

                                                        return (
                                                            <Tooltip key={slotLabel}>
                                                                <TooltipTrigger asChild>
                                                                    <div className="relative">
                                                                        <Button
                                                                            variant={formData.slot === slotLabel ? "default" : "outline"}
                                                                            onClick={() => !isBlocked && setFormData({ ...formData, slot: slotLabel })}
                                                                            disabled={isBlocked}
                                                                            className={cn(
                                                                                "w-full rounded-md text-[11px] font-bold transition-all relative overflow-hidden h-9 px-2",
                                                                                isBlocked && "bg-muted/50 border-muted text-muted-foreground/60 cursor-not-allowed opacity-90",
                                                                                slotData.status === 'BLOCKED' && "bg-stripes border-risk/10"
                                                                            )}
                                                                            size="sm"
                                                                        >
                                                                            <span className="relative z-10 flex items-center justify-center gap-1.5 line-clamp-1">
                                                                                {slotData.status === 'BLOCKED' && <Lock className="w-3 h-3 text-risk/50" />}
                                                                                {slotData.status === 'BOOKED' && <Activity className="w-3 h-3 text-accent/50" />}
                                                                                {slotLabel}
                                                                            </span>
                                                                        </Button>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                {isBlocked && (
                                                                    <TooltipContent side="top" className="bg-popover border border-border shadow-md px-3 py-1.5">
                                                                        <p className="text-[10px] font-bold uppercase tracking-tight text-foreground/80">
                                                                            {slotData.status === 'BLOCKED' ? "Blocked – Leave" : "Reserved"}
                                                                        </p>
                                                                        <p className="text-[10px] text-muted-foreground leading-tight">
                                                                            {slotData.reason || "Slot unavailable"} ({slotLabel})
                                                                        </p>
                                                                    </TooltipContent>
                                                                )}
                                                            </Tooltip>
                                                        );
                                                    })}
                                                </div>
                                            </TooltipProvider>
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

                            {suggestedSlot && (
                                <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg animate-in fade-in zoom-in-95">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-primary/20 rounded-full text-primary">
                                            <CalendarIcon className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-foreground">Next Available SlotFound</p>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                The requested time is no longer available. How about <span className="font-bold text-primary">{suggestedSlot}</span> instead?
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="mt-2 h-8 text-[11px] font-bold border-primary/40 hover:bg-primary/20 hover:text-primary transition-all"
                                                onClick={() => {
                                                    setFormData({ ...formData, slot: suggestedSlot });
                                                    setSuggestedSlot(null);
                                                }}
                                            >
                                                Accept Suggestion
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

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
