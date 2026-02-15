import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Heart,
  Moon,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Settings2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/common/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BodyMap } from "@/components/ui/BodyMap";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function PatientOnboarding() {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    gender: profile?.patient?.gender || "",
    therapyType: profile?.patient?.therapyType || "",
    sleepBedtime: "",
    sleepWakeTime: "",
    sleepDuration: 7,
    painLevel: 0,
    painLocations: [] as string[],
  });

  const steps = [
    {
      title: "Basic Information",
      subtitle: "Help us personalize your experience",
      icon: Settings2,
    },
    {
      title: "Sleep Patterns",
      subtitle: "Sleep is crucial for your healing journey",
      icon: Moon,
    },
    {
      title: "Pain Assessment",
      subtitle: "Tell us where it hurts and how much",
      icon: AlertCircle,
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Validation
      if (currentStep === 0 && !formData.gender) {
        toast.error("Please select your gender");
        return;
      }
      if (currentStep === 1) {
        if (!formData.sleepBedtime || !formData.sleepWakeTime) {
          toast.error("Please provide your sleep schedule");
          return;
        }
      }
      setCurrentStep((prev) => prev + 1);
    } else {
      submitOnboarding();
    }
  };

  const submitOnboarding = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/patient/onboarding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        // --- CRITICAL FIX: Refresh profile so ProtectedRoute sees we are done ---
        await refreshProfile();

        setIsComplete(true);
        setTimeout(() => {
          navigate("/patient", { replace: true });
        }, 2000);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save onboarding data");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-wellness/10 animate-check-pop">
            <CheckCircle2 className="w-12 h-12 text-wellness" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl lg:text-4xl font-black text-foreground">{t('onboarding.perfect')}</h1>
            <p className="text-muted-foreground text-lg max-w-sm mx-auto font-medium">
              {t('onboarding.complete_description')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const step = steps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="py-8 px-6 lg:py-12">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shadow-sm border border-primary/20">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground">Al-Shifa</span>
          </div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] bg-secondary/30 px-3 py-1.5 rounded-full border border-border/50">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>
      </header>

      <div className="px-6">
        <div className="max-w-2xl mx-auto">
          <div className="h-2 bg-secondary/50 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-6 py-12 lg:py-16">
        <div className="max-w-2xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/5 border-2 border-primary/20 mb-2 shadow-sm">
              <Icon className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">{t(`onboarding.steps.${currentStep}.title`)}</h1>
            <p className="text-muted-foreground text-lg font-medium">{t(`onboarding.steps.${currentStep}.subtitle`)}</p>
          </div>

          <div className="bg-card border-none rounded-[2rem] p-8 lg:p-12 shadow-elevated transition-all">
            {currentStep === 0 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('onboarding.therapy_type')}</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {["AYURVEDA", "YOGA", "UNANI", "SIDDHA", "HOMEOPATHY"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, therapyType: type })}
                        className={cn(
                          "py-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1",
                          formData.therapyType === type
                            ? "bg-primary/5 border-primary text-primary"
                            : "bg-background border-transparent hover:border-border text-muted-foreground"
                        )}
                      >
                        <span className="text-[10px] font-black tracking-tight">{t(`onboarding.${type.toLowerCase()}`)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-border/50">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('onboarding.gender')}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {["MALE", "FEMALE", "OTHER"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: g })}
                        className={cn(
                          "py-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2",
                          formData.gender === g
                            ? "bg-primary/5 border-primary text-primary shadow-sm"
                            : "bg-background border-transparent hover:border-border text-muted-foreground"
                        )}
                      >
                        <span className="text-lg font-black tracking-wide">{t(`onboarding.genders.${g.toLowerCase()}`)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Bedtime</Label>
                    <Input
                      type="time"
                      className="h-14 lg:h-16 text-xl font-bold bg-secondary/20 border-border/50 rounded-2xl focus:ring-primary/20"
                      value={formData.sleepBedtime}
                      onChange={(e) => setFormData({ ...formData, sleepBedtime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Wake time</Label>
                    <Input
                      type="time"
                      className="h-14 lg:h-16 text-xl font-bold bg-secondary/20 border-border/50 rounded-2xl focus:ring-primary/20"
                      value={formData.sleepWakeTime}
                      onChange={(e) => setFormData({ ...formData, sleepWakeTime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-6 pt-4 border-t border-border/50">
                  <div className="flex justify-between items-end">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Average Sleep Duration</Label>
                    <span className="text-2xl font-black text-primary">{formData.sleepDuration} <span className="text-sm">hrs</span></span>
                  </div>
                  <Slider
                    min={4}
                    max={12}
                    step={0.5}
                    value={[formData.sleepDuration]}
                    onValueChange={(v) => setFormData({ ...formData, sleepDuration: v[0] })}
                  />
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                    <span>4 Hours</span>
                    <span>8 Hours (Ideal)</span>
                    <span>12 Hours</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pain Severity</Label>
                    <span className={cn(
                      "font-black text-4xl",
                      formData.painLevel > 7 ? "text-destructive" : (formData.painLevel > 4 ? "text-amber-500" : "text-wellness")
                    )}>{formData.painLevel} <span className="text-sm">/ 10</span></span>
                  </div>
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={[formData.painLevel]}
                    onValueChange={(v) => setFormData({ ...formData, painLevel: v[0] })}
                  />
                </div>
                <div className="space-y-6 pt-4 border-t border-border/50">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground block text-center lg:text-left">Targeted Pain Regions</Label>
                  <div className="flex justify-center lg:justify-start">
                    <div className="w-full max-w-sm">
                      <BodyMap
                        selectedRegions={formData.painLocations}
                        onChange={(regions) => setFormData({ ...formData, painLocations: regions })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            {currentStep > 0 && (
              <Button
                variant="outline"
                className="w-24 h-14 lg:h-16 rounded-2xl border-border/50 hover:bg-secondary transition-all"
                onClick={() => setCurrentStep(prev => prev - 1)}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}
            <Button
              className="flex-1 h-14 lg:h-16 text-lg font-black tracking-wide rounded-2xl shadow-lg hover:shadow-xl transition-all"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? (
                "Saving Assessment..."
              ) : currentStep === steps.length - 1 ? (
                "Finalize Assessment"
              ) : (
                <>
                  Continue Journey
                  <ArrowRight className="w-6 h-6 ml-3" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      <footer className="py-12 px-6 text-center">
        <p className="text-sm font-bold text-muted-foreground/60 flex items-center justify-center gap-2">
          <Heart className="w-4 h-4 text-wellness/60" />
          Mandatory Clinical Baseline Assessment
        </p>
      </footer>
    </div>
  );
}
