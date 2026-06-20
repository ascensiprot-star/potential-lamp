import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, Package, Truck, Key, MapPin, Clock, ArrowRight, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const TYPE_CONFIG = {
    carpool: { icon: Car, label: 'Carpool', color: 'bg-blue-100 text-blue-700', light: 'bg-blue-50 dark:bg-blue-950/30' },
    delivery: { icon: Package, label: 'Delivery', color: 'bg-amber-100 text-amber-700', light: 'bg-amber-50 dark:bg-amber-950/30' },
    moving: { icon: Truck, label: 'Moving', color: 'bg-emerald-100 text-emerald-700', light: 'bg-emerald-50 dark:bg-emerald-950/30' },
    car_rental: { icon: Key, label: 'Car Rental', color: 'bg-violet-100 text-violet-700', light: 'bg-violet-50 dark:bg-violet-950/30' },
};

export default function TransportSection({ user }) {
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState('all');
    const [postDialog, setPostDialog] = useState(false);
    const [requestDialog, setRequestDialog] = useState(null);
    const [form, setForm] = useState({ type: 'carpool', from_location: '', to_location: '', date: '', departure_time: '', seats_available: 3, price_per_seat: 0, vehicle: '', contact_phone: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/neighborhood/ride-shares');
                const { data } = await res.json();
                if (data) setRides(data.filter(r => r.status === 'open').slice(0, 5));
            } catch (e) {
                console.error('Failed to load rides', e);
            }
            setLoading(false);
        })();
    }, []);

    const filtered = activeType === 'all' ? rides : rides.filter(r => r.type === activeType);

    const post = async () => {
        if (!form.from_location || !form.to_location || !form.date) { toast.error('From, to and date required'); return; }
        if (!user) { toast.error('Please log in to post'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/neighborhood/ride-shares', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...form,
                    departure_at: form.date + (form.departure_time ? `T${form.departure_time}` : ''),
                    price_pkr: form.price_per_seat,
                    seats_total: form.seats_available
                })
            });
            const { error } = await res.json();
            if (error) throw new Error(error);
            toast.success('Listing posted!');
            setPostDialog(false);
            // Reload
            const res2 = await fetch('/api/neighborhood/ride-shares');
            const { data } = await res2.json();
            if (data) setRides(data.filter(r => r.status === 'open').slice(0, 5));
        } catch (e) {
            toast.error(e.message || 'Failed to post listing');
        }
        setSaving(false);
    };

    const requestSeat = async (ride) => {
        if (!user) { toast.error('Please log in'); return; }
        try {
            const res = await fetch(`/api/neighborhood/ride-shares/${ride.id}/join`, {
                method: 'POST',
                credentials: 'include'
            });
            const { error } = await res.json();
            if (error) throw new Error(error);
            setRides(prev => prev.map(r => r.id === ride.id ? { ...r, seats_taken: (r.seats_taken || 0) + 1 } : r));
            toast.success('Request sent! Contact the driver to confirm.');
            setRequestDialog(null);
        } catch (e) {
            toast.error(e.message || 'Failed to request seat');
        }
    };

    // Stats
    const counts = { all: rides.length, carpool: 0, delivery: 0, moving: 0, car_rental: 0 };
    rides.forEach(r => { if (counts[r.type] !== undefined) counts[r.type]++; });

    return (
        <section>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="font-display font-bold text-xl tracking-tight">Transport Hub</h2>
                    <p className="text-zinc-500 text-sm mt-0.5 font-inter">Carpools, delivery, moving & car rentals nearby</p>
                </div>
                <div className="flex items-center gap-2">
                    {user && (
                        <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs" onClick={() => setPostDialog(true)}>
                            <Plus className="h-3.5 w-3.5" /> Post Listing
                        </Button>
                    )}
                    <Link to="/transport" className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                        All listings <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>

            {/* Type tabs with counts */}
            <div className="grid grid-cols-5 gap-2 mb-4">
                {[['all', 'All', null], ...Object.entries(TYPE_CONFIG).map(([k, v]) => [k, v.label, v.icon])].map(([key, label, Icon]) => (
                    <button key={key} onClick={() => setActiveType(key)}
                        className={`rounded-xl p-2.5 text-center border-2 transition-all ${activeType === key ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'border-transparent bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'}`}>
                        {Icon && <Icon className="h-4 w-4 mx-auto mb-0.5" />}
                        <p className="text-[10px] font-bold">{label}</p>
                        <p className="text-[10px] opacity-60">{counts[key] || 0}</p>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-24 rounded-2xl" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="card-premium p-10 text-center">
                    <Car className="h-8 w-8 mx-auto mb-3 text-zinc-200" />
                    <p className="text-zinc-400 text-sm">No listings yet</p>
                    {user && <Button size="sm" variant="outline" className="rounded-xl mt-3" onClick={() => setPostDialog(true)}>Post First Listing</Button>}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.slice(0, 5).map(ride => {
                        const cfg = TYPE_CONFIG[ride.type] || TYPE_CONFIG.carpool;
                        const Icon = cfg.icon;
                        const seatsLeft = (ride.seats_available || ride.seats_total || 0) - (ride.seats_taken || 0);
                        const isFull = seatsLeft <= 0;
                        return (
                            <div key={ride.id} className={`rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 ${cfg.light} hover:shadow-premium transition-all`}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{ride.driver_name || ride.driver_email?.split('@')[0]}</p>
                                            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5 flex-wrap">
                                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ride.from_location} → {ride.to_location}</span>
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ride.departure_at?.slice(0, 10) || ride.date}</span>
                                                {ride.type === 'carpool' && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{seatsLeft} seats left</span>}
                                                {ride.vehicle && <span className="text-zinc-400">{ride.vehicle}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-bold text-sm">{ride.price_pkr > 0 ? `$${ride.price_pkr}` : 'Free'}</p>
                                        {ride.type === 'carpool' && <p className="text-[10px] text-zinc-400">per seat</p>}
                                        <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs mt-1.5 gap-1" disabled={isFull}
                                            onClick={() => setRequestDialog(ride)}>
                                            {isFull ? 'Full' : ride.type === 'carpool' ? 'Request Seat' : 'Contact'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {filtered.length > 5 && (
                <Link to="/transport" className="flex items-center justify-center gap-2 mt-3 text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                    View {filtered.length - 5} more listings <ArrowRight className="h-4 w-4" />
                </Link>
            )}

            {/* Post Dialog */}
            <Dialog open={postDialog} onOpenChange={setPostDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Post Transport Listing</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-1">
                        <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="From *" value={form.from_location} onChange={e => setForm(p => ({ ...p, from_location: e.target.value }))} className="rounded-xl" />
                            <Input placeholder="To *" value={form.to_location} onChange={e => setForm(p => ({ ...p, to_location: e.target.value }))} className="rounded-xl" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="rounded-xl" />
                            <Input type="time" value={form.departure_time} onChange={e => setForm(p => ({ ...p, departure_time: e.target.value }))} className="rounded-xl" />
                        </div>
                        {form.type === 'carpool' && (
                            <div className="grid grid-cols-2 gap-3">
                                <Input type="number" placeholder="Seats" value={form.seats_available} onChange={e => setForm(p => ({ ...p, seats_available: Number(e.target.value) }))} className="rounded-xl" min={1} />
                                <Input type="number" placeholder="Price/seat ($)" value={form.price_per_seat} onChange={e => setForm(p => ({ ...p, price_per_seat: Number(e.target.value) }))} className="rounded-xl" />
                            </div>
                        )}
                        {form.type !== 'carpool' && (
                            <Input type="number" placeholder="Price ($)" value={form.price_per_seat} onChange={e => setForm(p => ({ ...p, price_per_seat: Number(e.target.value) }))} className="rounded-xl" />
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="Vehicle (optional)" value={form.vehicle} onChange={e => setForm(p => ({ ...p, vehicle: e.target.value }))} className="rounded-xl" />
                            <Input placeholder="Phone" value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} className="rounded-xl" />
                        </div>
                        <div className="flex gap-2">
                            <Button className="flex-1 h-10 rounded-xl" onClick={post} disabled={saving}>{saving ? 'Posting…' : 'Post Listing'}</Button>
                            <Link to="/transport" className="flex-1">
                                <Button variant="outline" className="w-full h-10 rounded-xl">Full Page</Button>
                            </Link>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Request Dialog */}
            <Dialog open={!!requestDialog} onOpenChange={() => setRequestDialog(null)}>
                {requestDialog && (
                    <DialogContent className="max-w-sm">
                        <DialogHeader><DialogTitle>{requestDialog.type === 'carpool' ? 'Request a Seat' : 'Send Request'}</DialogTitle></DialogHeader>
                        <div className="space-y-3 pt-1">
                            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 space-y-1.5 text-sm">
                                <p><span className="text-zinc-400">Route: </span>{requestDialog.from_location} → {requestDialog.to_location}</p>
                                <p><span className="text-zinc-400">Date: </span>{requestDialog.departure_at?.slice(0, 10) || requestDialog.date} {requestDialog.departure_time && `at ${requestDialog.departure_time}`}</p>
                                <p><span className="text-zinc-400">Driver: </span>{requestDialog.driver_name || requestDialog.driver_email}</p>
                                {requestDialog.contact_phone && <p><span className="text-zinc-400">Phone: </span>{requestDialog.contact_phone}</p>}
                                <p><span className="text-zinc-400">Price: </span>{requestDialog.price_pkr > 0 ? `$${requestDialog.price_pkr}${requestDialog.type === 'carpool' ? '/seat' : ''}` : 'Free'}</p>
                            </div>
                            <Button className="w-full h-11 rounded-xl" onClick={() => requestSeat(requestDialog)}>Confirm Request</Button>
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        </section>
    );
}
