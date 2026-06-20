import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_STYLES = {
    admin: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
    provider: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    user: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
};

export default function UsersAdmin() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setUsers([]);
        setLoading(false);
    }, []);

    const updateRole = async (id, role) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
        toast.success(`Role updated to ${role}`);
    };

    const filtered = users.filter(u => !search ||
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h1 className="font-bold text-2xl">Users <span className="text-muted-foreground font-normal text-lg">({users.length})</span></h1>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search users..." className="pl-9 h-9 text-sm w-full" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {/* Mobile: cards. Desktop: table */}
            <div className="md:hidden space-y-2">
                {filtered.map(u => (
                    <div key={u.id} className="border border-border rounded-xl p-4 bg-card">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-xs font-black text-zinc-500">
                                    {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{u.full_name || 'No name'}</p>
                                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                </div>
                            </div>
                            <Select value={u.role || 'user'} onValueChange={v => updateRole(u.id, v)}>
                                <SelectTrigger className="w-24 h-7 text-xs shrink-0"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="provider">Provider</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="mt-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_STYLES[u.role || 'user'] || ''}`}>{u.role || 'user'}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(u => (
                            <tr key={u.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-500 shrink-0">
                                            {u.full_name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <span className="font-medium">{u.full_name || '—'}</span>
                                    </div>
                                </td>
                                <td className="p-3 text-muted-foreground">{u.email}</td>
                                <td className="p-3">
                                    <Select value={u.role || 'user'} onValueChange={v => updateRole(u.id, v)}>
                                        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">User</SelectItem>
                                            <SelectItem value="provider">Provider</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                                <td className="p-3 text-muted-foreground text-xs">{u.created_date ? new Date(u.created_date).toLocaleDateString() : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No users found.</p>}
        </div>
    );
}