import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, Search, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

const STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    in_progress: { label: 'In Progress', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300' },
    completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
    cancelled: { label: 'Cancelled', color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
    no_show: { label: 'No Show', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

export default function BookingsAdmin() {
    const [bookings, setBookings] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [updating, setUpdating] = useState(false);

    const load = async () => {
        setLoading(true);
        const { data } = await supabase.from('bookings').select('*').order('created_date', { ascending: false });
        if (data) setBookings(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const updateStatus = async (id, status) => {
        setUpdating(true);
        toast.success(`Booking marked as ${status.replace('_', ' ')}`);
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
        if (selected?.id === id) setSelected(b => ({ ...b, status }));
        setUpdating(false);
    };

    const filtered = bookings.filter(b => {
        const matchStatus = filter === 'all' || b.status === filter;
        const term = search.toLowerCase();
        const matchSearch = !term ||
            b.service_name?.toLowerCase().includes(term) ||
            b.customer_email?.toLowerCase().includes(term) ||
            b.provider_name?.toLowerCase().includes(term);
        return matchStatus && matchSearch;
    });

    const counts = Object.fromEntries(
        Object.keys(STATUS_CONFIG).map(s => [s, bookings.filter(b => b.status === s).length])
    );

    if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h1 className="font-bold text-2xl">All Bookings <span className="text-muted-foreground font-normal text-lg">({bookings.length})</span></h1>
                <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search..." className="pl-9 h-9 w-48 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All ({bookings.length})</SelectItem>
                            {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                                <SelectItem key={s} value={s}>{c.label} ({counts[s] || 0})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
                {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                    <button key={s} onClick={() => setFilter(filter === s ? 'all' : s)}
                        className={`p-2 rounded-xl text-center transition-all border ${filter === s ? 'border-foreground' : 'border-border'}`}>
                        <div className="text-lg font-black">{counts[s] || 0}</div>
                        <div className="text-[10px] text-muted-foreground">{c.label}</div>
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No bookings found.</p>
            ) : (
                <div className="space-y-2">
                    {filtered.map(b => (
                        <div key={b.id}
                            onClick={() => setSelected(b)}
                            className="border border-border rounded-xl p-4 hover:border-foreground/40 transition-colors cursor-pointer bg-card"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold text-sm">{b.service_name || 'Unknown Service'}</h4>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[b.status]?.color || ''}`}>
                                            {STATUS_CONFIG[b.status]?.label || b.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{b.provider_name} · {b.customer_email}</p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{b.date}</span>
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.time_slot}</span>
                                        {b.price > 0 && <span className="font-semibold text-foreground">${b.price}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                    {b.status === 'pending' && (
                                        <Button size="sm" className="h-7 text-xs rounded-lg" onClick={() => updateStatus(b.id, 'confirmed')}>
                                            <CheckCircle className="h-3.5 w-3.5 mr-1" />Confirm
                                        </Button>
                                    )}
                                    {(b.status === 'pending' || b.status === 'confirmed') && (
                                        <Button size="sm" variant="destructive" className="h-7 text-xs rounded-lg" onClick={() => updateStatus(b.id, 'cancelled')}>
                                            <XCircle className="h-3.5 w-3.5 mr-1" />Cancel
                                        </Button>
                                    )}
                                    {b.status === 'confirmed' && (
                                        <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => updateStatus(b.id, 'completed')}>
                                            <CheckCircle className="h-3.5 w-3.5 mr-1" />Complete
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Dialog */}
            <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Booking Details</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-4 pt-1">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><p className="text-muted-foreground text-xs mb-1">Service</p><p className="font-semibold">{selected.service_name}</p></div>
                                <div><p className="text-muted-foreground text-xs mb-1">Status</p>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_CONFIG[selected.status]?.color || ''}`}>
                                        {STATUS_CONFIG[selected.status]?.label || selected.status}
                                    </span>
                                </div>
                                <div><p className="text-muted-foreground text-xs mb-1">Provider</p><p className="font-medium">{selected.provider_name || '—'}</p></div>
                                <div><p className="text-muted-foreground text-xs mb-1">Customer</p><p className="font-medium truncate">{selected.customer_email}</p></div>
                                <div><p className="text-muted-foreground text-xs mb-1">Date</p><p className="font-medium">{selected.date}</p></div>
                                <div><p className="text-muted-foreground text-xs mb-1">Time</p><p className="font-medium">{selected.time_slot}</p></div>
                                {selected.price > 0 && <div><p className="text-muted-foreground text-xs mb-1">Price</p><p className="font-bold text-lg">${selected.price}</p></div>}
                                {selected.notes && <div className="col-span-2"><p className="text-muted-foreground text-xs mb-1">Notes</p><p className="text-sm">{selected.notes}</p></div>}
                            </div>
                            <div className="border-t pt-4">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Update Status</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                                        <Button key={s} size="sm" variant={selected.status === s ? 'default' : 'outline'}
                                            className="h-9 text-xs rounded-xl"
                                            disabled={selected.status === s || updating}
                                            onClick={() => updateStatus(selected.id, s)}>
                                            {c.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}