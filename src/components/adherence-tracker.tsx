
import { useState, useEffect } from "react";
import { Pill, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface ScheduleItem {
    prescriptionId: string;
    medicationName: string;
    dosage: string;
    slot: string;
    scheduledTime: string;
    frequency: string;
    status: 'TAKEN' | 'NOT_TAKEN' | 'PENDING';
    logId: string | null;
    takenAt: string | null;
    notes: string | null;
}

export function AdherenceTracker({ patientId }: { patientId: string }) {
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loggingId, setLoggingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSchedule();
    }, [patientId]);

    const fetchSchedule = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/adherence/today`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                setSchedule(await res.json());
            }
        } catch (error) {
            console.error("Failed to fetch schedule", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLog = async (prescriptionId: string, slot: string, scheduledTime: string, taken: boolean) => {
        setLoggingId(`${prescriptionId}-${slot}`);
        try {
            const res = await fetch(`${API_BASE_URL}/api/adherence/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({
                    prescriptionId,
                    slot,
                    scheduledTime,
                    taken
                }),
            });

            if (res.ok) {
                toast.success(taken ? "Medication marked as taken" : "Medication marked as not taken");
                fetchSchedule();
            } else {
                toast.error("Failed to log adherence");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoggingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (schedule.length === 0) {
        return (
            <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed">
                <Pill className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground">No medications scheduled for today</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {schedule.map((item) => (
                <div
                    key={`${item.prescriptionId}-${item.slot}`}
                    className={cn(
                        "p-4 rounded-xl border transition-all duration-200",
                        item.status === 'TAKEN' ? "bg-wellness/5 border-wellness/20" : "bg-card border-border",
                        "hover:shadow-md"
                    )}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">{item.medicationName}</span>
                                <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">
                                    {item.slot}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{item.scheduledTime}</span>
                                </div>
                                <span>•</span>
                                <span>{item.dosage}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            {loggingId === `${item.prescriptionId}-${item.slot}` ? (
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            ) : (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleLog(item.prescriptionId, item.slot, item.scheduledTime, true)}
                                            className={cn(
                                                "p-2 rounded-full border transition-colors",
                                                item.status === 'TAKEN'
                                                    ? "bg-wellness text-white border-wellness"
                                                    : "hover:bg-wellness/10 border-border text-muted-foreground"
                                            )}
                                            title="Mark as Taken"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleLog(item.prescriptionId, item.slot, item.scheduledTime, false)}
                                            className={cn(
                                                "p-2 rounded-full border transition-colors",
                                                item.status === 'NOT_TAKEN'
                                                    ? "bg-destructive text-white border-destructive"
                                                    : "hover:bg-destructive/10 border-border text-muted-foreground"
                                            )}
                                            title="Mark as Not Taken"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {item.status === 'TAKEN' && item.takenAt && (
                        <p className="text-[10px] text-wellness mt-2 text-right italic font-medium">
                            Logged at {new Date(item.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}
