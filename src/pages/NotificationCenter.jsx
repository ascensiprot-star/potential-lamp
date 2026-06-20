import { useState, useEffect } from 'react';
import { notificationService } from '@/lib/platform/notificationService';
import { Bell, CheckCheck, ExternalLink, AlertCircle, CalendarCheck, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const TYPE_ICON = {
    booking_confirmed: CalendarCheck,
    booking_cancelled: AlertCircle,
    booking_reminder: Bell,
    new_review: Star,
    provider_approved: Zap,
    provider_rejected: AlertCircle,
    system_alert: AlertCircle,
    automation_triggered: Zap,
    default: Bell,
};

const PRIORITY_BADGE_STYLE = {
    urgent:  { backgroundColor: 'var(--color-error-bg)',   color: 'var(--color-error)'   },
    high:    { backgroundColor: 'rgba(251,146,60,0.12)',   color: '#f97316'               },
    normal:  { backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)' },
    low:     { backgroundColor: 'var(--color-surface-highest)', color: 'var(--color-text-subtle)' },
};

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [userEmail, setUserEmail] = useState(null);

    useEffect(() => { setLoading(false); }, []);

    const loadNotifications = async (_email) => { setNotifications([]); setLoading(false); };

    const markRead = async (id) => {
        await notificationService.markRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const markAllRead = async () => {
        await notificationService.markAllRead(userEmail);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (loading) return (
        <div className="max-w-2xl mx-auto space-y-3 pb-24">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="card-premium h-20 skeleton-wave" />)}
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto pb-24 md:pb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-black text-xl" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>Notifications</h1>
                    {unreadCount > 0 && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{unreadCount} unread</p>}
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={markAllRead}>
                        <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                    </Button>
                )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 mb-4">
                {['all', 'unread'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className="px-4 h-8 rounded-xl text-xs font-semibold capitalize transition-all"
                        style={{
                            backgroundColor: filter === f ? 'var(--color-primary)' : 'var(--color-surface-high)',
                            color: filter === f ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { if (filter !== f) e.currentTarget.style.color = 'var(--color-text)'; }}
                        onMouseLeave={e => { if (filter !== f) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                        {f} {f === 'unread' && unreadCount > 0 && `(${unreadCount})`}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="card-premium p-16 text-center">
                    <Bell className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
                    <h3 className="font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>You're all caught up!</h3>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No {filter === 'unread' ? 'unread ' : ''}notifications yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(n => {
                        const Icon = TYPE_ICON[n.type] || TYPE_ICON.default;
                        const badgeStyle = PRIORITY_BADGE_STYLE[n.priority] || PRIORITY_BADGE_STYLE.normal;
                        return (
                            <div key={n.id}
                                className="card-premium p-4 flex items-start gap-3 cursor-pointer transition-all"
                                style={{ borderLeft: !n.is_read ? '3px solid var(--color-primary)' : undefined }}
                                onClick={() => !n.is_read && markRead(n.id)}>
                                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                                    style={{
                                        backgroundColor: n.is_read ? 'var(--color-surface-high)' : 'var(--color-primary)',
                                        color: n.is_read ? 'var(--color-text-muted)' : 'var(--color-on-primary)',
                                    }}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-semibold" style={{ color: n.is_read ? 'var(--color-text-muted)' : 'var(--color-primary)' }}>{n.title}</p>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={badgeStyle}>{n.priority}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{n.body}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
                                            {new Date(n.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {n.action_url && (
                                            <Link to={n.action_url}
                                                className="flex items-center gap-1 text-xs font-medium transition-colors"
                                                style={{ color: 'var(--color-text-muted)' }}
                                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                                                View <ExternalLink className="h-3 w-3" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
