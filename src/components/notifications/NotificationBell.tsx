import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { cn } from '@/lib/utils';

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const { unreadCount } = useNotifications();
    const bellRef = useRef<HTMLDivElement>(null);

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
                    'relative',
                    isOpen && 'bg-accent'
                )}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                )}
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 z-50">
                    <NotificationPanel onClose={() => setIsOpen(false)} />
                </div>
            )}
        </div>
    );
}
