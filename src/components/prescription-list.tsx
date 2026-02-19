import { Download, FileText, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Prescription {
    id: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
    fileUrl?: string;
    videoUrl?: string;
    createdAt: string;
    doctor?: {
        fullName?: string;
        user: {
            email: string;
        };
    };
    therapist?: {
        fullName?: string;
        user: {
            email: string;
        };
    };
}

interface PrescriptionListProps {
    prescriptions: Prescription[];
    emptyMessage?: string;
}

export function PrescriptionList({
    prescriptions,
    emptyMessage = "No prescriptions available yet.",
}: PrescriptionListProps) {
    const handleDownload = (fileUrl: string) => {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
        const filename = fileUrl.split("/").pop();
        window.open(`${API_BASE_URL}/api/prescriptions/download/${filename}`, "_blank");
    };

    if (prescriptions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-secondary/5">
                <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {prescriptions.map((rx) => {
                const prescriber =
                    rx.doctor?.fullName ||
                    rx.therapist?.fullName ||
                    rx.doctor?.user.email ||
                    rx.therapist?.user.email ||
                    "Unknown";
                const role = rx.doctor ? "Doctor" : "Therapist";

                return (
                    <Card key={rx.id} className="p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-bold text-lg text-foreground">
                                            {rx.medicationName}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            Prescribed by {prescriber} ({role})
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(rx.createdAt).toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Dosage Info */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Dosage
                                        </p>
                                        <p className="font-semibold text-sm">{rx.dosage}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Frequency
                                        </p>
                                        <p className="font-semibold text-sm">{rx.frequency}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Duration
                                        </p>
                                        <p className="font-semibold text-sm">{rx.duration}</p>
                                    </div>
                                </div>

                                {/* Notes */}
                                {rx.notes && (
                                    <div className="pt-2 border-t border-border/50">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                            Notes
                                        </p>
                                        <p className="text-sm text-foreground/80 leading-relaxed">
                                            {rx.notes}
                                        </p>
                                    </div>
                                )}

                                {/* Video Player */}
                                {rx.videoUrl && (
                                    <div className="pt-4 border-t border-border/50">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                            Educational Video
                                        </p>
                                        <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-inner relative group">
                                            <iframe
                                                className="w-full h-full"
                                                src={rx.videoUrl.includes('youtube.com/watch?v=')
                                                    ? rx.videoUrl.replace('watch?v=', 'embed/')
                                                    : rx.videoUrl.includes('youtu.be/')
                                                        ? rx.videoUrl.replace('youtu.be/', 'youtube.com/embed/')
                                                        : rx.videoUrl}
                                                title={`Educational video for ${rx.medicationName}`}
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            ></iframe>
                                        </div>
                                    </div>
                                )}

                                {/* File Attachment */}
                                {rx.fileUrl && (
                                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-medium">
                                                Prescription File Attached
                                            </span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDownload(rx.fileUrl!)}
                                            className="gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
