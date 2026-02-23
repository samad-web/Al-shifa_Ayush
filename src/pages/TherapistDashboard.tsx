
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatCard } from "@/components/ui/stat-card";
import { Panel } from "@/components/ui/panel";
import { AppointmentList } from "@/components/appointment-list";
import { AppointmentModal } from "@/components/appointment-modal";
import { useAuth } from "@/hooks/useAuth";
import {
    Heart,
    Calendar,
    Users,
    Video,
    UserCheck,
    Activity,
    Clock,
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const initialStats = {
    recoveryProgress: 0,
    sessionAdherence: 0,
    activeCases: 0,
    todaySittings: 0,
    hoursWorked: "0",
    completedSittings: 0,
};

export default function TherapistDashboard() {
    const { profile, role } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [stats, setStats] = useState(initialStats);
    const [editingAppointment, setEditingAppointment] = useState<any>(null);

    useEffect(() => {
        fetchAppointments();
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/consultations/therapist/stats", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch statistics:", error);
        }
    };

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/appointments", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.appointments) {
                    setAppointments(data.appointments);
                } else {
                    setAppointments(data);
                }
            }
        } catch (error) {
            console.error("Failed to fetch appointments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartSession = async (appointment: any) => {
        try {
            const res = await fetch(`/api/consultations/session/${appointment.id}/start`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
            });
            if (res.ok) {
                const updated = await res.json();
                toast.success("Session started!");
                if (updated.meetingLink) {
                    window.open(updated.meetingLink, "_blank");
                }
                fetchAppointments();
            }
        } catch (error) {
            toast.error("Failed to start session");
        }
    };

    const handleEdit = (appointment: any) => {
        setEditingAppointment(appointment);
        setShowModal(true);
    };

    const handleApprove = async (appointmentId: string) => {
        try {
            const res = await fetch(`/api/appointments/${appointmentId}/approve`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
            });
            if (res.ok) {
                toast.success("Appointment approved!");
                fetchAppointments();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to approve");
            }
        } catch (error) {
            toast.error("Failed to approve");
        }
    };

    const handleReject = async (appointmentId: string) => {
        if (!confirm("Reject this appointment?")) return;
        try {
            const res = await fetch(`/api/appointments/${appointmentId}/reject`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
            });
            if (res.ok) {
                toast.success("Appointment rejected");
                fetchAppointments();
            } else {
                toast.error("Failed to reject");
            }
        } catch (error) {
            toast.error("Failed to reject");
        }
    };

    return (
        <AppLayout>
            <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <PageHeader
                        title="Therapist Dashboard"
                        subtitle={profile?.fullName
                            ? `Welcome back, ${profile.fullName} • You have ${stats.todaySittings} sittings scheduled for today.`
                            : "Every session is a step towards wellness."
                        }
                    />
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="gap-2" onClick={() => setShowModal(true)}>
                            <Calendar className="w-4 h-4" />
                            Request Availability Change
                        </Button>
                    </div>
                </div>

                {/* Clinical Pulse - Progress Rings */}
                <div className="grid md:grid-cols-3 gap-8 p-8 bg-card/30 backdrop-blur-md rounded-3xl border border-border/50">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <ProgressRing
                            progress={stats.recoveryProgress}
                            size={120}
                            variant="recovery"
                            label="Recovery"
                        />
                        <div className="space-y-1">
                            <p className="font-bold text-foreground">Recovery Rate</p>
                            <p className="text-xs text-muted-foreground">Patients showing positive evolution</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center text-center space-y-4">
                        <ProgressRing
                            progress={stats.sessionAdherence}
                            size={120}
                            variant="adherence"
                            label="Adherence"
                        />
                        <div className="space-y-1">
                            <p className="font-bold text-foreground">Session Adherence</p>
                            <p className="text-xs text-muted-foreground">Attendance for scheduled sittings</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-6 space-y-3 bg-primary/5 rounded-2xl border border-primary/10">
                        <Activity className="w-10 h-10 text-primary" />
                        <div className="text-center">
                            <p className="text-2xl font-black text-primary">{stats.completedSittings}</p>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Sittings Delivered</p>
                        </div>
                    </div>
                </div>

                {/* Actionable Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Active Cases"
                        value={stats.activeCases}
                        icon={Users}
                        description="Patients currently in therapy"
                    />
                    <StatCard
                        title="Today's Sittings"
                        value={stats.todaySittings}
                        icon={Clock}
                        description="Scheduled for today"
                        variant="wellness"
                    />
                    <StatCard
                        title="Hours Delivered"
                        value={stats.hoursWorked}
                        icon={Activity}
                        description="Clinical hours today"
                    />
                    <StatCard
                        title="Available Modes"
                        value="Hybrid"
                        icon={Video}
                        description="Video & In-Clinic"
                    />
                </div>

                {/* Main Content Area */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Today's Agenda - Takes 2 columns */}
                    <div className="lg:col-span-2 space-y-6">
                        <Panel
                            title="Today's Clinical Agenda"
                            subtitle="Managed and scheduled consultation sessions"
                        >
                            {loading ? (
                                <div className="text-center py-12 text-muted-foreground">Loading agenda...</div>
                            ) : (
                                <AppointmentList
                                    appointments={appointments}
                                    onEdit={handleEdit}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    onStartSession={handleStartSession}
                                    showPatientName={true}
                                    emptyMessage="No sittings scheduled for today."
                                />
                            )}
                        </Panel>
                    </div>

                    {/* Quick Actions & High Value Folders */}
                    <div className="space-y-6">
                        <Panel title="Clinical Resources" subtitle="Quick access to tools">
                            <div className="space-y-3">
                                <Button className="w-full justify-start h-14 rounded-xl gap-4" variant="secondary">
                                    <UserCheck className="w-5 h-5 text-wellness" />
                                    <div className="text-left">
                                        <p className="font-bold text-sm">Patient Health Records</p>
                                        <p className="text-xs text-muted-foreground">Access full clinical history</p>
                                    </div>
                                </Button>

                            </div>
                        </Panel>

                        <Panel title="Operational Note" subtitle="Administrative information">
                            <div className="p-4 bg-attention/5 border border-attention/20 rounded-xl space-y-2">
                                <p className="text-sm font-bold text-foreground">Schedule Audit</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Your availability for the upcoming week needs to be submitted by Friday 5 PM for Admin approval.
                                </p>
                            </div>
                        </Panel>
                    </div>
                </div>

                {/* Modal for Appointment Interaction */}
                <AppointmentModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSuccess={fetchAppointments}
                    appointment={editingAppointment}
                />
            </div>
        </AppLayout>
    );
}
