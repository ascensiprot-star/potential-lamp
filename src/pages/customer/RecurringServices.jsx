import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Pause, Play, Trash2, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const FREQ_LABELS = { weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month', quarterly: 'Every 3 months' };
const FREQ_COLORS = { weekly: 'bg-violet-100 text-violet-700', biweekly: 'bg-blue-100 text-blue-700', monthly: 'bg-emerald-100 text-emerald-700', quarterly: 'bg-amber-100 text-amber-700' };

export default function RecurringServices() {
    const [recurring, setRecurring] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setRecurring([]);
        setLoading(false);
    }, []);

    const toggleActive = async (r) => {
        setRecurring(prev => prev.map(rb => rb.id === r.id ? { ...rb, is_active: !rb.is_active } : rb));
        toast.success(r.is_active ? 'Recurring service paused' : 'Recurring service resumed');
    };

    const del = async (id) => {
        setRecurring(prev => prev.filter(r => r.id !== id));
        toast.success('Recurring service cancelled');
    };

    if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-24 rounded-2xl" />)}</div>;

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="font-display font-bold text-3xl tracking-tight">Recurring Services</h1>
                <p className="text-zinc-500 text-sm mt-1">Auto-scheduled services you've set up</p>
            </div>

            {recurring.length === 0 ? (
                <div className="card-premium p-12 text-center">
                    <RefreshCw className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm mb-1">No recurring services</p>
                    <p className="text-xs text-zinc-300">Set up a recurring booking from any provider's service page</p>
                    <Button asChild variant="outline" className="mt-4 rounded-xl"><Link to="/services">Find Services</Link></Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {recurring.map(r => (
                        <div key={r.id} className={`card-premium p-5 ${!r.is_active ? 'opacity-60' : ''}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="font-bold text-sm">{r.service_name}</p>
                                    <p className="text-xs text-zinc-400 mt-0.5">{r.provider_name}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${FREQ_COLORS[r.frequency] || 'bg-zinc-100 text-zinc-600'}`}>{FREQ_LABELS[r.frequency] || r.frequency}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-400 mb-3">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {r.day_of_week}</span>
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.preferred_time}</span>
                                <span>{r.total_completed} completions</span>
                            </div>
                            {r.next_date && <p className="text-xs text-zinc-500 mb-3">Next: <span className="font-semibold">{r.next_date}</span></p>}
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="rounded-xl gap-1.5 flex-1" onClick={() => toggleActive(r)}>
                                    {r.is_active ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Resume</>}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-400 hover:text-red-600" onClick={() => del(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}