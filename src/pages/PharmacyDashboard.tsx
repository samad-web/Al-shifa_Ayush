
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import {
    Package,
    PlusCircle,
    History,
    AlertTriangle,
    TrendingUp,
    Search,
    ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PharmacyDashboard() {
    const [stats, setStats] = useState({
        totalMedicines: 0,
        lowStock: 0,
        dispensedToday: 0,
        revenueToday: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            const token = localStorage.getItem("accessToken");
            const headers = { Authorization: `Bearer ${token}` };

            try {
                // Fetch medicines to calculate total and low stock
                const res = await fetch("/api/pharmacy/medicines", {
                    credentials: "include",
                    headers
                });
                if (res.ok) {
                    const medicines = await res.json();
                    if (Array.isArray(medicines)) {
                        const lowStock = medicines.filter((m: any) => m.totalStock <= 10).length;

                        setStats(prev => ({
                            ...prev,
                            totalMedicines: medicines.length,
                            lowStock
                        }));
                    }
                }

                // Fetch dispenses for today
                const dispRes = await fetch("/api/pharmacy/dispenses", {
                    credentials: "include",
                    headers
                });
                if (dispRes.ok) {
                    const dispenses = await dispRes.json();
                    if (Array.isArray(dispenses)) {
                        const today = new Date().toISOString().split('T')[0];
                        const todayDispenses = dispenses.filter((d: any) => d.createdAt.startsWith(today));

                        setStats(prev => ({
                            ...prev,
                            dispensedToday: todayDispenses.length,
                            revenueToday: todayDispenses.reduce((sum: number, d: any) => sum + d.totalAmount, 0)
                        }));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch pharmacy stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    return (
        <AppLayout>
            <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
                <PageHeader
                    title="Pharmacy Dashboard"
                    subtitle="Manage inventory, dispensing, and sales"
                />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Panel title="Total Medicines" subtitle="All registered drugs">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-primary/10">
                                <Package className="w-6 h-6 text-primary" />
                            </div>
                            <div className="text-3xl font-bold text-foreground">{stats.totalMedicines}</div>
                        </div>
                    </Panel>

                    <Panel title="Low Stock" subtitle="Items needing restock">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-risk/10">
                                <AlertTriangle className="w-6 h-6 text-risk" />
                            </div>
                            <div className="text-3xl font-bold text-foreground">{stats.lowStock}</div>
                        </div>
                    </Panel>

                    <Panel title="Dispensed Today" subtitle="Completed orders">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-wellness/10">
                                <ShoppingCart className="w-6 h-6 text-wellness" />
                            </div>
                            <div className="text-3xl font-bold text-foreground">{stats.dispensedToday}</div>
                        </div>
                    </Panel>

                    <Panel title="Revenue Today" subtitle="Total pharmacy sales">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-accent/10">
                                <TrendingUp className="w-6 h-6 text-accent" />
                            </div>
                            <div className="text-3xl font-bold text-foreground">₹{stats.revenueToday}</div>
                        </div>
                    </Panel>
                </div>

                {/* Quick Actions */}
                <Panel title="Pharmacy Operations" subtitle="Quick access to pharmacy modules">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Link
                            to="/pharmacy/inventory"
                            className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg shadow hover:shadow-lg transition font-semibold"
                        >
                            <Package className="w-5 h-5" />
                            Inventory Management
                        </Link>
                        <Link
                            to="/pharmacy/dispense"
                            className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-wellness to-wellness/80 text-wellness-foreground rounded-lg shadow hover:shadow-lg transition font-semibold"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            Dispense Medicines
                        </Link>
                        <Link
                            to="/pharmacy/history"
                            className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-secondary to-secondary/80 text-foreground rounded-lg shadow hover:shadow-lg transition font-semibold border"
                        >
                            <History className="w-5 h-5" />
                            Dispensing History
                        </Link>
                        <Link
                            to="/pharmacy/orders"
                            className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg shadow hover:shadow-lg transition font-semibold"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            Manage Medicine Orders
                        </Link>
                    </div>
                </Panel>

                {/* Low Stock Alert Table */}
                {stats.lowStock > 0 && (
                    <Panel title="Critical Stock Alerts" subtitle="Medicines that are below the minimum threshold">
                        <div className="text-sm text-risk font-medium mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Attention! {stats.lowStock} items require immediate restocked.
                        </div>
                        <div className="flex justify-end">
                            <Button asChild variant="outline" size="sm">
                                <Link to="/pharmacy/inventory">View Inventory</Link>
                            </Button>
                        </div>
                    </Panel>
                )}
            </div>
        </AppLayout>
    );
}
