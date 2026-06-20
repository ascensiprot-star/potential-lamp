import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import {
    computePlatformKPIs, computeMonthlyRevenue, computeBookingsByDayOfWeek,
    computeTopProviders, computeStatusDistribution, computeRevenueByCategory,
    computeCustomerRetention, forecastNextMonthRevenue,
} from '@/lib/platform/analyticsEngine';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, DollarSign, CalendarCheck, Star, ArrowUpRight, ArrowDownRight, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const useChartColors = () => ({
    accent:  getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#7c6fcd',
    success: getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim() || '#22c55e',
    error:   getComputedStyle(document.documentElement).getPropertyValue('--color-error').trim() || '#ef4444',
    warning: getComputedStyle(document.documentElement).getPropertyValue('--color-warning').trim() || '#f59e0b',
    grid:    getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim() || 'rgba(128,128,128,0.1)',
    text:    getComputedStyle(document.documentElement).getPropertyValue('--color-text-subtle').trim() || '#6b6f82',
    muted:   getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim() || '#b0b3c1',
});

const STATUS_COLORS = {
    completed: '#22c55e', cancelled: '#ef4444', pending: '#f59e0b',
    confirmed: '#3b82f6', in_progress: '#7c6fcd', no_show: '#6b7280',
};

function KPI({ label, value, sub, icon: Icon, trend, color }) {
    const up = trend > 0;
    return (
        <div className="card-premium p-5">
            <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                    <Icon className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                </div>
                {trend != null && (
                    <div className={`flex items-center gap-1 text-xs font-semibold`}
                        style={{ color: up ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <p className="text-2xl font-black" style={{ color: color || 'var(--color-text)' }}>{value}</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
            {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{sub}</p>}
        </div>
    );
}

export default function Analytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');
    const colors = useChartColors();

    const tooltipStyle = {
        contentStyle: {
            backgroundColor: 'var(--color-surface-high)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            color: 'var(--color-text)',
            fontSize: 12,
        },
    };

    const load = async () => {
        setLoading(true);
        const [{ data: b }, { data: p }, { data: r }, { data: s }] = await Promise.all([
            supabase.from('bookings').select('*'),
            supabase.from('providers').select('*'),
            supabase.from('reviews').select('*'),
            supabase.from('services').select('*'),
        ]);
        const bookings = b || [], providers = p || [], reviews = r || [], services = s || [];
        const kpis = computePlatformKPIs({ bookings, providers, reviews });
        const monthly = computeMonthlyRevenue(bookings);
        const byDay = computeBookingsByDayOfWeek(bookings);
        const topProviders = computeTopProviders(bookings, providers, 10);
        const statusDist = computeStatusDistribution(bookings);
        const byCategory = computeRevenueByCategory(bookings, services);
        const retention = computeCustomerRetention(bookings);
        const forecast = forecastNextMonthRevenue(monthly);
        setData({ kpis, monthly, byDay, topProviders, statusDist, byCategory, retention, forecast });
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    if (loading) return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card-premium skeleton-wave h-28" />)}
            </div>
        </div>
    );

    const { kpis, monthly, byDay, topProviders, statusDist, byCategory, retention, forecast } = data;
    const TABS = ['overview', 'revenue', 'providers', 'customers', 'operations'];

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="font-black text-2xl" style={{ color: 'var(--color-text)' }}>Platform Intelligence</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>Real-time analytics across all operations</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={load}>
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
            </div>

            {/* Tab nav */}
            <div className="flex gap-1 flex-wrap">
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className="px-4 h-9 rounded-xl text-sm font-semibold capitalize transition-all"
                        style={{
                            backgroundColor: tab === t ? 'var(--color-primary)' : 'var(--color-surface-high)',
                            color: tab === t ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                        }}>
                        {t}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KPI label="Total Revenue" value={`$${kpis.totalRevenue.toLocaleString()}`} sub="from completed bookings" icon={DollarSign} />
                        <KPI label="Total Bookings" value={kpis.totalBookings.toLocaleString()} sub={`${kpis.pendingBookings} pending`} icon={CalendarCheck} />
                        <KPI label="Active Providers" value={kpis.approvedProviders} sub={`${kpis.pendingProviders} pending review`} icon={Users} />
                        <KPI label="Avg Rating" value={kpis.avgRating.toFixed(2)} sub={`${kpis.totalReviews} reviews`} icon={Star} />
                        <KPI label="Completion Rate" value={`${kpis.completionRate.toFixed(1)}%`} icon={TrendingUp} color="var(--color-success)" />
                        <KPI label="Cancellation Rate" value={`${kpis.cancellationRate.toFixed(1)}%`} icon={TrendingUp} color="var(--color-error)" />
                        <KPI label="Avg Booking Value" value={`$${kpis.avgBookingValue.toFixed(2)}`} icon={DollarSign} />
                        {forecast && <KPI label="Revenue Forecast" value={`$${forecast.toLocaleString()}`} sub="next month (linear)" icon={Zap} color="var(--color-info)" />}
                    </div>

                    <div className="card-premium p-6">
                        <h2 className="font-bold text-base mb-4" style={{ color: 'var(--color-text)' }}>Monthly Revenue Trend</h2>
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={monthly}>
                                <defs>
                                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors.accent} stopOpacity={0.25} />
                                        <stop offset="95%" stopColor={colors.accent} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: colors.text }} />
                                <YAxis tick={{ fontSize: 11, fill: colors.text }} />
                                <Tooltip {...tooltipStyle} formatter={(v) => [`$${v.toLocaleString()}`, 'Revenue']} />
                                <Area type="monotone" dataKey="revenue" stroke={colors.accent} strokeWidth={2} fill="url(#revenueGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="card-premium p-6">
                            <h2 className="font-bold text-base mb-4" style={{ color: 'var(--color-text)' }}>Booking Status Distribution</h2>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                        {statusDist.map((entry) => (
                                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || colors.muted} />
                                        ))}
                                    </Pie>
                                    <Tooltip {...tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="card-premium p-6">
                            <h2 className="font-bold text-base mb-4" style={{ color: 'var(--color-text)' }}>Bookings by Day of Week</h2>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={byDay}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: colors.text }} />
                                    <YAxis tick={{ fontSize: 11, fill: colors.text }} />
                                    <Tooltip {...tooltipStyle} />
                                    <Bar dataKey="bookings" fill={colors.accent} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'revenue' && (
                <div className="space-y-6">
                    <div className="card-premium p-6">
                        <h2 className="font-bold text-base mb-4" style={{ color: 'var(--color-text)' }}>Revenue by Category</h2>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={byCategory} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                <XAxis type="number" tick={{ fontSize: 11, fill: colors.text }} />
                                <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: colors.text }} width={100} />
                                <Tooltip {...tooltipStyle} formatter={(v) => [`$${v.toLocaleString()}`, 'Revenue']} />
                                <Bar dataKey="revenue" fill={colors.accent} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="card-premium p-6">
                        <h2 className="font-bold text-base mb-4" style={{ color: 'var(--color-text)' }}>Monthly Bookings Volume</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={monthly}>
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: colors.text }} />
                                <YAxis tick={{ fontSize: 11, fill: colors.text }} />
                                <Tooltip {...tooltipStyle} />
                                <Line type="monotone" dataKey="bookings" stroke={colors.accent} strokeWidth={2} dot={{ r: 4, fill: colors.accent }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {tab === 'providers' && (
                <div className="space-y-4">
                    <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Top Providers by Revenue</h2>
                    {topProviders.map((item, i) => item.provider && (
                        <div key={i} className="card-premium p-4 flex items-center gap-4">
                            <span className="text-2xl font-black w-8 shrink-0" style={{ color: 'var(--color-border-strong)' }}>{i + 1}</span>
                            <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                                style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                {item.provider.logo_url
                                    ? <img src={item.provider.logo_url} alt="" className="w-full h-full object-cover" />
                                    : <span className="font-black" style={{ color: 'var(--color-text-subtle)' }}>{item.provider.business_name?.[0]}</span>
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{item.provider.business_name}</p>
                                <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>{item.bookings} completed bookings</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-black" style={{ color: 'var(--color-text)' }}>${item.revenue.toLocaleString()}</p>
                                <div className="flex items-center gap-1 justify-end mt-0.5">
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <div key={j} className="h-1 w-4 rounded-full" style={{
                                            backgroundColor: j < Math.round(item.provider.rating || 0) ? 'var(--color-warning)' : 'var(--color-surface-highest)',
                                        }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                    {topProviders.length === 0 && (
                        <div className="text-center py-12" style={{ color: 'var(--color-text-subtle)' }}>No provider data available yet.</div>
                    )}
                </div>
            )}

            {tab === 'customers' && (
                <div className="space-y-6">
                    <div className="card-premium p-6">
                        <h2 className="font-bold text-base mb-4" style={{ color: 'var(--color-text)' }}>New vs Returning Customers</h2>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={retention}>
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: colors.text }} />
                                <YAxis tick={{ fontSize: 11, fill: colors.text }} />
                                <Tooltip {...tooltipStyle} />
                                <Legend />
                                <Bar dataKey="new" name="New" fill={colors.accent} radius={[4, 4, 0, 0]} stackId="a" />
                                <Bar dataKey="returning" name="Returning" fill={colors.muted} radius={[4, 4, 0, 0]} stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {tab === 'operations' && (
                <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        {[
                            { label: 'Pending Review', value: kpis.pendingBookings, sub: 'bookings need attention', color: 'var(--color-warning)' },
                            { label: 'In Progress', value: kpis.confirmedBookings, sub: 'confirmed bookings', color: 'var(--color-info)' },
                            { label: 'Providers Pending', value: kpis.pendingProviders, sub: 'await approval', color: 'var(--color-error)' },
                        ].map(k => (
                            <div key={k.label} className="card-premium p-5">
                                <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--color-text-subtle)' }}>{k.label}</p>
                                <p className="text-3xl font-black" style={{ color: k.color }}>{k.value}</p>
                                <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>{k.sub}</p>
                            </div>
                        ))}
                    </div>
                    <div className="card-premium p-6">
                        <h2 className="font-bold text-base mb-4" style={{ color: 'var(--color-text)' }}>Booking Volume by Day of Week</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={byDay}>
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: colors.text }} />
                                <YAxis tick={{ fontSize: 11, fill: colors.text }} />
                                <Tooltip {...tooltipStyle} />
                                <Bar dataKey="bookings" fill={colors.accent} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
