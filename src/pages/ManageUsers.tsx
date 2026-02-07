import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Trash2, AlertTriangle, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { UserEditModal } from "@/components/user-edit-modal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface Doctor {
    id: string;
    fullName: string | null;
    email: string;
    specialization: string | null;
    qualification: string | null;
    yearsExperience: number | null;
}

interface Therapist {
    id: string;
    fullName: string | null;
    email: string;
    specialization: string | null;
    qualification: string | null;
    yearsExperience: number | null;
}

interface Patient {
    id: string;
    fullName: string | null;
    email: string;
    phoneNumber: string | null;
    age: number | null;
    gender: string | null;
    patientId: string | null;
}

interface Pharmacist {
    id: string;
    fullName: string | null;
    email: string;
    qualification: string | null;
    yearsExperience: number | null;
}

export default function ManageUsers() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [therapists, setTherapists] = useState<Therapist[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [pharmacists, setPharmacists] = useState<Pharmacist[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<any>(null);
    const [editType, setEditType] = useState<"doctor" | "therapist" | "patient" | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const headers = { Authorization: `Bearer ${token}` };

            const [doctorsRes, therapistsRes, patientsRes, pharmacistsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/user/list-doctors`, { headers }),
                fetch(`${API_BASE_URL}/api/user/list-therapists`, { headers }),
                fetch(`${API_BASE_URL}/api/user/list-patients`, { headers }),
                fetch(`${API_BASE_URL}/api/user/list-pharmacists`, { headers }),
            ]);

            if (doctorsRes.ok) setDoctors(await doctorsRes.json());
            if (therapistsRes.ok) setTherapists(await therapistsRes.json());
            if (patientsRes.ok) setPatients(await patientsRes.json());
            if (pharmacistsRes.ok) setPharmacists(await pharmacistsRes.json());
        } catch (error) {
            toast.error("Failed to fetch users");
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (type: "doctor" | "therapist" | "patient", id: string, name: string | null) => {
        const confirmMessage = `Are you sure you want to delete ${type} "${name || 'this user'}"? This action cannot be undone.`;

        if (!confirm(confirmMessage)) return;

        setDeleting(id);
        try {
            const token = localStorage.getItem("accessToken");
            const res = await fetch(`${API_BASE_URL}/api/user/${type}/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);

                // Remove from local state
                if (type === "doctor") {
                    setDoctors(doctors.filter((d) => d.id !== id));
                } else if (type === "therapist") {
                    setTherapists(therapists.filter((t) => t.id !== id));
                } else {
                    setPatients(patients.filter((p) => p.id !== id));
                }
            } else {
                const error = await res.json();
                toast.error(error.error || `Failed to delete ${type}`);
            }
        } catch (error) {
            toast.error(`Failed to delete ${type}`);
            console.error(`Error deleting ${type}:`, error);
        } finally {
            setDeleting(null);
        }
    };

    const handleEdit = (type: "doctor" | "therapist" | "patient", user: any) => {
        setEditType(type);
        setUserToEdit(user);
        setIsEditModalOpen(true);
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
                <PageHeader
                    title="Manage Users"
                    subtitle="View and manage doctors, therapists, and patients"
                />

                <Tabs defaultValue="doctors" className="space-y-6">
                    <TabsList className="grid w-full max-w-md grid-cols-3">
                        <TabsTrigger value="doctors">
                            Doctors ({doctors.length})
                        </TabsTrigger>
                        <TabsTrigger value="therapists">
                            Therapists ({therapists.length})
                        </TabsTrigger>
                        <TabsTrigger value="patients">
                            Patients ({patients.length})
                        </TabsTrigger>
                        <TabsTrigger value="pharmacists">
                            Pharmacists ({pharmacists.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Doctors Tab */}
                    <TabsContent value="doctors">
                        <Panel title="Doctors" subtitle="Manage medical doctors">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-border">
                                        <tr className="text-left">
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Name</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Email</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Specialization</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Qualification</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Experience</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {doctors.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center">
                                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                        <Users className="w-8 h-8 opacity-20" />
                                                        <p>No doctors found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            doctors.map((doctor) => (
                                                <tr key={doctor.id} className="border-b border-border/40 hover:bg-secondary/10 transition-colors group">
                                                    <td className="py-4 font-medium">{doctor.fullName || "N/A"}</td>
                                                    <td className="py-4 text-sm text-muted-foreground">{doctor.email}</td>
                                                    <td className="py-4 text-sm">
                                                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-medium">
                                                            {doctor.specialization || "General"}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-sm text-muted-foreground">{doctor.qualification || "N/A"}</td>
                                                    <td className="py-4 text-sm text-muted-foreground">{doctor.yearsExperience ? `${doctor.yearsExperience} yrs` : "N/A"}</td>
                                                    <td className="py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit("doctor", doctor)}
                                                                className="text-primary hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Edit Doctor"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete("doctor", doctor.id, doctor.fullName)}
                                                                disabled={deleting === doctor.id}
                                                                className="text-risk hover:text-risk hover:bg-risk/10 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Delete Doctor"
                                                            >
                                                                {deleting === doctor.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="w-4 h-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                    </TabsContent>

                    {/* Therapists Tab */}
                    <TabsContent value="therapists">
                        <Panel title="Therapists" subtitle="Manage clinical therapists">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-border">
                                        <tr className="text-left">
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Name</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Email</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Specialization</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Qualification</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Experience</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {therapists.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Users className="w-8 h-8 opacity-20" />
                                                        <p>No therapists found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            therapists.map((therapist) => (
                                                <tr key={therapist.id} className="border-b border-border/40 hover:bg-secondary/10 transition-colors group">
                                                    <td className="py-4 font-medium">{therapist.fullName || "N/A"}</td>
                                                    <td className="py-4 text-sm text-muted-foreground">{therapist.email}</td>
                                                    <td className="py-4 text-sm">
                                                        <span className="bg-accent/10 text-accent px-2 py-1 rounded-md text-xs font-medium">
                                                            {therapist.specialization || "Clinical"}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-sm text-muted-foreground">{therapist.qualification || "N/A"}</td>
                                                    <td className="py-4 text-sm text-muted-foreground">{therapist.yearsExperience ? `${therapist.yearsExperience} yrs` : "N/A"}</td>
                                                    <td className="py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit("therapist", therapist)}
                                                                className="text-primary hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Edit Therapist"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete("therapist", therapist.id, therapist.fullName)}
                                                                disabled={deleting === therapist.id}
                                                                className="text-risk hover:text-risk hover:bg-risk/10 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Delete Therapist"
                                                            >
                                                                {deleting === therapist.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="w-4 h-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                    </TabsContent>

                    {/* Patients Tab */}
                    <TabsContent value="patients">
                        <Panel title="Patients" subtitle="Manage registered patients">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-border">
                                        <tr className="text-left">
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Name</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Email</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Phone</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Age</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Gender</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Patient ID</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {patients.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Users className="w-8 h-8 opacity-20" />
                                                        <p>No patients found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            patients.map((patient) => (
                                                <tr key={patient.id} className="border-b border-border/40 hover:bg-secondary/10 transition-colors group">
                                                    <td className="py-4 font-medium">{patient.fullName || "N/A"}</td>
                                                    <td className="py-4 text-sm text-muted-foreground">{patient.email}</td>
                                                    <td className="py-4 text-sm text-muted-foreground">{patient.phoneNumber || "N/A"}</td>
                                                    <td className="py-4 text-sm text-muted-foreground">{patient.age || "N/A"}</td>
                                                    <td className="py-4 text-sm text-muted-foreground">{patient.gender || "N/A"}</td>
                                                    <td className="py-4 text-sm border-l-2 border-primary/20 pl-3">
                                                        <span className="font-mono text-xs">{patient.patientId || "N/A"}</span>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit("patient", patient)}
                                                                className="text-primary hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Edit Patient"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete("patient", patient.id, patient.fullName)}
                                                                disabled={deleting === patient.id}
                                                                className="text-risk hover:text-risk hover:bg-risk/10 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Delete Patient"
                                                            >
                                                                {deleting === patient.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="w-4 h-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                    </TabsContent>

                    {/* Pharmacists Tab */}
                    <TabsContent value="pharmacists">
                        <Panel title="Pharmacists" subtitle="Manage pharmacy staff">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-border">
                                        <tr className="text-left">
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Name</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Email</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Qualification</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground">Experience</th>
                                            <th className="pb-3 font-semibold text-sm text-muted-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pharmacists.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Users className="w-8 h-8 opacity-20" />
                                                        <p>No pharmacists found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            pharmacists.map((pharma) => (
                                                <tr key={pharma.id} className="border-b border-border/40 hover:bg-secondary/10 transition-colors group">
                                                    <td className="py-4 font-medium">{pharma.fullName || "N/A"}</td>
                                                    <td className="py-4 text-sm text-muted-foreground">{pharma.email}</td>
                                                    <td className="py-4 text-sm text-muted-foreground">{pharma.qualification || "N/A"}</td>
                                                    <td className="py-4 text-sm text-muted-foreground">{pharma.yearsExperience ? `${pharma.yearsExperience} yrs` : "N/A"}</td>
                                                    <td className="py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit("pharmacist" as any, pharma)} // Simplified for now
                                                                className="text-primary hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Edit Pharmacist"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete("pharmacist" as any, pharma.id, pharma.fullName)}
                                                                disabled={deleting === pharma.id}
                                                                className="text-risk hover:text-risk hover:bg-risk/10 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Delete Pharmacist"
                                                            >
                                                                {deleting === pharma.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="w-4 h-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                    </TabsContent>
                </Tabs>

                {/* Warning Notice */}
                <Panel
                    variant="attention"
                    title="Caution: User Deletion"
                    subtitle="Important information regarding the deletion process"
                >
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-attention mt-0.5" />
                        <p className="text-sm text-attention-foreground/80 leading-relaxed">
                            Deleted users will be marked as inactive and hidden from all lists. Their historical data (appointments, prescriptions, documents) will be preserved for audit purposes. This ensures clinical records remain intact while removing the user's access to the system.
                        </p>
                    </div>
                </Panel>

                <UserEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setUserToEdit(null);
                        setEditType(null);
                    }}
                    user={userToEdit}
                    type={editType}
                    onSuccess={fetchUsers}
                />
            </div>
        </AppLayout>
    );
}
