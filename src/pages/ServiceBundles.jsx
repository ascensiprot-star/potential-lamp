import { useState, useEffect, useCallback } from 'react';
import { Layers, Users, Tag, Plus, Calendar, Check, Loader2, X, TrendingDown, Zap, Star } from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_CATEGORIES = [
    { slug: 'cleaning', label: 'House Cleaning' },
    { slug: 'gardening', label: 'Gardening' },
    { slug: 'plumbing', label: 'Plumbing' },
    { slug: 'electrical', label: 'Electrical' },
    { slug: 'painting', label: 'Painting' },
    { slug: 'pest_control', label: 'Pest Control' },
    { slug: 'hvac', label: 'AC / HVAC' },
    { slug: 'handyman', label: 'Handyman' },
    { slug: 'security', label: 'Security' },
    { slug: 'moving', label: 'Moving / Packing' },
];

const STATUS_CONFIG = {
    forming: { label: 'Forming', color: '#93c5fd', bg: 'rgba(147,197,253,0.08)' },
    confirmed: { label: 'Confirmed', color: '#6ee7b7', bg: 'rgba(110,231,183,0.08)' },
    active: { label: 'Active', color: '#fcd34d', bg: 'rgba(252,211,77,0.08)' },
    completed: { label: 'Done', color: '#888', bg: 'rgba(136,136,136,0.08)' },
    cancelled: { label: 'Cancelled', color: '#fca5a5', bg: 'rgba(252,165,165,0.08)' },
};

const EMPTY = {
    title: '', description: '', category_slug: '', service_name: '',
    zone_name: '', address_hint: '', max_participants: 5,
    discount_percentage: 20, base_price: '', scheduled_date: '',
    deadline_date: '',
};

