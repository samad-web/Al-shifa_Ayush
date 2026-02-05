import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PrescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    patientName?: string;
    onSuccess?: () => void;
}

export function PrescriptionModal({
    isOpen,
    onClose,
    patientId,
    patientName,
    onSuccess,
}: PrescriptionModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        medicationName: "",
        dosage: "",
        frequency: "",
        duration: "",
        notes: "",
    });
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append("patientId", patientId);
            formDataToSend.append("medicationName", formData.medicationName);
            formDataToSend.append("dosage", formData.dosage);
            formDataToSend.append("frequency", formData.frequency);
            formDataToSend.append("duration", formData.duration);
            formDataToSend.append("notes", formData.notes);
            if (file) {
                formDataToSend.append("file", file);
            }

            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
            const res = await fetch(`${API_BASE_URL}/api/prescriptions/add`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
                body: formDataToSend,
            });

            if (res.ok) {
                toast.success("Prescription added successfully");
                setFormData({
                    medicationName: "",
                    dosage: "",
                    frequency: "",
                    duration: "",
                    notes: "",
                });
                setFile(null);
                onSuccess?.();
                onClose();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to add prescription");
            }
        } catch (error) {
            toast.error("Failed to add prescription");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Prescription</DialogTitle>
                    {patientName && (
                        <p className="text-sm text-muted-foreground">For patient: {patientName}</p>
                    )}
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="medicationName">Medication Name *</Label>
                            <Input
                                id="medicationName"
                                value={formData.medicationName}
                                onChange={(e) =>
                                    setFormData({ ...formData, medicationName: e.target.value })
                                }
                                required
                                placeholder="e.g., Amoxicillin"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dosage">Dosage *</Label>
                            <Input
                                id="dosage"
                                value={formData.dosage}
                                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                required
                                placeholder="e.g., 500mg"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="frequency">Frequency *</Label>
                            <Input
                                id="frequency"
                                value={formData.frequency}
                                onChange={(e) =>
                                    setFormData({ ...formData, frequency: e.target.value })
                                }
                                required
                                placeholder="e.g., 3 times a day"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="duration">Duration *</Label>
                            <Input
                                id="duration"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                required
                                placeholder="e.g., 7 days"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional instructions or notes"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="file">Prescription File (PDF/Image)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="file"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="flex-1"
                            />
                            {file && (
                                <span className="text-sm text-muted-foreground">
                                    {file.name}
                                </span>
                            )}
                        </div>
                        {file && (
                            <div className="flex items-center gap-2 text-sm text-primary">
                                <FileUp className="w-4 h-4" />
                                <span>File selected: {file.name}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                "Add Prescription"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
