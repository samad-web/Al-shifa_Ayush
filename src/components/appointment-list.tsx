import { Calendar, Clock, User, Edit2, XCircle, CheckCircle2, Video, MessageSquare, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProgressAnalysisReport } from "./ProgressAnalysisReport";
import { useState } from "react";
import { toast } from "sonner";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface Appointment {
    id: string;
    date: string;
    status: string;
    notes?: string;
    doctor?: {
        id: string;
        userId: string;
        fullName?: string;
        user: {
            email: string;
        };
    };
    therapist?: {
        id: string;
        userId: string;
        fullName?: string;
        user: {
            email: string;
        };
    };
    patient?: {
        id: string;
        userId: string;
        fullName?: string;
        user: {
            email: string;
        };
    };
    consultationMode?: string;
    consultationType?: string;
    meetingLink?: string;
    doctorApproved: boolean;
    therapistApproved: boolean;
}

interface AppointmentListProps {
    appointments: Appointment[];
    onEdit?: (appointment: Appointment) => void;
    onCancel?: (appointmentId: string) => void;
    onApprove?: (appointmentId: string) => void;
    onReject?: (appointmentId: string) => void;
    showPatientName?: boolean; // For doctor/admin view
    emptyMessage?: string;
    onStartSession?: (appointment: Appointment) => void;
}

