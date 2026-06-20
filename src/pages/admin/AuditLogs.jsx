import { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const SEVERITY_STYLES = {
    debug: 'bg-zinc-100 text-zinc-500',
    info: 'bg-blue-50 text-blue-600',
    warn: 'bg-amber-50 text-amber-700',
    error: 'bg-red-50 text-red-600',
    critical: 'bg-red-100 text-red-800',
};

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');

    useEffect(() => {
        setLogs([]);
        setLoading(false);
    }, []);

    const filtered = logs.filter(l => {
        const matchSearch = !search || l.actor_email?.toLowerCase().includes(search.toLowerCase()) || l.action?.toLowerCase().includes(search.toLowerCase());
        const matchSeverity = severityFilter === 'all' || l.severity === severityFilter;
        return matchSearch && matchSeverity;
    });

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-inter font-black text-2xl tracking-tight">Audit Logs</h1>
                    <p className="text-zinc-400 text-sm">Complete audit trail of all platform actions</p>
                </div>
                <Button variant="outline" className="rounded-xl gap-2"><Download className="h-4 w-4" /> Export Logs</Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {['debug', 'info', 'warn', 'error', 'critical'].map(s => (
                    <div key={s} className={`rounded-xl p-3 text-center ${SEVERITY_STYLES[s]}`}>
                        <p className="font-black text-xl">{logs.filter(l => l.severity === s).length}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5">{s}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by actor or action…" className="pl-9 rounded-xl" />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="rounded-xl w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Severity</SelectItem>
                        {['debug', 'info', 'warn', 'error', 'critical'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-wave h-12 rounded-xl" />)}</div>
            ) : (
                <div className="card-premium overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            <tr>
                                <th className="text-left px-5 py-3">Timestamp</th>
                                <th className="text-left px-5 py-3">Actor</th>
                                <th className="text-left px-5 py-3">Action</th>
                                <th className="text-left px-5 py-3">Resource</th>
                                <th className="text-right px-5 py-3">Severity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 font-mono text-xs">
                            {filtered.map(log => (
                                <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-5 py-2.5 text-zinc-400">{log.created_date?.slice(0, 19).replace('T', ' ')}</td>
                                    <td className="px-5 py-2.5 font-sans font-medium text-zinc-700">{log.actor_email}</td>
                                    <td className="px-5 py-2.5 text-zinc-600">{log.action}</td>
                                    <td className="px-5 py-2.5 text-zinc-500">{log.resource_type} {log.resource_id ? `#${log.resource_id?.slice(0, 6)}` : ''}</td>
                                    <td className="px-5 py-2.5 text-right">
                                        <span className={`font-sans text-[10px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_STYLES[log.severity] || ''}`}>{log.severity}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && <div className="p-10 text-center text-zinc-400 text-sm">No audit logs found</div>}
                </div>
            )}
        </div>
    );
}