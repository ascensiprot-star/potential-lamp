import { useState, useEffect } from 'react';
import { Send, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ProviderPayouts() {
    const [providers, setProviders] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        setProviders([]); setBookings([]); setLoading(false);
    }, []);

    const payoutData = providers.map(p => {
        const providerBookings = bookings.filter(b => b.provider_id === p.id);
        const totalEarnings = providerBookings.reduce((s, b) => s + (b.price || 0), 0);
        const platformFee = totalEarnings * 0.15;
        const netPayout = totalEarnings - platformFee;
        return { ...p, totalEarnings, platformFee, netPayout, bookingCount: providerBookings.length };
    });

    const filtered = payoutData.filter(p => !search || p.business_name?.toLowerCase().includes(search.toLowerCase()) || p.user_email?.toLowerCase().includes(search.toLowerCase()));

    const totalPlatformFees = payoutData.reduce((s, p) => s + p.platformFee, 0);
    const totalPayouts = payoutData.reduce((s, p) => s + p.netPayout, 0);

    const processPayout = (provider) => {
        toast.success(`Payout of $${provider.netPayout.toFixed(2)} initiated for ${provider.business_name}`);
    };

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="font-inter font-black text-2xl tracking-tight">Provider Payouts</h1>
                <p className="text-zinc-400 text-sm">Manage earnings and disbursements</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Earnings', value: `$${(totalPlatformFees + totalPayouts).toLocaleString()}` },
                    { label: 'Platform Fees (15%)', value: `$${totalPlatformFees.toLocaleString()}` },
                    { label: 'Pending Payouts', value: `$${totalPayouts.toLocaleString()}` },
                    { label: 'Providers', value: providers.length },
                ].map(k => (
                    <div key={k.label} className="card-premium p-5">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{k.label}</p>
                        <p className="font-black text-2xl text-zinc-900">{k.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search providers…" className="pl-9 rounded-xl" />
                </div>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton-wave h-16 rounded-2xl" />)}</div>
            ) : (
                <div className="card-premium overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            <tr>
                                <th className="text-left px-5 py-3">Provider</th>
                                <th className="text-right px-5 py-3">Bookings</th>
                                <th className="text-right px-5 py-3">Total Earned</th>
                                <th className="text-right px-5 py-3">Platform Fee</th>
                                <th className="text-right px-5 py-3">Net Payout</th>
                                <th className="text-right px-5 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {filtered.map(p => (
                                <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-5 py-3">
                                        <p className="font-semibold">{p.business_name}</p>
                                        <p className="text-xs text-zinc-400">{p.user_email}</p>
                                    </td>
                                    <td className="px-5 py-3 text-right">{p.bookingCount}</td>
                                    <td className="px-5 py-3 text-right font-semibold">${p.totalEarnings.toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right text-zinc-500">${p.platformFee.toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right font-bold text-emerald-700">${p.netPayout.toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right">
                                        {p.netPayout > 0 ? (
                                            <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs gap-1" onClick={() => processPayout(p)}>
                                                <Send className="h-3 w-3" /> Pay
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-zinc-300">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && <div className="p-10 text-center text-zinc-400 text-sm">No providers found</div>}
                </div>
            )}
        </div>
    );
}