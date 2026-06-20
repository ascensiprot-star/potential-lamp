import { useState, useEffect, useCallback } from 'react';
import {
    Wallet, ArrowUpRight, ArrowDownLeft, Send, Plus, Download,
    CreditCard, Clock, CheckCircle, XCircle, Loader2, Search,
    TrendingUp, Shield, RefreshCw, Phone, Building2, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const TYPE_CONFIG = {
    credit: { icon: ArrowDownLeft, label: 'Received', color: '#6ee7b7', bg: 'rgba(110,231,183,0.08)' },
    debit: { icon: ArrowUpRight, label: 'Sent', color: '#fca5a5', bg: 'rgba(252,165,165,0.08)' },
    hold: { icon: Clock, label: 'On Hold', color: '#fcd34d', bg: 'rgba(252,211,77,0.08)' },
    release: { icon: CheckCircle, label: 'Released', color: '#6ee7b7', bg: 'rgba(110,231,183,0.08)' },
    fee: { icon: ArrowUpRight, label: 'Fee', color: '#fca5a5', bg: 'rgba(252,165,165,0.08)' },
    refund: { icon: ArrowDownLeft, label: 'Refund', color: '#6ee7b7', bg: 'rgba(110,231,183,0.08)' },
    payout: { icon: Download, label: 'Withdrawal', color: '#93c5fd', bg: 'rgba(147,197,253,0.08)' },
};

const STATUS_CONFIG = {
    completed: { label: 'Completed', color: '#6ee7b7' },
    pending: { label: 'Pending', color: '#fcd34d' },
    failed: { label: 'Failed', color: '#fca5a5' },
    reversed: { label: 'Reversed', color: '#888' },
};

const TOPUP_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

const TABS = ['overview', 'send', 'topup', 'withdraw', 'history'];

export default function WalletPage() {
    const [user, setUser] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');
    const [refreshing, setRefreshing] = useState(false);

    // Send
    const [sendEmail, setSendEmail] = useState('');
    const [sendAmount, setSendAmount] = useState('');
    const [sendNote, setSendNote] = useState('');
    const [sendSearch, setSendSearch] = useState([]);
    const [sendSearching, setSendSearching] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const [sending, setSending] = useState(false);

    // Top-up
    const [topupAmount, setTopupAmount] = useState('');
    const [topupMethod, setTopupMethod] = useState('jazzcash');
    const [toppingUp, setToppingUp] = useState(false);

    // Withdraw
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawBank, setWithdrawBank] = useState('');
    const [withdrawAccount, setWithdrawAccount] = useState('');
    const [withdrawTitle, setWithdrawTitle] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);

    const fetchWallet = useCallback(async () => {
        try {
            const r = await fetch('/api/wallet', { credentials: 'include' });
            const d = await r.json();
            if (d.wallet) setWallet(d.wallet);
            if (d.transactions) setTransactions(d.transactions);
        } catch (_) {}
    }, []);

    useEffect(() => {
        const init = async () => {
            const r = await fetch('/api/auth/user', { credentials: 'include' });
            const d = await r.json();
            if (!d.user) { setLoading(false); return; }
            setUser(d.user);
            await fetchWallet();
            setLoading(false);
        };
        init();
    }, [fetchWallet]);

    const refresh = async () => {
        setRefreshing(true);
        await fetchWallet();
        setRefreshing(false);
    };

    const searchUsers = async (q) => {
        setSendEmail(q);
        setSelectedRecipient(null);
        if (!q.trim() || q.length < 2) { setSendSearch([]); return; }
        setSendSearching(true);
        try {
            const r = await fetch(`/api/wallet/neighbors?q=${encodeURIComponent(q)}`, { credentials: 'include' });
            const d = await r.json();
            setSendSearch(d.users || []);
        } catch (_) {}
        setSendSearching(false);
    };

    const doSend = async () => {
        const email = selectedRecipient?.email || sendEmail;
        const amt = parseFloat(sendAmount);
        if (!email || !amt || amt < 1) { toast.error('Enter recipient and amount'); return; }
        setSending(true);
        try {
            const r = await fetch('/api/wallet/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ to_email: email, amount: amt, note: sendNote }),
            });
            const d = await r.json();
            if (d.success) {
                toast.success(`PKR ${amt.toLocaleString()} sent to ${selectedRecipient?.full_name || email}`);
                setSendEmail(''); setSendAmount(''); setSendNote(''); setSelectedRecipient(null); setSendSearch([]);
                await fetchWallet();
                setTab('overview');
            } else { toast.error(d.error || 'Transfer failed'); }
        } catch (_) { toast.error('Network error'); }
        setSending(false);
    };

    const doTopup = async () => {
        const amt = parseFloat(topupAmount);
        if (!amt || amt < 100) { toast.error('Minimum top-up is PKR 100'); return; }
        setToppingUp(true);
        try {
            const r = await fetch('/api/wallet/topup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ amount: amt, method: topupMethod }),
            });
            const d = await r.json();
            if (d.success) {
                toast.success(`PKR ${amt.toLocaleString()} added to wallet!`);
                setTopupAmount('');
                await fetchWallet();
                setTab('overview');
            } else { toast.error(d.error || 'Top-up failed'); }
        } catch (_) { toast.error('Network error'); }
        setToppingUp(false);
    };

    const doWithdraw = async () => {
        const amt = parseFloat(withdrawAmount);
        if (!amt || amt < 500) { toast.error('Minimum withdrawal is PKR 500'); return; }
        if (!withdrawBank || !withdrawAccount) { toast.error('Bank details required'); return; }
        setWithdrawing(true);
        try {
            const r = await fetch('/api/wallet/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ amount: amt, bank_name: withdrawBank, account_number: withdrawAccount, account_title: withdrawTitle }),
            });
            const d = await r.json();
            if (d.success) {
                toast.success(d.message || 'Withdrawal requested');
                setWithdrawAmount(''); setWithdrawBank(''); setWithdrawAccount(''); setWithdrawTitle('');
                await fetchWallet();
                setTab('history');
            } else { toast.error(d.error || 'Withdrawal failed'); }
        } catch (_) { toast.error('Network error'); }
        setWithdrawing(false);
    };

    const formatAmt = (n) => `PKR ${parseFloat(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    const fmtTime = (ts) => {
        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        return isToday ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-text-subtle)' }} />
        </div>
    );
    if (!user) return (
        <div className="text-center py-20" style={{ color: 'var(--color-text-subtle)' }}>
            <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Please log in to access your wallet</p>
        </div>
    );

    const balance = parseFloat(wallet?.balance || 0);
    const incomeThisMonth = transactions.filter(t => t.type === 'credit' && new Date(t.created_at) > new Date(new Date().setDate(1))).reduce((s, t) => s + parseFloat(t.amount), 0);
    const spentThisMonth = transactions.filter(t => ['debit', 'fee', 'hold'].includes(t.type) && new Date(t.created_at) > new Date(new Date().setDate(1))).reduce((s, t) => s + parseFloat(t.amount), 0);

    return (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
            {/* Balance Card */}
            <div className="rounded-2xl p-6 mb-5 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #111111 100%)', border: '1px solid var(--color-border-strong)' }}>
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #ffffff 0%, transparent 60%)' }} />
                <div className="flex items-start justify-between mb-4 relative">
                    <div>
                        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--color-text-subtle)' }}>Truvornex Wallet</p>
                        <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
                            {formatAmt(balance)}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            {user.full_name || user.email}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={refresh} disabled={refreshing} className="h-8 w-8 rounded-full flex items-center justify-center transition-opacity"
                            style={{ backgroundColor: 'var(--color-surface-high)', opacity: refreshing ? 0.5 : 1 }}>
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} style={{ color: 'var(--color-text-subtle)' }} />
                        </button>
                        <div className="h-8 w-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'var(--color-surface-high)' }}>
                            <Shield className="h-3.5 w-3.5" style={{ color: 'var(--color-success)' }} />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 relative">
                    <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(110,231,183,0.06)', border: '1px solid rgba(110,231,183,0.12)' }}>
                        <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--color-success)' }}>Received this month</p>
                        <p className="font-bold text-sm" style={{ color: '#6ee7b7' }}>PKR {incomeThisMonth.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(252,165,165,0.06)', border: '1px solid rgba(252,165,165,0.12)' }}>
                        <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--color-error)' }}>Spent this month</p>
                        <p className="font-bold text-sm" style={{ color: '#fca5a5' }}>PKR {spentThisMonth.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-2 mb-5">
                {[
                    { key: 'send', icon: Send, label: 'Send', color: '#93c5fd' },
                    { key: 'topup', icon: Plus, label: 'Add Money', color: '#6ee7b7' },
                    { key: 'withdraw', icon: Download, label: 'Withdraw', color: '#fcd34d' },
                    { key: 'history', icon: Clock, label: 'History', color: '#d4d4d4' },
                ].map(a => (
                    <button key={a.key} onClick={() => setTab(a.key)}
                        className="rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-all"
                        style={{
                            backgroundColor: tab === a.key ? 'var(--color-surface-high)' : 'var(--color-surface)',
                            border: `1px solid ${tab === a.key ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
                        }}>
                        <div className="h-9 w-9 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: a.color + '15' }}>
                            <a.icon className="h-4 w-4" style={{ color: a.color }} />
                        </div>
                        <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>{a.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Recent Activity</h2>
                        <button onClick={() => setTab('history')} className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                            View all →
                        </button>
                    </div>
                    {transactions.length === 0 ? (
                        <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                            <Wallet className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text)' }} />
                            <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>No transactions yet</p>
                            <button onClick={() => setTab('topup')} className="text-xs mt-2 font-semibold" style={{ color: 'var(--color-primary)' }}>
                                Add money to get started →
                            </button>
                        </div>
                    ) : (
                        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                            {transactions.slice(0, 8).map((txn, i) => {
                                const cfg = TYPE_CONFIG[txn.type] || TYPE_CONFIG.credit;
                                const stc = STATUS_CONFIG[txn.status] || STATUS_CONFIG.completed;
                                const isIncoming = ['credit', 'release', 'refund'].includes(txn.type);
                                return (
                                    <div key={txn.id} className="flex items-center gap-3 px-4 py-3"
                                        style={{ borderBottom: i < transactions.slice(0, 8).length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                        <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: cfg.bg }}>
                                            <cfg.icon className="h-4 w-4" style={{ color: cfg.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                                                {txn.description || cfg.label}
                                            </p>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                                                {fmtTime(txn.created_at)} · <span style={{ color: stc.color }}>{stc.label}</span>
                                            </p>
                                        </div>
                                        <p className={`text-sm font-bold shrink-0`} style={{ color: isIncoming ? '#6ee7b7' : '#fca5a5' }}>
                                            {isIncoming ? '+' : '−'}PKR {parseFloat(txn.amount).toLocaleString()}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {tab === 'send' && (
                <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <h2 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                        <Send className="h-4 w-4" style={{ color: '#93c5fd' }} /> Send Money
                    </h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>
                                Recipient (email or name)
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-text-subtle)' }} />
                                <input
                                    value={selectedRecipient ? (selectedRecipient.full_name || selectedRecipient.email) : sendEmail}
                                    onChange={e => { if (!selectedRecipient) searchUsers(e.target.value); }}
                                    onClick={() => { if (selectedRecipient) { setSelectedRecipient(null); setSendEmail(''); setSendSearch([]); } }}
                                    placeholder="Search by name or email…"
                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                                />
                            </div>
                            {sendSearching && <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>Searching…</p>}
                            {sendSearch.length > 0 && !selectedRecipient && (
                                <div className="mt-1 rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                                    {sendSearch.map(u => (
                                        <button key={u.id} onClick={() => { setSelectedRecipient(u); setSendSearch([]); setSendEmail(u.email); }}
                                            className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors"
                                            style={{ borderBottom: '1px solid var(--color-border)' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-high)'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                                                {(u.full_name || u.email || '?')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{u.full_name || 'Unknown'}</p>
                                                <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{u.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Amount (PKR)</label>
                            <input type="number" min={1} value={sendAmount} onChange={e => setSendAmount(e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {[100, 500, 1000, 2000, 5000].map(a => (
                                    <button key={a} onClick={() => setSendAmount(String(a))}
                                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                                        style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                        {a.toLocaleString()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Note (optional)</label>
                            <input value={sendNote} onChange={e => setSendNote(e.target.value)}
                                placeholder="e.g. For groceries, rent split…"
                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                        </div>
                        {selectedRecipient && sendAmount && (
                            <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(147,197,253,0.06)', border: '1px solid rgba(147,197,253,0.15)' }}>
                                <p className="text-xs" style={{ color: '#93c5fd' }}>
                                    Sending <strong>PKR {parseFloat(sendAmount || 0).toLocaleString()}</strong> to <strong>{selectedRecipient.full_name || selectedRecipient.email}</strong>
                                    {sendNote && ` — "${sendNote}"`}
                                </p>
                            </div>
                        )}
                        <button onClick={doSend} disabled={sending || !sendAmount || (!selectedRecipient && !sendEmail)}
                            className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', opacity: (sending || !sendAmount || (!selectedRecipient && !sendEmail)) ? 0.5 : 1 }}>
                            {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send Money</>}
                        </button>
                    </div>
                </div>
            )}

            {tab === 'topup' && (
                <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <h2 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                        <Plus className="h-4 w-4" style={{ color: '#6ee7b7' }} /> Add Money
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--color-text-subtle)' }}>Payment Method</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { key: 'jazzcash', label: 'JazzCash', icon: Phone, color: '#e91e63' },
                                    { key: 'easypaisa', label: 'Easypaisa', icon: Phone, color: '#4caf50' },
                                    { key: 'bank', label: 'Bank Transfer', icon: Building2, color: '#2196f3' },
                                    { key: 'card', label: 'Debit Card', icon: CreditCard, color: '#9c27b0' },
                                ].map(m => (
                                    <button key={m.key} onClick={() => setTopupMethod(m.key)}
                                        className="flex items-center gap-2 p-3 rounded-xl transition-all"
                                        style={{
                                            backgroundColor: topupMethod === m.key ? 'var(--color-surface-high)' : 'transparent',
                                            border: `1px solid ${topupMethod === m.key ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
                                        }}>
                                        <m.icon className="h-4 w-4" style={{ color: m.color }} />
                                        <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--color-text-subtle)' }}>Amount (PKR)</label>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {TOPUP_AMOUNTS.map(a => (
                                    <button key={a} onClick={() => setTopupAmount(String(a))}
                                        className="py-2 rounded-xl text-xs font-bold transition-all"
                                        style={{
                                            backgroundColor: topupAmount === String(a) ? 'var(--color-primary)' : 'var(--color-surface-high)',
                                            color: topupAmount === String(a) ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                                            border: '1px solid var(--color-border)',
                                        }}>
                                        {a.toLocaleString()}
                                    </button>
                                ))}
                            </div>
                            <input type="number" min={100} value={topupAmount} onChange={e => setTopupAmount(e.target.value)}
                                placeholder="Or enter custom amount…"
                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                        </div>
                        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)' }}>
                            <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
                                💡 Funds are instantly credited. No fees for top-up.
                            </p>
                        </div>
                        <button onClick={doTopup} disabled={toppingUp || !topupAmount || parseFloat(topupAmount) < 100}
                            className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', opacity: (toppingUp || !topupAmount || parseFloat(topupAmount) < 100) ? 0.5 : 1 }}>
                            {toppingUp ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <><Plus className="h-4 w-4" /> Add PKR {parseFloat(topupAmount || 0).toLocaleString()}</>}
                        </button>
                    </div>
                </div>
            )}

            {tab === 'withdraw' && (
                <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <h2 className="font-bold text-base mb-1 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                        <Download className="h-4 w-4" style={{ color: '#fcd34d' }} /> Withdraw
                    </h2>
                    <p className="text-xs mb-4" style={{ color: 'var(--color-text-subtle)' }}>Available: {formatAmt(balance)}</p>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Amount (PKR)</label>
                            <input type="number" min={500} max={balance} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                                placeholder="Minimum PKR 500"
                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                            <button onClick={() => setWithdrawAmount(String(Math.floor(balance)))}
                                className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--color-primary)' }}>
                                Withdraw all →
                            </button>
                        </div>
                        <div>
                            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Bank Name</label>
                            <input value={withdrawBank} onChange={e => setWithdrawBank(e.target.value)}
                                placeholder="e.g. Meezan Bank, HBL, UBL…"
                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Account Title</label>
                            <input value={withdrawTitle} onChange={e => setWithdrawTitle(e.target.value)}
                                placeholder="Name on account"
                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Account / IBAN Number</label>
                            <input value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)}
                                placeholder="PK36 XXXX XXXX XXXX XXXX XXXX"
                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                                style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                        </div>
                        <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(252,211,77,0.06)', border: '1px solid rgba(252,211,77,0.12)' }}>
                            <p className="text-[11px]" style={{ color: 'var(--color-warning)' }}>
                                ⏱ Withdrawals typically arrive within 1–2 business days.
                            </p>
                        </div>
                        <button onClick={doWithdraw} disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) < 500 || !withdrawBank || !withdrawAccount}
                            className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', opacity: (withdrawing || !withdrawAmount || parseFloat(withdrawAmount) < 500 || !withdrawBank || !withdrawAccount) ? 0.5 : 1 }}>
                            {withdrawing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <><Download className="h-4 w-4" /> Request Withdrawal</>}
                        </button>
                    </div>
                </div>
            )}

            {tab === 'history' && (
                <div>
                    <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text)' }}>All Transactions</h2>
                    {transactions.length === 0 ? (
                        <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text)' }} />
                            <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>No transactions yet</p>
                        </div>
                    ) : (
                        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                            {transactions.map((txn, i) => {
                                const cfg = TYPE_CONFIG[txn.type] || TYPE_CONFIG.credit;
                                const stc = STATUS_CONFIG[txn.status] || STATUS_CONFIG.completed;
                                const isIncoming = ['credit', 'release', 'refund'].includes(txn.type);
                                return (
                                    <div key={txn.id} className="flex items-center gap-3 px-4 py-3"
                                        style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                        <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: cfg.bg }}>
                                            <cfg.icon className="h-4 w-4" style={{ color: cfg.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                                                {txn.description || cfg.label}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{fmtTime(txn.created_at)}</p>
                                                <span className="text-[10px] font-semibold" style={{ color: stc.color }}>{stc.label}</span>
                                            </div>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                                                Balance: PKR {parseFloat(txn.balance_after).toLocaleString()}
                                            </p>
                                        </div>
                                        <p className="text-sm font-bold shrink-0" style={{ color: isIncoming ? '#6ee7b7' : '#fca5a5' }}>
                                            {isIncoming ? '+' : '−'}PKR {parseFloat(txn.amount).toLocaleString()}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
