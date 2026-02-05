import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/contexts/NotificationContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const navigate = useNavigate();

    const handleNotificationClick = (notificationId: string) => {
        markAsRead(notificationId);
        navigate("/appointments");
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-attention text-attention-foreground text-xs"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                        >
                            Mark all as read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Bell className="h-8 w-8 text-muted-foreground/20 mb-2" />
                            <p className="text-sm text-muted-foreground">No notifications</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification.id)}
                                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.read ? "bg-primary/5" : ""
                                    }`}
                            >
                                <div className="flex items-start justify-between w-full">
                                    <p className="font-medium text-sm">{notification.title}</p>
                                    {!notification.read && (
                                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground/60">
                                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                </p>
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
