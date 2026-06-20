import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle, Clock, XCircle, ArrowRight, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUS_CONFIG = {
    pending: { label: 'Pending', class: 'bg-amber-50 text-amber-700 border border-amber-200' },
    confirmed: { label: 'Confirmed', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    in_progress: { label: 'In Progress', class: 'bg-blue-50 text-blue-700 border border-blue-200' },
    completed: { label: 'Completed', class: 'bg-zinc-100 text-zinc-600 border border-zinc-200' },
    cancelled: { label: 'Cancelled', class: 'bg-red-50 text-red-600 border border-red-200 line-through' },
    no_show: { label: 'No Show', class: 'bg-red-50 text-red-700 border border-red-200' },
};

const MetricCard = ({ icon: Icon, label, value, sub }) => (
    <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </div>
        </div>
        <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100 leading-none mb-1">{value}</div>
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
        {sub && <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{sub}</div>}
    </div>
);

const BookingRow = ({ booking, onClick }) => {
    const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
    return (
        <button
            onClick={() => onClick(booking)}
            className="card-premium p-4 w-full text-left flex items-center gap-4 hover:shadow-float transition-all"
        >
            <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg font-black text-zinc-400 dark:text-zinc-500 shrink-0">
                {booking.provider_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-zinc-900 truncate">{booking.service_name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${status.class}`}>{status.label}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                    <span>{booking.provider_name}</span>
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{booking.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{booking.time_slot}</span>
                    {booking.price > 0 && <span className="ml-auto font-bold text-zinc-700">${booking.price}</span>}
                </div>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-300 shrink-0" />
        </button>
    );
};

export default function CustomerDashboard() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        setBookings([]);
        setLoading(false);
    }, []);

    const cancel = async (b) => {
        setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: 'cancelled' } : x));
        setSelected(null);
        toast.success('Booking cancelled');
    };

    const upcoming = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
    const completed = bookings.filter(b => b.status === 'completed');
    const cancelled = bookings.filter(b => b.status === 'cancelled');

    const filters = [
        { id: 'all', label: 'All', count: bookings.length },
        { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
        { id: 'completed', label: 'Completed', count: completed.length },
        { id: 'cancelled', label: 'Cancelled', count: cancelled.length },
    ];

    const filtered = activeFilter === 'all' ? bookings
        : activeFilter === 'upcoming' ? upcoming
            : activeFilter === 'completed' ? completed
                : cancelled;

    return (
        <div className="pb-24 md:pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-inter font-black text-3xl tracking-tight">My Bookings</h1>
                    <p className="text-zinc-400 text-sm mt-1">Track and manage your reservations</p>
                </div>
                <Button asChild className="rounded-xl bg-zinc-900 hover:bg-zinc-800 hidden md:flex">
                    <Link to="/services">+ New Booking</Link>
                </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <MetricCard icon={CalendarDays} label="Upcoming" value={upcoming.length} />
                <MetricCard icon={CheckCircle} label="Completed" value={completed.length} />
                <MetricCard icon={Clock} label="Total Booked" value={bookings.length} />
                <MetricCard icon={XCircle} label="Cancelled" value={cancelled.length} />
            </div>

            {/* Filter tabs */}
            <div className="glass rounded-2xl p-1.5 flex gap-1 mb-5 shadow-premium">
                {filters.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-xs font-semibold transition-all ${activeFilter === f.id ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                            }`}
                    >
                        {f.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === f.id ? 'bg-white/20' : 'bg-zinc-100 text-zinc-500'}`}>
                            {f.count}
                        </span>

                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="card-premium p-4 flex items-center gap-4">
                            <div className="skeleton-wave h-10 w-10 rounded-xl shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="skeleton-wave h-4 rounded w-1/2" />
                                <div className="skeleton-wave h-3 rounded w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card-premium p-16 text-center">
                    <CalendarDays className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2 text-zinc-700">No bookings here</h3>
                    <p className="text-zinc-400 text-sm mb-5">
                        {activeFilter === 'all' ? "You haven't made any bookings yet." : `No ${activeFilter} bookings.`}
                    </p>
                    <Button asChild className="rounded-xl"><Link to="/services">Browse Services</Link></Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(b => <BookingRow key={b.id} booking={b} onClick={setSelected} />)}
                </div>
            )}

            <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl">{selected?.service_name}</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-4 mt-2">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Provider', value: selected.provider_name },
                                    { label: 'Date', value: selected.date },
                                    { label: 'Time', value: selected.time_slot },
                                    { label: 'Status', value: selected.status?.replace('_', ' ') },
                                    { label: 'Price', value: `$${selected.price}` },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
                                        <div className="text-xs text-zinc-400 mb-0.5">{label}</div>
                                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 capitalize">{value}</div>
                                    </div>
                                ))}
                            </div>
                            {selected.notes && (
                                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
                                    <div className="text-xs text-zinc-400 mb-0.5">Notes</div>
                                    <div className="text-sm text-zinc-700 dark:text-zinc-300">{selected.notes}</div>
                                </div>
                            )}
                            {['pending', 'confirmed'].includes(selected.status) && (
                                <Button variant="destructive" className="w-full rounded-xl" onClick={() => cancel(selected)}>
                                    Cancel Booking
                                </Button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}