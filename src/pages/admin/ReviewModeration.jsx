import { useState, useEffect } from 'react';
import { Star, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ReviewModeration() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [ratingFilter, setRatingFilter] = useState('all');

    useEffect(() => {
    }, []);

    const del = async (id) => {
        setReviews(prev => prev.filter(r => r.id !== id));
        toast.success('Review removed');
    };

    const filtered = reviews.filter(r => {
        const matchSearch = !search || r.customer_email?.toLowerCase().includes(search.toLowerCase()) || r.comment?.toLowerCase().includes(search.toLowerCase());
        const matchRating = ratingFilter === 'all' || r.rating === Number(ratingFilter);
        return matchSearch && matchRating;
    });

    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';
    const lowRating = reviews.filter(r => r.rating <= 2).length;

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="font-inter font-black text-2xl tracking-tight">Review Moderation</h1>
                <p className="text-zinc-400 text-sm">Monitor and moderate platform reviews</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Reviews', value: reviews.length },
                    { label: 'Average Rating', value: avgRating },
                    { label: '5-Star Reviews', value: reviews.filter(r => r.rating === 5).length },
                    { label: 'Low Ratings (≤2)', value: lowRating },
                ].map(k => (
                    <div key={k.label} className="card-premium p-4 text-center">
                        <p className="font-black text-3xl text-zinc-900">{k.value}</p>
                        <p className="text-xs text-zinc-400 mt-1">{k.label}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews…" className="pl-9 rounded-xl" />
                </div>
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                    <SelectTrigger className="rounded-xl w-36"><SelectValue placeholder="Rating" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        {[5, 4, 3, 2, 1].map(r => <SelectItem key={r} value={String(r)}>{'⭐'.repeat(r)} ({r} star)</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton-wave h-24 rounded-2xl" />)}</div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(r => (
                        <div key={r.id} className={`card-premium p-5 ${r.rating <= 2 ? 'border-l-4 border-l-red-300' : ''}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex gap-0.5">
                                            {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`} />)}
                                        </div>
                                        <span className="text-xs text-zinc-400">{r.customer_email}</span>
                                        <span className="text-xs text-zinc-300">·</span>
                                        <span className="text-xs text-zinc-400">{r.created_date?.slice(0, 10)}</span>
                                    </div>
                                    <p className="text-sm text-zinc-700">{r.comment || <span className="text-zinc-400 italic">No comment</span>}</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-400 hover:text-red-600" onClick={() => del(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <div className="card-premium p-10 text-center text-zinc-400 text-sm">No reviews found</div>}
                </div>
            )}
        </div>
    );
}