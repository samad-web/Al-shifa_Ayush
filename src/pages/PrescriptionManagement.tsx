import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { MultiplePrescriptionForm } from "@/components/prescription/MultiplePrescriptionForm";
import { PrescriptionList } from "@/components/prescription-list";
import { useAuth } from "@/hooks/useAuth";
import { FilePlus2, User } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function PrescriptionManagement() {
    const { role } = useAuth();
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<string>("");
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

    // Fetch list of patients
    useEffect(() => {
        async function fetchPatients() {
            try {
                const res = await fetch(`/api/user/list-patients`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
                });
                console.log("[PrescriptionManagement] Patients fetch status:", res.status);
                if (res.ok) {
                    const data = await res.json();
                    console.log("[PrescriptionManagement] Patients count:", data.length);
                    setPatients(data);
                }
            } catch (error) {
                console.error("Failed to fetch patients:", error);
            }
        }
        fetchPatients();
    }, []);

    // Fetch prescriptions when patient is selected
    useEffect(() => {
        async function fetchPrescriptions() {
            if (!selectedPatient) {
                setPrescriptions([]);
                return;
            }
            setLoadingPrescriptions(true);
            try {
                const res = await fetch(
                    `/api/prescriptions/patient/${selectedPatient}`,
                    {
                        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
                    }
                );
                if (res.ok) {
                    const data = await res.json();
                    setPrescriptions(data);
                }
            } catch (error) {
                console.error("Failed to fetch prescriptions:", error);
            } finally {
                setLoadingPrescriptions(false);
            }
        }
        fetchPrescriptions();
    }, [selectedPatient]);

    const handlePrescriptionAdded = () => {
        // Refresh prescriptions list
        if (selectedPatient) {
            fetch(`/api/prescriptions/patient/${selectedPatient}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            })
                .then((res) => res.json())
                .then(setPrescriptions)
                .catch(console.error);
        }
    };

    if (!role || !["DOCTOR", "THERAPIST", "ADMIN", "ADMIN_DOCTOR"].includes(role)) {
        return (
            <AppLayout>
                <div className="container max-w-4xl mx-auto px-4 py-8 text-center">
                    <p className="text-muted-foreground">
                        {!role ? "Loading..." : "Access denied. Only medical staff can access this page."}
                    </p>
                </div>
            </AppLayout>
        );
    }

    const selectedPatientData = patients.find((p) => p.id === selectedPatient);

    return (
        <AppLayout>
            <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
                <PageHeader
                    title="Prescription Management"
                    subtitle="Upload, view, and download patient prescriptions"
                />

                {/* Patient Selection */}
                <Panel title="Select Patient" subtitle="Choose a patient to manage their prescriptions">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a patient..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {patients.map((patient) => (
                                        <SelectItem key={patient.id} value={patient.id}>
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                <span>{patient.fullName || patient.email}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedPatient && (
                            <Button onClick={() => setShowModal(true)} className="gap-2">
                                <FilePlus2 className="w-4 h-4" />
                                Add Prescription
                            </Button>
                        )}
                    </div>
                </Panel>

                {/* Add Prescription Form */}
                {selectedPatient && showModal && (
                    <Panel title="New Prescription" subtitle={`Create a structured prescription for ${selectedPatientData?.fullName}`}>
                        <MultiplePrescriptionForm
                            patientId={selectedPatient}
                            patientName={selectedPatientData?.fullName || selectedPatientData?.email}
                            onSuccess={() => {
                                setShowModal(false);
                                handlePrescriptionAdded();
                            }}
                            onCancel={() => setShowModal(false)}
                        />
                    </Panel>
                )}

                {/* Prescriptions Display */}
                {selectedPatient && !showModal && (
                    <Panel
                        title={`Prescriptions for ${selectedPatientData?.fullName || "Patient"}`}
                        subtitle="View and download prescription history"
                    >
                        {loadingPrescriptions ? (
                            <div className="text-center py-12 text-muted-foreground">
                                Loading prescriptions...
                            </div>
                        ) : (
                            <PrescriptionList prescriptions={prescriptions} />
                        )}
                    </Panel>
                )}
            </div>
        </AppLayout>
    );
}
