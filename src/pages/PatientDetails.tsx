import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

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
      <div className="mb-2"><b>Appointments:</b></div>
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
