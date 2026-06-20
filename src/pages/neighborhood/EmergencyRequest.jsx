import { useState, useEffect } from 'react';
import { Zap, MapPin, AlertTriangle, CheckCircle, Loader2, Wrench, Thermometer, Lock, Home, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';

const EMERGENCY_CATEGORIES = [
    { id: 'plumbing',   label: 'Plumbing',    Icon: Wrench       },
    { id: 'electrical', label: 'Electrical',  Icon: Zap          },
    { id: 'hvac',       label: 'HVAC',        Icon: Thermometer  },
    { id: 'locksmith',  label: 'Locksmith',   Icon: Lock         },
    { id: 'structural', label: 'Structural',  Icon: Home         },
    { id: 'appliance',  label: 'Appliance',   Icon: Package      },
];

const URGENCY_LEVELS = [
    { id: 'immediate', label: 'Right Now',      sub: 'Within 1 hour'  },
    { id: 'urgent',    label: 'Within 4 Hours', sub: 'Same day'       },
    { id: 'today',     label: 'Today',          sub: 'Within 8 hours' },
];

const STATUS_STEPS = ['open', 'matched', 'in_progress', 'resolved'];
const STATUS_LABELS = {
    open: 'Submitted', matched: 'Matched', in_progress: 'In Progress', resolved: 'Resolved',
};

export default function EmergencyRequest() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ category: '', urgency: 'immediate', description: '' });
    const [locating, setLocating] = useState(false);
    const [loc, setLoc] = useState(null);
    const [activeReq, setActiveReq] = useState(null);

    const load = async () => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        const { data } = await supabase.from('emergency_requests').select('*').eq('customer_id', user.id).order('created_at', { ascending: false });
        if (data) {
            setRequests(data);
            const active = data.find(r => !['resolved', 'cancelled'].includes(r.status));
            if (active) setActiveReq(active);
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, [user]);

    const getLocation = () => {
        if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            p => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); toast.success('Location captured'); },
            () => { toast.error('Could not get location'); setLocating(false); }
        );
    };

    const submit = async () => {
        if (!form.category) { toast.error('Select a category'); return; }
        if (!form.description.trim()) { toast.error('Describe the issue'); return; }
        if (!user) { toast.error('Sign in first'); return; }
        setSubmitting(true);
        // Get default zone
        const { data: zones } = await supabase.from('neighborhood_zones').select('id').limit(1);
        const zoneId = zones?.[0]?.id || null;
        const { data, error } = await supabase.from('emergency_requests').insert([{
            customer_id: user.id,
            category: form.category,
            urgency: form.urgency,
            description: form.description.trim(),
            lat: loc?.lat ?? null,
            lng: loc?.lng ?? null,
            zone_id: zoneId
        }]).select().single();
        if (!error && data) {
            setActiveReq(data);
            setRequests(p => [data, ...p]);
            setForm({ category: '', urgency: 'immediate', description: '' });
            setLoc(null);
            toast.success('Emergency request submitted — matching providers now');
        } else { toast.error(error?.message || 'Failed to submit'); }
        setSubmitting(false);
    };

    const cancel = async () => {
        if (!activeReq) return;
        const { error } = await supabase.from('emergency_requests').update({ status: 'cancelled' }).eq('id', activeReq.id);
        if (!error) {
            setActiveReq(null);
            load();
            toast.success('Request cancelled');
        } else {
            toast.error('Failed to cancel request');
        }
    };

    const stepIdx = s => STATUS_STEPS.indexOf(s);

    if (loading) {
        return (
            <div className="space-y-4 max-w-2xl">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-24 rounded-2xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-red-600" />
                </div>
                <div>
                    <h1 className="font-bold text-2xl tracking-tight text-zinc-900 dark:text-white">Emergency Request</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">On-demand urgent service dispatch</p>
                </div>
            </div>

            {/* Safety notice */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold text-sm text-red-700 dark:text-red-300">For life-threatening emergencies call 911</p>
                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                        This service covers home emergencies — burst pipes, power outages, lockouts, HVAC failures.
                    </p>
                </div>
            </div>

            {/* Active request tracker */}
            {activeReq && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="font-semibold text-zinc-900 dark:text-white">Active Request</p>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            activeReq.status === 'resolved'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        }`}>
                            {activeReq.status.replace('_', ' ')}
                        </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 capitalize">
                        {activeReq.category} — {activeReq.description}
                    </p>

                    {/* Status stepper */}
                    <div className="flex items-start">
                        {STATUS_STEPS.map((step, i) => {
                            const done = i <= stepIdx(activeReq.status);
                            const isLast = i === STATUS_STEPS.length - 1;
                            return (
                                <div key={step} className="flex items-start flex-1 last:flex-none">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                            done
                                                ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white'
                                                : 'border-zinc-200 dark:border-zinc-700 bg-transparent'
                                        }`}>
                                            {done && <CheckCircle className="h-3.5 w-3.5 text-white dark:text-zinc-900" />}
                                        </div>
                                        <p className="text-[9px] text-zinc-400 text-center w-16 leading-tight">{STATUS_LABELS[step]}</p>
                                    </div>
                                    {!isLast && (
                                        <div className={`h-0.5 flex-1 mx-1 mt-3 rounded-full transition-all ${
                                            i < stepIdx(activeReq.status)
                                                ? 'bg-zinc-900 dark:bg-white'
                                                : 'bg-zinc-100 dark:bg-zinc-800'
                                        }`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {activeReq.matched_provider_id && activeReq.status === 'matched' && (
                        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Provider matched — on their way</p>
                        </div>
                    )}

                    {!['resolved', 'cancelled'].includes(activeReq.status) && (
                        <Button variant="outline" size="sm" className="mt-5 rounded-xl text-xs" onClick={cancel}>
                            Cancel Request
                        </Button>
                    )}
                </div>
            )}

            {/* Request form */}
            {!activeReq && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 space-y-5">
                    <h2 className="font-semibold text-sm text-zinc-900 dark:text-white">New Emergency Request</h2>

                    <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">What type of emergency?</p>
                        <div className="grid grid-cols-3 gap-2">
                            {EMERGENCY_CATEGORIES.map(cat => (
                                <button key={cat.id} onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                                    className={`p-3 rounded-xl border text-center transition-all ${
                                        form.category === cat.id
                                            ? 'border-zinc-900 dark:border-white bg-zinc-900/5 dark:bg-white/10'
                                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                    }`}>
                                    <cat.Icon className="h-5 w-5 mx-auto mb-1 text-zinc-600 dark:text-zinc-400" />
                                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{cat.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">How urgent?</p>
                        <div className="grid grid-cols-3 gap-2">
                            {URGENCY_LEVELS.map(u => (
                                <button key={u.id} onClick={() => setForm(f => ({ ...f, urgency: u.id }))}
                                    className={`p-3 rounded-xl border text-center transition-all ${
                                        form.urgency === u.id
                                            ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white'
                                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                                    }`}>
                                    <p className={`font-bold text-xs ${form.urgency === u.id ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-white'}`}>
                                        {u.label}
                                    </p>
                                    <p className={`text-[10px] mt-0.5 ${form.urgency === u.id ? 'text-white/70 dark:text-zinc-900/70' : 'text-zinc-400'}`}>
                                        {u.sub}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Describe the issue</p>
                        <Textarea
                            placeholder="e.g. Kitchen pipe burst, water flooding the floor..."
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            className="rounded-xl resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="rounded-xl gap-2 h-9 text-sm" onClick={getLocation} disabled={locating}>
                            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                            {loc ? 'Location Captured' : 'Share Location'}
                        </Button>
                        {loc && <p className="text-xs text-zinc-400">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>}
                    </div>

                    <Button
                        className="w-full h-11 rounded-xl gap-2"
                        onClick={submit}
                        disabled={submitting || !form.category || !form.description.trim()}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        {submitting ? 'Submitting...' : 'Submit Emergency Request'}
                    </Button>

                    {!user && (
                        <p className="text-xs text-center text-zinc-400">You must be logged in to submit a request</p>
                    )}
                </div>
            )}

            {/* Past requests */}
            {requests.filter(r => ['resolved', 'cancelled'].includes(r.status)).length > 0 && (
                <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Past Requests</p>
                    <div className="space-y-2">
                        {requests.filter(r => ['resolved', 'cancelled'].includes(r.status)).map(r => (
                            <div key={r.id} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full shrink-0 ${r.status === 'resolved' ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white capitalize">{r.category}</p>
                                    <p className="text-xs text-zinc-400 line-clamp-1">{r.description}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    r.status === 'resolved'
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                }`}>
                                    {r.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
