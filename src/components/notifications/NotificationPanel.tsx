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

    const getPriorityStyles = (priority: string) => {
        switch (priority) {
            case 'HIGH':
                return {
                    border: 'border-l-4 border-l-destructive',
                    bg: 'bg-destructive/5',
                    text: 'text-destructive',
                    icon: <AlertCircle className="h-4 w-4 text-destructive" />,
                    badge: 'bg-destructive text-destructive-foreground'
                };
            case 'MEDIUM':
                return {
                    border: 'border-l-4 border-l-amber-500',
                    bg: 'bg-amber-500/5',
                    text: 'text-amber-600',
                    icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
                    badge: 'bg-amber-500 text-white'
                };
            case 'LOW':
                return {
                    border: 'border-l-4 border-l-blue-500',
                    bg: 'bg-blue-500/5',
                    text: 'text-blue-600',
                    icon: <Bell className="h-4 w-4 text-blue-500" />,
                    badge: 'bg-blue-500 text-white'
                };
            default:
                return {
                    border: 'border-l-4 border-l-transparent',
                    bg: '',
                    text: '',
                    icon: <Bell className="h-4 w-4 text-muted-foreground" />,
                    badge: 'bg-muted text-muted-foreground'
                };
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    return (
        <Card className="w-[380px] max-w-[calc(100vw-2rem)] shadow-lg overflow-hidden">
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

            <ScrollArea className="h-[450px]">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Bell className="h-12 w-12 text-muted-foreground/20 mb-3" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {notifications.map((notification) => {
                            const styles = getPriorityStyles(notification.priority);
                            return (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 group relative ${styles.border} ${!notification.read ? styles.bg || 'bg-primary/5' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {styles.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <div className="flex flex-col gap-1">
                                                    <h4 className={`text-sm font-medium leading-none ${!notification.read ? 'font-bold' : ''} ${notification.priority === 'HIGH' ? 'text-destructive' : ''}`}>
                                                        {notification.title}
                                                    </h4>
                                                    {notification.priority !== 'INFO' && (
                                                        <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm w-fit ${styles.badge}`}>
                                                            {notification.priority}
                                                        </span>
                                                    )}
                                                </div>
                                                {!notification.read && (
                                                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                                                )}
                                            </div>
                                            <p className={`text-sm line-clamp-2 ${notification.priority === 'HIGH' && !notification.read ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground/60 mt-2">
                                                {formatDistanceToNow(new Date(notification.timestamp), {
                                                    addSuffix: true,
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
