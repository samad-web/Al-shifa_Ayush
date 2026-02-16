
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
    Video,
    MessageSquare,
    FileText,
    Save,
    CheckCircle,
    ArrowLeft,
    User,
    Clock,
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { ChatWrapper } from "@/components/chat/ChatWrapper";

export default function ConsultationRoom() {
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchAppointment();
    }, [appointmentId]);

    const fetchAppointment = async () => {
        try {
            const res = await fetch(`/api/appointments/${appointmentId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                const data = await res.json();
                setAppointment(data);
                setNotes(data.sessionNotes || "");
            }
        } catch (error) {
            toast.error("Failed to fetch appointment details");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNotes = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/consultations/session/${appointmentId}/notes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
                body: JSON.stringify({ sessionNotes: notes }),
            });
            if (res.ok) {
                toast.success("Notes saved successfully");
            }
        } catch (error) {
            toast.error("Failed to save notes");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCompleteSession = async () => {
        if (!confirm("Are you sure you want to complete this session?")) return;

        try {
            // First save notes
            await handleSaveNotes();

            const res = await fetch(`/api/consultations/session/${appointmentId}/complete`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                toast.success("Session completed!");
                navigate("/therapist");
            }
        } catch (error) {
            toast.error("Failed to complete session");
        }
    };

    if (loading) return <AppLayout><div className="p-8 text-center">Loading session...</div></AppLayout>;
    if (!appointment) return <AppLayout><div className="p-8 text-center text-attention">Session not found</div></AppLayout>;

    return (
        <AppLayout>
            <div className="h-[calc(100vh-4rem)] flex flex-col">
                {/* Session Header */}
                <div className="px-6 py-4 bg-card border-b border-border/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/therapist")}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                Session with {appointment.patient?.fullName || "Patient"}
                                {appointment.consultationMode === "ONLINE" && (
                                    <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase tracking-wider">Online</span>
                                )}
                            </h2>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {appointment.patient?.gender || "NA"}, {appointment.patient?.age || "NA"}Y</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled for {new Date(appointment.date).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={handleSaveNotes} disabled={isSaving}>
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? "Saving..." : "Save Notes"}
                        </Button>
                        <Button size="sm" onClick={handleCompleteSession} className="bg-wellness hover:bg-wellness/90">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Complete Session
                        </Button>
                    </div>
                </div>

                {/* Main Split View */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Consultation Area */}
                    <div className="flex-1 bg-secondary/20 p-6 overflow-y-auto">
                        {appointment.consultationMode === "ONLINE" ? (
                            <div className="h-full flex flex-col gap-6">
                                <div className="flex-1 bg-black rounded-3xl overflow-hidden relative group">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center space-y-4">
                                            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto">
                                                <Video className="w-10 h-10 text-white/50" />
                                            </div>
                                            <p className="text-white/40 text-sm font-medium">Video Consultation Room</p>
                                            <Button
                                                asChild
                                                className="bg-primary/80 hover:bg-primary backdrop-blur-xl border border-white/20"
                                            >
                                                <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    Open Video Stream
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                    {/* Participant Labels */}
                                    <div className="absolute bottom-6 left-6 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white text-xs font-bold border border-white/10">
                                        {appointment.patient?.fullName || "Patient"} (Remote)
                                    </div>
                                </div>

                                {/* Chat Section */}
                                <div className="h-64 bg-card border border-border/50 rounded-2xl flex flex-col overflow-hidden">
                                    <div className="px-4 py-2 border-b border-border/50 bg-muted/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 shrink-0">
                                        <MessageSquare className="w-3 h-3" /> Secure Session Chat
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        {appointment.patient?.userId && appointment.doctor?.userId ? (
                                            <ChatWrapper
                                                patientId={appointment.patient.id}
                                                doctorId={appointment.doctor.id}
                                            />
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic h-full">
                                                Messaging will be available once the participants join.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <div className="max-w-md text-center space-y-6">
                                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                        <User className="w-12 h-12 text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-foreground">Offline Consultation</h3>
                                        <p className="text-muted-foreground">The patient is present in-clinic. Use this interface to document session notes and clinical recommendations.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-card border border-border/50 rounded-xl text-left">
                                            <p className="text-xs font-bold text-muted-foreground uppercase">Clinic Location</p>
                                            <p className="text-sm font-medium text-foreground">Main Branch - Room 402</p>
                                        </div>
                                        <div className="p-4 bg-card border border-border/50 rounded-xl text-left">
                                            <p className="text-xs font-bold text-muted-foreground uppercase">Queue Status</p>
                                            <p className="text-sm font-medium text-wellness font-bold">Active Now</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Documentation Area */}
                    <div className="w-96 bg-card border-l border-border/50 p-6 flex flex-col space-y-6 shrink-0">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-tight">
                                <FileText className="w-4 h-4 text-primary" />
                                Clinical Notes
                            </h3>
                            <p className="text-xs text-muted-foreground">Notes are visible to the assigned clinical team.</p>
                        </div>

                        <textarea
                            className="flex-1 w-full bg-secondary/30 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 p-4 text-sm font-medium leading-relaxed resize-none transition-all"
                            placeholder="Document observations, therapeutic interventions, and patient progress..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />

                        <Panel title="Quick Templates" subtitle="Therapeutic frameworks">
                            <div className="space-y-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-left justify-start text-[10px] h-auto p-3"
                                    onClick={() => setNotes(prev => prev + "\n[CBT Framework Applied]: Motivation check, Core belief identification.")}
                                >
                                    Apply CBT Framework
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-left justify-start text-[10px] h-auto p-3"
                                    onClick={() => setNotes(prev => prev + "\n[Progress Evaluation]: Stable, showing improved emotional regulation.")}
                                >
                                    Standard Progress Note
                                </Button>
                            </div>
                        </Panel>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
