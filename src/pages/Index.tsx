import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getRoleRedirectPath } from "@/components/auth/ProtectedRoute";
import { Activity, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/common/button";

export default function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && user && role) {
      navigate(getRoleRedirectPath(role), { replace: true });
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-12 md:py-20 px-4">
        <div className="max-w-lg mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-2">
            <Activity className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              IWIS
            </h1>
            <p className="text-xl md:text-2xl text-primary font-medium">
              Illness to Wellness Intelligence System
            </p>
            <p className="text-muted-foreground max-w-md mx-auto">
              A calm, intelligent healthcare companion. Supporting doctors, 
              therapists, and patients on every step of the healing journey.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-4">
            <Button
              onClick={() => navigate("/login")}
              size="lg"
              className="h-12 px-8 text-base"
            >
              Sign In to Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Role Info */}
          <div className="pt-8">
            <p className="text-sm text-muted-foreground mb-4">
              Supporting multiple roles
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Super Admin", "Doctor", "Therapist", "Patient"].map((role) => (
                <span
                  key={role}
                  className="px-3 py-1.5 rounded-full bg-secondary text-sm text-muted-foreground"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border/50">
        <p className="text-center text-xs text-muted-foreground">
          Built with care for the healing journey
        </p>
      </footer>
    </div>
  );
}
