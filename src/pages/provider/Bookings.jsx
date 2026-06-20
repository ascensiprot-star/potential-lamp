import { useState, useEffect } from 'react';
import { CalendarDays, Clock, CheckCircle, XCircle } from 'lucide-react';

const STATUS_MAP = {
    pending: { label: 'Pending', class: 'bg-amber-50 text-amber-700 border border-amber-200' },
    confirmed: { label: 'Confirmed', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    in_progress: { label: 'In Progress', class: 'bg-blue-50 text-blue-700 border border-blue-200' },
    completed: { label: 'Completed', class: 'bg-zinc-100 text-zinc-600 border border-zinc-200' },
    cancelled: { label: 'Cancelled', class: 'bg-red-50 text-red-600 border border-red-200' },
    no_show: { label: 'No Show', class: 'bg-red-50 text-red-700 border border-red-200' },
};

export default function ProviderBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setBookings([]);
        setLoading(false);
    }, []);

    if (loading) return (
        <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-wave h-20 rounded-2xl" />
            ))}
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="font-display font-bold text-2xl tracking-tight">Bookings</h1>
                    <p className="text-zinc-400 text-sm">Manage your incoming bookings</p>
                </div>
            </div>

            {bookings.length === 0 ? (
                <div className="card-premium p-12 text-center">
                    <CalendarDays className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">No bookings yet. Connect Supabase to load your data.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bookings.map(b => {
                        const status = STATUS_MAP[b.status] || STATUS_MAP.pending;
                        return (
                            <div key={b.id} className="card-premium p-4 flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm">{b.service_name}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                                        <span>{b.customer_email}</span>
                                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{b.date}</span>
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.time_slot}</span>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${status.class}`}>{status.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
