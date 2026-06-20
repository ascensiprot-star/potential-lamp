import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Megaphone, Search, HelpCircle, Briefcase, RefreshCw, Plus,
    MessageCircle, Send, MapPin, Share2, Heart, Bookmark,
    ImageIcon, X, Camera, Loader2, BarChart2, Calendar,
    ChevronRight, Ticket, Users, Check, Vote, ArrowRight,
    CheckCircle2, Music, Wrench, Zap, Sparkles, UtensilsCrossed,
    GraduationCap, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

const POST_TYPES = {
    general:       { icon: MessageCircle, label: 'General'      },
    announcement:  { icon: Megaphone,     label: 'Announcement' },
    lost_found:    { icon: Search,        label: 'Lost & Found' },
    recommendation:{ icon: Star,          label: 'Recommend'    },
    question:      { icon: HelpCircle,    label: 'Question'     },
    job:           { icon: Briefcase,     label: 'Job'          },
    skill_exchange:{ icon: RefreshCw,     label: 'Skill Swap'   },
};

const MAIN_TABS = [
    { key: 'feed',   label: 'Feed'   },
    { key: 'jobs',   label: 'Jobs'   },
    { key: 'events', label: 'Events' },
    { key: 'polls',  label: 'Polls'  },
];

const FILTER_PILLS = ['All', 'Photo', 'Announcement', 'Lost & Found', 'Recommendation', 'Question'];

const EMPTY_POST = {
    type: 'general', title: '', body: '', neighborhood: '',
    job_type: '', job_salary: '', skill_offer: '', skill_want: '', contact_email: '',
};
const EMPTY_POLL = { question: '', neighborhood: '', options: ['', '', '', ''] };
const JOB_TYPES = { full_time: 'Full-time', part_time: 'Part-time', freelance: 'Contract', gig: 'Gig' };

const CAT_ICON_MAP = {
    concert: Music, workshop: Wrench, meetup: Users, sports: Zap,
    festival: Sparkles, exhibition: ImageIcon, food: UtensilsCrossed, other: Calendar,
};

function Avatar({ name, email, size = 8 }) {
    const initial = (name || email || 'A').charAt(0).toUpperCase();
    const colors = ['bg-violet-500','bg-rose-500','bg-amber-500','bg-emerald-500','bg-sky-500','bg-pink-500','bg-indigo-500'];
    const color = colors[initial.charCodeAt(0) % colors.length];
    const px = size * 4;
    return (
        <div className={`${color} rounded-full flex items-center justify-center shrink-0`} style={{ width: px, height: px }}>
            <span className="text-white font-bold" style={{ fontSize: px * 0.4 }}>{initial}</span>
        </div>
    );
}

