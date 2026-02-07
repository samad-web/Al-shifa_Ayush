
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { AppointmentModal } from "@/components/appointment-modal";
import { AppointmentList } from "@/components/appointment-list";
import { Calendar, Users, UserPlus, Activity } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ doctors: 0, patients: 0 });
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [doctors, patients] = await Promise.all([
          fetch(`${API_BASE_URL}/api/user/list-doctors`, { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/user/list-patients`, { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }).then(r => r.json()),
        ]);
        setCounts({ doctors: doctors.length, patients: patients.length });
      } catch { }
    }
    fetchCounts();
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const res = await fetch("/api/appointments", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleAppointmentSuccess = () => {
    fetchAppointments();
    setShowModal(false);
    setEditingAppointment(null);
  };

  const handleEdit = (appointment: any) => {
    setEditingAppointment(appointment);
    setShowModal(true);
  };

  const handleCancel = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Appointment cancelled successfully");
        fetchAppointments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to cancel appointment");
      }
    } catch (error) {
      toast.error("Failed to cancel appointment");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAppointment(null);
  };

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
        <PageHeader
          title="Admin Dashboard"
          subtitle="Manage users, patients, and appointments"
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Panel title="Doctors" subtitle="Total registered doctors">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">{counts.doctors}</div>
            </div>
          </Panel>

          <Panel title="Patients" subtitle="Total registered patients">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-wellness/10">
                <Users className="w-6 h-6 text-wellness" />
              </div>
              <div className="text-3xl font-bold text-foreground">{counts.patients}</div>
            </div>
          </Panel>

          <Panel title="Appointments" subtitle="Total scheduled appointments">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary">
                <Calendar className="w-6 h-6 text-foreground" />
              </div>
              <div className="text-3xl font-bold text-foreground">
                {appointments.filter(a => a.status === "SCHEDULED").length}
              </div>
            </div>
          </Panel>
        </div>

        {/* Quick Actions */}
        <Panel title="Quick Actions" subtitle="Common administrative tasks">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/create-user"
              className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg shadow hover:shadow-lg transition font-semibold"
            >
              <UserPlus className="w-5 h-5" />
              Create User
            </Link>
            <Link
              to="/manage-users"
              className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-risk to-risk/80 text-risk-foreground rounded-lg shadow hover:shadow-lg transition font-semibold"
            >
              <Users className="w-5 h-5" />
              Manage Users
            </Link>
            <Link
              to="/assign-patient"
              className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-wellness to-wellness/80 text-wellness-foreground rounded-lg shadow hover:shadow-lg transition font-semibold"
            >
              <Users className="w-5 h-5" />
              Assign Patient
            </Link>
            <Link
              to="/doctor-gamification"
              className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground rounded-lg shadow hover:shadow-lg transition font-semibold"
            >
              <Activity className="w-5 h-5" />
              Doctor Gamification
            </Link>
          </div>
        </Panel>

        {/* Appointment Management */}
        <Panel
          title="Appointment Management"
          subtitle="View and manage all appointments"
        >
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowModal(true)} className="gap-2">
                <Calendar className="w-4 h-4" />
                Book Appointment
              </Button>
            </div>

            {loadingAppointments ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading appointments...
              </div>
            ) : (
              <AppointmentList
                appointments={appointments}
                onEdit={handleEdit}
                onCancel={handleCancel}
                showPatientName={true}
              />
            )}
          </div>
        </Panel>

        {/* Appointment Modal */}
        <AppointmentModal
          isOpen={showModal}
          onClose={handleCloseModal}
          onSuccess={handleAppointmentSuccess}
          appointment={editingAppointment}
        />
      </div>
    </AppLayout>
  );
}