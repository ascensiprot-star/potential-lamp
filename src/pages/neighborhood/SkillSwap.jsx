import { useState, useEffect } from 'react';
import { RefreshCw, GraduationCap, Search, Plus, Star, Check, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';

export default function SkillSwap() {
    const { user } = useAuth();
    const [swaps, setSwaps] = useState([]);
    const [mySwaps, setMySwaps] = useState([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState({ offering: '', seeking: '', time_credits: 1 });
    const [saving, setSaving] = useState(false);
    const [proposing, setProposing] = useState(null);

    const load = async () => {
        setLoading(true);
        const [openRes, myRes, balRes] = await Promise.all([
            supabase.from('skill_swaps').select('*').eq('status', 'open').order('created_at', { ascending: false }),
            user ? supabase.from('skill_swaps').select('*').eq('offerer_id', user.id) : Promise.resolve({ data: [] }),
            user ? supabase.from('time_credits_ledger').select('amount').eq('user_id', user.id) : Promise.resolve({ data: [] })
        ]);
        if (openRes.data) {
            // Get a default zone for the swaps
            const { data: zones } = await supabase.from('neighborhood_zones').select('id').limit(1);
            const defaultZone = zones?.[0]?.id || null;
            setSwaps(user ? openRes.data.filter(s => s.offerer_id !== user.id) : openRes.data);
        }
        if (myRes.data) setMySwaps(myRes.data);
        if (balRes.data) setBalance(balRes.data.reduce((sum, r) => sum + (r.amount || 0), 0));
        setLoading(false);
    };

    useEffect(() => { load(); }, [user]);

    const post = async () => {
        if (!form.offering.trim() || !form.seeking.trim()) { toast.error('Fill in both fields'); return; }
        if (!user) { toast.error('Sign in first'); return; }
        setSaving(true);
        try {
            // Get a default zone
            const { data: zones } = await supabase.from('neighborhood_zones').select('id').limit(1);
            const defaultZone = zones?.[0]?.id || null;
            const { error } = await supabase.from('skill_swaps').insert([{
                offering: form.offering.trim(),
                seeking: form.seeking.trim(),
                time_credits_offered: Number(form.time_credits),
                offerer_id: user.id,
                zone_id: defaultZone
            }]);
            if (error) throw error;
            toast.success('Skill swap posted');
            setDialog(false);
            setForm({ offering: '', seeking: '', time_credits: 1 });
            load();
        } catch (err) { toast.error(err.message || 'Failed to post'); }
        finally { setSaving(false); }
    };

    const propose = async (swap) => {
        if (!user) { toast.error('Sign in first'); return; }
        setProposing(swap.id);
        try {
            const { error } = await supabase.from('skill_swaps').update({
                status: 'matched',
                matched_with_user_id: user.id
            }).eq('id', swap.id);
            if (error) throw error;
            setSwaps(p => p.filter(s => s.id !== swap.id));
            toast.success('Swap proposed — the other person will be notified');
        } catch (err) { toast.error(err.message || 'Failed to propose'); }
        finally { setProposing(null); }
    };

    const STATUS_BADGE = {
        open:      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        matched:   'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
        completed: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                        <RefreshCw className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                        <h1 className="font-bold text-2xl tracking-tight text-zinc-900 dark:text-white">Skill Exchange</h1>
                        <p className="text-zinc-400 text-sm mt-0.5">Trade skills · earn time credits</p>
                    </div>
                </div>
                <Button className="rounded-xl gap-2" onClick={() => user ? setDialog(true) : toast.error('Sign in first')}>
                    <Plus className="h-4 w-4" /> Post a Swap
                </Button>
            </div>

            {/* Time credits balance */}
            <div className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-2xl p-5 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Your Time Credits</p>
                    <p className="text-4xl font-black">{balance}</p>
                    <p className="text-xs opacity-40 mt-1">1 credit = 1 hour of service</p>
                </div>
                <Star className="h-12 w-12 opacity-20" strokeWidth={1} />
            </div>

            {/* My swaps */}
            {mySwaps.length > 0 && (
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">My Swaps</p>
                    <div className="space-y-2">
                        {mySwaps.map(s => (
                            <div key={s.id} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3 flex-wrap">
                                <span className="text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <GraduationCap className="h-2.5 w-2.5" /> {s.offering}
                                </span>
                                <ArrowRight className="h-3 w-3 text-zinc-300 shrink-0" />
                                <span className="text-xs font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Search className="h-2.5 w-2.5" /> {s.seeking}
                                </span>
                                <div className="ml-auto">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status] || STATUS_BADGE.open}`}>
                                        {s.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Browse available swaps */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Available Swaps</p>
                    <span className="text-[10px] text-zinc-400">{swaps.length} posted</span>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-wave h-24 rounded-2xl" />)}
                    </div>
                ) : swaps.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                        <RefreshCw className="h-10 w-10 mx-auto mb-3 text-zinc-200 dark:text-zinc-700" strokeWidth={1.5} />
                        <p className="text-zinc-400 font-medium">No swaps posted yet</p>
                        <p className="text-xs text-zinc-400 mt-1">Be the first — post what you offer and need</p>
                        {user && (
                            <button onClick={() => setDialog(true)} className="mt-4 text-sm font-semibold text-zinc-900 dark:text-white underline underline-offset-2">
                                Post the first swap
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {swaps.map(s => (
                            <div key={s.id} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                        <GraduationCap className="h-3 w-3" /> Offering: {s.offering}
                                    </span>
                                    <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                        <Search className="h-3 w-3" /> Seeking: {s.seeking}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                                        <Star className="h-3 w-3 text-amber-500" />
                                        {s.time_credits_offered} credit{s.time_credits_offered !== 1 ? 's' : ''}
                                    </span>
                                    <Button size="sm" className="h-7 rounded-xl text-[10px] gap-1"
                                        disabled={proposing === s.id} onClick={() => propose(s)}>
                                        {proposing === s.id
                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                            : <Check className="h-3 w-3" />}
                                        Propose Swap
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Post dialog */}
            <Dialog open={dialog} onOpenChange={setDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Post a Skill Swap</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-1">
                        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl p-3">
                            <p className="text-xs font-bold text-teal-700 dark:text-teal-300 mb-1.5 flex items-center gap-1.5">
                                <GraduationCap className="h-3.5 w-3.5" /> What I Offer
                            </p>
                            <Input placeholder="e.g. Web design, cooking lessons, photography"
                                value={form.offering} onChange={e => setForm(p => ({ ...p, offering: e.target.value }))} className="rounded-xl" />
                        </div>
                        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl p-3">
                            <p className="text-xs font-bold text-violet-700 dark:text-violet-300 mb-1.5 flex items-center gap-1.5">
                                <Search className="h-3.5 w-3.5" /> What I Need
                            </p>
                            <Input placeholder="e.g. Plumbing help, accounting, tutoring"
                                value={form.seeking} onChange={e => setForm(p => ({ ...p, seeking: e.target.value }))} className="rounded-xl" />
                        </div>
                        <div>
                            <p className="text-xs text-zinc-400 mb-1">Time credits offered (hours)</p>
                            <Input type="number" min={1} max={20} value={form.time_credits}
                                onChange={e => setForm(p => ({ ...p, time_credits: e.target.value }))} className="rounded-xl" />
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-500">
                            When a match is confirmed, credits transfer between both parties automatically via the time bank.
                        </div>
                        <Button className="w-full h-11 rounded-xl gap-2" onClick={post}
                            disabled={saving || !form.offering.trim() || !form.seeking.trim()}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {saving ? 'Posting...' : 'Post Skill Swap'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
