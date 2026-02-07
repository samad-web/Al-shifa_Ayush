import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Search, Plus, Trash2, ShoppingCart, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PharmacyDispense() {
    const [patients, setPatients] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState("");
    const [patientSearch, setPatientSearch] = useState("");
    const [cart, setCart] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch patients
        fetch("/api/user/list-patients", { headers })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setPatients(data);
                else {
                    console.error("Patients data is not an array:", data);
                    setPatients([]);
                }
            })
            .catch(err => toast.error("Failed to load patients"));

        // Fetch medicines
        fetch("/api/pharmacy/medicines", {
            headers,
            credentials: "include"
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setMedicines(data);
                else {
                    console.error("Medicines data is not an array:", data);
                    setMedicines([]);
                }
            })
            .catch(err => toast.error("Failed to load medicines"));
    }, []);

    const filteredPatients = patients.filter((p: any) => {
        const q = patientSearch.toLowerCase();
        return (p.fullName?.toLowerCase() || "").includes(q) ||
            (p.phoneNumber || "").includes(q);
    });

    const addToCart = (medicine: any) => {
        // Basic stock check
        if (medicine.totalStock <= 0) {
            toast.error("Medicine is out of stock!");
            return;
        }

        const existing = cart.find(item => item.medicineId === medicine.id);
        if (existing) {
            if (existing.quantity + 1 > medicine.totalStock) {
                toast.error("Insufficient stock!");
                return;
            }
            setCart(cart.map(item =>
                item.medicineId === medicine.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                medicineId: medicine.id,
                name: medicine.name,
                price: medicine.price,
                quantity: 1,
                stockId: medicine.stocks[0]?.id // Simplified: pick first batch
            }]);
        }
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(item => item.medicineId !== id));
    };

    const handleDispense = async () => {
        if (!selectedPatientId || cart.length === 0) return;

        setSubmitting(true);
        try {
            const token = localStorage.getItem("accessToken");
            const res = await fetch("/api/pharmacy/dispense", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                credentials: "include",
                body: JSON.stringify({
                    patientId: selectedPatientId,
                    items: cart
                })
            });

            if (res.ok) {
                setSuccess(true);
                setCart([]);
                setSelectedPatientId("");
                toast.success("Medicines dispensed successfully!");
                setTimeout(() => setSuccess(false), 3000);
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to dispense medicines");
            }
        } catch (error) {
            toast.error("A network error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <AppLayout>
            <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
                <PageHeader
                    title="Dispense Medicines"
                    subtitle="Record medicine sales and deduct inventory"
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Patient & Medicine Selection */}
                    <div className="lg:col-span-2 space-y-6">
                        <Panel title="Step 1: Select Patient" subtitle="Identify the patient receiving medications">
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search patient by name or phone..."
                                        className="pl-10"
                                        value={patientSearch}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                    />
                                </div>
                                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select patient..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredPatients.map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.fullName || "Unnamed Patient"} ({p.phoneNumber || "No phone"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </Panel>

                        <Panel title="Step 2: Add Medicines" subtitle="Search and add drugs to the dispense list">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {medicines.map((med: any) => (
                                    <div key={med.id} className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-all flex justify-between items-center group">
                                        <div>
                                            <div className="font-bold">{med.name}</div>
                                            <div className="text-xs text-muted-foreground">{med.brand} • ₹{med.price}</div>
                                            <div className={cn(
                                                "text-[10px] font-bold mt-1",
                                                med.totalStock <= 0 ? "text-risk" : "text-wellness"
                                            )}>
                                                Stock: {med.totalStock}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => addToCart(med)}
                                            disabled={med.totalStock <= 0}
                                            variant="outline"
                                            className="group-hover:bg-primary group-hover:text-primary-foreground"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    </div>

                    {/* Right: Cart & Action */}
                    <div className="space-y-6">
                        <Panel title="Dispense List" className="sticky top-24">
                            <div className="space-y-4 min-h-[300px] flex flex-col">
                                <div className="flex-grow">
                                    {cart.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground italic space-y-2">
                                            <ShoppingCart className="w-8 h-8 mx-auto opacity-20" />
                                            <p>Your dispense list is empty</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {cart.map((item) => (
                                                <div key={item.medicineId} className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
                                                    <div>
                                                        <div className="text-sm font-bold">{item.name}</div>
                                                        <div className="text-xs text-muted-foreground">{item.quantity} x ₹{item.price}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm">₹{item.price * item.quantity}</span>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-risk" onClick={() => removeFromCart(item.medicineId)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t space-y-4">
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span>Total Amount</span>
                                        <span className="text-accent">₹{totalAmount}</span>
                                    </div>

                                    {success && (
                                        <div className="p-3 rounded-lg bg-wellness/10 text-wellness text-xs font-bold flex items-center gap-2 animate-fade-in">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Dispensed successfully!
                                        </div>
                                    )}

                                    <Button
                                        className="w-full h-12 text-lg font-bold rounded-xl shadow-lg"
                                        disabled={!selectedPatientId || cart.length === 0 || submitting}
                                        onClick={handleDispense}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            "Confirm Dispense"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </Panel>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
