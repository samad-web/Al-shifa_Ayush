import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/ui/panel";
import { Plus, Trash2, Search, Loader2, CheckCircle2, PlaySquare } from "lucide-react";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Medicine {
    id: string;
    name: string;
    brand: string;
    category: string;
    price: number;
    totalStock: number;
    videoUrl?: string;
}

interface PrescriptionItem {
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes: string;
    timing: string;
    vehicle: string;
    medicineId?: string;
    videoUrl: string;
}

interface ExternalVideo {
    id: string;
    title: string;
    videoUrl: string;
    category: string;
}

interface MultiplePrescriptionFormProps {
    patientId: string;
    patientName?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const TIMING_OPTIONS = [
    { value: "BEFORE_FOOD", label: "Before Food (Prapchaat)" },
    { value: "AFTER_FOOD", label: "After Food (Paschat)" },
    { value: "EMPTY_STOMACH", label: "Empty Stomach (Akala)" },
    { value: "BEDTIME", label: "At Bedtime (Nishi)" },
    { value: "WITH_FOOD", label: "With Food (Sabhakta)" },
];

const VEHICLE_OPTIONS = [
    { value: "WARM_WATER", label: "Warm Water" },
    { value: "HONEY", label: "Honey" },
    { value: "MILK", label: "Milk" },
    { value: "GHEE", label: "Ghee" },
    { value: "BUTTERMILK", label: "Buttermilk" },
];

export function MultiplePrescriptionForm({
    patientId,
    patientName,
    onSuccess,
    onCancel,
}: MultiplePrescriptionFormProps) {
    const [loading, setLoading] = useState(false);
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [videos, setVideos] = useState<ExternalVideo[]>([]);
    const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
        {
            medicationName: "",
            dosage: "",
            frequency: "",
            duration: "",
            notes: "",
            timing: "AFTER_FOOD",
            vehicle: "WARM_WATER",
            videoUrl: "",
        },
    ]);

    useEffect(() => {
        fetchMedicines();
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        try {
            const res = await fetch("/api/wellness/videos", {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                const data = await res.json();
                setVideos(data);
            }
        } catch (error) {
            console.error("Failed to fetch videos:", error);
        }
    };

    const fetchMedicines = async () => {
        try {
            const res = await fetch("/api/pharmacy/medicines", {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                const data = await res.json();
                setMedicines(data);
            }
        } catch (error) {
            console.error("Failed to fetch medicines:", error);
        }
    };

    const addItem = () => {
        setPrescriptionItems([
            ...prescriptionItems,
            {
                medicationName: "",
                dosage: "",
                frequency: "",
                duration: "",
                notes: "",
                timing: "AFTER_FOOD",
                vehicle: "WARM_WATER",
                videoUrl: "",
            },
        ]);
    };

    const removeItem = (index: number) => {
        if (prescriptionItems.length === 1) return;
        const newItems = [...prescriptionItems];
        newItems.splice(index, 1);
        setPrescriptionItems(newItems);
    };

    const updateItem = (index: number, field: keyof PrescriptionItem, value: string) => {
        const newItems = [...prescriptionItems];
        newItems[index] = { ...newItems[index], [field]: value };

        // If updating medicationName, try to find medicineId and videoUrl
        if (field === "medicationName") {
            const med = medicines.find(m => m.name.toLowerCase() === value.toLowerCase());
            if (med) {
                newItems[index].medicineId = med.id;
                // @ts-ignore - videoUrl might not be in the local Medicine type yet but is in the backend response
                if (med.videoUrl) {
                    newItems[index].videoUrl = med.videoUrl;
                }
            }
        }

        setPrescriptionItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const invalid = prescriptionItems.some(item => !item.medicationName || !item.dosage || !item.frequency || !item.duration);
        if (invalid) {
            toast.error("Please fill in all required fields for each medication");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/prescriptions/batch-add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
                body: JSON.stringify({
                    patientId,
                    medicines: prescriptionItems,
                }),
            });

            if (res.ok) {
                toast.success("Prescriptions added successfully");
                onSuccess?.();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to add prescriptions");
            }
        } catch (error) {
            toast.error("Failed to add prescriptions");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Write Prescription</h2>
                    {patientName && (
                        <p className="text-sm text-muted-foreground">For: {patientName}</p>
                    )}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Medication
                </Button>
            </div>

            <div className="space-y-4">
                {prescriptionItems.map((item, index) => (
                    <div key={index} className="p-4 bg-secondary/20 rounded-xl relative border border-border/50 group">
                        {prescriptionItems.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-risk text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2 space-y-2">
                                <Label>Medication Name *</Label>
                                <div className="relative">
                                    <Input
                                        value={item.medicationName}
                                        onChange={(e) => updateItem(index, "medicationName", e.target.value)}
                                        placeholder="Search or type medicine name..."
                                        list={`med-list-${index}`}
                                    />
                                    <datalist id={`med-list-${index}`}>
                                        {medicines.map(m => (
                                            <option key={m.id} value={m.name}>{m.brand ? `${m.brand} - ` : ""}{m.totalStock} in stock</option>
                                        ))}
                                    </datalist>
                                    {item.medicationName && (
                                        <div className="mt-1">
                                            {medicines.find(m => m.name.toLowerCase() === item.medicationName.toLowerCase()) ? (
                                                <span className="text-[10px] text-wellness flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Linked to Inventory
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground italic">Custom entry</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Dosage *</Label>
                                <Input
                                    value={item.dosage}
                                    onChange={(e) => updateItem(index, "dosage", e.target.value)}
                                    placeholder="e.g., 500mg or 2 tablets"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Duration *</Label>
                                <Input
                                    value={item.duration}
                                    onChange={(e) => updateItem(index, "duration", e.target.value)}
                                    placeholder="e.g., 7 days"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Frequency *</Label>
                                <Input
                                    value={item.frequency}
                                    onChange={(e) => updateItem(index, "frequency", e.target.value)}
                                    placeholder="e.g., TDS (3 times/day)"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Timing</Label>
                                <Select
                                    value={item.timing}
                                    onValueChange={(val) => updateItem(index, "timing", val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIMING_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Vehicle (Anupana)</Label>
                                <Select
                                    value={item.vehicle}
                                    onValueChange={(val) => updateItem(index, "vehicle", val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {VEHICLE_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label>Special Notes / Pathya (Lifestyle)</Label>
                                <Input
                                    value={item.notes}
                                    onChange={(e) => updateItem(index, "notes", e.target.value)}
                                    placeholder="Additional instructions..."
                                />
                            </div>

                            <div className="md:col-span-4 space-y-2 border-t border-border/30 pt-4">
                                <Label className="flex items-center gap-2">
                                    Educational Video URL (Optional)
                                    <span className="text-[10px] text-muted-foreground font-normal">Link a video for the patient to follow</span>
                                </Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <Input
                                            value={item.videoUrl}
                                            onChange={(e) => updateItem(index, "videoUrl", e.target.value)}
                                            placeholder="Paste YouTube/Vimeo URL or select from library..."
                                            list={`video-list-${index}`}
                                        />
                                        <datalist id={`video-list-${index}`}>
                                            {videos.map(v => (
                                                <option key={v.id} value={v.videoUrl}>{v.title} ({v.category})</option>
                                            ))}
                                        </datalist>
                                    </div>
                                    <div className="flex items-center">
                                        {item.videoUrl && (
                                            <div className="text-[10px] text-primary flex items-center gap-2 p-2 bg-primary/5 rounded-lg w-full">
                                                <PlaySquare className="w-3 h-3" />
                                                <span className="truncate">Video link attached: {item.videoUrl}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" disabled={loading} className="min-w-[120px]">
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        "Issue Prescription"
                    )}
                </Button>
            </div>
        </form>
    );
}
