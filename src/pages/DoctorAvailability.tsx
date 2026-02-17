
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
    doctorId: string;
    date?: string;
    dayOfWeek?: number;
    startTime: string;
    endTime: string;
    reason?: string;
}

export default function DoctorAvailability() {
    const { role, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    // Form State
    const [activeTab, setActiveTab] = useState("single");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [reason, setReason] = useState("");
    const [recurringDay, setRecurringDay] = useState<string>("0");

    useEffect(() => {
        fetchDoctors();
    }, []);

    useEffect(() => {
        if (role === 'DOCTOR' && profile?.doctor?.id) {
            setSelectedDoctorId(profile.doctor.id);
        }
    }, [role, profile]);

    useEffect(() => {
        if (selectedDoctorId) {
            fetchBlockedSlots(selectedDoctorId);
        }
    }, [selectedDoctorId]);

    const fetchDoctors = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/user/list-doctors`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                const data = await res.json();
                setDoctors(data);
                // If admin and no doctor selected, select first
                if ((role === 'ADMIN' || role === 'ADMIN_DOCTOR') && !selectedDoctorId && data.length > 0) {
                    // Don't auto-select to avoid confusion, let user select
                }
            }
        } catch (error) {
            console.error("Failed to fetch doctors", error);
        }
    };

    const fetchBlockedSlots = async (docId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/availability/${docId}`, {
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
        if (!selectedDoctorId) {
            toast.error("Please select a doctor");
            return;
        }

        const payload: any = {
            doctorId: selectedDoctorId,
            startTime,
            endTime,
            reason
        };

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

            if (res.ok) {
                toast.success("Availability blocked successfully");
                fetchBlockedSlots(selectedDoctorId);
                setReason("");
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to block slot");
            }
        } catch (error) {
            toast.error("Failed to save block");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/availability/block/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
            });
            if (res.ok) {
                toast.success("Block removed");
                setBlockedSlots(prev => prev.filter(b => b.id !== id));
            }
        } catch (error) {
            toast.error("Failed to remove block");
        }
    };

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    return (
        <AppLayout>
            <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
                <PageHeader
                    title="Doctor Availability"
                    subtitle="Manage blocked dates and time slots"
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
                                    <Label>Select Doctor</Label>
                                    <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose doctor..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {doctors.map(d => (
                                                <SelectItem key={d.id} value={d.id}>{d.fullName || d.user?.email}</SelectItem>
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

                            <Button className="w-full gap-2" onClick={handleBlock} disabled={!selectedDoctorId || loading}>
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
                                {selectedDoctorId
                                    ? `Managing availability for ${doctors.find(d => d.id === selectedDoctorId)?.fullName || 'Selected Doctor'}`
                                    : 'Select a doctor to view blocks'}
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
