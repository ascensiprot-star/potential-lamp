import { useState, useEffect } from 'react';
import {
    Calendar, MapPin, Ticket, Plus, Search, Users,
    Loader2, Check, Music, Wrench, Zap, Sparkles,
    UtensilsCrossed, ImageIcon, Building2, Globe, Home, Trees
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';

const CATEGORY_ICONS = {
    concert: Music, workshop: Wrench, meetup: Users, sports: Zap,
    festival: Sparkles, exhibition: ImageIcon, food: UtensilsCrossed, other: Calendar,
};
const CATEGORY_LABELS = {
    concert: 'Concert', workshop: 'Workshop', meetup: 'Meetup', sports: 'Sports',
    festival: 'Festival', exhibition: 'Exhibition', food: 'Food & Drink', other: 'Other',
};
const VENUE_TYPES = { hall: 'Community Hall', rooftop: 'Rooftop', open_ground: 'Open Ground', indoor: 'Indoor', online: 'Online', other: 'Other' };
const BUNDLE_SERVICES = ['photographer', 'decorator', 'caterer', 'security', 'sound_system', 'mc_host', 'florist'];

const EMPTY_EVENT = {
    title: '', description: '', category: 'meetup', venue_name: '', venue_type: 'hall',
    address: '', date: '', start_time: '', end_time: '', organizer_name: '',
    ticket_price: 0, is_free: true, total_tickets: 100, bundle_services: [],
};

const VENUE_DATA = [
    { type: 'hall',       name: 'Grand Community Hall',  cap: 500,  price: '$800/day',   Icon: Building2, amenities: ['stage', 'parking', 'kitchen', 'AV system'] },
    { type: 'rooftop',    name: 'Skyline Rooftop',       cap: 150,  price: '$400/day',   Icon: Building2, amenities: ['panoramic view', 'bar counter', 'string lights'] },
    { type: 'open_ground',name: 'Green Valley Ground',   cap: 2000, price: '$300/day',   Icon: Trees,     amenities: ['open air', 'tents available', 'generators', 'toilets'] },
    { type: 'indoor',     name: 'The Loft',              cap: 80,   price: '$250/day',   Icon: Home,      amenities: ['AC', 'projector', 'whiteboard', 'coffee'] },
    { type: 'rooftop',    name: 'Sunset Terrace',        cap: 60,   price: '$350/day',   Icon: Building2, amenities: ['garden', 'BBQ', 'private'] },
    { type: 'hall',       name: 'Heritage Ballroom',     cap: 300,  price: '$1,200/day', Icon: Building2, amenities: ['vintage decor', 'dance floor', 'catering included'] },
];

export default function Events() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('all');
    const [tab, setTab] = useState('browse');
    const [createDialog, setCreateDialog] = useState(false);
    const [ticketDialog, setTicketDialog] = useState(null);
    const [form, setForm] = useState(EMPTY_EVENT);
    const [saving, setSaving] = useState(false);
    const [buying, setBuying] = useState(false);
    const [myTickets, setMyTickets] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);

    const loadEvents = async () => {
        setLoading(true);
        const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
        if (data) setEvents(data);
        setLoading(false);
    };
    const loadMyTickets = async () => {
        if (!user) return;
        setTicketsLoading(true);
        const { data } = await supabase.from('event_tickets').select('*').eq('buyer_email', user.email).order('created_at', { ascending: false });
        if (data) setMyTickets(data);
        setTicketsLoading(false);
    };

    useEffect(() => { loadEvents(); }, []);
    useEffect(() => { if (user && tab === 'my-tickets') loadMyTickets(); }, [user, tab]);

    const toggleBundle = (s) => setForm(p => ({
        ...p, bundle_services: p.bundle_services?.includes(s)
            ? p.bundle_services.filter(x => x !== s)
            : [...(p.bundle_services || []), s]
    }));

    const createEvent = async () => {
        if (!form.title || !form.date || !form.venue_name) { toast.error('Title, date and venue required'); return; }
        if (!user) { toast.error('Sign in to create an event'); return; }
        setSaving(true);
        try {
            const { error } = await supabase.from('events').insert([{
                title: form.title, description: form.description || null,
                category: form.category, venue_name: form.venue_name,
                venue_type: form.venue_type, address: form.address || null,
                date: form.date, start_time: form.start_time || null,
                end_time: form.end_time || null,
                organizer_name: form.organizer_name || user.full_name || user.email?.split('@')[0],
                organizer_id: user.id,
                ticket_price: form.is_free ? 0 : form.ticket_price,
                is_free: form.is_free, total_tickets: form.total_tickets,
                bundle_services: form.bundle_services
            }]);
            if (error) throw error;
            toast.success('Event published');
            setCreateDialog(false);
            setForm(EMPTY_EVENT);
            loadEvents();
        } catch (err) { toast.error(err.message || 'Failed to create event'); }
        finally { setSaving(false); }
    };

    const buyTicket = async (event, qty = 1) => {
        if (!user) { toast.error('Please log in to get tickets'); return; }
        setBuying(true);
        try {
            const ticketCode = `TKT-${Date.now().toString(36).toUpperCase()}`;
            const { error } = await supabase.from('event_tickets').insert([{
                event_id: event.id, event_title: event.title,
                buyer_email: user.email, buyer_name: user.full_name || user.email?.split('@')[0],
                quantity: qty, unit_price: event.ticket_price || 0,
                total_amount: (event.ticket_price || 0) * qty,
                ticket_code: ticketCode
            }]);
            if (error) throw error;
            // Update tickets sold count
            await supabase.from('events').update({ tickets_sold: (event.tickets_sold || 0) + qty }).eq('id', event.id);
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, tickets_sold: (e.tickets_sold || 0) + qty } : e));
            toast.success(`Ticket booked — Code: ${ticketCode}`);
            setTicketDialog(null);
        } catch (err) { toast.error(err.message || 'Failed to book ticket'); }
        finally { setBuying(false); }
    };

    const filtered = events.filter(e => {
        const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.venue_name?.toLowerCase().includes(search.toLowerCase());
        const matchCat = catFilter === 'all' || e.category === catFilter;
        return matchSearch && matchCat;
    });
    const upcoming = filtered.filter(e => !e.date || new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)));
    const past = filtered.filter(e => e.date && new Date(e.date) < new Date(new Date().setHours(0,0,0,0)));

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="font-bold text-3xl tracking-tight text-zinc-900 dark:text-white">Local Events</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">Concerts · workshops · meetups · venue bookings</p>
                </div>
                {user && <Button className="rounded-xl gap-2" onClick={() => setCreateDialog(true)}><Plus className="h-4 w-4" /> Create Event</Button>}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl w-fit">
                {[['browse', 'Browse'], ['my-tickets', 'My Tickets'], ['venues', 'Venues']].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`h-8 px-4 rounded-xl text-xs font-semibold transition-all ${tab === key ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'browse' && (
                <>
                    <div className="flex gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events" className="pl-9 rounded-xl" />
                        </div>
                        <Select value={catFilter} onValueChange={setCatFilter}>
                            <SelectTrigger className="rounded-xl w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {Object.entries(CATEGORY_LABELS).map(([c, label]) => (
                                    <SelectItem key={c} value={c}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-wave h-64 rounded-2xl" />)}
                        </div>
                    ) : upcoming.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                            <Calendar className="h-10 w-10 mx-auto mb-3 text-zinc-200 dark:text-zinc-700" strokeWidth={1.5} />
                            <p className="text-zinc-400 font-medium">No upcoming events</p>
                            {user && <button onClick={() => setCreateDialog(true)} className="mt-3 text-sm font-semibold text-zinc-900 dark:text-white underline underline-offset-2">Be the first to create one</button>}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {upcoming.map(event => {
                                    const CatIcon = CATEGORY_ICONS[event.category] || Calendar;
                                    const soldOut = (event.tickets_sold || 0) >= (event.total_tickets || 9999);
                                    const pct = Math.min(100, Math.round(((event.tickets_sold || 0) / (event.total_tickets || 1)) * 100));
                                    return (
                                        <div key={event.id} className="card-premium overflow-hidden group">
                                            <div className="h-36 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative">
                                                {event.image_url
                                                    ? <img src={event.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                                    : <CatIcon className="h-12 w-12 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />}
                                                <span className="absolute top-3 left-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-full capitalize">{CATEGORY_LABELS[event.category] || event.category}</span>
                                                {soldOut && <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">SOLD OUT</span>}
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-bold text-sm mb-2 line-clamp-1">{event.title}</h3>
                                                <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                                                    <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{event.date}{event.start_time && ` · ${event.start_time}`}</div>
                                                    <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.venue_name}{event.venue_type && ` · ${VENUE_TYPES[event.venue_type] || event.venue_type}`}</div>
                                                    <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{event.tickets_sold || 0}/{event.total_tickets} tickets sold</div>
                                                </div>
                                                {event.bundle_services?.length > 0 && (
                                                    <div className="flex gap-1 flex-wrap mb-3">
                                                        {event.bundle_services.map(s => <span key={s} className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded-full">{s}</span>)}
                                                    </div>
                                                )}
                                                <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-3 overflow-hidden">
                                                    <div className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-sm">{event.is_free || !event.ticket_price ? 'Free' : `$${event.ticket_price}`}</span>
                                                    <Button size="sm" className="rounded-xl h-8 text-xs gap-1.5" disabled={soldOut} onClick={() => setTicketDialog(event)}>
                                                        <Ticket className="h-3.5 w-3.5" />{soldOut ? 'Sold Out' : 'Get Ticket'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {past.length > 0 && (
                                <div className="mt-8">
                                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Past Events</p>
                                    <div className="space-y-2">
                                        {past.slice(0, 5).map(event => {
                                            const CatIcon = CATEGORY_ICONS[event.category] || Calendar;
                                            return (
                                                <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 opacity-60">
                                                    <CatIcon className="h-5 w-5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium line-clamp-1">{event.title}</p>
                                                        <p className="text-xs text-zinc-400">{event.date} · {event.venue_name}</p>
                                                    </div>
                                                    <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">Ended</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {tab === 'my-tickets' && (
                <div className="space-y-3">
                    {!user ? (
                        <div className="card-premium p-10 text-center text-zinc-400">Log in to view your tickets</div>
                    ) : ticketsLoading ? (
                        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-20 rounded-xl" />)}</div>
                    ) : myTickets.length === 0 ? (
                        <div className="card-premium p-10 text-center">
                            <Ticket className="h-10 w-10 mx-auto mb-3 text-zinc-200 dark:text-zinc-700" strokeWidth={1.5} />
                            <p className="text-zinc-400">No tickets yet</p>
                            <button onClick={() => setTab('browse')} className="mt-3 text-sm font-semibold text-zinc-900 dark:text-white underline underline-offset-2">Browse events</button>
                        </div>
                    ) : myTickets.map(t => (
                        <div key={t.id} className="card-premium p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate">{t.event_title}</p>
                                    <p className="text-xs text-zinc-400 mt-0.5">Qty: {t.quantity} · Code: <span className="font-mono font-bold">{t.ticket_code}</span></p>
                                    <p className="text-xs text-zinc-400">{t.total_amount > 0 ? `$${t.total_amount} paid` : 'Free ticket'}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${t.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>{t.status}</span>
                            </div>
                            <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                                <p className="text-xs font-mono text-zinc-400 text-center tracking-widest">{t.ticket_code}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'venues' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {VENUE_DATA.map((v, i) => (
                        <div key={i} className="card-premium overflow-hidden">
                            <div className="h-28 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <v.Icon className="h-10 w-10 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
                            </div>
                            <div className="p-4">
                                <p className="font-bold text-sm">{v.name}</p>
                                <p className="text-xs text-zinc-400 mt-0.5">{VENUE_TYPES[v.type]} · Up to {v.cap.toLocaleString()} guests</p>
                                <div className="flex flex-wrap gap-1 mt-2 mb-3">
                                    {v.amenities.map(a => <span key={a} className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-full">{a}</span>)}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm">{v.price}</span>
                                    <Button size="sm" className="rounded-xl h-8 text-xs" onClick={() => toast.success("Venue inquiry sent")}>Book Venue</Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Event Dialog */}
            <Dialog open={createDialog} onOpenChange={setCreateDialog}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Create New Event</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-1">
                        <Input placeholder="Event title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="rounded-xl" />
                        <Textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="rounded-xl resize-none" rows={3} />
                        <div className="grid grid-cols-2 gap-3">
                            <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>{Object.entries(CATEGORY_LABELS).map(([c, label]) => <SelectItem key={c} value={c}>{label}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={form.venue_type} onValueChange={v => setForm(p => ({ ...p, venue_type: v }))}>
                                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>{Object.entries(VENUE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <Input placeholder="Venue name *" value={form.venue_name} onChange={e => setForm(p => ({ ...p, venue_name: e.target.value }))} className="rounded-xl" />
                        <Input placeholder="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="rounded-xl" />
                        <div className="grid grid-cols-3 gap-3">
                            <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="rounded-xl" />
                            <Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} className="rounded-xl" />
                            <Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} className="rounded-xl" />
                        </div>
                        <Input placeholder="Organizer name" value={form.organizer_name} onChange={e => setForm(p => ({ ...p, organizer_name: e.target.value }))} className="rounded-xl" />
                        <div className="grid grid-cols-2 gap-3">
                            <Input type="number" placeholder="Total tickets" value={form.total_tickets} onChange={e => setForm(p => ({ ...p, total_tickets: Number(e.target.value) }))} className="rounded-xl" />
                            <Input type="number" placeholder="Price (0 = free)" value={form.ticket_price}
                                onChange={e => setForm(p => ({ ...p, ticket_price: Number(e.target.value), is_free: Number(e.target.value) === 0 }))} className="rounded-xl" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Bundle Services</p>
                            <div className="flex flex-wrap gap-2">
                                {BUNDLE_SERVICES.map(s => {
                                    const active = form.bundle_services?.includes(s);
                                    return (
                                        <button key={s} onClick={() => toggleBundle(s)}
                                            className={`flex items-center gap-1.5 h-7 px-3 rounded-xl text-xs font-semibold border transition-all ${active ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400'}`}>
                                            {active && <Check className="h-3 w-3" />} {s.replace('_', ' ')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <Button className="w-full h-11 rounded-xl gap-2" onClick={createEvent} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {saving ? 'Publishing' : 'Publish Event'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Ticket Dialog */}
            <Dialog open={!!ticketDialog} onOpenChange={() => setTicketDialog(null)}>
                {ticketDialog && (
                    <DialogContent className="max-w-sm">
                        <DialogHeader><DialogTitle>Get Ticket</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-1">
                            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4">
                                <p className="font-bold">{ticketDialog.title}</p>
                                <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5"><Calendar className="h-3 w-3" />{ticketDialog.date}{ticketDialog.start_time && ` at ${ticketDialog.start_time}`}</p>
                                <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5"><MapPin className="h-3 w-3" />{ticketDialog.venue_name}</p>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="font-semibold">Price per ticket</p>
                                <p className="font-bold text-lg">{ticketDialog.is_free || !ticketDialog.ticket_price ? 'Free' : `$${ticketDialog.ticket_price}`}</p>
                            </div>
                            <div className="flex items-center justify-between text-xs text-zinc-400">
                                <span>Available</span>
                                <span>{Math.max(0, (ticketDialog.total_tickets || 0) - (ticketDialog.tickets_sold || 0))} remaining</span>
                            </div>
                            {ticketDialog.bundle_services?.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Bundled Services</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {ticketDialog.bundle_services.map(s => <span key={s} className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">{s}</span>)}
                                    </div>
                                </div>
                            )}
                            <Button className="w-full h-11 rounded-xl gap-2" onClick={() => buyTicket(ticketDialog)} disabled={buying}>
                                {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                                {buying ? 'Booking' : ticketDialog.is_free || !ticketDialog.ticket_price ? 'Reserve Free Ticket' : `Pay $${ticketDialog.ticket_price} & Book`}
                            </Button>
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
}
