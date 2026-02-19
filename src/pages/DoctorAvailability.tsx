
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Plus, Trash2, CalendarX, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface BlockedSlot {
    id: string;
    doctorId: string | null;
    therapistId: string | null;
    date?: string;
    dayOfWeek?: number;
    startTime: string;
    endTime: string;
    reason?: string;
}

export default function DoctorAvailability() {
    const { role, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [clinicians, setClinicians] = useState<any[]>([]);
    const [selectedClinicianId, setSelectedClinicianId] = useState<string>("");
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    // Form State
    const [activeTab, setActiveTab] = useState("single");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [reason, setReason] = useState("");
    const [recurringDay, setRecurringDay] = useState<string>("1");

    useEffect(() => {
        if (role === 'ADMIN' || role === 'ADMIN_DOCTOR') {
            fetchClinicians();
        } else if (role === 'DOCTOR' && profile?.doctor?.id) {
            setSelectedClinicianId(profile.doctor.id);
        } else if (role === 'THERAPIST' && profile?.therapist?.id) {
            setSelectedClinicianId(profile.therapist.id);
        }
    }, [role, profile]);

    useEffect(() => {
        if (selectedClinicianId) {
            fetchBlockedSlots(selectedClinicianId);
        }
    }, [selectedClinicianId]);

    const fetchClinicians = async () => {
        try {
            const [docsRes, thersRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/user/list-doctors`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
                }),
                fetch(`${API_BASE_URL}/api/user/list-therapists`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
                })
            ]);

            const docs = docsRes.ok ? await docsRes.json() : [];
            const thers = thersRes.ok ? await thersRes.json() : [];

            setClinicians([
                ...docs.map((d: any) => ({ ...d, type: 'Doctor' })),
                ...thers.map((t: any) => ({ ...t, type: 'Therapist' }))
            ]);
        } catch (error) {
            console.error("Failed to fetch clinicians", error);
        }
    };

    const fetchBlockedSlots = async (clinicianId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/availability/${clinicianId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                setBlockedSlots(await res.json());
            }
        } catch (error) {
            toast.error("Failed to fetch availability");
        } finally {
            setLoading(false);
        }
    };

    const handleBlock = async () => {
        if (!selectedClinicianId) {
            toast.error("Please select a professional");
            return;
        }

        const isAdmin = ['ADMIN', 'ADMIN_DOCTOR'].includes(role || '');
        const payload: any = {
            startTime,
            endTime,
            reason
        };

        // Determine if we are blocking for a doctor or therapist
        if (role === 'DOCTOR') {
            payload.doctorId = selectedClinicianId;
        } else if (role === 'THERAPIST') {
            payload.therapistId = selectedClinicianId;
        } else if (isAdmin) {
            const clinician = clinicians.find(c => c.id === selectedClinicianId);
            if (clinician?.user?.role === 'THERAPIST' || clinician?.type === 'Therapist') {
                payload.therapistId = selectedClinicianId;
            } else {
                payload.doctorId = selectedClinicianId;
            }
        }

        if (activeTab === 'single') {
            if (!selectedDate) {
                toast.error("Please select a date");
                return;
            }
            payload.date = selectedDate.toISOString();
        } else {
            payload.dayOfWeek = parseInt(recurringDay);
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/availability/block`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Availability blocked successfully");
                fetchBlockedSlots(selectedClinicianId);
                setReason("");
            } else {
                toast.error(data.message || data.error || "Failed to block slot");
            }
        } catch (error) {
            toast.error("Failed to save block");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/availability/block/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
            });
            if (res.ok) {
                toast.success("Block removed");
                setBlockedSlots(prev => prev.filter(b => b.id !== id));
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to remove block");
            }
        } catch (error) {
            toast.error("Failed to remove block");
        } finally {
            setLoading(false);
        }
    };

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    return (
        <AppLayout>
            <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
                <PageHeader
                    title="Availability Management"
                    subtitle="Manage blocked dates and time slots for Doctors & Therapists"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar / Controls */}
                    <Card className="md:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle>Configuration</CardTitle>
                            <CardDescription>Set availability rules</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {(role === 'ADMIN' || role === 'ADMIN_DOCTOR') && (
                                <div className="space-y-2">
                                    <Label>Select Professional</Label>
                                    <Select value={selectedClinicianId} onValueChange={setSelectedClinicianId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose professional..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clinicians.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.fullName || c.user?.email} ({c.type})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="single">Single Date</TabsTrigger>
                                    <TabsTrigger value="recurring">Recurring</TabsTrigger>
                                </TabsList>

                                <TabsContent value="single" className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label>Date</Label>
                                        <div className="border rounded-md p-2 flex justify-center">
                                            <Calendar
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={setSelectedDate}
                                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="recurring" className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label>Day of Week</Label>
                                        <Select value={recurringDay} onValueChange={setRecurringDay}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {days.map((day, idx) => (
                                                    <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label>Start Time</Label>
                                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Time</Label>
                                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Reason (Optional)</Label>
                                <Input
                                    placeholder="e.g., Leave, Conference"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                />
                            </div>

                            <Button className="w-full gap-2" onClick={handleBlock} disabled={!selectedClinicianId || loading}>
                                <CalendarX className="w-4 h-4" />
                                Block Time
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Main Content / List */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Blocked Slots</CardTitle>
                            <CardDescription>
                                {selectedClinicianId
                                    ? `Managing availability for ${clinicians.find(c => c.id === selectedClinicianId)?.fullName || profile?.fullName || 'Current Account'}`
                                    : 'Select a professional to view blocks'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                            ) : blockedSlots.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No blocked slots found.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {blockedSlots.map(slot => (
                                        <div key={slot.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/5 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-full ${slot.dayOfWeek !== null ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                    {slot.dayOfWeek !== null ? <Clock className="w-4 h-4" /> : <CalendarX className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium">
                                                        {slot.dayOfWeek !== null
                                                            ? `Every ${days[slot.dayOfWeek]}`
                                                            : slot.date ? format(new Date(slot.date), "PPP") : "Unknown Date"}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {slot.startTime} - {slot.endTime} • {slot.reason || "Unavailable"}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(slot.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