export function AppointmentList({
    appointments,
    onEdit,
    onCancel,
    onApprove,
    onReject,
    showPatientName = false,
    emptyMessage = "No appointments scheduled yet.",
    onStartSession,
}: AppointmentListProps) {
    const { role } = useAuth();
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [reportData, setReportData] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [reviewedPatients, setReviewedPatients] = useState<Set<string>>(new Set());

    const fetchProgressReport = async (patientId: string) => {
        setLoadingReport(true);
        setSelectedPatientId(patientId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports/patient/${patientId}/progress`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
            });
            if (res.ok) {
                const result = await res.json();
                setReportData(result.data);
                setReviewedPatients(prev => new Set(prev).add(patientId));
            } else {
                toast.error("Failed to fetch progress report");
            }
        } catch (error) {
            toast.error("Error fetching progress report");
        } finally {
            setLoadingReport(false);
        }
    };

    const handleApproveClick = (appointment: Appointment) => {
        if (!onApprove) return;

        if (appointment.patient && !reviewedPatients.has(appointment.patient.id)) {
            toast.info("Please review patient progress before approving.", {
                action: {
                    label: "View Progress",
                    onClick: () => fetchProgressReport(appointment.patient!.id)
                }
            });
            return;
        }

        onApprove(appointment.id);
    };

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case "PENDING":
                return "bg-attention/10 text-attention border-attention/20";
            case "PENDING_THERAPIST_APPROVAL":
            case "PENDING_DOCTOR_APPROVAL":
                return "bg-amber-500/10 text-amber-600 border-amber-500/20";
            case "ACCEPTED":
            case "CONFIRMED":
            case "SCHEDULED":
                return "bg-primary/10 text-primary border-primary/20";
            case "COMPLETED":
                return "bg-wellness/10 text-wellness border-wellness/20";
            case "CANCELLED":
                return "bg-muted text-muted-foreground border-border";
            case "IN_PROGRESS":
                return "bg-primary text-primary-foreground border-primary/20 animate-pulse";
            default:
                return "bg-secondary text-secondary-foreground border-border";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toUpperCase()) {
            case "SCHEDULED":
                return <Clock className="w-3 h-3" />;
            case "COMPLETED":
                return <CheckCircle2 className="w-3 h-3" />;
            case "CANCELLED":
                return <XCircle className="w-3 h-3" />;
            default:
                return <Calendar className="w-3 h-3" />;
        }
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        const timeStr = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
        return { date: dateStr, time: timeStr };
    };

    if (appointments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-secondary/5">
                <Calendar className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {appointments.map((appointment) => {
                const { date, time } = formatDateTime(appointment.date);
                const doctorName =
                    appointment.doctor?.fullName || appointment.doctor?.user.email || "Unknown Doctor";
                const therapistName = appointment.therapist
                    ? appointment.therapist.fullName || appointment.therapist.user.email
                    : null;
                const patientName = appointment.patient
                    ? appointment.patient.fullName || appointment.patient.user.email
                    : null;

                const hasReviewed = appointment.patient ? reviewedPatients.has(appointment.patient.id) : false;

                return (
                    <Card key={appointment.id} className={cn("p-5 hover:shadow-md transition-shadow", appointment.status === "PENDING" && "border-primary/20 bg-primary/[0.02]")}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                                {/* Header with Date/Time and Status */}
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-primary" />
                                            <span className="font-semibold text-foreground">{date}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            <span>{time}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-tighter",
                                                getStatusColor(appointment.status)
                                            )}
                                        >
                                            {getStatusIcon(appointment.status)}
                                            {appointment.status.replace(/_/g, " ")}
                                        </Badge>
                                        <div className="flex gap-2">
                                            {appointment.consultationMode === 'ONLINE' && (
                                                <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary bg-primary/5 gap-1">
                                                    <Video className="w-3 h-3" /> ONLINE
                                                </Badge>
                                            )}
                                            {appointment.consultationType && appointment.consultationType !== "DOCTOR" && (
                                                <Badge variant="outline" className="text-[10px] font-bold border-secondary/30 text-secondary bg-secondary/5">
                                                    {appointment.consultationType}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Approval Indicators */}
                                <div className="flex gap-4 items-center">
                                    <div className={cn("flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-bold border", appointment.doctorApproved ? "bg-wellness/10 text-wellness border-wellness/20" : "bg-muted text-muted-foreground border-border")}>
                                        <CheckCircle2 className={cn("w-3 h-3", appointment.doctorApproved ? "text-wellness" : "opacity-30")} />
                                        Doctor Approved
                                    </div>
                                    <div className={cn("flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-bold border", appointment.therapistApproved ? "bg-wellness/10 text-wellness border-wellness/20" : "bg-muted text-muted-foreground border-border")}>
                                        <CheckCircle2 className={cn("w-3 h-3", appointment.therapistApproved ? "text-wellness" : "opacity-30")} />
                                        Therapist Approved
                                    </div>
                                </div>

                                {/* Participants */}
                                <div className="space-y-2 pt-2 border-t border-border/50">
                                    {showPatientName && patientName && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-medium text-foreground">Patient:</span>
                                            <span className="text-muted-foreground">{patientName}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium text-foreground">Doctor:</span>
                                        <span className="text-muted-foreground">{doctorName}</span>
                                    </div>
                                    {therapistName && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-medium text-foreground">Therapist:</span>
                                            <span className="text-muted-foreground">{therapistName}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Notes */}
                                {appointment.notes && (
                                    <div className="pt-2 border-t border-border/50">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                            Notes
                                        </p>
                                        <p className="text-sm text-foreground/80 leading-relaxed">
                                            {appointment.notes}
                                        </p>
                                    </div>
                                )}

                                {/* PENDING ALERT */}
                                {appointment.status === "PENDING" && showPatientName && (
                                    <div className={cn("flex items-center gap-2 p-3 rounded-lg text-sm transition-colors", hasReviewed ? "bg-wellness/10 text-wellness" : "bg-attention/10 text-attention")}>
                                        <Activity className="w-4 h-4" />
                                        {hasReviewed ? "Progress report reviewed. Ready for approval." : "Review patient progress before approving this session."}
                                    </div>
                                )}

                                {/* Actions */}
                                {(onEdit || onCancel || onApprove || onReject) && appointment.status !== "CANCELLED" && (
                                    <div className="flex gap-2 pt-2">
                                        {/* Approval Actions */}
                                        {((role === 'DOCTOR' || role === 'ADMIN_DOCTOR') && !appointment.doctorApproved || (role === 'THERAPIST') && !appointment.therapistApproved) &&
                                            ['PENDING', 'PENDING_THERAPIST_APPROVAL', 'PENDING_DOCTOR_APPROVAL'].includes(appointment.status) && onApprove && onReject && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant={hasReviewed ? "default" : "outline"}
                                                        onClick={() => handleApproveClick(appointment)}
                                                        className={cn("gap-2", hasReviewed ? "bg-wellness hover:bg-wellness/90" : "text-wellness hover:bg-wellness/10 border-wellness/30")}
                                                    >
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onReject(appointment.id)}
                                                        className="gap-2 text-risk hover:bg-risk/10 border-risk/30"
                                                    >
                                                        <XCircle className="w-3 h-3" />
                                                        Reject
                                                    </Button>
                                                </>
                                            )}

                                        {/* Edit Action */}
                                        {onEdit && appointment.status !== "PENDING" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onEdit(appointment)}
                                                className="gap-2"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                                Edit
                                            </Button>
                                        )}

                                        {/* Cancel Action */}
                                        {onCancel && (appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED" || appointment.status === "PENDING") && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onCancel(appointment.id)}
                                                className="gap-2 text-attention hover:bg-attention/10"
                                            >
                                                <XCircle className="w-3 h-3" />
                                                Cancel
                                            </Button>
                                        )}

                                        {/* Start/Join Session Action */}
                                        {role === "THERAPIST" && appointment.status === "SCHEDULED" && onStartSession && (
                                            <Button
                                                size="sm"
                                                onClick={() => onStartSession(appointment)}
                                                className="gap-2 bg-primary hover:bg-primary/90"
                                            >
                                                <Video className="w-3 h-3" />
                                                Start Session
                                            </Button>
                                        )}

                                        {(appointment.status === "IN_PROGRESS" || (appointment.status === "SCHEDULED" && appointment.consultationMode === "ONLINE")) && (
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    if (role === "THERAPIST" && appointment.status === "SCHEDULED") {
                                                        if (onStartSession) onStartSession(appointment);
                                                    } else if (appointment.meetingLink) {
                                                        window.open(appointment.meetingLink, "_blank");
                                                    } else {
                                                        toast.error("Meeting link not available yet.");
                                                    }
                                                }}
                                                className="gap-2 bg-wellness hover:bg-wellness/90"
                                            >
                                                <Video className="w-3 h-3" />
                                                {role === "THERAPIST" && appointment.status === "SCHEDULED" ? "Start Session" : "Join Video Call"}
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const partnerId = role === 'PATIENT'
                                                    ? (appointment.doctor?.userId || appointment.therapist?.userId)
                                                    : appointment.patient?.userId;
                                                if (partnerId) {
                                                    window.location.href = `/chat?partner=${partnerId}`;
                                                }
                                            }}
                                            className="gap-2"
                                        >
                                            <MessageSquare className="w-3 h-3" />
                                            Message
                                        </Button>

                                        {showPatientName && appointment.patient && (
                                            <Button
                                                size="sm"
                                                variant={hasReviewed ? "outline" : "default"}
                                                onClick={() => fetchProgressReport(appointment.patient!.id)}
                                                className={cn("gap-2", hasReviewed ? "text-primary border-primary/20 hover:bg-primary/5" : "bg-primary hover:bg-primary/90")}
                                            >
                                                <Activity className="w-3 h-3" />
                                                {hasReviewed ? "View Progress Again" : "Review Progress"}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                );
            })}

            <Dialog open={!!selectedPatientId} onOpenChange={(open) => !open && setSelectedPatientId(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">
                            {loadingReport ? "Loading Report..." : `Progress Analysis: ${reportData?.patientName || "Patient"}`}
                        </DialogTitle>
                    </DialogHeader>
                    {loadingReport ? (
                        <div className="py-20 text-center text-muted-foreground">Analysing clinical data...</div>
                    ) : reportData ? (
                        <ProgressAnalysisReport data={reportData} />
                    ) : (
                        <div className="py-20 text-center text-muted-foreground">No data available for this patient.</div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
