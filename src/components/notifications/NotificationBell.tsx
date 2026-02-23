import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { cn } from '@/lib/utils';

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const { unreadCount, notifications } = useNotifications();
    const bellRef = useRef<HTMLDivElement>(null);

    const hasHighPriority = notifications.some(n => !n.read && n.priority === 'HIGH');

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={bellRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'relative transition-all duration-300',
                    isOpen && 'bg-accent',
                    hasHighPriority && unreadCount > 0 && 'text-destructive'
                )}
            >
                <Bell className={cn(
                    "h-5 w-5",
                    hasHighPriority && unreadCount > 0 && "fill-destructive/10 animate-pulse"
                )} />
                {unreadCount > 0 && (
                    <Badge
                        variant={hasHighPriority ? "destructive" : "default"}
                        className={cn(
                            "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold ring-2 ring-background",
                            hasHighPriority && "bg-destructive animate-bounce"
                        )}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                )}
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                    <NotificationPanel onClose={() => setIsOpen(false)} />
                </div>
            )}
        </div>
    );
}
