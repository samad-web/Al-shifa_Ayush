import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Stethoscope,
  User,
  Heart,
  Activity,
  Menu,
  X,
  LogOut,
  FilePlus2,
  CalendarDays,
  Package,
  ShoppingCart,
  History,
  MessageSquare,
  Building2
} from "lucide-react";
import { useState } from "react";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// Role-based navigation items
const getRoleNavItems = (role: AppRole | null) => {
  switch (role) {
    case "ADMIN":
      return [
        { path: "/admin", label: "Admin Dashboard", icon: Stethoscope },
        { path: "/appointments", label: "Appointments", icon: CalendarDays },
        { path: "/create-user", label: "Create User", icon: User },
        { path: "/assign-patient", label: "Assign Patient", icon: User },
        { path: "/prescriptions", label: "Prescriptions", icon: FilePlus2 },
        { path: "/doctor-gamification", label: "Doctor Gamification", icon: Activity },
        { path: "/doctor-availability", label: "Availability", icon: CalendarDays },
        { path: "/chat", label: "Chat", icon: MessageSquare },
      ];
    case "ADMIN_DOCTOR":
      return [
        { path: "/doctor-admin", label: "Dashboard", icon: Stethoscope },
        { path: "/appointments", label: "Appointments", icon: CalendarDays },
        { path: "/doctor", label: "My Patients", icon: User },
        { path: "/create-user", label: "Create User", icon: User },
        { path: "/branch-management", label: "Branches", icon: Building2 },
        { path: "/assign-patient", label: "Assign Patient", icon: User },
        { path: "/prescriptions", label: "Prescriptions", icon: FilePlus2 },
        { path: "/doctor-gamification", label: "Doctor Gamification", icon: Activity },
        { path: "/doctor-availability", label: "Availability", icon: CalendarDays },
        { path: "/chat", label: "Chat", icon: MessageSquare },
      ];
    case "DOCTOR":
      return [
        { path: "/doctor", label: "Dashboard", icon: User },
        { path: "/appointments", label: "Appointments", icon: CalendarDays },
        { path: "/prescriptions", label: "Prescriptions", icon: FilePlus2 },
        { path: "/doctor-gamification", label: "Doctor Gamification", icon: Activity },
        { path: "/doctor-availability", label: "Availability", icon: CalendarDays },
        { path: "/chat", label: "Chat", icon: MessageSquare },
      ];
    case "THERAPIST":
      return [
        { path: "/therapist", label: "Today's Sittings", icon: Heart },
        { path: "/appointments", label: "Appointments", icon: CalendarDays },
        { path: "/prescriptions", label: "Prescriptions", icon: FilePlus2 },
        { path: "/doctor-gamification", label: "Therapist Gamification", icon: Activity },
        { path: "/doctor-availability", label: "Availability", icon: CalendarDays },
        { path: "/chat", label: "Chat", icon: MessageSquare },
      ];
    case "PATIENT":
      return [
        { path: "/patient", label: "My Journey", icon: Activity },
        { path: "/wellness", label: "Wellness", icon: Heart },
        { path: "/appointments", label: "Appointments", icon: CalendarDays },
        { path: "/chat", label: "Chat", icon: MessageSquare },
      ];
    case "PHARMACIST":
      return [
        { path: "/pharmacy", label: "Dashboard", icon: Stethoscope },
        { path: "/pharmacy/orders", label: "Manage Orders", icon: ShoppingCart },
        { path: "/pharmacy/inventory", label: "Inventory", icon: Package },
        { path: "/pharmacy/dispense", label: "Dispense", icon: ShoppingCart },
        { path: "/pharmacy/history", label: "History", icon: History },
        { path: "/chat", label: "Chat", icon: MessageSquare },
      ];
    default:
      return [];
  }
};

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = getRoleNavItems(role);

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
    navigate("/login", { replace: true });
  };

  // Don't show navigation if not logged in
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 items-center justify-between px-6 bg-card/80 backdrop-blur-md border-b border-border/50">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">IWIS</span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <NotificationBell />
          {profile?.full_name && (
            <span className="text-sm text-muted-foreground">
              {profile.full_name}
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-card/80 backdrop-blur-md border-b border-border/50">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground text-sm">IWIS</span>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            {mobileOpen ? (
              <X className="h-5 w-5 text-foreground" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm pt-14">
          <div className="flex flex-col p-4 gap-2">
            {/* User Info */}
            {profile?.full_name && (
              <div className="px-4 py-3 border-b border-border mb-2">
                <p className="text-sm text-muted-foreground">Signed in as</p>
                <p className="font-medium text-foreground">{profile.full_name}</p>
              </div>
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-attention hover:bg-attention/10 transition-colors mt-4"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
