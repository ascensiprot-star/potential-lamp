import { useState, useEffect } from 'react';
import { Car, Package, Truck, Key, Plus, MapPin, Calendar, Users, Clock, ArrowRight, Search, X } from 'lucide-react';
import { toast } from 'sonner';

const SEGMENTS = [
    { key: 'carpool', label: 'Rides', icon: Car, color: '#3B82F6' },
    { key: 'delivery', label: 'Courier', icon: Package, color: '#8B5CF6' },
    { key: 'moving', label: 'Moving', icon: Truck, color: '#F59E0B' },
    { key: 'car_rental', label: 'Car Rental', icon: Key, color: '#10B981' },
];

const EMPTY = { type: 'carpool', from_location: '', to_location: '', departure_at: '', seats_total: 3, price_pkr: 0, vehicle: '', notes: '', contact_phone: '', recurring: false };

export default function Transport() {
    const [user, setUser] = useState(null);
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('carpool');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [joiningId, setJoiningId] = useState(null);

    const fetchRides = async (type = tab, fromQ = from, toQ = to) => {
        setLoading(true);
        try {
            let url = `/api/neighborhood/transport?type=${type}`;
            if (fromQ) url += `&from_location=${encodeURIComponent(fromQ)}`;
            if (toQ) url += `&to_location=${encodeURIComponent(toQ)}`;
            const r = await fetch(url);
            const d = await r.json();
            setRides(d.rides || []);
        } catch (_) { setRides([]); }
        setLoading(false);
    };

    useEffect(() => {
        const init = async () => {
            const r = await fetch('/api/auth/user');
            const d = await r.json();
            setUser(d.user);
            await fetchRides();
        };
        init();
    }, []);

    useEffect(() => {
        fetchRides(tab, from, to);
    }, [tab]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchRides(tab, from, to);
    };

    const create = async () => {
        if (!form.from_location || !form.to_location) { toast.error('From and To are required'); return; }
        setSaving(true);
        try {
            const r = await fetch('/api/neighborhood/transport', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, type: tab }),
            });
            const d = await r.json();
            if (d.ride) {
                setRides(prev => [d.ride, ...prev]);
                toast.success('Listing posted!');
                setCreateOpen(false);
                setForm(EMPTY);
            } else { toast.error(d.error || 'Failed'); }
        } catch (_) { toast.error('Network error'); }
        setSaving(false);
    };

    const joinRide = async (ride) => {
        if (!user) { toast.error('Please log in'); return; }
        setJoiningId(ride.id);
        try {
            const r = await fetch(`/api/neighborhood/transport/${ride.id}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            const d = await r.json();
            if (d.success) {
                toast.success('Seat reserved! Driver will confirm.');
                setRides(prev => prev.map(r => r.id === ride.id ? { ...r, seats_available: r.seats_available - 1, status: r.seats_available - 1 <= 0 ? 'full' : 'open' } : r));
            } else { toast.error(d.error || 'Failed'); }
        } catch (_) { toast.error('Network error'); }
        setJoiningId(null);
    };

    const fmtDate = (dt) => {
        if (!dt) return null;
        return new Date(dt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--color-text)' }}>
                        Transport
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                        Rideshare, courier, moving & rentals in your neighborhood
                    </p>
                </div>
                {user && (
                    <button onClick={() => { setForm({ ...EMPTY, type: tab }); setCreateOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                        <Plus className="h-3.5 w-3.5" /> Post Listing
                    </button>
                )}
            </div>

            {/* Segment tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {SEGMENTS.map(s => {
                    const active = tab === s.key;
                    return (
                        <button key={s.key} onClick={() => setTab(s.key)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={{
                                backgroundColor: active ? s.color : 'var(--color-surface)',
                                color: active ? '#fff' : 'var(--color-text-muted)',
                                border: `1px solid ${active ? s.color : 'var(--color-border)'}`,
                            }}>
                            <s.icon className="h-3.5 w-3.5" /> {s.label}
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-5">
                <div className="flex-1 relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-text-subtle)' }} />
                    <input value={from} onChange={e => setFrom(e.target.value)} placeholder="From…"
                        className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                </div>
                <div className="flex-1 relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-text-subtle)' }} />
                    <input value={to} onChange={e => setTo(e.target.value)} placeholder="To…"
                        className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                </div>
                <button type="submit" className="px-3 py-2 rounded-xl"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                    <Search className="h-4 w-4" />
                </button>
            </form>

            {/* Listings */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="h-6 w-6 rounded-full animate-spin" style={{ border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
                </div>
            ) : rides.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--color-text-subtle)' }}>
                    <Car className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No listings yet</p>
                    {user && <button onClick={() => setCreateOpen(true)} className="text-xs mt-2 font-semibold" style={{ color: 'var(--color-primary)' }}>Be the first to post →</button>}
                </div>
            ) : (
                <div className="space-y-3">
                    {rides.map(ride => {
                        const seg = SEGMENTS.find(s => s.key === ride.type) || SEGMENTS[0];
                        const isDriver = ride.driver_id === user?.id;
                        const isFull = ride.status === 'full';
                        const seatsLeft = ride.seats_available;
                        return (
                            <div key={ride.id} className="rounded-2xl p-4"
                                style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                style={{ backgroundColor: seg.color + '20', color: seg.color }}>
                                                {seg.label}
                                            </span>
                                            {isDriver && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-subtle)' }}>Your listing</span>}
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                                                {ride.from_location}
                                            </p>
                                            <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-text-subtle)' }} />
                                            <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                                                {ride.to_location}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
                                            {ride.departure_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(ride.departure_at)}</span>}
                                            {ride.type === 'carpool' && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{seatsLeft}/{ride.seats_total} seats</span>}
                                            {ride.vehicle && <span className="flex items-center gap-1"><Car className="h-3 w-3" />{ride.vehicle}</span>}
                                            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                                                {ride.price_pkr > 0 ? `PKR ${ride.price_pkr}` : 'Free'}
                                            </span>
                                        </div>
                                        {ride.notes && <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-subtle)' }}>{ride.notes}</p>}
                                        <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-subtle)' }}>
                                            Posted by {ride.driver_name || 'Unknown'}
                                        </p>
                                    </div>
                                    {!isDriver && (
                                        <button
                                            onClick={() => joinRide(ride)}
                                            disabled={isFull || joiningId === ride.id}
                                            className="px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-opacity"
                                            style={{
                                                backgroundColor: isFull ? 'var(--color-surface-high)' : 'var(--color-primary)',
                                                color: isFull ? 'var(--color-text-subtle)' : 'var(--color-on-primary)',
                                                opacity: joiningId === ride.id ? 0.7 : 1,
                                            }}>
                                            {joiningId === ride.id ? '…' : isFull ? 'Full' : ride.type === 'carpool' ? 'Book Seat' : 'Contact'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Dialog */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={e => e.target === e.currentTarget && setCreateOpen(false)}>
                    <div className="rounded-2xl p-5 w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Post Transport Listing</h2>
                            <button onClick={() => setCreateOpen(false)} style={{ color: 'var(--color-text-subtle)' }}><X className="h-4 w-4" /></button>
                        </div>

                        {/* Type selector */}
                        <div className="flex gap-1.5 mb-4 flex-wrap">
                            {SEGMENTS.map(s => (
                                <button key={s.key} onClick={() => setForm(f => ({ ...f, type: s.key }))}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                                    style={{ backgroundColor: form.type === s.key ? s.color : 'var(--color-surface-high)', color: form.type === s.key ? '#fff' : 'var(--color-text-muted)' }}>
                                    <s.icon className="h-3 w-3" /> {s.label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            {[
                                { key: 'from_location', label: 'From', placeholder: 'Pickup location' },
                                { key: 'to_location', label: 'To', placeholder: 'Drop-off location' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-subtle)' }}>{f.label}</label>
                                    <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                </div>
                            ))}

                            {form.type === 'carpool' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-subtle)' }}>Seats</label>
                                        <input type="number" min={1} max={8} value={form.seats_total}
                                            onChange={e => setForm(p => ({ ...p, seats_total: parseInt(e.target.value) || 1 }))}
                                            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                            style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-subtle)' }}>Price/seat (PKR)</label>
                                        <input type="number" min={0} value={form.price_pkr}
                                            onChange={e => setForm(p => ({ ...p, price_pkr: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                            style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-subtle)' }}>Departure date & time</label>
                                <input type="datetime-local" value={form.departure_at}
                                    onChange={e => setForm(p => ({ ...p, departure_at: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                            </div>

                            <div>
                                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-subtle)' }}>Vehicle / details</label>
                                <input value={form.vehicle} onChange={e => setForm(p => ({ ...p, vehicle: e.target.value }))}
                                    placeholder="e.g. Honda Civic, White"
                                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                            </div>

                            <div>
                                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-subtle)' }}>Contact phone</label>
                                <input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))}
                                    placeholder="03XX-XXXXXXX"
                                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                            </div>

                            <div>
                                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-subtle)' }}>Notes</label>
                                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                    placeholder="Additional details…" rows={2}
                                    className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setCreateOpen(false)} className="flex-1 py-2 rounded-xl text-sm font-semibold"
                                style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                Cancel
                            </button>
                            <button onClick={create} disabled={saving}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity"
                                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Posting…' : 'Post Listing'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
