import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Activity } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function PatientDetails() {
  const { role } = useAuth();
  const { id } = useParams();
  const [patient, setPatient] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE_URL}/api/user/patient/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
    })
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then(setPatient)
      .catch(() => setError("Failed to load patient details"))
      .finally(() => setLoading(false));
  }, [id]);

  if (role !== "ADMIN" && role !== "ADMIN_DOCTOR") return <div>Access denied.</div>;
  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!patient) return <div>No patient found.</div>;

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Patient Details</h2>
      <div className="mb-2"><b>Full Name:</b> {patient.fullName || "Not provided"}</div>
      <div className="mb-2"><b>Email:</b> {patient.user?.email}</div>
      <div className="mb-2"><b>Phone:</b> {patient.phoneNumber || "Not provided"}</div>
      <div className="mb-2"><b>Patient ID:</b> {patient.id}</div>

      {patient.onboardingData && (
        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h3 className="font-bold text-primary mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Baseline Health Data (Onboarding)
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><b>Gender:</b> {patient.onboardingData.gender}</div>
            <div><b>Pain Level:</b> {patient.onboardingData.painLevel}/10</div>
            <div><b>Sleep Schedule:</b> {patient.onboardingData.sleepBedtime} - {patient.onboardingData.sleepWakeTime}</div>
            <div><b>Sleep Duration:</b> {patient.onboardingData.sleepDuration} hours</div>
            <div className="col-span-2">
              <b>Pain Locations:</b> {patient.onboardingData.painLocations?.join(', ') || "None reported"}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 mb-2"><b>Appointments:</b></div>
      <ul className="list-disc ml-6">
        {patient.appointments.map((appt: any) => (
          <li key={appt.id}>
            Doctor: {appt.doctor?.user?.email || appt.doctorId} | Date: {new Date(appt.date).toLocaleString()} | Status: {appt.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
