import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getRoleRedirectPath } from "@/components/auth/ProtectedRoute";
import { Activity, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user, role, signIn, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in with a role
  useEffect(() => {
    if (!loading && user && role) {
      navigate(getRoleRedirectPath(role), { replace: true });
    }
  }, [user, role, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError("Invalid credentials. Please check your email and password.");
      setIsLoading(false);
      return;
    }

    // The useEffect above will handle redirection when role is fetched
    // Keep loading state while waiting
  };

  // Show loading if checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Decorative Side Panel - Desktop Only */}
      <div className="hidden lg:flex flex-1 relative bg-primary items-center justify-center p-12 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-foreground/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

        <div className="relative z-10 max-w-md w-full space-y-12">
          {/* Hero Branding */}
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Activity className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-5xl font-black text-white tracking-tight">IWIS</h2>
              <p className="text-xl text-white/80 font-medium">Illness to Wellness Intelligence System</p>
            </div>
          </div>

          {/* Value Props */}
          <div className="space-y-6">
            <div className="flex items-start gap-4 text-white">
              <div className="mt-1 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-lg font-medium text-white/90">Personalized healing journeys for every patient</p>
            </div>
            <div className="flex items-start gap-4 text-white">
              <div className="mt-1 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-lg font-medium text-white/90">Streamlined sit-management for therapists</p>
            </div>
            <div className="flex items-start gap-4 text-white">
              <div className="mt-1 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-lg font-medium text-white/90">Data-driven insights for clinical administrators</p>
            </div>
          </div>

          {/* Trusted Footer */}
          <div className="pt-12 border-t border-white/10">
            <p className="text-sm text-white/60">Built with care for modern healthcare professionals.</p>
          </div>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-20 py-12">
        <div className="w-full max-w-[400px] space-y-10">
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden flex flex-col items-center gap-4 mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-black text-foreground">IWIS</span>
          </div>

          {/* Welcome Text */}
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to access your intelligence dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-attention/5 border border-attention/20 animate-shake">
                <AlertCircle className="w-5 h-5 text-attention shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-bold text-muted-foreground ml-1">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@alshifa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 bg-secondary/30 border-secondary focus:bg-background transition-all rounded-xl text-lg"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" title="Password" className="text-sm font-bold text-muted-foreground ml-1">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 bg-secondary/30 border-secondary focus:bg-background transition-all rounded-xl text-lg"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className={cn(
                "w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20",
                "transition-all duration-300"
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Continue to Dashboard"
              )}
            </Button>
          </form>

          {/* Manual Redirect Fallback */}
          {user && role && !isLoading && (
            <div className="text-center lg:text-left space-y-4 p-5 rounded-2xl bg-primary/5 border border-primary/20 animate-fade-in shadow-sm">
              <p className="text-sm text-foreground font-bold">Session active</p>
              <Button
                onClick={() => navigate(getRoleRedirectPath(role), { replace: true })}
                variant="outline"
                className="w-full h-12 rounded-xl font-bold"
              >
                Go to Dashboard
              </Button>
            </div>
          )}

          {/* Footer Branding */}
          <div className="pt-8 border-t border-border/50 text-center lg:text-left">
            <p className="text-sm text-muted-foreground">
              Illness to Wellness Intelligence System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
