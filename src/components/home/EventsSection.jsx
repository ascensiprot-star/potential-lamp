import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket, ArrowRight, Users, Plus, Music2, Wrench, Handshake, Trophy, Sparkles, ImageIcon, UtensilsCrossed, Building2, TreePine, Sun, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

const CATEGORY_ICONS = {
    concert:    Music2,
    workshop:   Wrench,
    meetup:     Handshake,
    sports:     Trophy,
    festival:   Sparkles,
    exhibition: ImageIcon,
    food:       UtensilsCrossed,
    other:      Calendar,
};

const VENUE_SPOTS = [
    { icon: Building2, name: 'Grand Hall'   },
    { icon: Layers,    name: 'Rooftop'      },
    { icon: TreePine,  name: 'Open Ground'  },
    { icon: Building2, name: 'The Loft'     },
    { icon: Sun,       name: 'Terrace'      },
    { icon: Sparkles,  name: 'Ballroom'     },
];

const VENUE_TYPES = { hall: 'Community Hall', rooftop: 'Rooftop', open_ground: 'Open Ground', indoor: 'Indoor', online: 'Online', other: 'Other' };

export default function EventsSection({ user }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ticketDialog, setTicketDialog] = useState(null);
    const [buying, setBuying] = useState(false);
    const [quickCreate, setQuickCreate] = useState(false);
    const [form, setForm] = useState({ title: '', category: 'meetup', venue_name: '', date: '', ticket_price: 0, is_free: true, total_tickets: 100 });
    const [saving, setSaving] = useState(false);

    const loadEvents = async () => {
        const { data } = await supabase.from('events').select('*').order('date', { ascending: true }).limit(10);
        if (data) setEvents(data.filter(e => !e.date || new Date(e.date) >= new Date(new Date().setHours(0,0,0,0))).slice(0, 6));
        setLoading(false);
    };

    useEffect(() => { loadEvents(); }, []);

    const buyTicket = async (event) => {
        if (!user) { toast.error('Please log in to buy tickets'); return; }
        setBuying(true);
        const code = `TRV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const { error } = await supabase.from('event_tickets').insert([{
            event_id: event.id,
            event_title: event.title,
            buyer_email: user.email,
            buyer_name: user.full_name || user.email?.split('@')[0],
            quantity: 1,
            unit_price: event.ticket_price || 0,
            total_amount: event.ticket_price || 0,
            ticket_code: code
        }]);
        if (!error) {
            await supabase.from('events').update({ tickets_sold: (event.tickets_sold || 0) + 1 }).eq('id', event.id);
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, tickets_sold: (e.tickets_sold || 0) + 1 } : e));
            toast.success(`Ticket booked! Code: ${code}`);
            setTicketDialog(null);
        } else {
            toast.error(error.message || 'Failed to book ticket');
        }
        setBuying(false);
    };

    const createEvent = async () => {
        if (!form.title || !form.date || !form.venue_name) { toast.error('Title, date and venue required'); return; }
        if (!user) { toast.error('Please log in to create events'); return; }
        setSaving(true);
        const { error } = await supabase.from('events').insert([{
            title: form.title,
            category: form.category,
            venue_name: form.venue_name,
            venue_type: 'hall',
            date: form.date,
            ticket_price: form.is_free ? 0 : form.ticket_price,
            is_free: form.is_free,
            total_tickets: form.total_tickets || 100,
            organizer_name: user.full_name || user.email?.split('@')[0],
            organizer_id: user.id
        }]);
        if (!error) {
            toast.success('Event published!');
            setQuickCreate(false);
            setForm({ title: '', category: 'meetup', venue_name: '', date: '', ticket_price: 0, is_free: true, total_tickets: 100 });
            loadEvents();
        } else {
            toast.error(error.message || 'Failed to create event');
        }
        setSaving(false);
    };

    const getCategoryIcon = (cat) => CATEGORY_ICONS[cat] || Calendar;

    return (
        <section>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="font-display font-bold text-xl tracking-tight">Local Events</h2>
                    <p className="text-zinc-500 text-sm mt-0.5 font-inter">Workshops, meetups, concerts & more</p>
                </div>
                <div className="flex items-center gap-2">
                    {user && (
                        <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs" onClick={() => setQuickCreate(true)}>
                            <Plus className="h-3.5 w-3.5" /> Create
                        </Button>
                    )}
                    <Link to="/events" className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                        Full calendar <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1,2,3].map(i => <div key={i} className="skeleton-wave h-36 rounded-2xl" />)}
                </div>
            ) : events.length === 0 ? (
                <div className="card-premium p-10 text-center">
                    <Calendar className="h-8 w-8 mx-auto mb-3 text-zinc-200" />
                    <p className="text-zinc-400 text-sm">No upcoming events</p>
                    {user && <Button size="sm" variant="outline" className="rounded-xl mt-3" onClick={() => setQuickCreate(true)}>Create Event</Button>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {events.map(event => {
                        const CatIcon = getCategoryIcon(event.category);
                        const soldOut = (event.tickets_sold || 0) >= (event.total_tickets || 9999);
                        return (
                            <div key={event.id} className="card-premium overflow-hidden group">
                                <div className="h-28 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative">
                                    <CatIcon className="h-10 w-10 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
                                    <span className="absolute top-3 left-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">{event.category}</span>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-sm mb-2 line-clamp-1">{event.title}</h3>
                                    <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{event.date}</div>
                                        <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.venue_name}</div>
                                        <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{event.tickets_sold || 0}/{event.total_tickets}</div>
                                    </div>
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                        <span className="font-bold text-sm">{event.is_free || !event.ticket_price ? 'Free' : `$${event.ticket_price}`}</span>
                                        <Button size="sm" className="rounded-xl h-7 text-xs gap-1" disabled={soldOut} onClick={() => setTicketDialog(event)}>
                                            <Ticket className="h-3.5 w-3.5" />{soldOut ? 'Sold Out' : 'Get Ticket'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Ticket Dialog */}
            <Dialog open={!!ticketDialog} onOpenChange={() => setTicketDialog(null)}>
                {ticketDialog && (
                    <DialogContent className="max-w-sm">
                        <DialogHeader><DialogTitle>Get Ticket</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-1">
                            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4">
                                <p className="font-bold">{ticketDialog.title}</p>
                                <p className="text-xs text-zinc-400 mt-1"><Calendar className="inline h-3 w-3 mr-1" />{ticketDialog.date}</p>
                                <p className="text-xs text-zinc-400"><MapPin className="inline h-3 w-3 mr-1" />{ticketDialog.venue_name}</p>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold">Price</span>
                                <span className="font-bold">{ticketDialog.is_free || !ticketDialog.ticket_price ? 'Free' : `$${ticketDialog.ticket_price}`}</span>
                            </div>
                            <Button className="w-full h-11 rounded-xl gap-2" onClick={() => buyTicket(ticketDialog)} disabled={buying}>
                                <Ticket className="h-4 w-4" />{buying ? 'Booking...' : 'Confirm'}
                            </Button>
                        </div>
                    </DialogContent>
                )}
            </Dialog>

            {/* Quick Create Dialog */}
            <Dialog open={quickCreate} onOpenChange={setQuickCreate}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-1">
                        <Input placeholder="Event title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="rounded-xl" />
                        <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="meetup">Meetup</SelectItem>
                                <SelectItem value="workshop">Workshop</SelectItem>
                                <SelectItem value="concert">Concert</SelectItem>
                                <SelectItem value="sports">Sports</SelectItem>
                                <SelectItem value="food">Food & Drink</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input placeholder="Venue name *" value={form.venue_name} onChange={e => setForm(p => ({ ...p, venue_name: e.target.value }))} className="rounded-xl" />
                        <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="rounded-xl" />
                        <div className="grid grid-cols-2 gap-3">
                            <Input type="number" placeholder="Tickets" value={form.total_tickets} onChange={e => setForm(p => ({ ...p, total_tickets: Number(e.target.value) }))} className="rounded-xl" />
                            <Input type="number" placeholder="Price ($0 = free)" value={form.ticket_price} onChange={e => setForm(p => ({ ...p, ticket_price: Number(e.target.value), is_free: Number(e.target.value) === 0 }))} className="rounded-xl" />
                        </div>
                        <Button className="w-full h-10 rounded-xl" onClick={createEvent} disabled={saving}>{saving ? 'Creating...' : 'Create Event'}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </section>
    );
}