export default function ServiceBundles() {
    const [user, setUser] = useState(null);
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('forming');
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [joining, setJoining] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchBundles = useCallback(async (status = tab) => {
        setLoading(true);
        try {
            const url = status === 'all' ? '/api/bundles' : `/api/bundles?status=${status}`;
            const r = await fetch(url);
            const d = await r.json();
            setBundles(d.bundles || []);
        } catch (_) { setBundles([]); }
        setLoading(false);
    }, [tab]);

    useEffect(() => {
        const init = async () => {
            const r = await fetch('/api/auth/user');
            const d = await r.json();
            setUser(d.user);
            await fetchBundles();
        };
        init();
    }, [fetchBundles]);

    const handleTabChange = (t) => {
        setTab(t);
        fetchBundles(t);
    };

    const joinBundle = async (bundle) => {
        if (!user) { toast.error('Please log in to join'); return; }
        setJoining(bundle.id);
        try {
            const r = await fetch(`/api/bundles/${bundle.id}/join`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }
            });
            const d = await r.json();
            if (d.success) {
                toast.success('Joined! You\'ll be notified when confirmed.');
                await fetchBundles(tab);
            } else { toast.error(d.error || 'Failed to join'); }
        } catch (_) { toast.error('Network error'); }
        setJoining(null);
    };

    const createBundle = async () => {
        if (!form.title || !form.category_slug) { toast.error('Title and category required'); return; }
        setSaving(true);
        try {
            const r = await fetch('/api/bundles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    max_participants: parseInt(form.max_participants),
                    discount_percentage: parseInt(form.discount_percentage),
                    base_price: form.base_price ? parseFloat(form.base_price) : null,
                    service_name: form.service_name || form.category_slug,
                }),
            });
            const d = await r.json();
            if (d.bundle) {
                toast.success('Bundle created! Share with neighbors to fill spots.');
                setCreateOpen(false);
                setForm(EMPTY);
                await fetchBundles('forming');
                setTab('forming');
            } else { toast.error(d.error || 'Failed'); }
        } catch (_) { toast.error('Network error'); }
        setSaving(false);
    };

    const filtered = bundles;

    const hasJoined = (b) => user && (b.participant_emails || []).includes(user.email);
    const isOrganizer = (b) => user && b.organizer_email === user.email;

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                        <Layers className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
                        Service Bundles
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>Group up with neighbors for cheaper, faster service</p>
                </div>
                {user && (
                    <button onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                        <Plus className="h-3.5 w-3.5" /> Create Bundle
                    </button>
                )}
            </div>

            {/* How it works */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                    { icon: Users, label: 'Group up', sub: '3–8 neighbors', color: '#93c5fd' },
                    { icon: TrendingDown, label: 'Save up to 35%', sub: 'Shared provider trip', color: '#6ee7b7' },
                    { icon: Zap, label: 'Book together', sub: 'One confirmed slot', color: '#fcd34d' },
                ].map(item => (
                    <div key={item.label} className="rounded-2xl p-4 text-center"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="h-9 w-9 rounded-xl mx-auto mb-2 flex items-center justify-center"
                            style={{ backgroundColor: item.color + '15' }}>
                            <item.icon className="h-4 w-4" style={{ color: item.color }} />
                        </div>
                        <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{item.label}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{item.sub}</p>
                    </div>
                ))}
            </div>

            {/* Status tabs */}
            <div className="flex gap-1.5 mb-4 flex-wrap">
                {[
                    { key: 'forming', label: 'Forming' },
                    { key: 'confirmed', label: 'Confirmed' },
                    { key: 'active', label: 'Active' },
                    { key: 'completed', label: 'Past' },
                    { key: 'all', label: 'All' },
                ].map(t => (
                    <button key={t.key} onClick={() => handleTabChange(t.key)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={{
                            backgroundColor: tab === t.key ? 'var(--color-primary)' : 'var(--color-surface)',
                            color: tab === t.key ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                            border: `1px solid ${tab === t.key ? 'transparent' : 'var(--color-border)'}`,
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-text-subtle)' }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--color-text-subtle)' }}>
                    <Layers className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No bundles in this category</p>
                    {user && <button onClick={() => setCreateOpen(true)} className="text-xs mt-2 font-semibold" style={{ color: 'var(--color-primary)' }}>Create the first one →</button>}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(bundle => {
                        const st = STATUS_CONFIG[bundle.status] || STATUS_CONFIG.forming;
                        const joined = hasJoined(bundle);
                        const organizer = isOrganizer(bundle);
                        const current = bundle.current_participants || 1;
                        const max = bundle.max_participants || 5;
                        const pct = Math.min(100, Math.round((current / max) * 100));
                        const discountedPrice = bundle.base_price ? bundle.base_price * (1 - bundle.discount_percentage / 100) : null;

                        return (
                            <div key={bundle.id} className="rounded-2xl p-5"
                                style={{ backgroundColor: 'var(--color-surface)', border: `1px solid ${joined ? 'rgba(110,231,183,0.2)' : 'var(--color-border)'}` }}>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                style={{ backgroundColor: st.bg, color: st.color }}>
                                                {st.label}
                                            </span>
                                            {joined && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(110,231,183,0.1)', color: '#6ee7b7' }}>✓ Joined</span>}
                                            {organizer && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-subtle)' }}>Organizer</span>}
                                        </div>
                                        <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{bundle.title}</h3>
                                        {bundle.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-subtle)' }}>{bundle.description}</p>}
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <span className="text-xl font-black" style={{ color: '#6ee7b7' }}>{bundle.discount_percentage}%</span>
                                        <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>off</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <div className="rounded-xl p-2 text-center" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                        <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{current}/{max}</p>
                                        <p className="text-[9px]" style={{ color: 'var(--color-text-subtle)' }}>neighbors</p>
                                    </div>
                                    {bundle.base_price && (
                                        <div className="rounded-xl p-2 text-center" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                            <p className="text-xs font-bold line-through" style={{ color: 'var(--color-text-subtle)' }}>PKR {parseFloat(bundle.base_price).toLocaleString()}</p>
                                            <p className="text-xs font-black" style={{ color: '#6ee7b7' }}>PKR {discountedPrice?.toLocaleString()}</p>
                                        </div>
                                    )}
                                    {bundle.scheduled_date && (
                                        <div className="rounded-xl p-2 text-center" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                            <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                                                {new Date(bundle.scheduled_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </p>
                                            <p className="text-[9px]" style={{ color: 'var(--color-text-subtle)' }}>scheduled</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-3">
                                    <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: 'var(--color-text-subtle)' }}>
                                        <span>Spots filled</span>
                                        <span>{pct}%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#6ee7b7' : '#fcd34d' }} />
                                    </div>
                                </div>

                                {bundle.status === 'forming' && !joined && !organizer && (
                                    <button onClick={() => joinBundle(bundle)} disabled={joining === bundle.id || current >= max}
                                        className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity"
                                        style={{
                                            backgroundColor: current >= max ? 'var(--color-surface-high)' : 'var(--color-primary)',
                                            color: current >= max ? 'var(--color-text-subtle)' : 'var(--color-on-primary)',
                                            opacity: joining === bundle.id ? 0.6 : 1,
                                        }}>
                                        {joining === bundle.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                                        {current >= max ? 'Bundle Full' : 'Join Bundle'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    onClick={e => e.target === e.currentTarget && setCreateOpen(false)}>
                    <div className="rounded-2xl p-5 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Create Bundle</h2>
                            <button onClick={() => setCreateOpen(false)} style={{ color: 'var(--color-text-subtle)' }}><X className="h-4 w-4" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Bundle Title *</label>
                                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g. Block B AC Maintenance Bundle"
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Service Category *</label>
                                <select value={form.category_slug} onChange={e => setForm(f => ({ ...f, category_slug: e.target.value }))}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                                    <option value="">Select category…</option>
                                    {SERVICE_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="What's needed, area, timing preferences…" rows={2}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Max Participants</label>
                                    <select value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                                        {[3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n} neighbors</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Discount %</label>
                                    <select value={form.discount_percentage} onChange={e => setForm(f => ({ ...f, discount_percentage: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                                        {[10, 15, 20, 25, 30, 35].map(n => <option key={n} value={n}>{n}%</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Base Price (PKR)</label>
                                    <input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                                        placeholder="Per person"
                                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Scheduled Date</label>
                                    <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Area / Zone</label>
                                <input value={form.zone_name} onChange={e => setForm(f => ({ ...f, zone_name: e.target.value }))}
                                    placeholder="e.g. DHA Phase 5, Block B"
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setCreateOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                                style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                Cancel
                            </button>
                            <button onClick={createBundle} disabled={saving || !form.title || !form.category_slug}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
                                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', opacity: (saving || !form.title || !form.category_slug) ? 0.5 : 1 }}>
                                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : 'Create Bundle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
