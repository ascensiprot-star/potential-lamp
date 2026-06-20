import { useState, useEffect } from 'react';
import { CalendarDays, Search, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_STYLES = {
    completed: { bg: 'rgba(110,231,183,0.12)', color: 'var(--color-success)', border: 'rgba(110,231,183,0.25)' },
    confirmed:  { bg: 'rgba(147,197,253,0.12)', color: 'var(--color-info)',    border: 'rgba(147,197,253,0.25)' },
    pending:    { bg: 'rgba(252,211,77,0.12)',  color: 'var(--color-warning)', border: 'rgba(252,211,77,0.25)'  },
    cancelled:  { bg: 'rgba(252,165,165,0.12)', color: 'var(--color-error)',   border: 'rgba(252,165,165,0.25)' },
    no_show:    { bg: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: 'var(--color-border)' },
};

export default function BookingHistory() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => { setBookings([]); setLoading(false); }, []);

    const filtered = bookings.filter(b => {
        const matchSearch = !search || b.service_name?.toLowerCase().includes(search.toLowerCase()) || b.provider_name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || b.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalSpent = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.price || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="font-black text-2xl tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>Booking History</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{bookings.length} total bookings · ${totalSpent.toLocaleString()} spent</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total',     value: bookings.length,                                                       sub: 'bookings'      },
                    { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length,                  sub: 'services done' },
                    { label: 'Upcoming',  value: bookings.filter(b => ['pending','confirmed'].includes(b.status)).length, sub: 'scheduled'     },
                    { label: 'Spent',     value: `$${totalSpent.toLocaleString()}`,                                      sub: 'lifetime'      },
                ].map(s => (
                    <div key={s.label} className="rounded-xl shimmer" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
                        <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-subtle)' }}>{s.label}</p>
                        <p className="font-black text-2xl" style={{ color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>{s.value}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{s.sub}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-text-subtle)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bookings…"
                        className="w-full h-9 pl-9 pr-3 rounded-xl text-sm outline-none"
                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text)', fontFamily: 'Inter,sans-serif' }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="h-9 rounded-xl px-3 text-sm outline-none"
                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text)', fontFamily: 'Inter,sans-serif' }}>
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton-wave h-16 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="rounded-xl p-12 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <CalendarDays className="h-9 w-9 mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
                    <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>No bookings found</p>
                    <Link to="/services" className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', textDecoration: 'none' }}>
                        Browse Services
                    </Link>
                </div>
            ) : (
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    {filtered.map((b, i) => {
                        const st = STATUS_STYLES[b.status] || STATUS_STYLES.no_show;
                        return (
                            <div key={b.id} className="flex items-center gap-4 px-4 py-3.5 transition-colors"
                                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)')}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                    <CalendarDays className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-primary)' }}>{b.service_name}</p>
                                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{b.provider_name} · {b.date} {b.time_slot}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>${b.price || 0}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                                        {b.status}
                                    </span>
                                    {b.status === 'completed' && (
                                        <Link to={`/providers/${b.provider_id}`} style={{ color: 'var(--color-text-subtle)' }}
                                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-subtle)')}>
                                            <Star className="h-4 w-4" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
