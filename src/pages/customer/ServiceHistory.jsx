import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Package, Star, Clock } from 'lucide-react';

export default function ServiceHistory() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setBookings([]);
        setLoading(false);
    }, []);

    const categoryMap = {};
    bookings.forEach(b => {
        const cat = b.service_name?.split(' ')[0] || 'Other';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const chartData = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

    const totalSpent = bookings.reduce((s, b) => s + (b.price || 0), 0);
    const avgSpend = bookings.length ? (totalSpent / bookings.length).toFixed(0) : 0;

    if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-wave h-20 rounded-2xl" />)}</div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-display font-bold text-3xl tracking-tight">Service History</h1>
                <p className="text-zinc-500 text-sm mt-1">Your completed services and spending patterns</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Services Completed', value: bookings.length, icon: Package },
                    { label: 'Total Spent', value: `$${totalSpent.toLocaleString()}`, icon: TrendingUp },
                    { label: 'Avg per Booking', value: `$${avgSpend}`, icon: Star },
                    { label: 'Unique Providers', value: new Set(bookings.map(b => b.provider_id)).size, icon: Clock },
                ].map(s => (
                    <div key={s.label} className="card-premium p-4">
                        <s.icon className="h-4 w-4 text-zinc-400 mb-2" />
                        <p className="font-black text-2xl text-zinc-900">{s.value}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {chartData.length > 0 && (
                <div className="card-premium p-5">
                    <h2 className="font-bold text-sm mb-4">Services by Category</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="card-premium overflow-hidden">
                <div className="px-5 py-3 border-b border-zinc-50 bg-zinc-50">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Completed Services</p>
                </div>
                {bookings.length === 0 ? (
                    <div className="p-10 text-center text-zinc-400 text-sm">No completed services yet</div>
                ) : (
                    <div className="divide-y divide-zinc-50">
                        {bookings.slice(0, 20).map(b => (
                            <div key={b.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors">
                                <div>
                                    <p className="font-medium text-sm">{b.service_name}</p>
                                    <p className="text-xs text-zinc-400">{b.provider_name} · {b.date}</p>
                                </div>
                                <span className="font-bold text-sm">${b.price || 0}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}