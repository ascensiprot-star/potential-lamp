import { useState, useEffect } from 'react';
import { ShieldCheck, ThumbsUp, ThumbsDown, Minus, AlertCircle, Star, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';

const VOTE_OPTIONS = [
    { value: 'for',     label: 'For Complainant', Icon: ThumbsUp,   cls: 'text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' },
    { value: 'against', label: 'For Provider',    Icon: ThumbsDown, cls: 'text-red-500 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20' },
    { value: 'abstain', label: 'Abstain',         Icon: Minus,      cls: 'text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800' },
];

function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    return 'just now';
}

export default function Jury() {
    const { user } = useAuth();
    const [disputes, setDisputes] = useState([]);
    const [myVotes, setMyVotes] = useState({});
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(null);

    const load = async () => {
        setLoading(true);
        const [dispRes, voteRes] = await Promise.all([
            supabase.from('disputes').select('*').eq('status', 'open').order('created_at', { ascending: false }),
            user ? supabase.from('jury_assignments').select('*').eq('juror_user_id', user.id) : Promise.resolve({ data: [] })
        ]);
        let d = dispRes.data || [];
        if (user) d = d.filter(dp => dp.raised_by !== user.id && dp.against_id !== user.id);
        setDisputes(d);
        const voteMap = {};
        (voteRes.data || []).forEach(v => { voteMap[v.dispute_id] = v.vote; });
        setMyVotes(voteMap);
        setLoading(false);
    };

    useEffect(() => { load(); }, [user]);

    const vote = async (dispute, choice) => {
        if (!user) { toast.error('Sign in to vote'); return; }
        if (myVotes[dispute.id]) { toast('Already voted on this dispute'); return; }
        setVoting(dispute.id + choice);
        const { error } = await supabase.from('jury_assignments').insert([{
            dispute_id: dispute.id,
            juror_user_id: user.id,
            vote: choice,
            voted_at: new Date().toISOString()
        }]);
        if (!error) {
            // Award time credit
            await supabase.from('time_credits_ledger').insert([{
                user_id: user.id,
                amount: 1,
                reason: 'jury_vote',
                related_entity_type: 'dispute',
                related_entity_id: dispute.id
            }]);
            setMyVotes(p => ({ ...p, [dispute.id]: choice }));
            toast.success('Vote recorded — +1 time credit earned');
        } else { toast.error(error.message || 'Failed to vote'); }
        setVoting(null);
    };

    return (
        <div className="space-y-6 pb-8 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                    <h1 className="font-bold text-2xl tracking-tight text-zinc-900 dark:text-white">Neighborhood Jury</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">Peer-reviewed dispute resolution — earn time credits</p>
                </div>
            </div>

            {/* How it works */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-zinc-500 shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold text-sm text-zinc-900 dark:text-white">How the jury works</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        Disputes between customers and providers are resolved by a randomly selected panel of community members.
                        All identities are anonymized. Quorum is reached at 3 votes. Each vote earns 1 time credit.
                    </p>
                </div>
            </div>

            {/* Earn credits callout */}
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4">
                <Star className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Earn 1 time credit for every dispute you vote on
                </p>
            </div>

            {/* Disputes list */}
            {loading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="skeleton-wave h-140 rounded-2xl" />
                    ))}
                </div>
            ) : disputes.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-zinc-200 dark:text-zinc-700" strokeWidth={1.5} />
                    <p className="text-zinc-400 font-medium">No open disputes</p>
                    <p className="text-xs text-zinc-400 mt-1">All disputes have been resolved — check back later</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {disputes.map(d => {
                        const voted = myVotes[d.id];
                        const evidence = Array.isArray(d.evidence_urls) ? d.evidence_urls : [];
                        return (
                            <div key={d.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                                <div className="p-5">
                                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                                d.status === 'voting'
                                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            }`}>
                                                {d.status === 'voting' ? 'Voting in Progress' : 'Open for Review'}
                                            </span>
                                            <span className="text-[10px] text-zinc-400">{timeAgo(d.created_at)}</span>
                                        </div>
                                        {evidence.length > 0 && (
                                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {evidence.length} evidence item{evidence.length !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>

                                    {d.category && (
                                        <p className="text-sm mb-1">
                                            <span className="font-semibold text-zinc-900 dark:text-white">Category:</span>
                                            <span className="text-zinc-600 dark:text-zinc-400 ml-1 capitalize">{d.category}</span>
                                        </p>
                                    )}
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-4">
                                        {d.description}
                                    </p>
                                </div>

                                <div className="border-t border-zinc-100 dark:border-zinc-800 p-4">
                                    {voted ? (
                                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                                            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                            <span>Your vote: <span className="font-semibold text-zinc-900 dark:text-white capitalize">{voted.replace('_', ' ')}</span></span>
                                            <span className="ml-auto text-[10px] text-amber-600 flex items-center gap-1">
                                                <Star className="h-3 w-3" /> +1 credit
                                            </span>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2.5">Cast your vote</p>
                                            <div className="flex gap-2 flex-wrap">
                                                {VOTE_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => vote(d, opt.value)}
                                                        disabled={!!voting}
                                                        className={`flex items-center gap-1.5 h-8 px-3 rounded-xl border text-xs font-semibold transition-all ${opt.cls} ${voting?.startsWith(d.id) ? 'opacity-60' : ''}`}>
                                                        {voting === d.id + opt.value
                                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                                            : <opt.Icon className="h-3 w-3" />}
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!user && (
                <div className="text-center py-6 text-zinc-400 text-sm border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    Sign in to participate as a juror and earn time credits
                </div>
            )}
        </div>
    );
}
