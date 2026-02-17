import { useState, useEffect } from "react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { ShoppingCart, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MedicineOrderFormProps {
    patientId: string;
    onOrderPlaced?: () => void;
}

export function MedicineOrderForm({ patientId, onOrderPlaced }: MedicineOrderFormProps) {
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedItems, setSelectedItems] = useState<{ medicineId: string, quantity: number, name: string }[]>([]);
    const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT' | 'CRITICAL'>('NORMAL');
    const [notes, setNotes] = useState("");

    useEffect(() => {
        async function fetchPrescriptions() {
            try {
                const res = await fetch(`/api/prescription/patient/${patientId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPrescriptions(data);
                }
            } catch (err) {
                console.error("Failed to fetch prescriptions", err);
            } finally {
                setLoading(false);
            }
        }
        fetchPrescriptions();
    }, [patientId]);

    const handleToggleItem = (med: any) => {
        // Try to find if this medicine is already in selectedItems
        // medicationName might not be a direct link to ID unless we parsed it
        // But for now we use the medicationName to find the medicine in inventory
        // (This is a simplified approach, real system should have valid IDs)

        const existingIndex = selectedItems.findIndex(i => i.name === med.medicationName);
        if (existingIndex > -1) {
            setSelectedItems(selectedItems.filter((_, i) => i !== existingIndex));
        } else {
            // We need the medicineId. The Prescription might have it now after my schema update
            if (med.medicineId) {
                setSelectedItems([...selectedItems, { medicineId: med.medicineId, quantity: 1, name: med.medicationName }]);
            } else {
                toast.error(`Medicine "${med.medicationName}" is not linked to inventory.`);
            }
        }
    };

    const handleUpdateQuantity = (index: number, q: number) => {
        const newItems = [...selectedItems];
        newItems[index].quantity = Math.max(1, q);
        setSelectedItems(newItems);
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            toast.error("Please select at least one medicine.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/pharmacy/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({
                    patientId,
                    items: selectedItems.map(({ medicineId, quantity }) => ({ medicineId, quantity })),
                    urgency,
                    notes
                })
            });

            if (res.ok) {
                toast.success("Medicine order placed successfully!");
                setSelectedItems([]);
                setNotes("");
                if (onOrderPlaced) onOrderPlaced();
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to place order.");
            }
        } catch (err) {
            toast.error("An error occurred.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;

    return (
        <Panel title="Order Medicines" subtitle="Place a pharmacy order for this patient">
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-sm font-medium">Select from Prescriptions</label>
                    <div className="grid grid-cols-1 gap-2">
                        {prescriptions.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No active prescriptions found.</p>
                        ) : prescriptions.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => handleToggleItem(p)}
                                className={`p-3 border rounded-lg cursor-pointer transition flex justify-between items-center ${selectedItems.some(i => i.name === p.medicationName)
                                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                                        : "hover:bg-accent"
                                    }`}
                            >
                                <div>
                                    <div className="font-medium">{p.medicationName}</div>
                                    <div className="text-xs text-muted-foreground">{p.dosage} | {p.frequency}</div>
                                </div>
                                {selectedItems.some(i => i.name === p.medicationName) && (
                                    <div className="text-primary"><ShoppingCart className="w-4 h-4" /></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {selectedItems.length > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                        <label className="text-sm font-medium">Order Details</label>
                        {selectedItems.map((item, idx) => (
                            <div key={item.medicineId} className="flex items-center justify-between gap-4">
                                <span className="text-sm truncate flex-1">{item.name}</span>
                                <div className="flex items-center gap-2">
                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}>-</Button>
                                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}>+</Button>
                                </div>
                            </div>
                        ))}

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Urgency</label>
                                <select
                                    className="w-full p-2 text-sm border rounded bg-background"
                                    value={urgency}
                                    onChange={(e: any) => setUrgency(e.target.value)}
                                >
                                    <option value="NORMAL">Normal</option>
                                    <option value="URGENT">Urgent</option>
                                    <option value="CRITICAL">Critical</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium">Notes (Optional)</label>
                            <textarea
                                className="w-full p-2 text-sm border rounded bg-background h-20 resize-none"
                                placeholder="Instructions for the pharmacy..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                            Place Order
                        </Button>
                    </div>
                )}
            </div>
        </Panel>
    );
}
