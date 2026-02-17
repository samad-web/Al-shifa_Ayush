import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/hooks/useAuth";
import { Send, User, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
    };
}

interface ChatWindowProps {
    conversationId: string;
    className?: string;
    header?: React.ReactNode;
}

export function ChatWindow({ conversationId, className, header }: ChatWindowProps) {
    const { t } = useTranslation();
    const { socket } = useWebSocket();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (conversationId) {
            fetchMessages(conversationId);
            socket?.emit('join_conversation', conversationId);
        }
    }, [conversationId, socket]);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message: Message) => {
            if (message.conversationId === conversationId) {
                setMessages((prev) => [...prev, message]);
            }
        };

        socket.on('new_message', handleNewMessage);

        return () => {
            socket.off('new_message', handleNewMessage);
        };
    }, [socket, conversationId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const fetchMessages = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            console.log("[ChatWindow] Fetching messages for:", id);
            const res = await fetch(`${API_BASE_URL}/api/chat/messages/${id}`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error("[ChatWindow] Failed to fetch messages:", res.status, errData);
                setError(errData.error || "Failed to load messages");
            }
        } catch (err) {
            console.error("[ChatWindow] Network error:", err);
            setError("Connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim() || !conversationId || !socket) return;

        socket.emit('send_message', {
            conversationId,
            content: newMessage
        });
        setNewMessage("");
    };

    return (
        <div className={cn("flex flex-col h-full bg-background overflow-hidden", className)}>
            {header}

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 translate-z-0">
                {loading && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground animate-pulse">
                        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest">Securing Connection...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                        <div className="p-3 bg-attention/10 rounded-full">
                            <Activity className="w-6 h-6 text-attention" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-attention">Restricted Access or Network Issue</p>
                            <p className="text-xs text-muted-foreground">{error}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fetchMessages(conversationId)}>Retry Connection</Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg, idx) => {
                            const isMe = msg.senderId === user?.id;
                            const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;

                            return (
                                <div key={msg.id} className={cn(
                                    "flex items-end gap-2 max-w-[85%]",
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
                                        "p-3 rounded-2xl shadow-sm relative group max-w-full overflow-hidden break-words",
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
                )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-card/30 border-t shrink-0">
                <div className="flex items-end gap-2">
                    <div className="flex-1 bg-background border rounded-2xl p-1 shadow-inner focus-within:ring-2 ring-primary/20 transition-all">
                        <textarea
                            rows={1}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm p-2.5 resize-none max-h-32 min-h-[40px]"
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
                        className="rounded-xl h-[40px] w-[40px] shadow-lg shrink-0"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
