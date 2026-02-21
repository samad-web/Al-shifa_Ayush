import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Activity,
    Stethoscope,
    Clock,
    FileText,
    UploadCloud,
    X,
    File as FileIcon,
    Loader2
} from "lucide-react";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { cn } from "@/lib/utils";

interface UploadedFile {
    id: string;
    fileName: string;
    description: string;
    fileUrl: string;
}

const SYMPTOMS_LIST = [
    "Back Pain", "Joint Pain", "Stomach Pain", "Acid Reflux", "Skin Rash",
    "Acne", "Headache", "Dizziness", "Anxiety", "Depression", "Cough", "Fever"
];

interface TriageQuestionnaireProps {
    onComplete: (session: any) => void;
    onCancel: () => void;
}

export function TriageQuestionnaire({ onComplete, onCancel }: TriageQuestionnaireProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        painArea: "",
        painSeverity: 0,
        duration: "Less than 24 hours",
        symptoms: [] as string[],
        medicalHistory: "",
        medications: ""
    });
    const [uploadedDocuments, setUploadedDocuments] = useState<UploadedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSymptomToggle = (symptom: string) => {
        setFormData(prev => ({
            ...prev,
            symptoms: prev.symptoms.includes(symptom)
                ? prev.symptoms.filter(s => s !== symptom)
                : [...prev.symptoms, symptom]
        }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("category", "MEDICAL_RECORD");
        uploadData.append("description", ""); // Initial empty description

        try {
            const res = await fetch("/api/triage/upload", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: uploadData
            });

            if (res.ok) {
                const doc = await res.json();
                setUploadedDocuments(prev => [...prev, {
                    id: doc.id,
                    fileName: doc.fileName,
                    description: "",
                    fileUrl: doc.fileUrl
                }]);
            }
        } catch (error) {
            console.error("Upload failed:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const updateDocDescription = (id: string, desc: string) => {
        setUploadedDocuments(prev => prev.map(doc =>
            doc.id === id ? { ...doc, description: desc } : doc
        ));
    };

    const removeDoc = (id: string) => {
        setUploadedDocuments(prev => prev.filter(doc => doc.id !== id));
    };

    const handleSubmit = async () => {
        setLoading(true);
        console.log("[Triage] Submitting form data:", formData, "Documents:", uploadedDocuments);
        try {
            const res = await fetch("/api/triage/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({
                    ...formData,
                    documentIds: uploadedDocuments.map(d => d.id)
                })
            });

            if (res.ok) {
                const data = await res.json();
                console.log("[Triage] Submission successful:", data);
                setResult(data);
                setStep(4);
                toast.success("Assessment completed successfully.");
            } else {
                const errorData = await res.json();
                console.error("[Triage] Submission failed:", errorData);
                toast.error(errorData.error || "Failed to submit assessment. Please try again.");
            }
        } catch (error) {
            console.error("[Triage] Network/Server error:", error);
            toast.error("A network error occurred. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    return (
        <ErrorBoundary>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header & Progress */}
                <div className="flex justify-between items-center border-b pb-4">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            Triage Assessment
                        </h2>
                        <p className="text-sm text-muted-foreground">Step {step} of 4</p>
                    </div>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4].map(s => (
                            <div
                                key={s}
                                className={cn(
                                    "h-1.5 w-8 rounded-full transition-all duration-300",
                                    step >= s ? "bg-primary" : "bg-secondary"
                                )}
                            />
                        ))}
                    </div>
                </div>

                <div className="min-h-[300px]">
                    {/* Step 1: Pain & Area */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-base font-semibold">Where is the primary area of concern?</Label>
                                <Input
                                    placeholder="e.g. Chest, Lower back, Right knee..."
                                    value={formData.painArea}
                                    onChange={e => setFormData({ ...formData, painArea: e.target.value })}
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label className="text-base font-semibold">Pain Severity (0-10)</Label>
                                    <Badge variant={formData.painSeverity >= 7 ? "destructive" : "secondary"} className="text-lg">
                                        {formData.painSeverity}
                                    </Badge>
                                </div>
                                <Slider
                                    min={0}
                                    max={10}
                                    step={1}
                                    value={[formData.painSeverity]}
                                    onValueChange={v => setFormData({ ...formData, painSeverity: v[0] })}
                                    className="py-4"
                                />
                                <div className="flex justify-between px-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                    <span>No Pain</span>
                                    <span>Moderate</span>
                                    <span>Severe</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Symptoms & Duration */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    How long have you had this?
                                </Label>
                                <Select value={formData.duration} onValueChange={v => setFormData({ ...formData, duration: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Less than 24 hours">Less than 24 hours</SelectItem>
                                        <SelectItem value="1-3 days">1-3 days</SelectItem>
                                        <SelectItem value="1 week">1 week</SelectItem>
                                        <SelectItem value="2-4 weeks">2-4 weeks</SelectItem>
                                        <SelectItem value="Long-term">Long-term (1 month+)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-4">
                                <Label className="text-base font-semibold text-foreground/80">Select relevant areas of concern:</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto p-3 bg-secondary/10 border border-border/50 rounded-xl">
                                    {SYMPTOMS_LIST.map(symptom => (
                                        <div key={symptom} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={symptom}
                                                checked={formData.symptoms.includes(symptom)}
                                                onCheckedChange={() => handleSymptomToggle(symptom)}
                                            />
                                            <label htmlFor={symptom} className="text-sm cursor-pointer select-none">
                                                {symptom}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Medical History & Documents */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Previous Medical Records / History
                                </Label>
                                <Textarea
                                    placeholder="Mention any existing conditions like Diabetes, Hypertension, etc."
                                    className="min-h-[80px]"
                                    value={formData.medicalHistory}
                                    onChange={e => setFormData({ ...formData, medicalHistory: e.target.value })}
                                />
                            </div>

                            {/* Drag & Drop Upload */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Upload Reports / Scans (Prescriptions, Lab results)</Label>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-xl p-6 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer">
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleFileUpload}
                                            disabled={isUploading}
                                        />
                                        {isUploading ? (
                                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                        ) : (
                                            <UploadCloud className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                                        )}
                                        <p className="mt-2 font-semibold text-sm">Click or Drag & Drop reports here</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">PDF, JPG, PNG (Max 5MB)</p>
                                    </div>

                                    {/* Uploaded Files List */}
                                    {uploadedDocuments.length > 0 && (
                                        <div className="space-y-3">
                                            {uploadedDocuments.map((doc) => (
                                                <div key={doc.id} className="flex flex-col gap-2 p-3 bg-secondary/20 rounded-lg border border-border animate-in slide-in-from-left-2">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <FileIcon className="w-4 h-4 text-primary shrink-0" />
                                                            <span className="text-xs font-medium truncate">{doc.fileName}</span>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDoc(doc.id)}>
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                    <Input
                                                        placeholder="Add brief context (e.g. 'Last Month's Lab Result')"
                                                        className="h-8 text-[11px] bg-background"
                                                        value={doc.description}
                                                        onChange={e => updateDocDescription(doc.id, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-base font-semibold">Ongoing Medications</Label>
                                <Textarea
                                    placeholder="List any medicines you are currently taking..."
                                    className="min-h-[60px]"
                                    value={formData.medications}
                                    onChange={e => setFormData({ ...formData, medications: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Results */}
                    {step === 4 && result && (
                        <div className="space-y-6 animate-in zoom-in-95 duration-300">
                            <Alert className={cn(
                                "border-2",
                                result.severity === 'HIGH' ? "border-primary bg-primary/5" : "border-wellness/20 bg-wellness/5"
                            )}>
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 className={cn("w-5 h-5", result.severity === 'HIGH' ? "text-primary" : "text-wellness")} />
                                    <AlertTitle className="text-lg mb-0 font-bold">Category: {result.classification}</AlertTitle>
                                </div>
                                <AlertDescription className="text-sm">
                                    Based on your severity score of <strong>{result.responses?.painSeverity}/10</strong>,
                                    your case is categorized as <strong>{result.classification}</strong>.
                                </AlertDescription>
                            </Alert>

                            <div className="p-6 rounded-xl bg-secondary/20 border border-border space-y-4">
                                <h3 className="font-bold text-lg flex items-center gap-2 text-primary uppercase tracking-tight">
                                    <Stethoscope className="w-5 h-5" />
                                    Recommended Care
                                </h3>
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">We suggest booking with a:</p>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge className="text-base px-5 py-1.5" variant="default">
                                            {result.suggestedSpecialty}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs uppercase font-bold">
                                            {result.classification} Level
                                        </Badge>
                                    </div>
                                </div>

                                <div className="p-4 bg-background/50 border border-border/50 rounded-lg">
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5">Assessment Reasoning</p>
                                    <p className="text-xs leading-relaxed italic">{result.reasoning}</p>
                                </div>

                                {result.isEscalated && (
                                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                        <p className="text-xs text-primary font-bold flex items-center gap-2">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            SENIOR SPECIALIST CONSULTATION ELIGIBLE
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Due to the severity score, you can directly consult with our Senior Consultants.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6 border-t">
                    {step < 4 ? (
                        <>
                            <Button variant="ghost" onClick={step === 1 ? onCancel : prevStep}>
                                {step === 1 ? "Cancel" : <><ChevronLeft className="w-4 h-4 mr-2" /> Back</>}
                            </Button>
                            <Button
                                onClick={step === 3 ? handleSubmit : nextStep}
                                disabled={loading || (step === 1 && !formData.painArea)}
                                className="px-8 font-bold"
                            >
                                {loading ? "Analyzing..." : (
                                    step === 3 ? "Complete Assessment" : <><ChevronRight className="w-4 h-4 ml-2" /> Next</>
                                )}
                            </Button>
                        </>
                    ) : (
                        <Button className="w-full h-12 text-lg font-bold" onClick={() => onComplete(result)}>
                            Continue to Slot Selection
                        </Button>
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
}
