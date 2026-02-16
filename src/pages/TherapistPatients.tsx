
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { PatientCard } from "@/components/ui/patient-card";
import { useAuth } from "@/hooks/useAuth";
import { Users, Search, Filter, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TherapistPatients() {
    const { profile } = useAuth();
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const res = await fetch("/api/user/assigned-patients", {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                const data = await res.json();
                setPatients(data);
            }
        } catch (error) {
            console.error("Failed to fetch patients:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = patients.filter(p =>
        (p.fullName || p.email).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AppLayout>
            <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-10">
                <PageHeader
                    title="Patient Roster"
                    subtitle="Manage and track clinical progress for all assigned patients."
                />

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 p-4 rounded-2xl border border-border/50 backdrop-blur-sm">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-10 h-11 bg-background/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-foreground">{filteredPatients.length} Active Profiles</span>
                    </div>
                </div>

                <Panel title="Clinical Roster" subtitle="Detailed patient health journeys">
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading roster...</div>
                    ) : filteredPatients.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPatients.map((patient) => (
                                <PatientCard
                                    key={patient.id}
                                    name={patient.fullName || patient.email}
                                    status={patient.status === "AT_RISK" ? "needs-attention" : "on-track"}
                                    sittings={{
                                        current: patient.completedSittings || 0,
                                        total: patient.totalSittings || 20
                                    }}
                                    phoneNumber={patient.phoneNumber}
                                    reason={patient.therapyType}
                                >
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2"
                                        onClick={() => window.location.href = `/chat?partner=${patient.userId}`}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Message
                                    </Button>
                                </PatientCard>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-3xl bg-secondary/5">
                            <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                            <p className="text-muted-foreground">No patients found matching your search.</p>
                        </div>
                    )}
                </Panel>
            </div>
        </AppLayout>
    );
}
