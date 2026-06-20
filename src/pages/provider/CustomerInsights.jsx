import { useState, useEffect } from 'react';
import { Users, Star, TrendingUp, Clock, MapPin, Cpu, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CustomerInsights() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aiSummary, setAiSummary] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        setBookings([]);
        setLoading(false);
    }, []);

    const customerMap = bookings.reduce((acc, b) => {
        const email = b.customer_email;
        if (!acc[email]) acc[email] = { email, bookings: [], spent: 0 };
        acc[email].bookings.push(b);
        acc[email].spent += b.price || 0;
        return acc;
    }, {});
    const customers = Object.values(customerMap).sort((a, b) => b.spent - a.spent);

    const getAiSummary = async () => {
        setAiLoading(true);
        const res = `**Demo Mode** — AI backend not configured. Total customers: ${customers.length}. Top spenders: ${customers.slice(0, 3).map(c => `${c.email}: $${c.spent}`).join(', ') || 'none'}.`;
        setAiSummary(res);
        setAiLoading(false);
    };

    if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton-wave h-16 rounded-2xl" />)}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="font-display font-bold text-2xl tracking-tight">Customer Insights</h1>
                    <p className="text-zinc-400 text-sm">Know your customers deeply with Simon AI</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="card-premium p-4"><div className="text-2xl font-black">{customers.length}</div><div className="text-xs text-zinc-400">Unique Customers</div></div>
                <div className="card-premium p-4"><div className="text-2xl font-black">{customers.filter(c => c.bookings.length > 1).length}</div><div className="text-xs text-zinc-400">Repeat Customers</div></div>
                <div className="card-premium p-4"><div className="text-2xl font-black">${customers.length ? (customers.reduce((s, c) => s + c.spent, 0) / customers.length).toFixed(0) : 0}</div><div className="text-xs text-zinc-400">Avg Customer Value</div></div>
            </div>

            {/* AI Summary */}
            <div className="card-premium p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><Cpu className="h-4 w-4" /><h2 className="font-semibold text-sm">Simon's Customer Analysis</h2></div>
                    <Button size="sm" onClick={getAiSummary} disabled={aiLoading} className="rounded-xl bg-zinc-900 h-8">
                        {aiLoading ? 'Analyzing...' : 'Analyze'}
                    </Button>
                </div>
                {aiSummary ? <p className="text-sm text-zinc-600 leading-relaxed">{aiSummary}</p> : <p className="text-sm text-zinc-400">Get Simon's AI analysis of your customer patterns.</p>}
            </div>

            {/* Customer list */}
            <div className="space-y-2">
                {customers.slice(0, 15).map(c => (
                    <div key={c.email} className="card-premium p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-sm font-black text-zinc-500 shrink-0">
                            {c.email[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-800 truncate">{c.email}</p>
                            <p className="text-xs text-zinc-400">{c.bookings.length} booking{c.bookings.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-zinc-900">${c.spent.toFixed(0)}</p>
                            {c.bookings.length > 2 && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>VIP</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}