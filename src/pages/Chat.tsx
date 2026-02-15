import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/hooks/useAuth";
import {
    Send,
    User,
    Search,
    MoreVertical,
    Phone,
    Video,
    ChevronLeft,
    Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
    };
}

interface Conversation {
    id: string;
    patient: { fullName: string; userId: string };
    doctor: { fullName: string; userId: string; profilePhoto?: string };
    messages: Message[];
}

export default function Chat() {
    const { t } = useTranslation();
    const { socket, isConnected } = useWebSocket();
    const { user, role } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (selectedConv) {
            fetchMessages(selectedConv.id);
            socket?.emit('join_conversation', selectedConv.id);
        }
    }, [selectedConv]);

    useEffect(() => {
        if (!socket) return;

        socket.on('new_message', (message: Message) => {
            if (message.conversationId === selectedConv?.id) {
                setMessages((prev) => [...prev, message]);
            }
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
        });

        return () => {
            socket.off('new_message');
        };
    }, [socket, selectedConv]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const fetchConversations = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (convId: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/messages/${convId}`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim() || !selectedConv || !socket) return;

        socket.emit('send_message', {
            conversationId: selectedConv.id,
            content: newMessage
        });
        setNewMessage("");
    };

    const getPartnerName = (conv: Conversation) => {
        if (role === 'PATIENT') return conv.doctor.fullName;
        return conv.patient.fullName;
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden border-t">
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
                                        {conv.doctor.profilePhoto && <AvatarImage src={conv.doctor.profilePhoto} />}
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
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className={cn(
                "flex-1 flex flex-col bg-secondary/5 transition-all text-foreground",
                !selectedConv && "hidden md:flex items-center justify-center p-8 text-center"
            )}>
                {selectedConv ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b bg-card/50 backdrop-blur-md px-4 flex items-center justify-between z-10">
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
                                    {selectedConv.doctor.profilePhoto && <AvatarImage src={selectedConv.doctor.profilePhoto} />}
                                    <AvatarFallback><User /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="font-bold text-sm leading-none">{getPartnerName(selectedConv)}</h2>
                                    <span className="text-[10px] text-wellness font-bold">Online</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="text-muted-foreground"><Phone className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-muted-foreground"><Video className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-4 lg:p-6 translate-z-0">
                            <div className="space-y-4">
                                {messages.map((msg, idx) => {
                                    const isMe = msg.senderId === user?.id;
                                    const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;

                                    return (
                                        <div key={msg.id} className={cn(
                                            "flex items-end gap-2 max-w-[85%] lg:max-w-[70%]",
                                            isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                                        )}>
                                            {!isMe && (
                                                <div className="w-8 h-8 flex-shrink-0">
                                                    {showAvatar && (
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="text-[10px]"><User className="h-3 w-3" /></AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                </div>
                                            )}
                                            <div className={cn(
                                                "p-3 rounded-2xl shadow-sm relative group",
                                                isMe
                                                    ? "bg-primary text-primary-foreground rounded-br-none"
                                                    : "bg-card text-foreground rounded-bl-none border border-border/50"
                                            )}>
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                                <span className={cn(
                                                    "text-[9px] mt-1 block opacity-50",
                                                    isMe ? "text-right" : "text-left"
                                                )}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-4 bg-card/30 border-t">
                            <div className="max-w-4xl mx-auto flex items-end gap-3">
                                <div className="flex-1 bg-background border rounded-2xl p-1 shadow-inner focus-within:ring-2 ring-primary/20 transition-all">
                                    <textarea
                                        rows={1}
                                        className="w-full bg-transparent border-none focus:ring-0 text-sm p-3 resize-none max-h-32 min-h-[44px]"
                                        placeholder={t('chat.placeholder')}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    className="rounded-xl h-[44px] w-[44px] shadow-lg shrink-0"
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim()}
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </>
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
    );
}