function PostComments({ postId, user, replyCount, onCountChange }) {
    const [open, setOpen] = useState(false);
    const [comments, setComments] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('post_comments').select('*')
            .eq('post_id', postId).order('created_at', { ascending: true }).limit(30);
        if (data) setComments(data);
        setLoading(false);
    };

    useEffect(() => { if (open && comments.length === 0) load(); }, [open]);

    const submit = async () => {
        if (!input.trim()) return;
        if (!user) { toast.error('Sign in to comment'); return; }
        setSubmitting(true);
        const { data, error } = await supabase.from('post_comments').insert([{
            post_id: postId,
            author_email: user.email,
            author_name: user.full_name || user.email?.split('@')[0],
            body: input.trim(),
            author_id: user.id
        }]).select().single();
        if (!error && data) {
            setComments(prev => [...prev, data]);
            onCountChange && onCountChange(1);
        }
        setInput('');
        setSubmitting(false);
    };

    const count = replyCount || 0;
    return (
        <div className="px-4 pb-3">
            <button onClick={() => setOpen(v => !v)} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                {open ? 'Hide comments' : count > 0 ? `View all ${count} comment${count !== 1 ? 's' : ''}` : 'Add a comment'}
            </button>
            {open && (
                <div className="mt-2 space-y-2">
                    {loading && <div className="space-y-1.5">{[0,1].map(i => <div key={i} className="skeleton-wave h-5 rounded-lg" />)}</div>}
                    {comments.map(c => (
                        <div key={c.id} className="flex gap-2 items-start">
                            <Avatar name={c.author_name} email={c.author_email} size={6} />
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold text-zinc-900 dark:text-white mr-1.5">
                                    {c.author_name || c.author_email?.split('@')[0]}
                                </span>
                                <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{c.body}</span>
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-2 items-center pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        {user && <Avatar name={user.full_name} email={user.email} size={6} />}
                        <input value={input} onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
                            placeholder={user ? 'Add a comment' : 'Sign in to comment'}
                            disabled={!user || submitting}
                            className="flex-1 text-xs bg-transparent outline-none border-b border-zinc-200 dark:border-zinc-700 py-1 text-zinc-900 dark:text-white placeholder:text-zinc-400" />
                        {input.trim() && (
                            <button onClick={submit} disabled={submitting}
                                className="text-xs font-bold text-zinc-900 dark:text-white shrink-0 hover:opacity-70 transition-opacity">Post</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function PostCard({ post, onLike, likedPosts, user }) {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [replyCount, setReplyCount] = useState(post.reply_count || 0);
    const cfg = POST_TYPES[post.type] || POST_TYPES.general;
    const isLiked = likedPosts.has(post.id);
    const authorName = post.author_name || post.author_email?.split('@')[0] || 'Anonymous';
    const timeAgo = (() => {
        const diff = Date.now() - new Date(post.created_date || post.created_at).getTime();
        const h = Math.floor(diff / 3600000);
        if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}m`;
        if (h < 24) return `${h}h`;
        return `${Math.floor(h / 24)}d`;
    })();

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
                <Avatar name={post.author_name} email={post.author_email} size={9} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-none">{authorName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {post.neighborhood && <span className="text-[10px] text-zinc-400 flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{post.neighborhood}</span>}
                        <span className="text-[10px] text-zinc-400">{timeAgo}</span>
                    </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    <cfg.icon className="h-3 w-3" /> {cfg.label}
                </span>
            </div>

            {post.image_url && (
                <div className="relative bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: '4/3' }}>
                    {!imgLoaded && <div className="absolute inset-0 skeleton-wave" />}
                    <img src={post.image_url} alt="" className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setImgLoaded(true)} />
                </div>
            )}

            <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                <button onClick={() => onLike(post)} className="transition-all active:scale-90">
                    <Heart className={`h-5 w-5 transition-all ${isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-zinc-400 dark:text-zinc-500'}`} strokeWidth={isLiked ? 0 : 1.8} />
                </button>
                <button className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 transition-colors">
                    <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
                </button>
                <button className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 transition-colors" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast('Link copied'); }}>
                    <Share2 className="h-5 w-5" strokeWidth={1.8} />
                </button>
                <div className="flex-1" />
                <button className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 transition-colors">
                    <Bookmark className="h-5 w-5" strokeWidth={1.8} />
                </button>
            </div>

            {(post.upvotes || 0) > 0 && (
                <p className="px-4 text-xs font-semibold text-zinc-900 dark:text-white pb-1">{post.upvotes} {post.upvotes === 1 ? 'like' : 'likes'}</p>
            )}

            <div className="px-4 pb-3">
                {post.title && <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-0.5">{post.title}</p>}
                {post.body && (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-3">
                        <span className="font-semibold text-zinc-900 dark:text-white mr-1.5">{authorName}</span>{post.body}
                    </p>
                )}
                {post.type === 'skill_exchange' && (post.skill_offer || post.skill_want) && (
                    <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                        {post.skill_offer && (
                            <span className="bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                                <GraduationCap className="h-2.5 w-2.5" /> {post.skill_offer}
                            </span>
                        )}
                        <ArrowRight className="h-3 w-3 text-zinc-300" />
                        {post.skill_want && (
                            <span className="bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800 flex items-center gap-1">
                                <Search className="h-2.5 w-2.5" /> {post.skill_want}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <PostComments postId={post.id} user={user} replyCount={replyCount}
                onCountChange={(delta) => setReplyCount(v => v + delta)} />
        </div>
    );
}

function JobCard({ post }) {
    const authorName = post.author_name || post.author_email?.split('@')[0] || 'Anonymous';
    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
            <div className="flex items-start gap-3">
                <Avatar name={post.author_name} email={post.author_email} size={10} />
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-white line-clamp-1">{post.title}</p>
                    <p className="text-xs text-zinc-400">{authorName}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {post.job_type && <span className="text-[10px] font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">{JOB_TYPES[post.job_type] || post.job_type}</span>}
                        {post.neighborhood && <span className="text-[10px] text-zinc-400 flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{post.neighborhood}</span>}
                        {post.job_salary && <span className="text-[10px] font-semibold text-emerald-600">{post.job_salary}</span>}
                    </div>
                </div>
                <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Apply</Button>
            </div>
            {post.body && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2">{post.body}</p>}
        </div>
    );
}

function PollCard({ poll, user }) {
    const [voted, setVoted] = useState(() => {
        try { return JSON.parse(localStorage.getItem('voted_polls') || '{}')[poll.id] ?? null; } catch { return null; }
    });
    const [options, setOptions] = useState(poll.options || []);
    const totalVotes = options.reduce((s, o) => s + (o.votes || 0), 0);
    const hasVoted = voted !== null;
    const timeAgo = (() => {
        const diff = Date.now() - new Date(poll.created_at).getTime();
        const h = Math.floor(diff / 3600000);
        if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    })();

    const vote = async (idx) => {
        if (hasVoted) return;
        if (!user) { toast.error('Sign in to vote'); return; }
        const updated = options.map((o, i) => i === idx ? { ...o, votes: (o.votes || 0) + 1 } : o);
        setOptions(updated);
        setVoted(idx);
        const stored = JSON.parse(localStorage.getItem('voted_polls') || '{}');
        stored[poll.id] = idx;
        localStorage.setItem('voted_polls', JSON.stringify(stored));
        await supabase.from('neighborhood_polls').update({ options: updated }).eq('id', poll.id);
    };

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
                <Avatar name={poll.created_by_name} email={poll.created_by_email} size={8} />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">{poll.created_by_name}</p>
                    <p className="text-[10px] text-zinc-400">
                        {poll.neighborhood && <><MapPin className="inline h-2.5 w-2.5 mr-0.5" />{poll.neighborhood} · </>}{timeAgo}
                    </p>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full">
                    <Vote className="h-3 w-3" /> Poll
                </span>
            </div>
            <p className="font-semibold text-sm text-zinc-900 dark:text-white mb-3 leading-snug">{poll.question}</p>
            <div className="space-y-2">
                {options.map((opt, i) => {
                    const pct = totalVotes > 0 ? Math.round((opt.votes || 0) / totalVotes * 100) : 0;
                    const isChosen = voted === i;
                    return (
                        <button key={i} onClick={() => vote(i)} disabled={hasVoted}
                            className={`w-full text-left rounded-xl overflow-hidden border transition-all relative ${hasVoted ? 'cursor-default' : 'hover:border-zinc-400 dark:hover:border-zinc-500'} ${isChosen ? 'border-zinc-900 dark:border-white' : 'border-zinc-200 dark:border-zinc-700'}`}>
                            {hasVoted && (
                                <div className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700"
                                    style={{ width: `${pct}%`, background: isChosen ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.04)' }} />
                            )}
                            <div className="relative flex items-center justify-between px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                    {isChosen && <CheckCircle2 className="h-3.5 w-3.5 text-zinc-900 dark:text-white shrink-0" />}
                                    <span className="text-sm text-zinc-900 dark:text-white">{opt.text}</span>
                                </div>
                                {hasVoted && <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{pct}%</span>}
                            </div>
                        </button>
                    );
                })}
            </div>
            <p className="text-[10px] text-zinc-400 mt-3">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} · {hasVoted ? 'You voted' : 'Tap to vote'}</p>
        </div>
    );
}

export default function Community() {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [events, setEvents] = useState([]);
    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [pollsLoading, setPollsLoading] = useState(false);
    const [likedPosts, setLikedPosts] = useState(() => {
        try { return new Set(JSON.parse(localStorage.getItem('likedPosts') || '[]')); } catch { return new Set(); }
    });
    const [mainTab, setMainTab] = useState('feed');
    const [filterPill, setFilterPill] = useState('All');
    const [search, setSearch] = useState('');
    const [createPostDialog, setCreatePostDialog] = useState(false);
    const [createPollDialog, setCreatePollDialog] = useState(false);
    const [postForm, setPostForm] = useState(EMPTY_POST);
    const [pollForm, setPollForm] = useState(EMPTY_POLL);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);
    const dropRef = useRef(null);

    const loadPosts = async () => {
        setLoading(true);
        const { data } = await supabase.from('community_posts').select('*').order('created_date', { ascending: false }).limit(50);
        if (data) setPosts(data);
        setLoading(false);
    };
    const loadEvents = async () => {
        setEventsLoading(true);
        const { data } = await supabase.from('events').select('*').order('date', { ascending: true }).limit(20);
        if (data) setEvents(data);
        setEventsLoading(false);
    };
    const loadPolls = async () => {
        setPollsLoading(true);
        const { data } = await supabase.from('neighborhood_polls').select('*').order('created_at', { ascending: false }).limit(20);
        if (data) setPolls(data);
        setPollsLoading(false);
    };

    useEffect(() => { loadPosts(); }, []);
    useEffect(() => { if (mainTab === 'events' && events.length === 0) loadEvents(); }, [mainTab]);
    useEffect(() => { if (mainTab === 'polls' && polls.length === 0) loadPolls(); }, [mainTab]);

    const handleImageSelect = (file) => {
        if (!file?.type.startsWith('image/')) { toast.error('Please select an image'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };
    const clearImage = () => { setImageFile(null); imagePreview && URL.revokeObjectURL(imagePreview); setImagePreview(null); };
    const closePostDialog = () => { setCreatePostDialog(false); setPostForm(EMPTY_POST); clearImage(); };

    const feedPosts = posts.filter(p => {
        if (mainTab === 'jobs') return p.type === 'job';
        const pillMap = { 'Announcement':'announcement', 'Lost & Found':'lost_found', 'Recommendation':'recommendation', 'Question':'question' };
        const matchPill = filterPill === 'All' ? true : filterPill === 'Photo' ? !!p.image_url : p.type === pillMap[filterPill];
        const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.body?.toLowerCase().includes(search.toLowerCase());
        return matchPill && matchSearch && p.type !== 'job';
    });

    const handleLike = async (post) => {
        const alreadyLiked = likedPosts.has(post.id);
        const delta = alreadyLiked ? -1 : 1;
        const newLiked = new Set(likedPosts);
        alreadyLiked ? newLiked.delete(post.id) : newLiked.add(post.id);
        setLikedPosts(newLiked);
        localStorage.setItem('likedPosts', JSON.stringify([...newLiked]));
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, upvotes: Math.max(0, (p.upvotes || 0) + delta) } : p));
        await supabase.from('community_posts').update({ upvotes: Math.max(0, (post.upvotes || 0) + delta) }).eq('id', post.id);
    };

    const createPost = async () => {
        if (!postForm.body && !imageFile) { toast.error('Add a caption or photo'); return; }
        if (!user) { toast.error('Please sign in to post'); return; }
        setSaving(true);
        try {
            let image_url = null;
            if (imageFile) {
                const ext = imageFile.name.split('.').pop();
                const path = `${user.id}/${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage.from('community-posts').upload(path, imageFile, { cacheControl: '3600', upsert: false, contentType: imageFile.type });
                if (!uploadError) {
                    const { data } = supabase.storage.from('community-posts').getPublicUrl(path);
                    image_url = data.publicUrl;
                } else {
                    console.error('Image upload failed', uploadError);
                }
            }
            const { error } = await supabase.from('community_posts').insert([{
                type: postForm.type, title: postForm.title || null, body: postForm.body || null,
                neighborhood: postForm.neighborhood || null, contact_email: postForm.contact_email || null,
                job_type: postForm.job_type || null, job_salary: postForm.job_salary || null,
                skill_offer: postForm.skill_offer || null, skill_want: postForm.skill_want || null,
                author_email: user.email,
                author_name: user.full_name || user.email?.split('@')[0],
                author_id: user.id,
                upvotes: 0, reply_count: 0, is_resolved: false,
                image_url
            }]);
            if (error) throw error;
            toast.success('Post published');
            closePostDialog();
            loadPosts();
        } catch (err) { toast.error(err.message || 'Failed to post'); }
        finally { setSaving(false); }
    };

    const createPoll = async () => {
        const validOptions = pollForm.options.filter(o => o.trim());
        if (!pollForm.question.trim()) { toast.error('Poll question required'); return; }
        if (validOptions.length < 2) { toast.error('At least 2 options required'); return; }
        if (!user) { toast.error('Sign in to create a poll'); return; }
        setSaving(true);
        try {
            const { error } = await supabase.from('neighborhood_polls').insert([{
                question: pollForm.question.trim(),
                neighborhood: pollForm.neighborhood || null,
                options: validOptions.map(text => ({ text, votes: 0 })),
                created_by_email: user.email,
                created_by_name: user.full_name || user.email?.split('@')[0],
                created_by: user.id
            }]);
            if (error) throw error;
            toast.success('Poll created');
            setCreatePollDialog(false);
            setPollForm(EMPTY_POLL);
            loadPolls();
        } catch (err) { toast.error(err.message || 'Failed to create poll'); }
        finally { setSaving(false); }
    };

    const upcomingEvents = events.filter(e => !e.date || new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)));

    return (
        <div className="pb-8 space-y-5 max-w-xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between pt-1">
                <div>
                    <h1 className="font-bold text-2xl tracking-tight text-zinc-900 dark:text-white">Community</h1>
                    <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-0.5">Neighborhood feed · jobs · events · polls</p>
                </div>
                <button
                    onClick={() => mainTab === 'polls'
                        ? (user ? setCreatePollDialog(true) : toast.error('Sign in first'))
                        : (user ? setCreatePostDialog(true) : toast.error('Sign in to post'))}
                    className="h-9 px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    <Plus className="h-4 w-4" />
                    {mainTab === 'polls' ? 'New Poll' : 'New Post'}
                </button>
            </div>

            {/* Main tabs */}
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full overflow-x-auto">
                {MAIN_TABS.map(t => (
                    <button key={t.key} onClick={() => setMainTab(t.key)}
                        className={`h-8 px-4 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-1 ${mainTab === t.key ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* FEED */}
            {mainTab === 'feed' && (
                <>
                    <div className="space-y-2.5">
                        <div className="flex gap-1.5 flex-wrap">
                            {FILTER_PILLS.map(pill => (
                                <button key={pill} onClick={() => setFilterPill(pill)}
                                    className={`h-7 px-3 rounded-full text-xs font-semibold transition-all ${filterPill === pill ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
                                    {pill}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                            <Input placeholder="Search posts" value={search} onChange={e => setSearch(e.target.value)}
                                className="pl-8 h-8 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                        </div>
                    </div>
                    {loading ? (
                        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-64 rounded-2xl" />)}</div>
                    ) : feedPosts.length === 0 ? (
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center bg-zinc-50 dark:bg-zinc-900/50">
                            <Camera className="h-8 w-8 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">No posts yet</p>
                            <p className="text-zinc-400 dark:text-zinc-600 text-xs mt-1">Be the first to share something</p>
                            {user && <button onClick={() => setCreatePostDialog(true)} className="mt-4 text-xs font-semibold text-zinc-900 dark:text-white underline underline-offset-2">Create a post</button>}
                        </div>
                    ) : (
                        <div className="space-y-4">{feedPosts.map(p => <PostCard key={p.id} post={p} onLike={handleLike} likedPosts={likedPosts} user={user} />)}</div>
                    )}
                </>
            )}

            {/* JOBS */}
            {mainTab === 'jobs' && (
                <>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <Input placeholder="Search jobs" value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-8 h-8 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                    </div>
                    {loading ? (
                        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-20 rounded-xl" />)}</div>
                    ) : feedPosts.length === 0 ? (
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center bg-zinc-50 dark:bg-zinc-900/50">
                            <Briefcase className="h-8 w-8 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
                            <p className="text-zinc-400 text-sm">No jobs posted yet</p>
                            {user && <button onClick={() => { setPostForm(p => ({ ...p, type: 'job' })); setCreatePostDialog(true); }} className="mt-3 text-xs font-semibold text-zinc-900 dark:text-white underline underline-offset-2">Post a job</button>}
                        </div>
                    ) : (
                        <div className="space-y-2.5">{feedPosts.map(p => <JobCard key={p.id} post={p} />)}</div>
                    )}
                </>
            )}

            {/* EVENTS */}
            {mainTab === 'events' && (
                <>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{upcomingEvents.length} upcoming events</p>
                        <Link to="/events" className="flex items-center gap-1 text-xs font-semibold text-zinc-900 dark:text-white hover:opacity-70 transition-opacity">
                            Full calendar <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    {eventsLoading ? (
                        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-28 rounded-2xl" />)}</div>
                    ) : upcomingEvents.length === 0 ? (
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center bg-zinc-50 dark:bg-zinc-900/50">
                            <Calendar className="h-8 w-8 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
                            <p className="text-zinc-500 text-sm font-medium">No upcoming events</p>
                            <Link to="/events" className="mt-4 inline-block text-xs font-semibold text-zinc-900 dark:text-white underline underline-offset-2">Browse all events</Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingEvents.map(ev => {
                                const CatIcon = CAT_ICON_MAP[ev.category] || Calendar;
                                const soldOut = (ev.tickets_sold || 0) >= (ev.total_tickets || 9999);
                                const pct = ev.total_tickets ? Math.round((ev.tickets_sold || 0) / ev.total_tickets * 100) : 0;
                                return (
                                    <div key={ev.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex">
                                        <div className="w-20 shrink-0 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                            <CatIcon className="h-7 w-7 text-zinc-400 dark:text-zinc-500" />
                                        </div>
                                        <div className="flex-1 p-3 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-semibold text-sm text-zinc-900 dark:text-white line-clamp-1">{ev.title}</p>
                                                <span className="text-[10px] font-bold shrink-0 text-emerald-600">{ev.is_free || !ev.ticket_price ? 'Free' : `$${ev.ticket_price}`}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 flex-wrap">
                                                {ev.date && <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> {ev.date}</span>}
                                                {ev.venue_name && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {ev.venue_name}</span>}
                                                <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" /> {ev.tickets_sold || 0}/{ev.total_tickets}</span>
                                            </div>
                                            {ev.total_tickets && (
                                                <div className="mt-2 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center pr-3">
                                            <Link to="/events">
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" disabled={soldOut}>
                                                    {soldOut ? 'Full' : <><Ticket className="h-3 w-3 mr-1" />Get</>}
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                            <Link to="/events" className="flex items-center justify-center gap-2 text-sm font-semibold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-2">
                                See all events <ChevronRight className="h-4 w-4" />
                            </Link>
                        </div>
                    )}
                </>
            )}

            {/* POLLS */}
            {mainTab === 'polls' && (
                <>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Vote on neighborhood decisions</p>
                        <span className="text-[10px] text-zinc-400">{polls.length} active poll{polls.length !== 1 ? 's' : ''}</span>
                    </div>
                    {pollsLoading ? (
                        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-40 rounded-2xl" />)}</div>
                    ) : polls.length === 0 ? (
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center bg-zinc-50 dark:bg-zinc-900/50">
                            <Vote className="h-8 w-8 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
                            <p className="text-zinc-500 text-sm font-medium">No polls yet</p>
                            <p className="text-zinc-400 text-xs mt-1">Create a poll to vote on neighborhood decisions</p>
                            {user && <button onClick={() => setCreatePollDialog(true)} className="mt-4 text-xs font-semibold text-zinc-900 dark:text-white underline underline-offset-2">Create first poll</button>}
                        </div>
                    ) : (
                        <div className="space-y-4">{polls.map(poll => <PollCard key={poll.id} poll={poll} user={user} />)}</div>
                    )}
                </>
            )}

            {/* CREATE POST DIALOG */}
            <Dialog open={createPostDialog} onOpenChange={closePostDialog}>
                <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0">
                    <DialogHeader className="px-5 pt-5 pb-0">
                        <DialogTitle className="font-semibold text-base">New Post</DialogTitle>
                    </DialogHeader>
                    <div className="px-5 pt-4 pb-5 space-y-4">
                        <div ref={dropRef}
                            onDragOver={e => { e.preventDefault(); dropRef.current?.classList.add('border-zinc-500'); }}
                            onDragLeave={() => dropRef.current?.classList.remove('border-zinc-500')}
                            onDrop={e => { e.preventDefault(); dropRef.current?.classList.remove('border-zinc-500'); handleImageSelect(e.dataTransfer.files[0]); }}>
                            {imagePreview ? (
                                <div className="relative rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: '4/3' }}>
                                    <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                                    <button onClick={clearImage} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"><X className="h-3.5 w-3.5" /></button>
                                </div>
                            ) : (
                                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-400 hover:border-zinc-400 transition-all" style={{ minHeight: 100 }}>
                                    <ImageIcon className="h-6 w-6" />
                                    <p className="text-xs">Add a photo (optional)</p>
                                </button>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageSelect(e.target.files[0])} />
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Avatar name={user?.full_name} email={user?.email} size={9} />
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{user?.full_name || user?.email?.split('@')[0] || 'You'}</p>
                                <p className="text-[10px] text-zinc-400">Posting to Community</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {Object.entries(POST_TYPES).map(([k, v]) => (
                                <button key={k} onClick={() => setPostForm(p => ({ ...p, type: k }))}
                                    className={`py-2.5 rounded-xl border text-center transition-all ${postForm.type === k ? 'border-zinc-900 dark:border-white bg-zinc-900/5 dark:bg-white/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                                    <v.icon className="h-4 w-4 mx-auto mb-1 text-zinc-600 dark:text-zinc-400" />
                                    <p className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 leading-tight">{v.label}</p>
                                </button>
                            ))}
                        </div>
                        <Input placeholder="Title (optional)" value={postForm.title} onChange={e => setPostForm(p => ({ ...p, title: e.target.value }))} className="rounded-xl" />
                        <div className="relative">
                            <Textarea placeholder="Write a caption" value={postForm.body} onChange={e => setPostForm(p => ({ ...p, body: e.target.value }))} className="rounded-xl resize-none pr-12" rows={3} />
                            <span className="absolute bottom-2.5 right-3 text-[10px] text-zinc-300 dark:text-zinc-600">{postForm.body.length}/500</span>
                        </div>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                            <Input placeholder="Add location (optional)" value={postForm.neighborhood} onChange={e => setPostForm(p => ({ ...p, neighborhood: e.target.value }))} className="pl-8 rounded-xl" />
                        </div>
                        {postForm.type === 'job' && (
                            <div className="grid grid-cols-2 gap-3">
                                <Select value={postForm.job_type} onValueChange={v => setPostForm(p => ({ ...p, job_type: v }))}>
                                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Job type" /></SelectTrigger>
                                    <SelectContent>{Object.entries(JOB_TYPES).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                                </Select>
                                <Input placeholder="Pay / Salary" value={postForm.job_salary} onChange={e => setPostForm(p => ({ ...p, job_salary: e.target.value }))} className="rounded-xl" />
                            </div>
                        )}
                        {postForm.type === 'skill_exchange' && (
                            <div className="grid grid-cols-2 gap-3">
                                <Input placeholder="I offer" value={postForm.skill_offer} onChange={e => setPostForm(p => ({ ...p, skill_offer: e.target.value }))} className="rounded-xl" />
                                <Input placeholder="I want" value={postForm.skill_want} onChange={e => setPostForm(p => ({ ...p, skill_want: e.target.value }))} className="rounded-xl" />
                            </div>
                        )}
                        <Input placeholder="Contact email (optional)" value={postForm.contact_email} onChange={e => setPostForm(p => ({ ...p, contact_email: e.target.value }))} className="rounded-xl" type="email" />
                        <div className="flex gap-2 pt-1">
                            <Button variant="outline" className="flex-1 h-10 rounded-xl text-sm" onClick={closePostDialog}>Cancel</Button>
                            <Button className="flex-1 h-10 rounded-xl text-sm gap-2" onClick={createPost} disabled={saving || (!postForm.body && !imageFile)}>
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                {saving ? 'Publishing' : 'Publish'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* CREATE POLL DIALOG */}
            <Dialog open={createPollDialog} onOpenChange={setCreatePollDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><BarChart2 className="h-4 w-4" /> Create a Poll</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2.5">
                            <Avatar name={user?.full_name} email={user?.email} size={9} />
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{user?.full_name || user?.email?.split('@')[0] || 'You'}</p>
                                <p className="text-[10px] text-zinc-400">Neighborhood Poll</p>
                            </div>
                        </div>
                        <Textarea placeholder="Ask a question — e.g. Should we add a dog park to Riverside?" value={pollForm.question}
                            onChange={e => setPollForm(p => ({ ...p, question: e.target.value }))} className="rounded-xl resize-none" rows={2} />
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                            <Input placeholder="Neighborhood (optional)" value={pollForm.neighborhood} onChange={e => setPollForm(p => ({ ...p, neighborhood: e.target.value }))} className="pl-8 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Options (min 2)</p>
                            {pollForm.options.map((opt, i) => (
                                <div key={i} className="relative">
                                    <Input placeholder={i < 2 ? `Option ${i + 1} *` : `Option ${i + 1} (optional)`} value={opt}
                                        onChange={e => { const o = [...pollForm.options]; o[i] = e.target.value; setPollForm(p => ({ ...p, options: o })); }}
                                        className="rounded-xl pr-8" />
                                    {opt && i >= 2 && (
                                        <button onClick={() => { const o = pollForm.options.map((x,j) => j === i ? '' : x); setPollForm(p => ({ ...p, options: o })); }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button variant="outline" className="flex-1 h-10 rounded-xl text-sm" onClick={() => setCreatePollDialog(false)}>Cancel</Button>
                            <Button className="flex-1 h-10 rounded-xl text-sm gap-2" onClick={createPoll} disabled={saving}>
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart2 className="h-3.5 w-3.5" />}
                                {saving ? 'Creating' : 'Create Poll'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
