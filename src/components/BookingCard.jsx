import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';

const STATUS_STYLES = {
    pending: 'bg-secondary text-foreground',
    confirmed: 'bg-foreground text-primary-foreground',
    in_progress: 'bg-foreground text-primary-foreground',
    completed: 'bg-secondary text-muted-foreground',
    cancelled: 'bg-secondary text-muted-foreground line-through',
    no_show: 'bg-destructive text-destructive-foreground',
};

export default function BookingCard({ booking, onClick, showProvider = true }) {
    return (
        <div
            onClick={() => onClick?.(booking)}
            className="border border-border rounded-lg p-4 hover:border-foreground transition-colors cursor-pointer bg-card"
        >
            <div className="flex items-start justify-between mb-2">
                <div>
                    <h4 className="font-inter font-semibold text-sm">{booking.service_name}</h4>
                    {showProvider && <p className="text-xs text-muted-foreground">{booking.provider_name}</p>}
                </div>
                <Badge className={`text-[10px] font-inter ${STATUS_STYLES[booking.status] || ''}`}>
                    {booking.status?.replace('_', ' ')}
                </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{booking.date}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{booking.time_slot}</span>
                {booking.price > 0 && <span className="ml-auto font-semibold text-foreground">${booking.price}</span>}
            </div>
        </div>
    );
}