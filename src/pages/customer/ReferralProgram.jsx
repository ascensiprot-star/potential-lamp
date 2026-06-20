import { useState, useEffect } from 'react';
import { Users, Copy, Check, Gift, Share2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ReferralProgram() {
    const [user, setUser] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
    }, []);

    const refCode = user ? `TRV-${user.id?.slice(0, 6).toUpperCase()}` : '...';
    const refLink = `${window.location.origin}?ref=${refCode}`;

    const copyLink = () => {
        navigator.clipboard.writeText(refLink);
        setCopied(true);
        toast.success('Referral link copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const STEPS = [
        { icon: Share2, title: 'Share your link', desc: 'Send your unique referral link to friends and family.' },
        { icon: Users, title: 'They sign up & book', desc: 'Your friend registers and completes their first booking.' },
        { icon: Gift, title: 'Both earn credits', desc: 'You get $10 credit and your friend gets $5 off their first booking.' },
    ];

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h1 className="font-display font-bold text-3xl tracking-tight">Refer & Earn</h1>
                <p className="text-zinc-500 text-sm mt-1">Invite friends and earn $10 for every successful referral</p>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 text-white text-center">
                <TrendingUp className="h-10 w-10 mx-auto mb-4 text-zinc-300" />
                <h2 className="font-display font-bold text-3xl mb-2">Earn $10 per referral</h2>
                <p className="text-zinc-400 text-sm">No limit. The more friends you refer, the more you earn.</p>
            </div>

            <div className="card-premium p-6">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-3">Your Referral Link</label>
                <div className="flex gap-2">
                    <Input value={refLink} readOnly className="rounded-xl font-mono text-sm bg-zinc-50 flex-1" />
                    <Button onClick={copyLink} className="rounded-xl px-4 shrink-0 gap-2">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy'}
                    </Button>
                </div>
                <p className="text-xs text-zinc-400 mt-2">Referral code: <span className="font-mono font-bold text-zinc-700">{refCode}</span></p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {STEPS.map((s, i) => (
                    <div key={i} className="card-premium p-5 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                            <s.icon className="h-5 w-5 text-zinc-700" />
                        </div>
                        <p className="font-bold text-sm mb-1">{s.title}</p>
                        <p className="text-xs text-zinc-400">{s.desc}</p>
                    </div>
                ))}
            </div>

            <div className="card-premium p-5">
                <h3 className="font-bold text-sm mb-3">Referral Stats</h3>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Links Shared', value: '—' },
                        { label: 'Successful Referrals', value: '0' },
                        { label: 'Credits Earned', value: '$0' },
                    ].map(s => (
                        <div key={s.label} className="text-center">
                            <p className="font-black text-xl text-zinc-900">{s.value}</p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}