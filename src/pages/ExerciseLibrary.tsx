import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { Play, Clock, User, MessageSquare, PlayCircle } from "lucide-react";
import { Button } from "@/components/common/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function ExerciseLibrary() {
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState<any>(null);

    useEffect(() => {
        fetchPrescriptions();
    }, []);

    const fetchPrescriptions = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/wellness/my-prescriptions`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            if (res.ok) {
                const data = await res.json();
                setPrescriptions(data);
                if (data.length > 0) setSelectedVideo(data[0]);
            }
        } catch (error) {
            console.error("Failed to fetch prescriptions:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
                <PageHeader
                    title="Prescribed Exercises"
                    subtitle="Follow these guided sessions as recommended by your clinical team."
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Video Player Section */}
                    <div className="lg:col-span-2 space-y-4">
                        {loading ? (
                            <Skeleton className="w-full aspect-video rounded-3xl" />
                        ) : selectedVideo ? (
                            <div className="space-y-6">
                                <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative group">
                                    <iframe
                                        className="w-full h-full"
                                        src={selectedVideo.video.videoUrl.replace("watch?v=", "embed/")}
                                        title={selectedVideo.video.title}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-black">{selectedVideo.video.title}</h2>
                                        <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 px-3 py-1">
                                            {selectedVideo.video.category}
                                        </Badge>
                                    </div>
                                    <Panel title="Session Notes" className="bg-secondary/20 border-border/50">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-background rounded-2xl">
                                                <MessageSquare className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Clinical Notes</p>
                                                <p className="text-sm font-medium leading-relaxed">
                                                    {selectedVideo.notes || "No additional notes provided for this session."}
                                                </p>
                                            </div>
                                        </div>
                                    </Panel>
                                </div>
                            </div>
                        ) : (
                            <Panel title="No Exercises" className="flex flex-col items-center justify-center h-96 text-center space-y-4">
                                <div className="p-6 bg-muted rounded-full">
                                    <PlayCircle className="w-12 h-12 text-muted-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold">No prescriptions found</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto">
                                        Contact your doctor or therapist to have specific exercise sessions assigned to your profile.
                                    </p>
                                </div>
                            </Panel>
                        )}
                    </div>

                    {/* Video Playlist Section */}
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Your Session List</h3>
                        <div className="space-y-3">
                            {loading ? (
                                [1, 2, 3].map((n) => <Skeleton key={n} className="h-24 w-full rounded-2xl" />)
                            ) : (
                                prescriptions.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedVideo(p)}
                                        className={cn(
                                            "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group",
                                            selectedVideo?.id === p.id
                                                ? "bg-primary/5 border-primary shadow-sm"
                                                : "bg-card border-transparent hover:border-muted shadow-sm"
                                        )}
                                    >
                                        <div className="relative w-20 aspect-video bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Play className={cn(
                                                    "w-6 h-6 transition-transform group-hover:scale-110",
                                                    selectedVideo?.id === p.id ? "text-primary fill-primary" : "text-muted-foreground"
                                                )} />
                                            </div>
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <h4 className="font-bold text-sm truncate">{p.video.title}</h4>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {p.doctor?.fullName || p.therapist?.fullName || "Clinical Team"}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
