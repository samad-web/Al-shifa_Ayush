import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ClipboardList,
    Clock,
    Truck,
    CheckCircle2,
    AlertCircle,
    User,
    Pill,
    ArrowRight
} from "lucide-react";
import { toast } from "sonner";

export default function PharmacyOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any>({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/pharmacy/orders", {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.orders) {
                    setOrders(data.orders);
                    setPagination(data.pagination);
                } else {
                    setOrders(data);
                }
            }
        } catch (err) {
            console.error("Failed to fetch orders", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const updateStatus = async (orderId: string, status: string) => {
        try {
            const res = await fetch(`/api/pharmacy/orders/${orderId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                toast.success(`Order status updated to ${status}`);
                fetchOrders();
            } else {
                toast.error("Failed to update status");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
            case 'APPROVED': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Approved</Badge>;
            case 'DISPATCHED': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Dispatched</Badge>;
            case 'DELIVERED': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>;
            case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getUrgencyBadge = (urgency: string) => {
        switch (urgency) {
            case 'CRITICAL': return <Badge className="bg-red-600">Critical</Badge>;
            case 'URGENT': return <Badge className="bg-orange-500">Urgent</Badge>;
            default: return <Badge variant="outline">Normal</Badge>;
        }
    };

    return (
        <AppLayout>
            <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
                <PageHeader
                    title="Pharmacy Orders"
                    subtitle="Track and fulfill online-placed medicine orders"
                />

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Clock className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : orders.length === 0 ? (
                    <Panel title="No Orders" subtitle="No active orders found in the system">
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <ClipboardList className="w-12 h-12 mb-4 opacity-20" />
                            <p>There are no medicine orders to process right now.</p>
                        </div>
                    </Panel>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <Panel key={order.id} title={`Order #${order.id.slice(0, 8)}`} className="overflow-hidden">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Order Info */}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-mono text-muted-foreground">#{order.id.slice(0, 8)}</span>
                                                {getUrgencyBadge(order.urgency)}
                                                {getStatusBadge(order.status)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(order.createdAt).toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                                            <div className="space-y-2">
                                                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Patient Information</div>
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-primary" />
                                                    <span className="font-semibold">{order.patient?.fullName || "Aakash"}</span>
                                                </div>
                                                {order.prescription && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Prescribed by {order.prescription.doctor?.fullName || "Staff"}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Medicines ordered</div>
                                                <div className="space-y-1">
                                                    {order.items.map((item: any) => (
                                                        <div key={item.id} className="text-sm flex items-center gap-2">
                                                            <Pill className="w-3 h-3 text-wellness" />
                                                            <span>{item.medicine.name}</span>
                                                            <span className="text-muted-foreground">x {item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {order.notes && (
                                            <div className="bg-accent/50 p-2 rounded text-xs italic border-l-2 border-primary/50">
                                                Note: {order.notes}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Panel */}
                                    <div className="md:w-64 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 flex flex-col justify-between space-y-4">
                                        <div className="text-center">
                                            <div className="text-xs text-muted-foreground uppercase mb-1">Total Amount</div>
                                            <div className="text-2xl font-bold">₹{order.totalAmount}</div>
                                        </div>

                                        <div className="space-y-2">
                                            {order.status === 'PENDING' && (
                                                <Button className="w-full" onClick={() => updateStatus(order.id, 'APPROVED')}>
                                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Order
                                                </Button>
                                            )}
                                            {order.status === 'APPROVED' && (
                                                <Button className="w-full bg-wellness hover:bg-wellness/90" onClick={() => updateStatus(order.id, 'DISPATCHED')}>
                                                    <Truck className="w-4 h-4 mr-2" /> Mark Dispatched
                                                </Button>
                                            )}
                                            {order.status === 'DISPATCHED' && (
                                                <Button className="w-full variant-secondary" onClick={() => updateStatus(order.id, 'DELIVERED')}>
                                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Delivered
                                                </Button>
                                            )}
                                            {(order.status === 'PENDING' || order.status === 'APPROVED') && (
                                                <Button variant="ghost" className="w-full text-risk hover:bg-risk/10" onClick={() => updateStatus(order.id, 'CANCELLED')}>
                                                    <AlertCircle className="w-4 h-4 mr-2" /> Cancel
                                                </Button>
                                            )}
                                            {order.status === 'DELIVERED' && (
                                                <div className="text-center py-2 text-wellness font-semibold flex items-center justify-center gap-2">
                                                    <CheckCircle2 className="w-5 h-5" /> Completed
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Panel>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
