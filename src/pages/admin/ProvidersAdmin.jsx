import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Shield, Search, MapPin, Star, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

const STATUS_COLORS = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    suspended: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
};

export default function ProvidersAdmin() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);

    const load = async () => {
        setLoading(true);
        const { data } = await supabase.from('providers').select('*').order('created_date', { ascending: false });
        if (data) setProviders(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const update = async (id, data) => {
        const action = data.status ? `Status → ${data.status}` : data.verified ? 'Verified' : 'Updated';
        toast.success(action);
        setProviders(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
        if (selected?.id === id) setSelected(p => ({ ...p, ...data }));
    };

    const filtered = providers.filter(p => {
        const matchStatus = filter === 'all' || p.status === filter;
        const term = search.toLowerCase();
        const matchSearch = !term ||
            p.business_name?.toLowerCase().includes(term) ||
            p.user_email?.toLowerCase().includes(term) ||
            p.city?.toLowerCase().includes(term);
        return matchStatus && matchSearch;
    });

    const counts = {
        pending: providers.filter(p => p.status === 'pending').length,
        approved: providers.filter(p => p.status === 'approved').length,
        rejected: providers.filter(p => p.status === 'rejected').length,
        suspended: providers.filter(p => p.status === 'suspended').length,
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h1 className="font-bold text-2xl">Providers <span className="text-muted-foreground font-normal text-lg">({providers.length})</span></h1>
                <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search..." className="pl-9 h-9 w-48 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All ({providers.length})</SelectItem>
                            <SelectItem value="pending">Pending ({counts.pending})</SelectItem>
                            <SelectItem value="approved">Approved ({counts.approved})</SelectItem>
                            <SelectItem value="rejected">Rejected ({counts.rejected})</SelectItem>
                            <SelectItem value="suspended">Suspended ({counts.suspended})</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {counts.pending > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <strong>{counts.pending} provider{counts.pending !== 1 ? 's' : ''} waiting for approval</strong>
                </div>
            )}

            <div className="space-y-2">
                {filtered.map(p => (
                    <div key={p.id} onClick={() => setSelected(p)}
                        className="border border-border rounded-xl p-4 hover:border-foreground/40 transition-colors cursor-pointer bg-card">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-sm font-black text-zinc-500">
                                    {p.business_name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-sm">{p.business_name}</h3>
                                        {p.verified && <Shield className="h-3.5 w-3.5 text-blue-500" />}
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || ''}`}>{p.status}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{p.user_email}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                        {p.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</span>}
                                        {p.rating > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3" />{p.rating?.toFixed(1)} ({p.review_count})</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0 flex-wrap" onClick={e => e.stopPropagation()}>
                                {p.status === 'pending' && (
                                    <>
                                        <Button size="sm" className="h-7 text-xs rounded-lg" onClick={() => update(p.id, { status: 'approved' })}>
                                            <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                                        </Button>
                                        <Button size="sm" variant="destructive" className="h-7 text-xs rounded-lg" onClick={() => update(p.id, { status: 'rejected' })}>
                                            <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                                        </Button>
                                    </>
                                )}
                                {p.status === 'approved' && !p.verified && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => update(p.id, { verified: true })}>
                                        <Shield className="h-3.5 w-3.5 mr-1" />Verify
                                    </Button>
                                )}
                                {p.status === 'approved' && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg text-red-600 dark:text-red-400 hover:text-red-700 border-red-200 dark:border-red-800" onClick={() => update(p.id, { status: 'suspended' })}>
                                        Suspend
                                    </Button>
                                )}
                                {p.status === 'suspended' && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" onClick={() => update(p.id, { status: 'approved' })}>
                                        Reactivate
                                    </Button>
                                )}
                                {p.status === 'rejected' && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => update(p.id, { status: 'pending' })}>
                                        Re-review
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No providers found.</p>}
            </div>

            <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>{selected?.business_name}</DialogTitle></DialogHeader>
                    {selected && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><p className="text-muted-foreground text-xs mb-1">Email</p><p className="font-medium truncate">{selected.user_email}</p></div>
                                <div><p className="text-muted-foreground text-xs mb-1">Status</p>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[selected.status] || ''}`}>{selected.status}</span>
                                </div>
                                {selected.phone && <div><p className="text-muted-foreground text-xs mb-1">Phone</p><p className="font-medium">{selected.phone}</p></div>}
                                {selected.city && <div><p className="text-muted-foreground text-xs mb-1">City</p><p className="font-medium">{selected.city}</p></div>}
                                {selected.address && <div className="col-span-2"><p className="text-muted-foreground text-xs mb-1">Address</p><p className="font-medium">{selected.address}</p></div>}
                                {selected.description && <div className="col-span-2"><p className="text-muted-foreground text-xs mb-1">About</p><p className="text-sm">{selected.description}</p></div>}
                                <div><p className="text-muted-foreground text-xs mb-1">Rating</p><p className="font-medium">{selected.rating?.toFixed(1) || 'N/A'} ({selected.review_count || 0} reviews)</p></div>
                                <div><p className="text-muted-foreground text-xs mb-1">Verified</p><p className="font-medium">{selected.verified ? '✓ Yes' : 'No'}</p></div>
                            </div>
                            <div className="border-t pt-4">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Actions</p>
                                <div className="flex flex-wrap gap-2">
                                    {!selected.verified && selected.status === 'approved' && (
                                        <Button size="sm" className="rounded-xl" onClick={() => update(selected.id, { verified: true })}>
                                            <Shield className="h-3.5 w-3.5 mr-1.5" /> Grant Verification
                                        </Button>
                                    )}
                                    {selected.verified && (
                                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => update(selected.id, { verified: false })}>
                                            Revoke Verification
                                        </Button>
                                    )}
                                    {selected.status !== 'approved' && (
                                        <Button size="sm" variant="outline" className="rounded-xl text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" onClick={() => update(selected.id, { status: 'approved' })}>
                                            Approve
                                        </Button>
                                    )}
                                    {selected.status !== 'suspended' && selected.status !== 'rejected' && (
                                        <Button size="sm" variant="outline" className="rounded-xl text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" onClick={() => update(selected.id, { status: 'suspended' })}>
                                            Suspend
                                        </Button>
                                    )}
                                    {selected.status !== 'rejected' && (
                                        <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => update(selected.id, { status: 'rejected' })}>
                                            Reject
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}