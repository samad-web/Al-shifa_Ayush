import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = getRoleRedirectPath(role);
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

export function getRoleRedirectPath(role: AppRole | null): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "ADMIN_DOCTOR":
      return "/doctor-admin";
    case "DOCTOR":
      return "/doctor";
    case "THERAPIST":
      return "/therapist";
    case "PATIENT":
      return "/patient";
    case "PHARMACIST":
      return "/pharmacy";
    default:
      return "/login";
  }
}
