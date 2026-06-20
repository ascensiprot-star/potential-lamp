import { useState, useEffect } from 'react';
import { Search, Users, Crown, AlertTriangle, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TIER_STYLES = {
    champion: 'bg-amber-100 text-amber-700',
    vip: 'bg-violet-100 text-violet-700',
    regular: 'bg-blue-100 text-blue-700',
    new: 'bg-zinc-100 text-zinc-600',
};

export default function CustomerManagement() {
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tierFilter, setTierFilter] = useState('all');

    useEffect(() => {
        setMemories([]);
        setLoading(false);
    }, []);

    const filtered = memories.filter(m => {
        const matchSearch = !search || m.customer_email?.toLowerCase().includes(search.toLowerCase());
        const matchTier = tierFilter === 'all' || m.loyalty_tier === tierFilter;
        return matchSearch && matchTier;
    });

    const totalLTV = memories.reduce((s, m) => s + (m.lifetime_value || 0), 0);
    const vipCount = memories.filter(m => ['vip', 'champion'].includes(m.loyalty_tier)).length;
    const atRisk = memories.filter(m => (m.risk_score || 0) > 70).length;

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-inter font-black text-2xl tracking-tight">Customer Management</h1>
                    <p className="text-zinc-400 text-sm">Customer insights and lifecycle management</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Customers', value: memories.length, icon: Users },
                    { label: 'Total LTV', value: `$${totalLTV.toLocaleString()}`, icon: TrendingUp },
                    { label: 'VIP / Champion', value: vipCount, icon: Crown },
                    { label: 'At-Risk Customers', value: atRisk, icon: AlertTriangle },
                ].map(k => (
                    <div key={k.label} className="card-premium p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{k.label}</span>
                            <k.icon className="h-4 w-4 text-zinc-400" />
                        </div>
                        <p className="font-black text-3xl text-zinc-900">{k.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email…" className="pl-9 rounded-xl" />
                </div>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="rounded-xl w-36"><SelectValue placeholder="Tier" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Tiers</SelectItem>
                        <SelectItem value="champion">Champion</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton-wave h-16 rounded-2xl" />)}</div>
            ) : (
                <div className="card-premium overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            <tr>
                                <th className="text-left px-5 py-3">Customer</th>
                                <th className="text-right px-5 py-3">Bookings</th>
                                <th className="text-right px-5 py-3">LTV</th>
                                <th className="text-right px-5 py-3">Avg Rating</th>
                                <th className="text-right px-5 py-3">Risk</th>
                                <th className="text-right px-5 py-3">Tier</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {filtered.map(m => (
                                <tr key={m.id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-5 py-3">
                                        <p className="font-medium">{m.customer_email}</p>
                                        {m.last_booking_at && <p className="text-xs text-zinc-400">Last: {m.last_booking_at?.slice(0, 10)}</p>}
                                    </td>
                                    <td className="px-5 py-3 text-right font-semibold">{m.booking_count || 0}</td>
                                    <td className="px-5 py-3 text-right font-bold">${(m.lifetime_value || 0).toLocaleString()}</td>
                                    <td className="px-5 py-3 text-right text-zinc-500">{m.average_rating_given ? `⭐ ${m.average_rating_given.toFixed(1)}` : '—'}</td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <div className="h-1.5 w-12 bg-zinc-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${(m.risk_score || 0) > 70 ? 'bg-red-400' : (m.risk_score || 0) > 40 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${m.risk_score || 0}%` }} />
                                            </div>
                                            <span className="text-xs text-zinc-500">{m.risk_score || 0}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${TIER_STYLES[m.loyalty_tier] || 'bg-zinc-100 text-zinc-600'}`}>{m.loyalty_tier || 'new'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && <div className="p-10 text-center text-zinc-400 text-sm">No customers found</div>}
                </div>
            )}
        </div>
    );
}