import { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle, AlertCircle, Phone, MessageCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const TRACKING_STEPS = [
    { key: 'confirmed', label: 'Booking Confirmed', desc: 'Provider accepted your booking', icon: CheckCircle },
    { key: 'en_route', label: 'Provider En Route', desc: 'On the way to your location', icon: MapPin },
    { key: 'arrived', label: 'Provider Arrived', desc: 'Service is starting', icon: CheckCircle },
    { key: 'in_progress', label: 'Service In Progress', desc: 'Your service is being completed', icon: Clock },
    { key: 'completed', label: 'Service Complete', desc: 'All done! Please leave a review', icon: CheckCircle },
];

export default function TrackService() {
    const [bookings, setBookings] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
                const active = b.filter(bk => ['confirmed', 'in_progress', 'pending'].includes(bk.status));
                setBookings(active);
                if (active.length > 0) setSelected(active[0]);
                setLoading(false);
    }, []);

    const getStep = (status) => {
        const map = { confirmed: 0, in_progress: 3, completed: 4 };
        return map[status] ?? 0;
    };

    if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-20 rounded-2xl" />)}</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display font-bold text-3xl tracking-tight">Track Service</h1>
                <p className="text-zinc-500 text-sm mt-1">Live status of your active bookings</p>
            </div>

            {bookings.length === 0 ? (
                <div className="card-premium p-12 text-center">
                    <MapPin className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm">No active bookings to track</p>
                    <Button asChild variant="outline" className="mt-4 rounded-xl"><Link to="/services">Book a Service</Link></Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Active Bookings</p>
                        {bookings.map(b => (
                            <button key={b.id} onClick={() => setSelected(b)}
                                className={`w-full text-left card-premium p-4 transition-all ${selected?.id === b.id ? 'ring-2 ring-zinc-900' : ''}`}>
                                <p className="font-semibold text-sm">{b.service_name}</p>
                                <p className="text-xs text-zinc-400 mt-0.5">{b.provider_name} · {b.date} {b.time_slot}</p>
                                <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{b.status}</span>
                            </button>
                        ))}
                    </div>

                    {selected && (
                        <div className="lg:col-span-2 space-y-5">
                            <div className="card-premium p-6">
                                <div className="flex items-start justify-between mb-5">
                                    <div>
                                        <h2 className="font-bold text-lg">{selected.service_name}</h2>
                                        <p className="text-zinc-500 text-sm">{selected.provider_name} · {selected.date} at {selected.time_slot}</p>
                                    </div>
                                    <span className="font-black text-xl">${selected.price || 0}</span>
                                </div>

                                <div className="relative">
                                    <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-zinc-100" />
                                    {TRACKING_STEPS.map((step, i) => {
                                        const currentStep = getStep(selected.status);
                                        const done = i <= currentStep;
                                        const active = i === currentStep;
                                        const Icon = step.icon;
                                        return (
                                            <div key={step.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
                                                <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                                                    <Icon className={`h-3.5 w-3.5 ${done ? 'text-white' : 'text-zinc-400'}`} />
                                                </div>
                                                <div className={`pt-1 ${done ? '' : 'opacity-40'}`}>
                                                    <p className={`font-semibold text-sm ${active ? 'text-zinc-900' : ''}`}>{step.label}</p>
                                                    <p className="text-xs text-zinc-400">{step.desc}</p>
                                                    {active && <span className="inline-block mt-1 text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">Current Status</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button asChild variant="outline" className="rounded-xl gap-2 h-11">
                                    <Link to="/chat"><MessageCircle className="h-4 w-4" /> Message Provider</Link>
                                </Button>
                                <Button variant="outline" className="rounded-xl gap-2 h-11" onClick={() => window.location.href = 'tel:+1'}>
                                    <Phone className="h-4 w-4" /> Call Provider
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}