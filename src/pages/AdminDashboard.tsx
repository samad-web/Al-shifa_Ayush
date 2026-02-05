
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ doctors: 0, patients: 0 });
  useEffect(() => {
    async function fetchCounts() {
      try {
        const [doctors, patients] = await Promise.all([
          fetch(`${API_BASE_URL}/api/user/list-doctors`, { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/user/list-patients`, { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }).then(r => r.json()),
        ]);
        setCounts({ doctors: doctors.length, patients: patients.length });
      } catch {}
    }
    fetchCounts();
  }, []);
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <div className="mb-4">Welcome, Admin! Use the quick links below to manage users and patients.</div>
        <div className="flex gap-4 mb-6">
          <div className="p-4 bg-gray-100 rounded shadow text-center">
            <div className="text-lg font-semibold">Doctors</div>
            <div className="text-2xl font-bold">{counts.doctors}</div>
          </div>
          <div className="p-4 bg-gray-100 rounded shadow text-center">
            <div className="text-lg font-semibold">Patients</div>
            <div className="text-2xl font-bold">{counts.patients}</div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Link to="/assign-patient" className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-lg shadow hover:from-green-600 hover:to-green-800 text-lg font-semibold transition">
            Assign Patient to Doctor
          </Link>
          <Link to="/doctor-gamification" className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-lg shadow hover:from-purple-600 hover:to-purple-800 text-lg font-semibold transition">
            Doctor Gamification Dashboard
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}