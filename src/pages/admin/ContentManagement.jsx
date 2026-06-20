import { useState } from 'react';
import { Edit3, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const DEFAULT_PAGES = [
    { id: 'home_hero', title: 'Home Hero Section', content: 'The operating system for your neighborhood.', subtitle: 'Predict demand. Bundle jobs. Trust verified providers. Book instantly.', published: true },
    { id: 'about', title: 'About Page', content: 'Truvornex is a neighborhood intelligence platform…', subtitle: '', published: true },
    { id: 'terms', title: 'Terms of Service', content: 'By using Truvornex, you agree to these terms…', subtitle: '', published: true },
    { id: 'privacy', title: 'Privacy Policy', content: 'We take your privacy seriously…', subtitle: '', published: true },
];

const DEFAULT_ANNOUNCEMENTS = [
    { id: '1', title: 'Platform Maintenance', body: 'Scheduled maintenance on Sunday 2am–4am UTC', active: false },
    { id: '2', title: 'New Feature: Group Bundles', body: 'Save up to 35% by booking with your neighbors!', active: true },
];

export default function ContentManagement() {
    const [tab, setTab] = useState('pages');
    const [pages, setPages] = useState(DEFAULT_PAGES);
    const [announcements, setAnnouncements] = useState(DEFAULT_ANNOUNCEMENTS);
    const [editing, setEditing] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [newAnn, setNewAnn] = useState({ title: '', body: '', active: true });

    const saveEdit = () => {
        setPages(prev => prev.map(p => p.id === editing ? { ...p, ...editForm } : p));
        setEditing(null);
        toast.success('Page content saved');
    };

    const addAnnouncement = () => {
        if (!newAnn.title || !newAnn.body) { toast.error('Title and body required'); return; }
        setAnnouncements(prev => [...prev, { ...newAnn, id: Date.now().toString() }]);
        setNewAnn({ title: '', body: '', active: true });
        toast.success('Announcement created');
    };

    const toggleAnn = (id) => setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
    const delAnn = (id) => { setAnnouncements(prev => prev.filter(a => a.id !== id)); toast.success('Deleted'); };

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="font-inter font-black text-2xl tracking-tight">Content Management</h1>
                <p className="text-zinc-400 text-sm">Manage platform text, pages, and announcements</p>
            </div>

            <div className="glass rounded-2xl p-1.5 flex gap-1 max-w-sm">
                {[['pages', 'Pages'], ['announcements', 'Announcements']].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex-1 h-9 rounded-xl text-xs font-semibold transition-all ${tab === key ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'pages' && (
                <div className="space-y-3">
                    {pages.map(page => (
                        <div key={page.id} className="card-premium p-5">
                            {editing === page.id ? (
                                <div className="space-y-3">
                                    <Input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} className="rounded-xl font-bold" />
                                    <Textarea value={editForm.content} onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} className="rounded-xl resize-none" rows={4} />
                                    {editForm.subtitle !== undefined && <Input placeholder="Subtitle" value={editForm.subtitle} onChange={e => setEditForm(p => ({ ...p, subtitle: e.target.value }))} className="rounded-xl" />}
                                    <div className="flex gap-2">
                                        <Button size="sm" className="rounded-xl gap-1.5" onClick={saveEdit}><Save className="h-3.5 w-3.5" /> Save</Button>
                                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setEditing(null)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-bold text-sm">{page.title}</p>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${page.published ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{page.published ? 'Published' : 'Draft'}</span>
                                        </div>
                                        <p className="text-sm text-zinc-500 line-clamp-2">{page.content}</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="rounded-xl gap-1.5 shrink-0" onClick={() => { setEditing(page.id); setEditForm({ title: page.title, content: page.content, subtitle: page.subtitle }); }}>
                                        <Edit3 className="h-3.5 w-3.5" /> Edit
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {tab === 'announcements' && (
                <div className="space-y-4">
                    <div className="card-premium p-5 space-y-3">
                        <h2 className="font-bold text-sm">New Announcement</h2>
                        <Input placeholder="Title *" value={newAnn.title} onChange={e => setNewAnn(p => ({ ...p, title: e.target.value }))} className="rounded-xl" />
                        <Textarea placeholder="Message body *" value={newAnn.body} onChange={e => setNewAnn(p => ({ ...p, body: e.target.value }))} className="rounded-xl resize-none" rows={2} />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Switch checked={newAnn.active} onCheckedChange={v => setNewAnn(p => ({ ...p, active: v }))} />
                                <span className="text-sm font-medium">Publish immediately</span>
                            </div>
                            <Button size="sm" className="rounded-xl" onClick={addAnnouncement}>Add Announcement</Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {announcements.map(a => (
                            <div key={a.id} className={`card-premium p-4 flex items-center gap-4 ${!a.active ? 'opacity-60' : ''}`}>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm">{a.title}</p>
                                    <p className="text-xs text-zinc-400 truncate">{a.body}</p>
                                </div>
                                <Switch checked={a.active} onCheckedChange={() => toggleAnn(a.id)} />
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-400 hover:text-red-600" onClick={() => delAnn(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}