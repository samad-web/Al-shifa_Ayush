import { useState, useEffect } from "react";
import { ChatWindow } from "./ChatWindow";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

interface ChatWrapperProps {
    patientId: string;
    doctorId: string;
    className?: string;
    header?: React.ReactNode;
}

export function ChatWrapper({ patientId, doctorId, className, header }: ChatWrapperProps) {
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (patientId && doctorId) {
            getOrCreateConversation();
        }
    }, [patientId, doctorId]);

    const getOrCreateConversation = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/conversation`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({ patientId, doctorId })
            });
            if (res.ok) {
                const data = await res.json();
                setConversationId(data.id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Initializing chat...</div>;
    }

    if (!conversationId) {
        return <div className="flex-1 flex items-center justify-center text-xs text-destructive italic">Failed to initialize chat.</div>;
    }

    return <ChatWindow conversationId={conversationId} className={className} header={header} />;
}
