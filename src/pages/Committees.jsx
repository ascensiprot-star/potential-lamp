import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Users, Plus, ChevronRight, CheckCircle, Clock, X, Trophy, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = { recruiting: '#F59E0B', active: '#10B981', completed: '#6B7280', cancelled: '#EF4444' };
const STATUS_LABELS = { recruiting: 'Recruiting', active: 'Active', completed: 'Completed', cancelled: 'Cancelled' };

export default function Committees() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [committees, setCommittees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', monthly_amount_pkr: '', member_limit: 12, total_rounds: 12, payout_day: 1 });
    const [saving, setSaving] = useState(false);
    const [joining, setJoining] = useState(null);

    const fetchCommittees = async () => {
        try {
            const r = await fetch('/api/committees', { credentials: 'include' });
            const d = await r.json();
            setCommittees(d.committees || []);
        } catch (_) {}
        setLoading(false);
    };

    useEffect(() => {
        const init = async () => {
            const r = await fetch('/api/auth/user', { credentials: 'include' });
            const d = await r.json();
            setUser(d.user);
            await fetchCommittees();
        };
        init();
    }, []);

    const loadDetail = async (committee) => {
        setSelected(committee);
        setDetailLoading(true);
        try {
            const r = await fetch(`/api/committees/${committee.id}`, { credentials: 'include' });
            const d = await r.json();
            setDetail(d);
        } catch (_) {}
        setDetailLoading(false);
    };

    const create = async () => {
        if (!user) { navigate('/login', { state: { from: '/committees' } }); return; }
        if (!form.name || !form.monthly_amount_pkr) { toast.error('Name and monthly amount required'); return; }
        setSaving(true);
        try {
            const r = await fetch('/api/committees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ...form, monthly_amount_pkr: parseFloat(form.monthly_amount_pkr) }),
            });
            const d = await r.json();
            if (d.committee) {
                toast.success('Committee created!');
                setCreateOpen(false);
                setForm({ name: '', description: '', monthly_amount_pkr: '', member_limit: 12, total_rounds: 12, payout_day: 1 });
                await fetchCommittees();
                loadDetail(d.committee);
            } else { toast.error(d.error || 'Failed'); }
        } catch (_) { toast.error('Network error'); }
        setSaving(false);
    };

    const join = async (committee) => {
        if (!user) { navigate('/login', { state: { from: '/committees' } }); return; }
        setJoining(committee.id);
        try {
            const r = await fetch(`/api/committees/${committee.id}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            const d = await r.json();
            if (d.success) {
                toast.success(`Joined! You are member #${d.position}`);
                fetchCommittees();
                if (selected?.id === committee.id) loadDetail(committee);
            } else { toast.error(d.error); }
        } catch (_) { toast.error('Network error'); }
        setJoining(null);
    };

    const totalPayout = (c) => parseFloat(c.monthly_amount_pkr) * parseInt(c.member_limit);

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                        <Wallet className="h-6 w-6" style={{ color: '#10B981' }} /> Committees
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                        A committee is a rotating savings group — members contribute monthly, one person gets the full pot each round.
                    </p>
                </div>
                {user && (
                    <button onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: '#10B981', color: '#fff' }}>
                        <Plus className="h-3.5 w-3.5" /> Start Committee
                    </button>
                )}
            </div>

            {/* Info Banner */}
            <div className="rounded-2xl p-4 mb-5 flex gap-3"
                style={{ backgroundColor: '#10B98115', border: '1px solid #10B98140' }}>
                <Trophy className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#10B981' }} />
                <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        The #1 financial tool in every Pakistani neighborhood
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                        Everyone contributes monthly. Each round, one member receives the full pot. Transparent, traceable, and secured on Truvornex.
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {/* List */}
                <div>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="h-6 w-6 rounded-full animate-spin" style={{ border: '2px solid var(--color-border)', borderTopColor: '#10B981' }} />
                        </div>
                    ) : committees.length === 0 ? (
                        <div className="text-center py-12" style={{ color: 'var(--color-text-subtle)' }}>
                            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No committees yet</p>
                            {user && <button onClick={() => setCreateOpen(true)} className="text-xs mt-2 font-semibold" style={{ color: '#10B981' }}>Start the first one →</button>}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {committees.map(c => {
                                const isMember = parseInt(c.is_member) > 0;
                                const memberCount = parseInt(c.member_count || 0);
                                const isOrganizer = c.organizer_id === user?.id;
                                const statusColor = STATUS_COLORS[c.status] || '#6B7280';
                                const payout = totalPayout(c);
                                return (
                                    <div key={c.id}
                                        className="rounded-2xl p-4 cursor-pointer transition-all"
                                        style={{
                                            border: selected?.id === c.id ? `2px solid #10B981` : '1px solid var(--color-border)',
                                            backgroundColor: selected?.id === c.id ? '#10B98108' : 'var(--color-surface)',
                                        }}
                                        onClick={() => loadDetail(c)}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-bold text-sm truncate" style={{ color: 'var(--color-text)' }}>{c.name}</p>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: statusColor + '20', color: statusColor }}>
                                                        {STATUS_LABELS[c.status]}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
                                                    <span className="font-semibold" style={{ color: '#10B981' }}>
                                                        PKR {parseFloat(c.monthly_amount_pkr).toLocaleString()}/mo
                                                    </span>
                                                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{memberCount}/{c.member_limit}</span>
                                                    <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />Pot: PKR {payout.toLocaleString()}</span>
                                                </div>
                                                {c.description && <p className="text-[11px] mt-1 line-clamp-1" style={{ color: 'var(--color-text-subtle)' }}>{c.description}</p>}
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                {isMember ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                                                        style={{ backgroundColor: '#10B98120', color: '#10B981' }}>
                                                        <CheckCircle className="h-3 w-3" /> Member
                                                    </span>
                                                ) : c.status === 'recruiting' && !isOrganizer ? (
                                                    <button onClick={e => { e.stopPropagation(); join(c); }}
                                                        disabled={joining === c.id || memberCount >= c.member_limit}
                                                        className="text-[10px] font-bold px-2.5 py-1 rounded-xl"
                                                        style={{ backgroundColor: '#10B981', color: '#fff', opacity: joining === c.id ? 0.7 : 1 }}>
                                                        {joining === c.id ? '…' : memberCount >= c.member_limit ? 'Full' : 'Join'}
                                                    </button>
                                                ) : null}
                                                <ChevronRight className="h-4 w-4" style={{ color: 'var(--color-text-subtle)' }} />
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="mt-3">
                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                                <div className="h-full rounded-full transition-all"
                                                    style={{ width: `${(memberCount / c.member_limit) * 100}%`, backgroundColor: '#10B981' }} />
                                            </div>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                                                {memberCount}/{c.member_limit} members • Payout day {c.payout_day} of each month
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                <div>
                    {selected ? (
                        <div className="rounded-2xl p-4 sticky top-4"
                            style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                            {detailLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="h-5 w-5 rounded-full animate-spin" style={{ border: '2px solid var(--color-border)', borderTopColor: '#10B981' }} />
                                </div>
                            ) : detail ? (
                                <>
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{detail.committee.name}</h2>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                                                Organized by {detail.committee.organizer_name}
                                            </p>
                                        </div>
                                        <button onClick={() => { setSelected(null); setDetail(null); }} style={{ color: 'var(--color-text-subtle)' }}>
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {[
                                            { label: 'Monthly', value: `PKR ${parseFloat(detail.committee.monthly_amount_pkr).toLocaleString()}` },
                                            { label: 'Pot', value: `PKR ${totalPayout(detail.committee).toLocaleString()}` },
                                            { label: 'Round', value: `${detail.committee.current_round}/${detail.committee.total_rounds}` },
                                        ].map(s => (
                                            <div key={s.label} className="rounded-xl p-2 text-center"
                                                style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                                <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{s.value}</p>
                                                <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{s.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Members */}
                                    <div>
                                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-subtle)' }}>
                                            MEMBERS ({detail.members.length})
                                        </p>
                                        <div className="space-y-1.5 max-h-52 overflow-y-auto">
                                            {detail.members.map((m, i) => (
                                                <div key={m.id} className="flex items-center gap-2.5 rounded-lg p-2"
                                                    style={{ backgroundColor: m.has_received_payout ? '#10B98112' : 'var(--color-surface-high)' }}>
                                                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                                                        style={{ backgroundColor: '#10B981', color: '#fff' }}>
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{m.name || m.email}</p>
                                                        <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                                                            {m.contributed_rounds} contributions
                                                            {m.payout_position && ` • Payout #${m.payout_position}`}
                                                        </p>
                                                    </div>
                                                    {m.has_received_payout && <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: '#10B981' }} />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    ) : (
                        <div className="rounded-2xl p-8 text-center"
                            style={{ border: '1px dashed var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-subtle)' }} />
                            <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>Select a committee to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Dialog */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={e => e.target === e.currentTarget && setCreateOpen(false)}>
                    <div className="rounded-2xl p-5 w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Start a Committee</h2>
                            <button onClick={() => setCreateOpen(false)} style={{ color: 'var(--color-text-subtle)' }}><X className="h-4 w-4" /></button>
                        </div>

                        <div className="space-y-3">
                            {[
                                { key: 'name', label: 'Committee Name *', placeholder: 'e.g. Block 3 Monthly Committee' },
                                { key: 'description', label: 'Description', placeholder: 'What is this committee about?' },
                                { key: 'monthly_amount_pkr', label: 'Monthly contribution (PKR) *', placeholder: '5000', type: 'number' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-subtle)' }}>{f.label}</label>
                                    <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                </div>
                            ))}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { key: 'member_limit', label: 'Members', type: 'number', min: 2, max: 50 },
                                    { key: 'total_rounds', label: 'Rounds', type: 'number', min: 2, max: 50 },
                                    { key: 'payout_day', label: 'Payout day', type: 'number', min: 1, max: 28 },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-subtle)' }}>{f.label}</label>
                                        <input type={f.type} min={f.min} max={f.max} value={form[f.key]}
                                            onChange={e => setForm(p => ({ ...p, [f.key]: parseInt(e.target.value) || f.min }))}
                                            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                            style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {form.monthly_amount_pkr && form.member_limit && (
                            <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: '#10B98112', border: '1px solid #10B98130' }}>
                                <p className="text-xs" style={{ color: '#10B981' }}>
                                    💰 Each member receives <strong>PKR {(parseFloat(form.monthly_amount_pkr || 0) * parseInt(form.member_limit || 0)).toLocaleString()}</strong> when their turn comes
                                </p>
                            </div>
                        )}

                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setCreateOpen(false)} className="flex-1 py-2 rounded-xl text-sm"
                                style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                Cancel
                            </button>
                            <button onClick={create} disabled={saving} className="flex-1 py-2 rounded-xl text-sm font-semibold"
                                style={{ backgroundColor: '#10B981', color: '#fff', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Creating…' : 'Create Committee'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
