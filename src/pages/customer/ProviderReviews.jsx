import { useState, useEffect } from 'react';
import { Star, MessageSquare, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ProviderReviews() {
    const [reviews, setReviews] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState({ rating: 5, comment: '', booking_id: '' });
    const [editId, setEditId] = useState(null);
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        setReviews([]);
        setBookings([]);
        setLoading(false);
    }, []);

    const save = async () => {
        const booking = bookings.find(b => b.id === form.booking_id);
        if (!booking) { toast.error('Select a booking'); return; }
        const data = { ...form, customer_email: userEmail, provider_id: booking.provider_id, booking_id: form.booking_id, customer_name: '' };
        toast.success(editId ? 'Review updated' : 'Review submitted');
        setDialog(false);
    };

    const del = async (id) => {
        setReviews(prev => prev.filter(r => r.id !== id));
        toast.success('Review deleted');
    };

    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="font-display font-bold text-3xl tracking-tight">My Reviews</h1>
                    <p className="text-zinc-500 text-sm mt-1">{reviews.length} reviews · Avg rating: {avgRating}</p>
                </div>
                {bookings.length > 0 && (
                    <Button className="rounded-xl gap-2" onClick={() => { setEditId(null); setForm({ rating: 5, comment: '', booking_id: '' }); setDialog(true); }}>
                        <Plus className="h-4 w-4" /> Write Review
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-24 rounded-2xl" />)}</div>
            ) : reviews.length === 0 ? (
                <div className="card-premium p-12 text-center">
                    <MessageSquare className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm">No reviews yet. Complete a booking to leave a review.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reviews.map(r => (
                        <div key={r.id} className="card-premium p-5">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`} />
                                    ))}
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => { setForm({ rating: r.rating, comment: r.comment, booking_id: r.booking_id }); setEditId(r.id); setDialog(true); }}><Pencil className="h-3 w-3" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-red-400" onClick={() => del(r.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                            </div>
                            <p className="text-sm text-zinc-700">{r.comment || <span className="text-zinc-400 italic">No comment</span>}</p>
                            <p className="text-xs text-zinc-400 mt-2">{r.created_date?.slice(0, 10)}</p>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={dialog} onOpenChange={setDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Write a'} Review</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-1">
                        {!editId && (
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Select Booking</label>
                                <select className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-transparent" value={form.booking_id} onChange={e => setForm(p => ({ ...p, booking_id: e.target.value }))}>
                                    <option value="">Select a completed booking…</option>
                                    {bookings.map(b => <option key={b.id} value={b.id}>{b.service_name} — {b.provider_name} ({b.date})</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Rating</label>
                            <div className="flex gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <button key={i} onClick={() => setForm(p => ({ ...p, rating: i + 1 }))}>
                                        <Star className={`h-7 w-7 ${i < form.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Textarea placeholder="Share your experience…" value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))} className="rounded-xl resize-none" rows={3} />
                        <Button className="w-full h-11 rounded-xl" onClick={save}>{editId ? 'Update Review' : 'Submit Review'}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}