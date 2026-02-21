import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ClientAppointmentStatusProps {
    status: string;
    doctorApproved: boolean;
    therapistApproved: boolean;
    consultationType?: string;
}

export function ClientAppointmentStatus({
    status,
    doctorApproved,
    therapistApproved,
    consultationType = "DOCTOR",
}: ClientAppointmentStatusProps) {

    const isCompleted = status === "COMPLETED";
    const isCancelled = status === "CANCELLED";

    const steps = [
        { id: "request", label: "Requested", icon: Clock, active: true, completed: true },
        {
            id: "approval",
            label: "Reviewing",
            icon: AlertCircle,
            active: status === "PENDING" || status === "PENDING_DOCTOR_APPROVAL" || status === "PENDING_THERAPIST_APPROVAL",
            completed: doctorApproved || therapistApproved
        },
        {
            id: "confirmed",
            label: "Confirmed",
            icon: CheckCircle2,
            active: status === "ACCEPTED" || status === "CONFIRMED" || status === "SCHEDULED",
            completed: status === "ACCEPTED" || status === "CONFIRMED" || status === "SCHEDULED" || isCompleted
        }
    ];

    if (isCancelled) {
        return (
            <div className="flex items-center gap-2 text-risk p-3 bg-risk/5 rounded-lg border border-risk/10">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-tight">Appointment Cancelled</span>
            </div>
        );
    }

    if (isCompleted) {
        return (
            <div className="flex items-center gap-2 text-wellness p-3 bg-wellness/5 rounded-lg border border-wellness/10">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-tight">Session Completed</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Booking Progress</p>
            <div className="relative flex justify-between">
                {/* Connector Line */}
                <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -z-10" />
                <div
                    className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-1000 -z-10"
                    style={{
                        width: status === "PENDING" ? "25%" :
                            (status === "ACCEPTED" || status === "CONFIRMED") ? "100%" : "0%"
                    }}
                />

                {steps.map((step) => (
                    <div key={step.id} className="flex flex-col items-center gap-2">
                        <div className={cn(
                            "w-7 h-7 rounded-sm flex items-center justify-center border transition-all duration-500 bg-background",
                            step.completed ? "border-primary bg-primary text-primary-foreground shadow-sm" :
                                step.active ? "border-primary animate-pulse text-primary shadow-md shadow-primary/10" :
                                    "border-muted text-muted-foreground"
                        )}>
                            <step.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider",
                            step.completed || step.active ? "text-foreground" : "text-muted-foreground"
                        )}>
                            {step.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Sub-status for approvals */}
            {status.startsWith("PENDING") && (
                <div className="space-y-1.5 pt-3 mt-1 border-t border-dashed border-border/60">
                    {consultationType !== "THERAPIST" && (
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Doctor Review</span>
                            <Badge variant="outline" className={cn("text-[8px] px-1.5 py-0 rounded-sm font-bold", doctorApproved ? "badge-wellness" : "bg-muted text-muted-foreground")}>
                                {doctorApproved ? "Approved" : "Awaiting"}
                            </Badge>
                        </div>
                    )}
                    {consultationType !== "DOCTOR" && (
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Therapist Review</span>
                            <Badge variant="outline" className={cn("text-[8px] px-1.5 py-0 rounded-sm font-bold", therapistApproved ? "badge-wellness" : "bg-muted text-muted-foreground")}>
                                {therapistApproved ? "Approved" : "Awaiting"}
                            </Badge>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
