import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ProtectedRoute, getRoleRedirectPath } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Index from "./pages/Index";
import DoctorAdminDashboard from "./pages/DoctorAdminDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import TherapistDashboard from "./pages/TherapistDashboard";
import ConsultationRoom from "./pages/ConsultationRoom";
import TherapistPatients from "./pages/TherapistPatients";
import PatientScreen from "./pages/PatientScreen";
import PatientOnboarding from "./pages/PatientOnboarding";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import CreateUser from "./pages/CreateUser";
import AdminDashboard from "./pages/AdminDashboard";
import AssignPatient from "./pages/AssignPatient";
import PatientDetails from "./pages/PatientDetails";
import DoctorGamification from "./pages/DoctorGamification";
import PrescriptionManagement from "./pages/PrescriptionManagement";
import Appointments from "./pages/Appointments";
import ManageUsers from "./pages/ManageUsers";
import PharmacyDashboard from "./pages/PharmacyDashboard";
import MedicineInventory from "./pages/MedicineInventory";
import PharmacyDispense from "./pages/PharmacyDispense";
import PharmacyHistory from "./pages/PharmacyHistory";

const queryClient = new QueryClient();

// Redirect authenticated users to their role-specific dashboard
function AuthenticatedRedirect() {
  const { user, role, loading } = useAuth();
  console.log("[App] AuthenticatedRedirect:", { user, role, loading });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && role) {
    const path = getRoleRedirectPath(role);
    console.log("[App] Redirecting to:", path);
    return <Navigate to={path} replace />;
  }

  return <Index />;
}

function LoginRedirect() {
  const { user, role, loading } = useAuth();
  console.log("[App] LoginRedirect:", { user, role, loading });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && role) {
    const path = getRoleRedirectPath(role);
    console.log("[App] Redirecting from login to:", path);
    return <Navigate to={path} replace />;
  }

  return <Login />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<AuthenticatedRedirect />} />
      <Route path="/login" element={<LoginRedirect />} />

      {/* Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor-admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN_DOCTOR"]}>
            <DoctorAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assign-patient"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "ADMIN_DOCTOR"]}>
            <AssignPatient />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor-gamification"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "ADMIN_DOCTOR", "DOCTOR"]}>
            <DoctorGamification />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prescriptions"
        element={
          <ProtectedRoute allowedRoles={["DOCTOR", "THERAPIST", "ADMIN", "ADMIN_DOCTOR"]}>
            <PrescriptionManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute allowedRoles={["PATIENT", "DOCTOR", "THERAPIST", "ADMIN", "ADMIN_DOCTOR"]}>
            <Appointments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRoles={["DOCTOR", "ADMIN_DOCTOR"]}>
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/therapist"
        element={
          <ProtectedRoute allowedRoles={["THERAPIST"]}>
            <TherapistDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/therapist/session/:appointmentId"
        element={
          <ProtectedRoute allowedRoles={["THERAPIST"]}>
            <ConsultationRoom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/therapist/patients"
        element={
          <ProtectedRoute allowedRoles={["THERAPIST"]}>
            <TherapistPatients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/onboarding"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientOnboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-user"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "ADMIN_DOCTOR"]}>
            <CreateUser />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage-users"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "ADMIN_DOCTOR"]}>
            <ManageUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute allowedRoles={["PHARMACIST", "ADMIN", "ADMIN_DOCTOR"]}>
            <PharmacyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy/inventory"
        element={
          <ProtectedRoute allowedRoles={["PHARMACIST", "ADMIN", "ADMIN_DOCTOR"]}>
            <MedicineInventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy/dispense"
        element={
          <ProtectedRoute allowedRoles={["PHARMACIST", "ADMIN", "ADMIN_DOCTOR"]}>
            <PharmacyDispense />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy/history"
        element={
          <ProtectedRoute allowedRoles={["PHARMACIST", "ADMIN", "ADMIN_DOCTOR"]}>
            <PharmacyHistory />
          </ProtectedRoute>
        }
      />

      {/* Catch-All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppRoutes />
            </TooltipProvider>
          </NotificationProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

