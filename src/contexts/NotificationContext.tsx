import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { useWebSocket } from "./WebSocketContext";

export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    timestamp: Date;
    read: boolean;
    data?: any;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { socket } = useWebSocket();

    // Fetch notifications from backend
    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const res = await fetch(`${API_BASE_URL}/api/notifications?take=50`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications.map((n: any) => ({
                    ...n,
                    timestamp: new Date(n.createdAt),
                    read: n.isRead,
                })));
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    // Fetch unread count
    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.count);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    // Initial fetch on mount
    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, []);

    // Listen to WebSocket notifications
    useEffect(() => {
        if (!socket) return;

        const handleNotification = (notification: any) => {
            console.log('[NotificationContext] Received notification:', notification);

            const newNotif: Notification = {
                ...notification,
                timestamp: new Date(notification.createdAt),
                read: notification.isRead,
                priority: notification.priority || 'INFO',
            };

            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Show toast
            toast.info(notification.title, {
                description: notification.message,
            });
        };

        socket.on('notification', handleNotification);

        return () => {
            socket.off('notification', handleNotification);
        };
    }, [socket]);

    const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
        const newNotification: Notification = {
            ...notification,
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            read: false,
        };

        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        // Show toast notification
        toast.info(notification.title, {
            description: notification.message,
        });
    };

    const markAsRead = async (id: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (token) {
                await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (token) {
                await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const clearNotifications = () => {
        setNotifications([]);
        setUnreadCount(0);
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                addNotification,
                markAsRead,
                markAllAsRead,
                clearNotifications,
                fetchNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotifications must be used within NotificationProvider");
    }
    return context;
}
