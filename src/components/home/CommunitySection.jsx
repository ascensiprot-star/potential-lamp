import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Search, ThumbsUp, HelpCircle, Briefcase, RefreshCw, MessageCircle, ArrowRight, Plus, Send, ChevronRight, MapPin, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

const POST_TYPES = {
    announcement:  { icon: Megaphone,     label: 'Announcement', color: 'bg-blue-100 text-blue-700'    },
    lost_found:    { icon: Search,         label: 'Lost & Found',  color: 'bg-amber-100 text-amber-700'  },
    recommendation:{ icon: ThumbsUp,       label: 'Recommend',     color: 'bg-emerald-100 text-emerald-700' },
    question:      { icon: HelpCircle,     label: 'Question',      color: 'bg-violet-100 text-violet-700' },
    job:           { icon: Briefcase,      label: 'Job',           color: 'bg-rose-100 text-rose-700'    },
    skill_exchange:{ icon: RefreshCw,      label: 'Skill Swap',    color: 'bg-teal-100 text-teal-700'    },
    general:       { icon: MessageCircle,  label: 'General',       color: 'bg-zinc-100 text-zinc-600'    },
};

export default function CommunitySection({ user }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState('all');
    const [postDialog, setPostDialog] = useState(false);
    const [form, setForm] = useState({ type: 'general', title: '', body: '', neighborhood: '', skill_offer: '', skill_want: '', job_type: '', job_salary: '', contact_email: '' });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        const { data } = await supabase.from('community_posts').select('*').order('created_date', { ascending: false }).limit(20);
        if (data) setPosts(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const filtered = activeType === 'all' ? posts : posts.filter(p => p.type === activeType);

    const upvote = async (post) => {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, upvotes: (p.upvotes || 0) + 1 } : p));
        await supabase.from('community_posts').update({ upvotes: (post.upvotes || 0) + 1 }).eq('id', post.id);
    };

    const create = async () => {
        if (!form.title || !form.body) { toast.error('Title and message required'); return; }
        if (!user) { toast.error('Please sign in first'); return; }
        setSaving(true);
        const { error } = await supabase.from('community_posts').insert([{
            type: form.type,
            title: form.title,
            body: form.body,
            neighborhood: form.neighborhood || null,
            skill_offer: form.skill_offer || null,
            skill_want: form.skill_want || null,
            job_type: form.job_type || null,
            job_salary: form.job_salary || null,
            contact_email: form.contact_email || null,
            author_email: user.email,
            author_name: user.full_name || user.email?.split('@')[0],
            author_id: user.id,
            upvotes: 0,
            reply_count: 0
        }]);
        if (!error) {
            toast.success('Posted to community feed!');
            setPostDialog(false);
            setForm({ type: 'general', title: '', body: '', neighborhood: '', skill_offer: '', skill_want: '', job_type: '', job_salary: '', contact_email: '' });
            load();
        } else {
            toast.error(error.message || 'Failed to post');
        }
        setSaving(false);
    };

    const counts = { all: posts.length };
    Object.keys(POST_TYPES).forEach(t => { counts[t] = posts.filter(p => p.type === t).length; });

    return (
        <section>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="font-display font-bold text-xl tracking-tight">Community Feed</h2>
                    <p className="text-zinc-500 text-sm mt-0.5 font-inter">Announcements, jobs, skill swaps & neighborhood chat</p>
                </div>
                <div className="flex items-center gap-2">
                    {user && (
                        <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs" onClick={() => setPostDialog(true)}>
                            <Plus className="h-3.5 w-3.5" /> New Post
                        </Button>
                    )}
                    <Link to="/community" className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                        Full feed <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>

            {/* Type pills with counts */}
            <div className="flex gap-2 flex-wrap mb-4">
                <button onClick={() => setActiveType('all')}
                    className={`h-7 px-3 rounded-full text-xs font-bold transition-all ${activeType === 'all' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'}`}>
                    All ({counts.all})
                </button>
                {Object.entries(POST_TYPES).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                        <button key={key} onClick={() => setActiveType(key === activeType ? 'all' : key)}
                            className={`h-7 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${activeType === key ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'}`}>
                            <Icon className="h-3 w-3" /> {cfg.label} {counts[key] > 0 && `(${counts[key]})`}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-wave h-20 rounded-2xl" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="card-premium p-10 text-center">
                    <MessageCircle className="h-8 w-8 mx-auto mb-3 text-zinc-200" />
                    <p className="text-zinc-400 text-sm">No posts yet. Start the conversation!</p>
                    {user && <Button size="sm" variant="outline" className="rounded-xl mt-3" onClick={() => setPostDialog(true)}>Post Something</Button>}
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filtered.slice(0, 6).map(post => {
                        const cfg = POST_TYPES[post.type] || POST_TYPES.general;
                        const Icon = cfg.icon;
                        return (
                            <div key={post.id} className="card-premium p-4 hover:shadow-premium transition-all">
                                <div className="flex items-start gap-3">
                                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.color}`}>
                                        <Icon className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                                                    {post.neighborhood && (
                                                        <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                                                            <MapPin className="h-2.5 w-2.5" /> {post.neighborhood}
                                                        </span>
                                                    )}
                                                    {post.is_resolved && <span className="text-[10px] text-emerald-600">Resolved</span>}
                                                    {post.type === 'job' && post.job_salary && <span className="text-[10px] text-emerald-600 font-semibold">{post.job_salary}</span>}
                                                </div>
                                                <p className="font-semibold text-sm line-clamp-1">{post.title}</p>
                                                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{post.body}</p>
                                                {post.type === 'skill_exchange' && (
                                                    <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                                                        {post.skill_offer && (
                                                            <span className="bg-teal-50 dark:bg-teal-900/20 text-teal-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                                <GraduationCap className="h-2.5 w-2.5" /> {post.skill_offer}
                                                            </span>
                                                        )}
                                                        <span className="text-zinc-300">&#8644;</span>
                                                        {post.skill_want && (
                                                            <span className="bg-violet-50 dark:bg-violet-900/20 text-violet-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                                <Search className="h-2.5 w-2.5" /> {post.skill_want}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                <span className="text-[10px] text-zinc-300">{post.created_date?.slice(0, 10)}</span>
                                                <button onClick={() => upvote(post)}
                                                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                                                    <ThumbsUp className="h-3 w-3" /> {post.upvotes || 0}
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-zinc-400 mt-1.5">{post.author_name || post.author_email?.split('@')[0]}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {filtered.length > 6 && (
                <Link to="/community" className="flex items-center justify-center gap-2 mt-3 text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                    {filtered.length - 6} more posts <ChevronRight className="h-4 w-4" />
                </Link>
            )}

            {/* Post Dialog */}
            <Dialog open={postDialog} onOpenChange={setPostDialog}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>New Community Post</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-1">
                        <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(POST_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input placeholder="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="rounded-xl" />
                        <Textarea placeholder="What's on your mind? *" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} className="rounded-xl resize-none" rows={3} />
                        <Input placeholder="Neighborhood (optional)" value={form.neighborhood} onChange={e => setForm(p => ({ ...p, neighborhood: e.target.value }))} className="rounded-xl" />
                        {form.type === 'job' && (
                            <div className="grid grid-cols-2 gap-3">
                                <Select value={form.job_type} onValueChange={v => setForm(p => ({ ...p, job_type: v }))}>
                                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Job type" /></SelectTrigger>
                                    <SelectContent><SelectItem value="full_time">Full Time</SelectItem><SelectItem value="part_time">Part Time</SelectItem><SelectItem value="freelance">Freelance</SelectItem><SelectItem value="gig">Gig</SelectItem></SelectContent>
                                </Select>
                                <Input placeholder="Pay/Salary" value={form.job_salary} onChange={e => setForm(p => ({ ...p, job_salary: e.target.value }))} className="rounded-xl" />
                            </div>
                        )}
                        {form.type === 'skill_exchange' && (
                            <div className="grid grid-cols-2 gap-3">
                                <Input placeholder="I offer…" value={form.skill_offer} onChange={e => setForm(p => ({ ...p, skill_offer: e.target.value }))} className="rounded-xl" />
                                <Input placeholder="I want…" value={form.skill_want} onChange={e => setForm(p => ({ ...p, skill_want: e.target.value }))} className="rounded-xl" />
                            </div>
                        )}
                        <Input placeholder="Contact email (optional)" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} className="rounded-xl" type="email" />
                        <div className="flex gap-2">
                            <Button className="flex-1 h-10 rounded-xl gap-2" onClick={create} disabled={saving}>
                                <Send className="h-4 w-4" /> {saving ? 'Posting…' : 'Publish'}
                            </Button>
                            <Link to="/community" className="flex-1">
                                <Button variant="outline" className="w-full h-10 rounded-xl">Full Editor</Button>
                            </Link>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </section>
    );
}
