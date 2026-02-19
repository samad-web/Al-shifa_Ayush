import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { TriageQuestionnaire } from "./triage/TriageQuestionnaire";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    patientId?: string; // For admin creating appointments
    appointment?: any; // For editing existing appointment
}

export function AppointmentModal({
    isOpen,
    onClose,
    onSuccess,
    patientId,
    appointment,
}: AppointmentModalProps) {
    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [therapists, setTherapists] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedHour, setSelectedHour] = useState<string>("09");
    const [selectedMinute, setSelectedMinute] = useState<string>("00");
    const [therapistDate, setTherapistDate] = useState<Date | undefined>();
    const [therapistHour, setTherapistHour] = useState<string>("09");
    const [therapistMinute, setTherapistMinute] = useState<string>("00");
    const [formData, setFormData] = useState({
        patientId: patientId || appointment?.patientId || "",
        doctorId: appointment?.doctorId || "",
        therapistId: appointment?.therapistId || "",
        status: appointment?.status || "SCHEDULED",
        notes: appointment?.notes || "",
        consultationType: appointment?.consultationType || "DOCTOR",
        consultationMode: appointment?.consultationMode || "OFFLINE",
    });
    const [triageSessionId, setTriageSessionId] = useState<string | null>(null);
    const [triageResult, setTriageResult] = useState<any>(null);
    const [showTriage, setShowTriage] = useState(false);
    const [contactDetails, setContactDetails] = useState({
        fullName: "",
        phoneNumber: "",
        email: "",
    });

    const { role, profile } = useAuth(); // Get current user's role and profile
    console.log('[AppointmentModal] Role:', role, 'Profile:', profile); // Debug log
    const isAdmin = ['ADMIN', 'ADMIN_DOCTOR'].includes(role || ''); // Only admins can select patients
    const isEditing = !!appointment;

    // Get patient ID for current user if they're a patient
    const currentUserPatientId = role === 'PATIENT' && profile?.patient ? profile.patient.id : null;
    console.log('[AppointmentModal] currentUserPatientId:', currentUserPatientId); // Debug log

    // Initialize and Reset state safely when modal opens or appointment changes
    useEffect(() => {
        if (!isOpen) {
            console.log('[AppointmentModal] Modal closed - clearing states');
            setTriageSessionId(null);
            setTriageResult(null);
            setShowTriage(false);
            setContactDetails({ fullName: "", phoneNumber: "", email: "" });
            return;
        }

        console.log(`[AppointmentModal] Initializing state. Context: ${isEditing ? 'EDIT' : 'NEW'}`);

        // 1. Reset/Initialize form data
        setFormData({
            patientId: patientId || appointment?.patientId || currentUserPatientId || "",
            doctorId: appointment?.doctorId || "",
            therapistId: appointment?.therapistId || "",
            status: appointment?.status || "SCHEDULED",
            notes: appointment?.notes || "",
            consultationType: appointment?.consultationType || "DOCTOR",
            consultationMode: appointment?.consultationMode || "OFFLINE",
        });

        // 2. Reset/Initialize Contact Details and Triage
        setContactDetails({
            fullName: appointment?.patient?.fullName || appointment?.contactDetails?.fullName || "",
            phoneNumber: appointment?.patient?.phoneNumber || appointment?.contactDetails?.phoneNumber || "",
            email: appointment?.patient?.email || appointment?.contactDetails?.email || "",
        });
        setTriageSessionId(appointment?.triageSessionId || null);
        setTriageResult(null); // Fresh start for results

        // 3. Reset/Initialize Dates and Times
        if (isEditing && appointment?.date) {
            const aptDate = new Date(appointment.date);
            setSelectedDate(aptDate);
            setSelectedHour(String(aptDate.getHours()).padStart(2, "0"));
            setSelectedMinute(String(aptDate.getMinutes()).padStart(2, "0"));
        } else {
            setSelectedDate(undefined);
            setSelectedHour("09");
            setSelectedMinute("00");
        }

        if (isEditing && appointment?.therapistDate) {
            const tAptDate = new Date(appointment.therapistDate);
            setTherapistDate(tAptDate);
            setTherapistHour(String(tAptDate.getHours()).padStart(2, "0"));
            setTherapistMinute(String(tAptDate.getMinutes()).padStart(2, "0"));
        } else {
            setTherapistDate(undefined);
            setTherapistHour("09");
            setTherapistMinute("00");
        }

        // 4. Triage flow logic
        if (!isAdmin && role === 'PATIENT' && !isEditing) {
            console.log('[AppointmentModal] Triggering triage flow');
            setShowTriage(true);
        } else {
            setShowTriage(false);
        }

        // 5. Audit Log
        console.log('[AppointmentModal] State initialized. Notes length:', (appointment?.notes || "").length);

        return () => {
            console.log('[AppointmentModal] Component unmounting or context switching - cleanup');
        };

    }, [isOpen, appointment, patientId, currentUserPatientId, isAdmin, role, isEditing]);

    // Fetch available staff and patients (for admin)
    useEffect(() => {
        let mounted = true;
        async function fetchData() {
            try {
                // Fetch available staff
                const staffRes = await fetch(`${API_BASE_URL}/api/appointments/available-staff`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
                });
                if (staffRes.ok) {
                    const data = await staffRes.json();
                    if (mounted && data.doctors) {
                        setDoctors(data.doctors);
                        setTherapists(data.therapists || []);
                    }
                }

                // Fetch patients if admin
                if (isAdmin) {
                    const patientsRes = await fetch(`${API_BASE_URL}/api/user/list-patients`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
                    });
                    if (patientsRes.ok) {
                        const pats = await patientsRes.json();
                        console.log('Fetched patients:', pats); // Debug log
                        if (mounted) setPatients(pats);
                    } else {
                        console.error('Failed to fetch patients:', patientsRes.status, patientsRes.statusText);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        }
        if (isOpen) {
            fetchData();
        }
        return () => { mounted = false; };
    }, [isOpen, isAdmin]);

    // Auto-prefill contact details when patient is selected or modal opens
    useEffect(() => {
        async function fetchPatientDetails(patId: string) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/user/patient/${patId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
                });
                if (res.ok) {
                    const patientData = await res.json();
                    setContactDetails({
                        fullName: patientData.fullName || "",
                        phoneNumber: patientData.phoneNumber || "",
                        email: patientData.email || patientData.user?.email || "",
                    });

                    // Pre-populate notes with onboarding data if it's a new appointment
                    if (!isEditing && (patientData.onboardingData || patientData.triageSessions?.length > 0)) {
                        let additionalNotes = "";

                        // 1. Onboarding Baseline Info
                        if (patientData.onboardingData) {
                            const od = patientData.onboardingData;
                            additionalNotes += `[Baseline Info] \nGender: ${od.gender || 'Not specified'}\nSleep: ${od.sleepBedtime || ''}-${od.sleepWakeTime || ''} (${od.sleepDuration}h)\nPain Level: ${od.painLevel}/10\nPain Locations: ${od.painLocations?.join(', ') || 'N/A'}`;
                        }

                        // 2. Triage Summary (Fresh from Questionnaire)
                        if (patientData.triageSessions?.length > 0) {
                            const latestTriage = patientData.triageSessions[0];
                            const resp = latestTriage.responses || {};
                            const triageSummary = `\n\n[Triage Summary] (${new Date(latestTriage.createdAt).toLocaleDateString()})
Pain Area: ${resp.painArea || 'N/A'}
Severity: ${resp.painSeverity || 0}/10
Symptoms: ${resp.symptoms?.join(', ') || 'None'}
History: ${resp.medicalHistory || 'None'}
Medications: ${resp.medications || 'None'}`;

                            additionalNotes += triageSummary;

                            // Also set the triageSessionId for the appointment record
                            if (!triageSessionId) {
                                setTriageSessionId(latestTriage.id);
                            }
                        }

                        setFormData(prev => {
                            // Prevent double-appending
                            if (prev.notes.includes("[Triage Summary]") || prev.notes.includes("[Baseline Info]")) return prev;
                            const trimmedNotes = prev.notes.trim();
                            return {
                                ...prev,
                                notes: trimmedNotes ? `${trimmedNotes}\n\n${additionalNotes.trim()}` : additionalNotes.trim()
                            };
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch patient details:", error);
            }
        }

        // Determine the actual patient ID to use
        const patId = formData.patientId || currentUserPatientId || patientId;
        if (patId && isOpen) {
            fetchPatientDetails(patId);
        }
    }, [formData.patientId, currentUserPatientId, patientId, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Validate contact details
        if (!contactDetails.fullName || contactDetails.fullName.trim().length < 2) {
            toast.error("Please enter a valid full name (minimum 2 characters)");
            setLoading(false);
            return;
        }

        const phoneRegex = /^[\+]?[0-9]{10,15}$/;
        if (!contactDetails.phoneNumber || !phoneRegex.test(contactDetails.phoneNumber.replace(/[\s\-]/g, ""))) {
            toast.error("Please enter a valid phone number (10-15 digits)");
            setLoading(false);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!contactDetails.email || !emailRegex.test(contactDetails.email)) {
            toast.error("Please enter a valid email address");
            setLoading(false);
            return;
        }

        if (!selectedDate) {
            toast.error("Please select a date");
            setLoading(false);
            return;
        }

        if (formData.consultationType !== "THERAPIST" && !formData.doctorId) {
            toast.error("Please select a doctor");
            setLoading(false);
            return;
        }

        if (formData.consultationType !== "DOCTOR" && !formData.therapistId) {
            toast.error("Please select a therapist");
            setLoading(false);
            return;
        }

        try {
            // Combine doctor date and time
            const combinedDateTime = new Date(selectedDate);
            combinedDateTime.setHours(parseInt(selectedHour));
            combinedDateTime.setMinutes(parseInt(selectedMinute));

            // Combine therapist date and time
            let combinedTherapistDateTime = null;
            if (formData.consultationType === "COMBINED" && therapistDate) {
                combinedTherapistDateTime = new Date(therapistDate);
                combinedTherapistDateTime.setHours(parseInt(therapistHour));
                combinedTherapistDateTime.setMinutes(parseInt(therapistMinute));
            } else if (formData.consultationType === "THERAPIST" && selectedDate) {
                // If only therapist, use the primary date selection
                combinedTherapistDateTime = new Date(selectedDate);
                combinedTherapistDateTime.setHours(parseInt(selectedHour));
                combinedTherapistDateTime.setMinutes(parseInt(selectedMinute));
            }

            const url = isEditing
                ? `${API_BASE_URL}/api/appointments/${appointment.id}`
                : `${API_BASE_URL}/api/appointments`;
            const method = isEditing ? "PUT" : "POST";

            // Get authentication token
            const token = localStorage.getItem("accessToken");
            if (!token) {
                toast.error("You must be logged in to book an appointment. Please log in and try again.");
                setLoading(false);
                return;
            }

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    date: combinedDateTime.toISOString(),
                    therapistDate: combinedTherapistDateTime?.toISOString() || null,
                    contactDetails,
                    triageSessionId: triageSessionId
                }),
            });

            if (res.ok) {
                toast.success(
                    isEditing ? "Appointment updated successfully" : "Appointment booked successfully"
                );
                // Reset form
                setFormData({
                    patientId: "",
                    doctorId: "",
                    therapistId: "",
                    status: "SCHEDULED",
                    notes: "",
                    consultationType: "DOCTOR",
                    consultationMode: "OFFLINE",
                });
                setContactDetails({
                    fullName: "",
                    phoneNumber: "",
                    email: "",
                });
                setSelectedDate(undefined);
                setSelectedHour("09");
                setSelectedMinute("00");
                onSuccess?.();
                onClose();
            } else {
                const errorData = await res.json();
                // Handle specific error cases
                if (res.status === 401 || res.status === 403) {
                    toast.error("Authentication failed. Please log in again.");
                } else if (res.status === 400 && errorData.error === 'Validation failed' && errorData.details) {
                    // Display all validation issues
                    const detailMessages = errorData.details.map((d: any) => d.message).join(", ");
                    toast.error(`Validation Error: ${detailMessages}`);
                } else if (errorData.error) {
                    toast.error(errorData.error);
                } else if (errorData.message) {
                    toast.error(errorData.message);
                } else {
                    toast.error("Failed to save appointment. Please try again.");
                }
            }
        } catch (error) {
            toast.error("Failed to save appointment");
        } finally {
            setLoading(false);
        }
    };

    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = ['00', '15', '30', '45'];

    const filteredDoctors = doctors.filter(doc => {
        if (isAdmin) return true; // Admin sees all
        if (!triageResult) return true; // Before triage, show all (though UI might hide them)

        // If not escalated, hide Admin Doctors
        if (doc.user?.role === 'ADMIN_DOCTOR' && !triageResult.isEscalated) return false;

        // Suggest specialty matching (soft match or priority)
        // For now, only hard restriction is on Admin Doctor
        return true;
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit Appointment" : "Book Appointment"}
                    </DialogTitle>
                </DialogHeader>

                {showTriage ? (
                    <TriageQuestionnaire
                        onComplete={(session) => {
                            setTriageSessionId(session.id);
                            setTriageResult(session);
                            setShowTriage(false);
                            // Pre-select doctor if only one matches specialty? 
                            // For now, just allow selection.
                        }}
                        onCancel={onClose}
                    />
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Patient Selection (Admin only) */}
                        {isAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="patient">Patient *</Label>
                                <Select
                                    value={formData.patientId}
                                    onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                                    required
                                >
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select patient..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patients.map((patient) => (
                                            <SelectItem key={patient?.id || 'unknown'} value={patient?.id || ''}>
                                                {patient?.fullName || patient?.email || patient?.user?.email || `Patient-${patient?.id?.slice(0, 8) || 'unknown'}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Contact Details Section */}
                        <div className="space-y-4 p-4 bg-secondary/10 rounded-lg border border-border">
                            <h3 className="font-semibold text-sm text-foreground">Client Details</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Full Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name *</Label>
                                    <Input
                                        id="fullName"
                                        type="text"
                                        value={contactDetails.fullName}
                                        onChange={(e) => setContactDetails({ ...contactDetails, fullName: e.target.value })}
                                        placeholder="Enter full name"
                                        required
                                        minLength={2}
                                    />
                                </div>

                                {/* Phone Number */}
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                                    <Input
                                        id="phoneNumber"
                                        type="tel"
                                        value={contactDetails.phoneNumber}
                                        onChange={(e) => setContactDetails({ ...contactDetails, phoneNumber: e.target.value })}
                                        placeholder="+1234567890"
                                        required
                                        pattern="[\+]?[0-9]{10,15}"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={contactDetails.email}
                                    onChange={(e) => setContactDetails({ ...contactDetails, email: e.target.value })}
                                    placeholder="email@example.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Consultation Configuration */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                            {/* Consultation Type */}
                            <div className="space-y-2">
                                <Label htmlFor="consultationType">Consultation Type *</Label>
                                <Select
                                    value={formData.consultationType}
                                    onValueChange={(value) => setFormData({ ...formData, consultationType: value })}
                                >
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DOCTOR">Doctor Only</SelectItem>
                                        <SelectItem value="THERAPIST">Therapist Only</SelectItem>
                                        <SelectItem value="COMBINED">Combined (Doctor + Therapist)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Consultation Mode */}
                            <div className="space-y-2">
                                <Label htmlFor="consultationMode">Visit Mode *</Label>
                                <Select
                                    value={formData.consultationMode}
                                    onValueChange={(value) => setFormData({ ...formData, consultationMode: value })}
                                >
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select mode..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OFFLINE">In-Person (Clinic)</SelectItem>
                                        <SelectItem value="ONLINE">Online (Virtual)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Doctor/Therapist Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Doctor */}
                            {(formData.consultationType === 'DOCTOR' || formData.consultationType === 'COMBINED') && (
                                <div className="space-y-2">
                                    <Label htmlFor="doctor">Doctor *</Label>
                                    <Select
                                        value={formData.doctorId}
                                        onValueChange={(value) => setFormData({ ...formData, doctorId: value })}
                                        required
                                    >
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select doctor..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredDoctors.map((doctor) => (
                                                <SelectItem key={doctor?.id || 'unknown'} value={doctor?.id || ''}>
                                                    {doctor?.fullName || doctor?.user?.email || `Doctor-${doctor?.id?.slice(0, 8) || 'unknown'}`}
                                                    {doctor?.user?.role === 'ADMIN_DOCTOR' && " (Admin Clinic)"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Therapist */}
                            {(formData.consultationType === 'THERAPIST' || formData.consultationType === 'COMBINED') && (
                                <div className="space-y-2">
                                    <Label htmlFor="therapist">Therapist *</Label>
                                    <Select
                                        value={formData.therapistId}
                                        onValueChange={(value) => setFormData({ ...formData, therapistId: value })}
                                        required
                                    >
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select therapist..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.isArray(therapists) && therapists.map((therapist) => (
                                                <SelectItem key={therapist.id} value={therapist.id}>
                                                    {therapist.fullName || therapist.user?.email || `Therapist-${therapist.id.slice(0, 8)}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Date and Time Selection */}
                        <div className="space-y-6 pt-4 border-t border-primary/10">
                            {/* Doctor/Primary Section */}
                            <div className="space-y-4">
                                <Label className="text-primary font-bold">
                                    {formData.consultationType === 'COMBINED' ? '1. Doctor Appointment Timing' : 'Appointment Date and Time'}
                                </Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Date *</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal bg-background",
                                                        !selectedDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <CalendarComponent
                                                    mode="single"
                                                    selected={selectedDate}
                                                    onSelect={setSelectedDate}
                                                    initialFocus
                                                    disabled={(date) =>
                                                        date < new Date(new Date().setHours(0, 0, 0, 0))
                                                    }
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Time *</Label>
                                        <div className="flex gap-2">
                                            <Select value={selectedHour} onValueChange={setSelectedHour}>
                                                <SelectTrigger className="bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {hours.map((hour) => (
                                                        <SelectItem key={hour} value={hour}>
                                                            {hour}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <span className="flex items-center">:</span>
                                            <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                                                <SelectTrigger className="bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {minutes.map((min) => (
                                                        <SelectItem key={min} value={min}>
                                                            {min}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Therapist Section (only for COMBINED) */}
                            {formData.consultationType === 'COMBINED' && (
                                <div className="space-y-4 pt-4 border-t border-dashed border-primary/20">
                                    <Label className="text-primary font-bold">2. Therapist Appointment Timing</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Date *</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal bg-background",
                                                            !therapistDate && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {therapistDate ? format(therapistDate, "PPP") : "Select date"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <CalendarComponent
                                                        mode="single"
                                                        selected={therapistDate}
                                                        onSelect={setTherapistDate}
                                                        initialFocus
                                                        disabled={(date) =>
                                                            date < new Date(new Date().setHours(0, 0, 0, 0))
                                                        }
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Time *</Label>
                                            <div className="flex gap-2">
                                                <Select value={therapistHour} onValueChange={setTherapistHour}>
                                                    <SelectTrigger className="bg-background">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {hours.map((hour) => (
                                                            <SelectItem key={hour} value={hour}>
                                                                {hour}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <span className="flex items-center">:</span>
                                                <Select value={therapistMinute} onValueChange={setTherapistMinute}>
                                                    <SelectTrigger className="bg-background">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {minutes.map((min) => (
                                                            <SelectItem key={min} value={min}>
                                                                {min}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status (Admin only) */}
                        {isAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="status">Status *</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                >
                                    <SelectTrigger className="bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Any additional notes..."
                                className="min-h-[80px]"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-end pt-4">
                            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="gap-2">
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isEditing ? "Update Appointment" : "Book Appointment"}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
