import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Package, Star, DollarSign, ArrowRight, TrendingUp, Clock, Users } from 'lucide-react';

const STATUS_CONFIG = {
    pending:     { label: 'Pending',     bg: 'rgba(252,211,77,0.12)',  color: 'var(--color-warning)', border: 'rgba(252,211,77,0.25)' },
    confirmed:   { label: 'Confirmed',   bg: 'rgba(110,231,183,0.12)', color: 'var(--color-success)', border: 'rgba(110,231,183,0.25)' },
    in_progress: { label: 'In Progress', bg: 'rgba(147,197,253,0.12)', color: 'var(--color-info)',    border: 'rgba(147,197,253,0.25)' },
    completed:   { label: 'Completed',   bg: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: 'var(--color-border)' },
    cancelled:   { label: 'Cancelled',   bg: 'rgba(252,165,165,0.12)', color: 'var(--color-error)',   border: 'rgba(252,165,165,0.25)' },
    no_show:     { label: 'No Show',     bg: 'rgba(252,165,165,0.12)', color: 'var(--color-error)',   border: 'rgba(252,165,165,0.25)' },
};

const KPICard = ({ icon: Icon, label, value, trend }) => (
    <div className="rounded-xl p-4 shimmer" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between mb-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)' }}>
                <Icon className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
            </div>
            {trend && (
                <div className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-success)' }}>
                    <TrendingUp className="h-3 w-3" />{trend}
                </div>
            )}
        </div>
        <div className="font-black text-2xl mb-1" style={{ color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>{value}</div>
        <div className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
);

const BookingItem = ({ booking, last }) => {
    const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
    return (
        <div className="flex items-center gap-3 p-3.5" style={{ borderBottom: last ? 'none' : '1px solid var(--color-border)' }}>
            <div className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)' }}>
                {booking.customer_email?.[0]?.toUpperCase() || 'C'}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-primary)' }}>{booking.service_name}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
                        {status.label}
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="truncate">{booking.customer_email}</span>
                    <span className="flex items-center gap-1 shrink-0"><CalendarDays className="h-3 w-3" />{booking.date}</span>
                    <span className="flex items-center gap-1 shrink-0"><Clock className="h-3 w-3" />{booking.time_slot}</span>
                    {booking.price > 0 && <span className="ml-auto font-bold shrink-0" style={{ color: 'var(--color-primary)' }}>${booking.price}</span>}
                </div>
            </div>
        </div>
    );
};

export default function Dashboard() {
    const [provider, setProvider] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { setLoading(false); }, []);

    if (loading) return (
        <div className="space-y-4">
            <div className="skeleton-wave h-7 w-56 rounded-xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-wave h-28 rounded-xl" />)}
            </div>
        </div>
    );

    if (!provider) return (
        <div className="rounded-xl p-14 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)' }}>
                <Package className="h-6 w-6" style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <h2 className="font-black text-lg mb-1.5" style={{ color: 'var(--color-primary)' }}>No Provider Profile</h2>
            <p className="text-sm max-w-xs mx-auto mb-5" style={{ color: 'var(--color-text-muted)' }}>Set up your provider profile to start receiving bookings and managing your services.</p>
            <Link to="/provider/profile"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                Set Up Profile <ArrowRight className="h-3.5 w-3.5" />
            </Link>
        </div>
    );

    const pending  = bookings.filter(b => b.status === 'pending');
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const earnings = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.price || 0), 0);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-black text-2xl tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>{provider.business_name}</h1>
                    <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                        <span className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: provider.status === 'approved' ? 'var(--color-success)' : 'var(--color-warning)' }} />
                        {provider.status === 'approved' ? 'Active & Visible' : `Status: ${provider.status}`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link to="/provider/bookings"
                        className="hidden md:inline-flex items-center h-8 px-3 rounded-xl text-xs font-semibold transition-all"
                        style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text)', border: '1px solid var(--color-border-strong)', textDecoration: 'none' }}>
                        All Bookings
                    </Link>
                    <Link to="/provider/services"
                        className="inline-flex items-center h-8 px-3 rounded-xl text-xs font-semibold transition-all"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', textDecoration: 'none' }}>
                        Manage Services
                    </Link>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard icon={CalendarDays} label="Pending Requests"  value={pending.length} />
                <KPICard icon={Package}      label="Confirmed Today"   value={confirmed.length} />
                <KPICard icon={Star}         label="Avg Rating"        value={provider.rating?.toFixed(1) || '—'} />
                <KPICard icon={DollarSign}   label="Total Earnings"    value={`$${earnings.toFixed(0)}`} />
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                    { to: '/provider/bookings',     label: 'View All Bookings', icon: CalendarDays },
                    { to: '/provider/services',     label: 'Manage Services',   icon: Package },
                    { to: '/provider/availability', label: 'Set Availability',  icon: Clock },
                    { to: '/provider/earnings',     label: 'See Earnings',      icon: TrendingUp },
                ].map(item => (
                    <Link key={item.to} to={item.to}
                        className="rounded-xl p-3.5 transition-all flex flex-col gap-2"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', textDecoration: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.querySelectorAll('[data-icon]').forEach(el => (el.style.color = 'var(--color-on-primary)')); e.currentTarget.querySelectorAll('[data-label]').forEach(el => (el.style.color = 'var(--color-on-primary)')); }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface)'; e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.querySelectorAll('[data-icon]').forEach(el => (el.style.color = 'var(--color-text-muted)')); e.currentTarget.querySelectorAll('[data-label]').forEach(el => (el.style.color = 'var(--color-text)')); }}>
                        <item.icon data-icon className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                        <p data-label className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{item.label}</p>
                    </Link>
                ))}
            </div>

            {/* Recent bookings */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>Recent Bookings</h2>
                    <Link to="/provider/bookings"
                        className="text-xs flex items-center gap-1 transition-all"
                        style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                        View all <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
                {bookings.length === 0 ? (
                    <div className="rounded-xl p-10 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <Users className="h-7 w-7 mx-auto mb-2" style={{ color: 'var(--color-text-subtle)' }} />
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No bookings yet. Share your profile to get started.</p>
                    </div>
                ) : (
                    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        {bookings.slice(0, 8).map((b, i) => <BookingItem key={b.id} booking={b} last={i === Math.min(bookings.length, 8) - 1} />)}
                    </div>
                )}
            </div>
        </div>
    );
}
