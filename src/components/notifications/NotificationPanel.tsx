import { useNotifications, Notification } from '@/contexts/NotificationContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, CheckCheck, Trash2, Calendar, FileText, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
    onClose?: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'APPOINTMENT_REMINDER':
                return <Calendar className="h-4 w-4 text-primary" />;
            case 'PRESCRIPTION_UPDATE':
                return <FileText className="h-4 w-4 text-wellness" />;
            case 'SYSTEM_ALERT':
                return <AlertCircle className="h-4 w-4 text-attention" />;
            default:
                return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    return (
        <Card className="w-[380px] max-w-[calc(100vw-2rem)] shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                            ({unreadCount} new)
                        </span>
                    )}
                </div>
                <div className="flex gap-1">
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="h-8 text-xs"
                        >
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </div>
            </div>

            <ScrollArea className="h-[400px]">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Bell className="h-12 w-12 text-muted-foreground/20 mb-3" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${!notification.read ? 'bg-primary/5' : ''
                                    }`}
                            >
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h4 className={`text-sm font-medium ${!notification.read ? 'font-semibold' : ''
                                                }`}>
                                                {notification.title}
                                            </h4>
                                            {!notification.read && (
                                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatDistanceToNow(new Date(notification.timestamp), {
                                                addSuffix: true,
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {notifications.length > 0 && (
                <div className="p-3 border-t flex justify-between items-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearNotifications}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear all
                    </Button>
                </div>
            )}
        </Card>
    );
}
