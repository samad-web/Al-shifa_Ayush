import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Minus,
    Loader2,
    RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface AppointmentRecord {
    id: string;
    date: string;
    patientName: string;
    doctorName: string;
    branchName: string;
    status: string;
    sessionNotes?: string;
}

interface MetaData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    trend: number;
    prevMonthTotal: number;
}

export function MonthlyCompletedAppointments() {
    const [data, setData] = useState<AppointmentRecord[]>([]);
    const [meta, setMeta] = useState<MetaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const limit = 10;

    const fetchData = async (targetPage: number) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports/monthly-completed-appointments?page=${targetPage}&limit=${limit}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
            });
            if (res.ok) {
                const result = await res.json();
                setData(result.data);
                setMeta(result.meta);
            } else {
                toast.error("Failed to fetch monthly report");
            }
        } catch (error) {
            console.error("Error fetching report:", error);
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(page);
    }, [page]);

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        };
    };

    if (loading && !data.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium italic">Calculating monthly clinical data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-primary/5 border-primary/20 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Monthly Completed</p>
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-foreground">{meta?.total || 0}</h3>
                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Sessions</span>
                    </div>
                </Card>

                <Card className="p-6 bg-wellness/5 border-wellness/20 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-wellness uppercase tracking-widest">Trend vs Prev Month</p>
                        {meta && meta.trend > 0 ? <TrendingUp className="w-4 h-4 text-wellness" /> :
                            meta && meta.trend < 0 ? <TrendingDown className="w-4 h-4 text-risk" /> :
                                <Minus className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className={cn(
                            "text-3xl font-black",
                            meta && meta.trend > 0 ? "text-wellness" :
                                meta && meta.trend < 0 ? "text-risk" : "text-muted-foreground"
                        )}>
                            {meta?.trend || 0}%
                        </h3>
                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">
                            {meta && meta.trend >= 0 ? "Growth" : "Decrease"}
                        </span>
                    </div>
                </Card>

                <Card className="p-6 bg-background space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current Month</p>
                            <p className="text-sm font-bold text-foreground">
                                {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => fetchData(page)}
                            disabled={loading}
                        >
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Table */}
            <Card className="overflow-hidden border-border/50">
                <Table>
                    <TableHeader className="bg-secondary/20">
                        <TableRow>
                            <TableHead className="font-bold text-foreground">Patient</TableHead>
                            <TableHead className="font-bold text-foreground">Doctor/Therapist</TableHead>
                            <TableHead className="font-bold text-foreground">Branch</TableHead>
                            <TableHead className="font-bold text-foreground">Date & Time</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length > 0 ? (
                            data.map((record) => {
                                const { date, time } = formatDateTime(record.date);
                                return (
                                    <TableRow key={record.id} className="hover:bg-muted/50 transition-colors group">
                                        <TableCell className="font-medium">{record.patientName}</TableCell>
                                        <TableCell className="text-muted-foreground">{record.doctorName}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-background/50 font-medium">
                                                {record.branchName}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground">{date}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">{time}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge className="bg-wellness/10 text-wellness border-wellness/20 hover:bg-wellness/20">
                                                {record.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic">
                                    No completed appointments found for this month yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between pb-4">
                    <p className="text-xs text-muted-foreground">
                        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, meta.total)} of {meta.total} records
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => p - 1)}
                            className="gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Prev
                        </Button>
                        <div className="flex items-center gap-1.5 px-3 bg-secondary/30 rounded-lg text-xs font-bold">
                            {page} / {meta.totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === meta.totalPages || loading}
                            onClick={() => setPage(p => p + 1)}
                            className="gap-2"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
