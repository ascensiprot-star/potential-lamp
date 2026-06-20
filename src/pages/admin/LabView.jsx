import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

const TIER_COLORS = { champion: '#f59e0b', trusted: '#10b981', verified: '#3b82f6', rising: '#8b5cf6', new: '#6b7280' };

async function apiFetch(path) {
    const r = await fetch(path, { credentials: 'include' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
}

function StatCard({ label, value, sub, color }) {
    return (
        <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 12, padding: '18px 20px',
        }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--color-text)', lineHeight: 1.1 }}>{value ?? '—'}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

function SectionHeader({ title }) {
    return (
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', margin: '28px 0 14px' }}>{title}</div>
    );
}

function ChartContainer({ title, children, height = 220 }) {
    return (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
            {title && <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>{title}</div>}
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {children}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default function LabView() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);

    const load = async () => {
        try {
            const d = await apiFetch('/api/admin/lab-data');
            setData(d);
            setLastRefresh(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Lab data error:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const iv = setInterval(load, 30000);
        return () => clearInterval(iv);
    }, []);

    const tooltipStyle = {
        contentStyle: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            color: 'var(--color-text)',
            fontSize: 12,
        },
    };

    if (loading) {
        return (
            <div style={{ padding: 32, color: 'var(--color-text-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: 13 }}>Loading Lab View…</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ padding: 32, color: 'var(--color-text-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: 16, color: 'var(--color-text)', marginBottom: 8 }}>Lab data unavailable</div>
                <button onClick={load} style={{ fontSize: 13, cursor: 'pointer', color: 'var(--color-primary)', background: 'none', border: 'none' }}>Retry</button>
            </div>
        );
    }

    const trustDist = data.trust_distribution || [];
    const bnpl = data.bnpl_risk || {};
    const loyalty = data.loyalty_economy || {};
    const zones = data.zones || [];
    const platformStats = data.platform_stats || {};

    return (
        <div style={{ padding: '24px 24px 60px', maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>Admin Lab View</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                    Last updated {lastRefresh} · auto-refreshes every 30s
                </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-subtle)', marginBottom: 24 }}>Research layer — live platform metrics</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                <StatCard label="Total Users" value={platformStats.total_users?.toLocaleString()} />
                <StatCard label="Providers" value={platformStats.total_providers?.toLocaleString()} />
                <StatCard label="Total Bookings" value={platformStats.total_bookings?.toLocaleString()} />
                <StatCard label="Bookings Today" value={platformStats.bookings_today?.toLocaleString()} color="var(--color-primary)" />
                <StatCard label="Active BNPL" value={bnpl.active_count?.toLocaleString()} />
                <StatCard label="BNPL Exposure" value={bnpl.total_exposure != null ? `PKR ${parseInt(bnpl.total_exposure).toLocaleString()}` : '—'} color="#f59e0b" />
                <StatCard label="Coins Issued" value={loyalty.total_coins_issued != null ? parseInt(loyalty.total_coins_issued).toLocaleString() : '—'} />
                <StatCard label="Coin Liability" value={loyalty.outstanding_balance != null ? parseInt(loyalty.outstanding_balance).toLocaleString() : '—'} sub="coins outstanding" />
            </div>

            <SectionHeader title="Trust Distribution" />
            {trustDist.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <ChartContainer title="Providers by Trust Tier" height={200}>
                        <BarChart data={trustDist} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <XAxis dataKey="tier" tick={{ fill: 'var(--color-text-subtle)', fontSize: 11 }} />
                            <YAxis tick={{ fill: 'var(--color-text-subtle)', fontSize: 11 }} />
                            <Tooltip {...tooltipStyle} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {trustDist.map((entry, i) => (
                                    <Cell key={i} fill={TIER_COLORS[entry.tier] || '#6b7280'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                    <ChartContainer title="Tier Share" height={200}>
                        <PieChart>
                            <Pie data={trustDist} dataKey="count" nameKey="tier" cx="50%" cy="50%" outerRadius={80} label={({ tier, percent }) => `${tier} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                {trustDist.map((entry, i) => (
                                    <Cell key={i} fill={TIER_COLORS[entry.tier] || '#6b7280'} />
                                ))}
                            </Pie>
                            <Tooltip {...tooltipStyle} formatter={(v, n) => [v, n]} />
                        </PieChart>
                    </ChartContainer>
                </div>
            ) : (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24, color: 'var(--color-text-subtle)', fontSize: 13 }}>
                    No provider trust data yet. Trust scores are computed after bookings complete.
                </div>
            )}

            <SectionHeader title="Zone Health Grid" />
            {zones.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                {['Zone', 'Health Score', 'Demand Index', 'Status', 'Last Updated'].map(h => (
                                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-subtle)', fontWeight: 600, fontSize: 11 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {zones.map((z, i) => (
                                <tr key={z.id || i} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'transparent' }}>
                                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text)' }}>{z.name || z.id?.slice(0, 8)}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 60, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ width: `${z.health_score || 0}%`, height: '100%', background: (z.health_score || 0) >= 70 ? '#10b981' : (z.health_score || 0) >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                                            </div>
                                            <span style={{ color: 'var(--color-text)' }}>{z.health_score || 0}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 12px', color: 'var(--color-text)' }}>{z.demand_index || 0}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <span style={{
                                            fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 8px',
                                            background: (z.health_score || 0) >= 70 ? '#10b98120' : (z.health_score || 0) >= 40 ? '#f59e0b20' : '#ef444420',
                                            color: (z.health_score || 0) >= 70 ? '#10b981' : (z.health_score || 0) >= 40 ? '#f59e0b' : '#ef4444',
                                        }}>{(z.health_score || 0) >= 70 ? 'Active' : (z.health_score || 0) >= 40 ? 'Moderate' : 'Quiet'}</span>
                                    </td>
                                    <td style={{ padding: '10px 12px', color: 'var(--color-text-subtle)' }}>
                                        {z.updated_at ? new Date(z.updated_at).toLocaleString() : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24, color: 'var(--color-text-subtle)', fontSize: 13 }}>
                    No neighborhood zones configured yet.
                </div>
            )}

            <SectionHeader title="BNPL Risk Dashboard" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                <StatCard label="Active Agreements" value={bnpl.active_count} />
                <StatCard label="Total Exposure" value={bnpl.total_exposure != null ? `PKR ${parseInt(bnpl.total_exposure).toLocaleString()}` : '—'} color="#f59e0b" />
                <StatCard label="Overdue" value={bnpl.overdue_count} color={bnpl.overdue_count > 0 ? '#ef4444' : undefined} />
                <StatCard label="Defaulted" value={bnpl.defaulted_count} color={bnpl.defaulted_count > 0 ? '#ef4444' : undefined} />
            </div>

            <SectionHeader title="Loyalty Economy" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                <StatCard label="Total Coins Issued" value={loyalty.total_coins_issued != null ? parseInt(loyalty.total_coins_issued).toLocaleString() : '—'} />
                <StatCard label="Total Redeemed" value={loyalty.total_coins_redeemed != null ? parseInt(Math.abs(loyalty.total_coins_redeemed)).toLocaleString() : '—'} />
                <StatCard label="Outstanding Balance" value={loyalty.outstanding_balance != null ? parseInt(loyalty.outstanding_balance).toLocaleString() : '—'} sub="coins in circulation" color="var(--color-primary)" />
                <StatCard label="Users with Coins" value={loyalty.users_with_coins} />
            </div>
        </div>
    );
}
