import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';

interface WebSocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const token = localStorage.getItem('accessToken');

        // Only connect if user is authenticated
        if (!token || !user) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        console.log('[WebSocket] Connecting to server...');

        const newSocket = io(API_BASE_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('[WebSocket] Connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('[WebSocket] Disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('[WebSocket] Connection error:', error);
            setIsConnected(false);
        });

        setSocket(newSocket);

        return () => {
            console.log('[WebSocket] Cleaning up connection');
            newSocket.disconnect();
        };
    }, [user]);

    return (
        <WebSocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket must be used within WebSocketProvider');
    }
    return context;
}
