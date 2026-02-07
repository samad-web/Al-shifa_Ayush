
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { History, Search, Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function PharmacyHistory() {
    const [dispenses, setDispenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        async function fetchHistory() {
            try {
                const res = await fetch("/api/pharmacy/dispenses", { credentials: "include" });
                if (res.ok) {
                    const data = await res.json();
                    setDispenses(data);
                }
            } catch (error) {
                console.error("Failed to fetch pharmacy history:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchHistory();
    }, []);

    const filteredHistory = dispenses.filter(d =>
        d.patient?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.id.includes(searchTerm)
    );

    return (
        <AppLayout>
            <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
                <PageHeader
                    title="Dispensing History"
                    subtitle="View all past medication dispensing records"
                />

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by patient name or ID..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Panel title="All Transactions" subtitle="Sorted by most recent">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b">
                                    <th className="pb-4 pt-2 font-semibold">Date & Time</th>
                                    <th className="pb-4 pt-2 font-semibold">Patient</th>
                                    <th className="pb-4 pt-2 font-semibold">Items</th>
                                    <th className="pb-4 pt-2 font-semibold">Total Amount</th>
                                    <th className="pb-4 pt-2 font-semibold text-right">Dispensed By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-muted-foreground">Loading history...</td>
                                    </tr>
                                ) : filteredHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-muted-foreground">No records found</td>
                                    </tr>
                                ) : (
                                    filteredHistory.map((d) => (
                                        <tr key={d.id} className="hover:bg-secondary/30 transition">
                                            <td className="py-4 text-sm">
                                                {format(new Date(d.createdAt), "MMM dd, yyyy HH:mm")}
                                            </td>
                                            <td className="py-4 font-medium">{d.patient?.fullName || "Unknown"}</td>
                                            <td className="py-4 text-sm text-muted-foreground">
                                                {d.items.map((item: any) => `${item.medicine.name} (x${item.quantity})`).join(", ")}
                                            </td>
                                            <td className="py-4 font-bold text-accent">₹{d.totalAmount}</td>
                                            <td className="py-4 text-right text-xs">
                                                <span className="px-2 py-1 rounded bg-secondary">{d.dispenser?.email}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            </div>
        </AppLayout>
    );
}
