import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Heart, Calendar, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/common/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  icon: React.ElementType;
  title: string;
  message: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    icon: Heart,
    title: "Welcome to Your Healing Journey",
    message: "We're here to support you every step of the way. This treatment plan has been carefully designed for your wellness.",
  },
  {
    icon: Calendar,
    title: "Your Treatment Plan",
    message: "You'll have 20 therapy sittings over the coming weeks. Each sitting brings you closer to complete wellness.",
  },
  {
    icon: Activity,
    title: "Consistency is Key",
    message: "Regular attendance and medication adherence are the foundation of healing. We'll gently remind you when it's time.",
  },
  {
    icon: Sparkles,
    title: "From Illness to Wellness",
    message: "As you complete your journey, you'll unlock the Wellness stage — where healing becomes lasting strength.",
  },
];

export default function PatientOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const navigate = useNavigate();

  const step = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsComplete(true);
      setTimeout(() => {
        navigate("/patient", { replace: true });
      }, 2000);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-wellness/10 animate-check-pop">
            <CheckCircle2 className="w-10 h-10 text-wellness" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">You're all set!</h1>
            <p className="text-muted-foreground">
              Let's begin your journey to wellness
            </p>
          </div>
        </div>
      </div>
    );
  }

  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="flex items-center justify-center gap-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold text-foreground">IWIS</span>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="px-4 py-2">
        <div className="max-w-sm mx-auto">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Step {currentStep + 1} of {onboardingSteps.length}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-sm w-full space-y-8 animate-fade-in-up" key={currentStep}>
          {/* Icon */}
          <div className="flex justify-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/5 border border-primary/10">
              <Icon className="w-12 h-12 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">{step.title}</h1>
            <p className="text-muted-foreground leading-relaxed">{step.message}</p>
          </div>

          {/* Journey Preview (on step 2) */}
          {currentStep === 1 && (
            <div className="flex justify-center py-4">
              <ProgressRing
                progress={0}
                size={120}
                strokeWidth={8}
                variant="progress"
              />
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleNext}
            className={cn(
              "w-full h-12 text-base font-medium",
              "transition-all duration-200"
            )}
          >
            {currentStep === onboardingSteps.length - 1 ? (
              "Start My Journey"
            ) : (
              <>
                Continue
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </main>

      {/* Skip Option */}
      <footer className="py-6 px-4">
        <button
          onClick={() => navigate("/patient", { replace: true })}
          className="block mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </footer>
    </div>
  );
}
