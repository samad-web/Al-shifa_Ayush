import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { ClientBookingModal } from "@/components/client/ClientBookingModal";
import { ClientAppointmentList } from "@/components/client/ClientAppointmentList";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Clock, History } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function PatientAppointments() {
    const { role } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("UPCOMING");

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

    const upcomingAppointments = appointments.filter(apt =>
        ["PENDING", "ACCEPTED", "CONFIRMED", "SCHEDULED", "PENDING_THERAPIST_APPROVAL", "PENDING_DOCTOR_APPROVAL"].includes(apt.status)
    );

    const pastAppointments = appointments.filter(apt =>
        ["COMPLETED", "CANCELLED"].includes(apt.status)
    );

    return (
        <AppLayout>
            <div className="container max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-8">
                <PageHeader
                    title="My Appointments"
                    subtitle="Book new sessions and track your care progress."
                >
                    <Button
                        onClick={() => setModalOpen(true)}
                        size="lg"
                        className="rounded-xl shadow-md hover:shadow-lg transition-all gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Book Appointment
                    </Button>
                </PageHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger
                            value="UPCOMING"
                            className="gap-2"
                        >
                            <Clock className="w-4 h-4" />
                            Upcoming
                            {upcomingAppointments.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-[10px]">
                                    {upcomingAppointments.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="PAST"
                            className="gap-2"
                        >
                            <History className="w-4 h-4" />
                            History
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="UPCOMING" className="mt-0 outline-none">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                <p className="text-muted-foreground text-sm font-medium">Syncing your schedule...</p>
                            </div>
                        ) : (
                            <ClientAppointmentList
                                appointments={upcomingAppointments}
                                emptyMessage="No upcoming appointments yet. Start your wellness journey by booking today!"
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="PAST" className="mt-0 outline-none">
                        <ClientAppointmentList
                            appointments={pastAppointments}
                            emptyMessage="No previous appointments found."
                        />
                    </TabsContent>
                </Tabs>
            </div>

            <ClientBookingModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={fetchAppointments}
            />
        </AppLayout>
    );
}
