import { useState, useEffect } from "react";
import { Navigation } from "@/components/layout/navigation";
import { AppointmentModal } from "@/components/appointment-modal";
import { AppointmentList } from "@/components/appointment-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CalendarDays, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/contexts/NotificationContext";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

type AppointmentStatus = "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export default function Appointments() {
    const { role } = useAuth();
    const { addNotification } = useNotifications();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<AppointmentStatus>("ALL");

    const isPatient = role === "PATIENT";
    const canApprove = ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"].includes(role || "");

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/appointments`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                const data = await res.json();
                setAppointments(data);
            }
        } catch (error) {
            console.error("Failed to fetch appointments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (appointment: any) => {
        setEditingAppointment(appointment);
        setModalOpen(true);
    };

    const handleCancel = async (appointmentId: string) => {
        if (!confirm("Are you sure you want to cancel this appointment?")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                toast.success("Appointment cancelled successfully");
                fetchAppointments();
            } else {
                toast.error("Failed to cancel appointment");
            }
        } catch (error) {
            toast.error("Failed to cancel appointment");
        }
    };

    const handleApprove = async (appointmentId: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}/approve`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
            });
            if (res.ok) {
                const updatedAppointment = await res.json();
                toast.success("Appointment approved successfully");

                // Trigger notification for the patient
                addNotification({
                    type: "appointment_confirmed",
                    title: "Appointment Confirmed",
                    message: `Your appointment on ${new Date(updatedAppointment.date).toLocaleDateString()} has been approved.`,
                    data: { appointmentId: updatedAppointment.id },
                });

                fetchAppointments();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to approve appointment");
            }
        } catch (error) {
            toast.error("Failed to approve appointment");
        }
    };

    const handleReject = async (appointmentId: string) => {
        if (!confirm("Are you sure you want to reject this appointment?")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}/reject`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
            });
            if (res.ok) {
                const updatedAppointment = await res.json();
                toast.success("Appointment rejected successfully");

                // Trigger notification for the patient
                addNotification({
                    type: "appointment_rejected",
                    title: "Appointment Not Approved",
                    message: `Your appointment request for ${new Date(updatedAppointment.date).toLocaleDateString()} was not approved.`,
                    data: { appointmentId: updatedAppointment.id },
                });

                fetchAppointments();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to reject appointment");
            }
        } catch (error) {
            toast.error("Failed to reject appointment");
        }
    };

    const filteredAppointments = appointments.filter((apt) => {
        if (activeTab === "ALL") return true;
        return apt.status === activeTab;
    });

    const getTabCount = (status: AppointmentStatus) => {
        if (status === "ALL") return appointments.length;
        return appointments.filter((apt) => apt.status === status).length;
    };

    return (
        <>
            <Navigation />
            <div className="min-h-screen bg-background pt-16 md:pt-20 px-4 md:px-8 pb-12">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                                <CalendarDays className="h-8 w-8 text-primary" />
                                Appointments
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                {isPatient
                                    ? "Request and track your appointments"
                                    : "Manage and approve appointment requests"}
                            </p>
                        </div>
                        {isPatient && (
                            <Button onClick={() => setModalOpen(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Request Appointment
                            </Button>
                        )}
                    </div>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AppointmentStatus)}>
                        <TabsList className="flex w-full overflow-x-auto h-auto p-1 bg-muted/50 gap-1 no-scrollbar">
                            <TabsTrigger value="ALL" className="flex-1 min-w-[80px] gap-2">
                                All
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                    {getTabCount("ALL")}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="PENDING" className="flex-1 min-w-[100px] gap-2">
                                <Clock className="h-3 w-3" />
                                Pending
                                <span className="text-xs bg-attention/10 text-attention px-1.5 py-0.5 rounded">
                                    {getTabCount("PENDING")}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="CONFIRMED" className="flex-1 min-w-[110px] gap-2">
                                <CheckCircle2 className="h-3 w-3" />
                                Confirmed
                                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                    {getTabCount("CONFIRMED")}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="COMPLETED" className="flex-1 min-w-[110px] gap-2">
                                Completed
                                <span className="text-xs bg-wellness/10 text-wellness px-1.5 py-0.5 rounded">
                                    {getTabCount("COMPLETED")}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="CANCELLED" className="flex-1 min-w-[100px] gap-2">
                                <XCircle className="h-3 w-3" />
                                Cancelled
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                    {getTabCount("CANCELLED")}
                                </span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab} className="mt-6">
                            {loading ? (
                                <div className="text-center py-12">
                                    <p className="text-muted-foreground">Loading appointments...</p>
                                </div>
                            ) : (
                                <AppointmentList
                                    appointments={filteredAppointments}
                                    onEdit={canApprove ? handleEdit : undefined}
                                    onCancel={handleCancel}
                                    onApprove={canApprove ? handleApprove : undefined}
                                    onReject={canApprove ? handleReject : undefined}
                                    showPatientName={!isPatient}
                                    emptyMessage={`No ${activeTab === "ALL" ? "" : activeTab.toLowerCase()} appointments`}
                                />
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Appointment Modal */}
            <AppointmentModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingAppointment(null);
                }}
                onSuccess={fetchAppointments}
                appointment={editingAppointment}
            />
        </>
    );
}
