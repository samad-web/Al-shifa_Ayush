import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

export interface Notification {
    id: string;
    type: "appointment_confirmed" | "appointment_rejected" | "appointment_cancelled" | "info";
    title: string;
    message: string;
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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Load notifications from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("notifications");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setNotifications(parsed.map((n: any) => ({
                    ...n,
                    timestamp: new Date(n.timestamp),
                })));
            } catch (e) {
                console.error("Failed to parse stored notifications:", e);
            }
        }
    }, []);

    // Save notifications to localStorage whenever they change
    useEffect(() => {
        if (notifications.length > 0) {
            localStorage.setItem("notifications", JSON.stringify(notifications));
        }
    }, [notifications]);

    const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
        const newNotification: Notification = {
            ...notification,
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            read: false,
        };

        setNotifications((prev) => [newNotification, ...prev]);

        // Show toast notification
        if (notification.type === "appointment_confirmed") {
            toast.success(notification.title, {
                description: notification.message,
            });
        } else if (notification.type === "appointment_rejected") {
            toast.error(notification.title, {
                description: notification.message,
            });
        } else {
            toast.info(notification.title, {
                description: notification.message,
            });
        }
    };

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const clearNotifications = () => {
        setNotifications([]);
        localStorage.removeItem("notifications");
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                addNotification,
                markAsRead,
                markAllAsRead,
                clearNotifications,
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
