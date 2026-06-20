import { useState, useEffect, useCallback } from 'react';
import { Layers, Users, Clock, Plus, Check, Loader2, ShoppingCart, X, TrendingDown, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

const SERVICE_CATEGORIES = [
    'Cleaning', 'Gardening', 'Plumbing', 'Electrical', 'Painting',
    'HVAC', 'Security', 'Handyman', 'Pest Control', 'Moving',
    'AC Maintenance', 'Generator Service', 'Water Tank Cleaning', 'Carpentry',
];

const EMPTY_FORM = { service_category: '', description: '', target_participants: 5, discount_percent: 15, expires_days: 7 };

function countdown(expiresAt) {
    const diff = new Date(expiresAt) - Date.now();
    if (diff <= 0) return 'Expired';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return `${d}d ${h}h left`;
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
}

export default function GroupBuy() {
    const { user } = useAuth();
    const [buys, setBuys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joined, setJoined] = useState(new Set());
    const [joining, setJoining] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const fetchBuys = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('group_buys').select('*').order('created_at', { ascending: false });
        if (data) setBuys(data);
        setLoading(false);
    }, []);

    const fetchMyParticipation = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from('group_buy_participants').select('group_buy_id').eq('user_id', user.id);
        if (data) setJoined(new Set(data.map(p => p.group_buy_id)));
    }, [user]);

    useEffect(() => {
        fetchBuys();
        if (user) fetchMyParticipation();
    }, [fetchBuys, fetchMyParticipation, user]);

    const joinBuy = async (buy) => {
        if (!user) { toast.error('Please log in to join'); return; }
        if (joined.has(buy.id)) { toast('Already joined'); return; }
        setJoining(buy.id);
        const { error } = await supabase.from('group_buy_participants').insert([{
            group_buy_id: buy.id,
            user_id: user.id
        }]);
        if (!error) {
            await supabase.from('group_buys').update({
                current_participants: (buy.current_participants || 0) + 1
            }).eq('id', buy.id);
            setJoined(p => new Set([...p, buy.id]));
            setBuys(prev => prev.map(b => b.id === buy.id
                ? { ...b, current_participants: (b.current_participants || 0) + 1 }
                : b));
            toast.success('Joined! You\'ll be notified when the deal locks.');
        } else { toast.error('Failed to join'); }
        setJoining(null);
    };

    const create = async () => {
        if (!form.service_category) { toast.error('Select a service category'); return; }
        if (!user) { toast.error('Please log in'); return; }
        setSaving(true);
        const expiresAt = new Date(Date.now() + Number(form.expires_days) * 86400000).toISOString();
        // Get a default zone
        const { data: zones } = await supabase.from('neighborhood_zones').select('id').limit(1);
        const defaultZone = zones?.[0]?.id || null;
        const { data, error } = await supabase.from('group_buys').insert([{
            service_category: form.service_category,
            description: form.description || null,
            target_participants: parseInt(form.target_participants),
            discount_percent: parseInt(form.discount_percent),
            expires_at: expiresAt,
            initiator_id: user.id,
            zone_id: defaultZone
        }]).select().single();
        if (data) {
            // Also add the creator as a participant
            await supabase.from('group_buy_participants').insert([{
                group_buy_id: data.id,
                user_id: user.id
            }]);
            setBuys(prev => [data, ...prev]);
            setJoined(p => new Set([...p, data.id]));
            toast.success('Group buy created!');
            setCreateOpen(false);
            setForm(EMPTY_FORM);
        } else { toast.error(error?.message || 'Failed to create'); }
        setSaving(false);
    };

    const pct = (b) => b.target_participants ? Math.round((b.current_participants || 0) / b.target_participants * 100) : 0;
    const isLocked = (b) => (b.current_participants || 0) >= (b.target_participants || 999);
    const isOpen = (b) => !isLocked(b) && (!b.expires_at || new Date(b.expires_at) > Date.now());

    const sorted = [...buys].sort((a, b) => {
        if (isOpen(a) && !isOpen(b)) return -1;
        if (!isOpen(a) && isOpen(b)) return 1;
        return 0;
    });

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                        <Layers className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
                        Group Deals
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                        Bundle jobs with neighbors · Save up to 35%
                    </p>
                </div>
                {user && (
                    <button onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                        <Plus className="h-3.5 w-3.5" /> Create Deal
                    </button>
                )}
            </div>

            {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton-wave h-28 rounded-xl" />)}</div>
            ) : sorted.length === 0 ? (
                <div className="text-center py-16 border border-dashed rounded-2xl" style={{ borderColor: 'var(--color-border)' }}>
                    <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p style={{ color: 'var(--color-text-subtle)' }}>No group deals yet</p>
                    <button onClick={() => setCreateOpen(true)} className="mt-3 text-sm font-semibold underline">Create the first one</button>
                </div>
            ) : (
                <div className="space-y-3">
                    {sorted.map(b => (
                        <div key={b.id} className="rounded-xl border p-4 transition-all hover:shadow-md"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{b.service_category}</p>
                                    {b.description && <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>{b.description}</p>}
                                </div>
                                {!isOpen(b) && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
                                        {isLocked(b) ? 'LOCKED' : 'EXPIRED'}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-xs mb-3" style={{ color: 'var(--color-text-subtle)' }}>
                                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{b.current_participants || 0}/{b.target_participants}</span>
                                <span className="flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" />{b.discount_percent}% off</span>
                                {b.expires_at && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{countdown(b.expires_at)}</span>}
                            </div>
                            <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct(b))}%`, backgroundColor: 'var(--color-primary)' }} />
                            </div>
                            {joined.has(b.id) ? (
                                <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-success)' }}>
                                    <Check className="h-3.5 w-3.5" /> You're in!
                                </div>
                            ) : (
                                <button onClick={() => joinBuy(b)} disabled={joining === b.id || isLocked(b) || !isOpen(b)}
                                    className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', opacity: isLocked(b) || !isOpen(b) ? 0.5 : 1 }}>
                                    {joining === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                    {isLocked(b) ? 'Deal Locked' : !isOpen(b) ? 'Expired' : 'Join Deal'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Dialog */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
                    <div className="relative rounded-2xl p-5 w-full max-w-md shadow-xl"
                        style={{ backgroundColor: 'var(--color-surface)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Create Group Deal</h2>
                            <button onClick={() => setCreateOpen(false)} className="p-1 rounded-lg hover:bg-black/5"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold block mb-1">Service Category *</label>
                                <select value={form.service_category} onChange={e => setForm(p => ({ ...p, service_category: e.target.value }))}
                                    className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                                    <option value="">Select category</option>
                                    {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold block mb-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    className="w-full rounded-lg border px-3 py-2 text-sm resize-none" rows={2} style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-semibold block mb-1">Target</label>
                                    <input type="number" value={form.target_participants} onChange={e => setForm(p => ({ ...p, target_participants: e.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold block mb-1">Discount %</label>
                                    <input type="number" value={form.discount_percent} onChange={e => setForm(p => ({ ...p, discount_percent: e.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold block mb-1">Expires (days)</label>
                                    <input type="number" value={form.expires_days} onChange={e => setForm(p => ({ ...p, expires_days: e.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }} />
                                </div>
                            </div>
                            <button onClick={create} disabled={saving}
                                className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                {saving ? 'Creating...' : 'Create Group Deal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
