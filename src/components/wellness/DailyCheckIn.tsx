import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/common/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Smile,
    Meh,
    Frown,
    Moon,
    AlertCircle,
    Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

interface DailyCheckInProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (pointsAwarded: number) => void;
}

export function DailyCheckIn({ isOpen, onClose, onSuccess }: DailyCheckInProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        painLevel: 0,
        sleepHours: 7,
        mood: "NEUTRAL",
        notes: "",
    });

    const moods = [
        { id: "SAD", icon: Frown, label: "Sad", color: "text-destructive" },
        { id: "NEUTRAL", icon: Meh, label: "Neutral", color: "text-muted-foreground" },
        { id: "HAPPY", icon: Smile, label: "Happy", color: "text-wellness" },
    ];

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/wellness/check-in`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success("Daily check-in completed! +10 Zen Points");
                onSuccess(10);
                onClose();
            } else {
                const text = await res.text();
                console.error("Submission failed with status:", res.status, "Body:", text);
                try {
                    const data = JSON.parse(text);
                    toast.error(data.error || "Failed to submit check-in");
                } catch (e) {
                    toast.error(`Error ${res.status}: Failed to submit check-in`);
                }
            }
        } catch (error: any) {
            console.error("Submission error:", error);
            toast.error(`Submission error: ${error.message || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Daily Wellness Check-in</DialogTitle>
                    <DialogDescription>
                        Help us track your progress and earn Zen Points.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-8">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label className="flex items-center gap-2">
                                        <Smile className="w-4 h-4" /> How's your mood?
                                    </Label>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    {moods.map((m) => {
                                        const Icon = m.icon;
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => setFormData({ ...formData, mood: m.id })}
                                                className={cn(
                                                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                                    formData.mood === m.id
                                                        ? "bg-primary/5 border-primary"
                                                        : "bg-background border-transparent hover:border-muted"
                                                )}
                                            >
                                                <Icon className={cn("w-8 h-8", m.color)} />
                                                <span className="text-xs font-bold uppercase tracking-widest">{m.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label className="flex items-center gap-2">
                                        <Moon className="w-4 h-4" /> Sleep (hours)
                                    </Label>
                                    <span className="text-lg font-black text-primary">{formData.sleepHours}h</span>
                                </div>
                                <Slider
                                    min={0}
                                    max={15}
                                    step={0.5}
                                    value={[formData.sleepHours]}
                                    onValueChange={(v) => setFormData({ ...formData, sleepHours: v[0] })}
                                />
                            </div>

                            <Button className="w-full h-12" onClick={() => setStep(2)}>
                                Next
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> Pain Level (0-10)
                                    </Label>
                                    <span className="text-lg font-black text-destructive">{formData.painLevel}</span>
                                </div>
                                <Slider
                                    min={0}
                                    max={10}
                                    step={1}
                                    value={[formData.painLevel]}
                                    onValueChange={(v) => setFormData({ ...formData, painLevel: v[0] })}
                                />
                            </div>

                            <div className="space-y-4">
                                <Label>Any specific notes today?</Label>
                                <Textarea
                                    placeholder="Tell us about any new symptoms or improvements..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="min-h-[100px]"
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                                    Back
                                </Button>
                                <Button
                                    className="flex-[2] h-12 bg-wellness hover:bg-wellness/90"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? "Submitting..." : "Complete Check-in"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-start">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                        <Award className="w-3 h-3 text-primary" />
                        Earn 10 Zen Points for every daily report.
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
