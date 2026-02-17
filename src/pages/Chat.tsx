import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/hooks/useAuth";
import {
    User,
    Search,
    MoreVertical,
    ChevronLeft,
    Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { AppLayout } from "@/components/layout/app-layout";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

interface Message {
    id: string;
    conversationId: string;
    content: string;
    senderId: string;
    createdAt: string;
    sender: {
        role: string;
        doctor?: { fullName: string };
        patient?: { fullName: string };
        therapist?: { fullName: string };
        pharmacist?: { fullName: string };
    };
}

interface Conversation {
    id: string;
    patient: { fullName: string; userId: string };
    doctor?: { fullName: string; userId: string; profilePhoto?: string };
    therapist?: { fullName: string; userId: string; profilePhoto?: string };
    pharmacist?: { fullName: string; userId: string; profilePhoto?: string };
    messages: Message[];
}

export default function Chat() {
    const { t } = useTranslation();
    const { isConnected, socket } = useWebSocket();
    const { role } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const conversations = await fetchConversations();

            const params = new URLSearchParams(window.location.search);
            const partnerId = params.get('partner');

            if (partnerId && conversations) {
                const existing = conversations.find(c =>
                    c.patient.userId === partnerId ||
                    c.doctor?.userId === partnerId ||
                    c.therapist?.userId === partnerId ||
                    c.pharmacist?.userId === partnerId
                );
                if (existing) {
                    setSelectedConv(existing);
                } else {
                    try {
                        const initRes = await fetch(`${API_BASE_URL}/api/chat/initiate`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                            },
                            body: JSON.stringify({ partnerId })
                        });
                        if (initRes.ok) {
                            const newConv = await initRes.json();
                            // Refresh conversations and select the new one
                            const updatedList = await fetchConversations();
                            if (updatedList) {
                                const found = updatedList.find(c => c.id === newConv.id);
                                if (found) setSelectedConv(found);
                            }
                        }
                    } catch (err) {
                        console.error("Failed to auto-initiate chat:", err);
                    }
                }
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message: Message) => {
            // Update preview in conversation list
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === message.conversationId ? { ...c, messages: [message] } : c
                ).sort((a, b) => {
                    const dateA = a.messages[0]?.createdAt || '';
                    const dateB = b.messages[0]?.createdAt || '';
                    return dateB.localeCompare(dateA);
                })
            );
        };

        socket.on('new_message', handleNewMessage);

        return () => {
            socket.off('new_message', handleNewMessage);
        };
    }, [socket]);

    const fetchConversations = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
                return data;
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
        return null;
    };

    const getPartnerName = (conv: Conversation) => {
        if (role === 'PATIENT') {
            return conv.doctor?.fullName || conv.therapist?.fullName || conv.pharmacist?.fullName || "Medical Professional";
        }
        return conv.patient.fullName || "Patient";
    };

    return (
        <AppLayout>
            <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] bg-background overflow-hidden border-t">
                {/* Sidebar */}
                <div className={cn(
                    "w-full md:w-80 border-r flex flex-col transition-all",
                    selectedConv ? "hidden md:flex" : "flex"
                )}>
                    <div className="p-4 border-b space-y-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl font-bold tracking-tight">{t('chat.title')}</h1>
                            {!isConnected && <span className="text-[10px] text-destructive font-bold animate-pulse uppercase">Offline</span>}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9 bg-secondary/30 border-none rounded-xl" placeholder="Search chats..." />
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        {loading ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Loading chats...</div>
                        ) : conversations.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground italic">No conversations found.</div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {conversations.map((conv) => {
                                    const partnerName = getPartnerName(conv);
                                    const lastMsg = conv.messages[0];
                                    return (
                                        <button
                                            key={conv.id}
                                            onClick={() => setSelectedConv(conv)}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 rounded-2xl transition-all",
                                                selectedConv?.id === conv.id
                                                    ? "bg-primary/10 text-primary shadow-sm"
                                                    : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                                                {(conv.doctor?.profilePhoto || conv.therapist?.profilePhoto || conv.pharmacist?.profilePhoto) && (
                                                    <AvatarImage src={conv.doctor?.profilePhoto || conv.therapist?.profilePhoto || conv.pharmacist?.profilePhoto} />
                                                )}
                                                <AvatarFallback className="bg-primary/5 text-primary">
                                                    <User className="h-6 w-6" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 text-left overflow-hidden">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="font-bold text-sm truncate text-foreground">{partnerName}</span>
                                                    {lastMsg && <span className="text-[10px] opacity-70">{new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                </div>
                                                <p className="text-xs truncate opacity-70">
                                                    {lastMsg ? lastMsg.content : "No messages yet"}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Main Chat Area */}
                <div className={cn(
                    "flex-1 flex flex-col bg-secondary/5 transition-all text-foreground",
                    !selectedConv && "hidden md:flex items-center justify-center p-8 text-center"
                )}>
                    {selectedConv ? (
                        <ChatWindow
                            conversationId={selectedConv.id}
                            header={
                                <div className="h-16 border-b bg-card/50 backdrop-blur-md px-4 flex items-center justify-between z-10 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="md:hidden"
                                            onClick={() => setSelectedConv(null)}
                                        >
                                            <ChevronLeft className="h-6 w-6" />
                                        </Button>
                                        <Avatar className="h-10 w-10">
                                            {(selectedConv.doctor?.profilePhoto || selectedConv.therapist?.profilePhoto || selectedConv.pharmacist?.profilePhoto) && (
                                                <AvatarImage src={selectedConv.doctor?.profilePhoto || selectedConv.therapist?.profilePhoto || selectedConv.pharmacist?.profilePhoto} />
                                            )}
                                            <AvatarFallback><User /></AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h2 className="font-bold text-sm leading-none">{getPartnerName(selectedConv)}</h2>
                                            <span className="text-[10px] text-wellness font-bold">Online</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            }
                        />
                    ) : (
                        <div className="space-y-6">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/5 border border-primary/10">
                                <Activity className="h-12 w-12 text-primary/40" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black tracking-tight">Your Health Connection</h2>
                                <p className="text-muted-foreground max-w-xs mx-auto">
                                    Select a conversation to start chatting securely with your medical team.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
