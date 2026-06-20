import { useState, useEffect, useCallback } from 'react';
import {
    ShoppingBag, Plus, Search, Filter, Tag, Package, Star,
    Eye, MessageCircle, MapPin, ChevronDown, X, Loader2,
    CheckCircle, Clock, AlertCircle, Heart, Share2, Edit2,
    Smartphone, Home, Car, Shirt, Book, Utensils, Wrench,
    Baby, Dumbbell, Sofa, Camera, Music, Zap, Grid3x3, List
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
    { key: 'all', label: 'All', icon: Grid3x3 },
    { key: 'electronics', label: 'Electronics', icon: Smartphone, color: '#3b82f6' },
    { key: 'furniture', label: 'Furniture', icon: Sofa, color: '#8b5cf6' },
    { key: 'clothes', label: 'Clothes', icon: Shirt, color: '#ec4899' },
    { key: 'vehicles', label: 'Vehicles', icon: Car, color: '#f59e0b' },
    { key: 'food', label: 'Food', icon: Utensils, color: '#10b981' },
    { key: 'books', label: 'Books', icon: Book, color: '#6366f1' },
    { key: 'appliances', label: 'Appliances', icon: Zap, color: '#f97316' },
    { key: 'sports', label: 'Sports', icon: Dumbbell, color: '#22c55e' },
    { key: 'kids', label: 'Kids', icon: Baby, color: '#a855f7' },
    { key: 'cameras', label: 'Cameras', icon: Camera, color: '#14b8a6' },
    { key: 'tools', label: 'Tools', icon: Wrench, color: '#64748b' },
    { key: 'music', label: 'Music', icon: Music, color: '#f43f5e' },
    { key: 'property', label: 'Property', icon: Home, color: '#0ea5e9' },
    { key: 'other', label: 'Other', icon: Package, color: '#737373' },
];

const CONDITION_LABELS = {
    new: { label: 'New', color: '#6ee7b7' },
    like_new: { label: 'Like New', color: '#86efac' },
    good: { label: 'Good', color: '#fcd34d' },
    fair: { label: 'Fair', color: '#fdba74' },
    for_parts: { label: 'For Parts', color: '#fca5a5' },
};

const STATUS_COLORS = {
    active: '#6ee7b7',
    reserved: '#fcd34d',
    sold: '#fca5a5',
    removed: '#888',
};

const EMPTY_FORM = {
    title: '', description: '', price_pkr: '', category: 'other', condition: 'good',
    negotiable: true, images: [], contact_phone: '', zone_id: null,
};

export default function Marketplace() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('browse');
    const [category, setCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [condition, setCondition] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [viewMode, setViewMode] = useState('grid');

    // Listing detail
    const [selected, setSelected] = useState(null);
    const [offerMsg, setOfferMsg] = useState('');
    const [offerLoading, setOfferLoading] = useState(false);

    // Create
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // My listings
    const [myListings, setMyListings] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [myLoading, setMyLoading] = useState(false);

    const fetchListings = useCallback(async (cat = category, q = search, cond = condition, minP = minPrice, maxP = maxPrice) => {
        setLoading(true);
        try {
            let url = '/api/marketplace?';
            if (cat && cat !== 'all') url += `category=${cat}&`;
            if (q) url += `q=${encodeURIComponent(q)}&`;
            if (cond) url += `condition=${cond}&`;
            if (minP) url += `min_price=${minP}&`;
            if (maxP) url += `max_price=${maxP}&`;
            const r = await fetch(url, { credentials: 'include' });
            const d = await r.json();
            setListings(d.listings || []);
        } catch (_) { setListings([]); }
        setLoading(false);
    }, [category, search, condition, minPrice, maxPrice]);

    const fetchMy = useCallback(async () => {
        setMyLoading(true);
        try {
            const [lr, or] = await Promise.all([
                fetch('/api/marketplace/my', { credentials: 'include' }).then(r => r.json()),
                fetch('/api/marketplace/orders/my', { credentials: 'include' }).then(r => r.json()),
            ]);
            setMyListings(lr.listings || []);
            setMyOrders(or.orders || []);
        } catch (_) {}
        setMyLoading(false);
    }, []);

    useEffect(() => {
        const init = async () => {
            const r = await fetch('/api/auth/user', { credentials: 'include' });
            const d = await r.json();
            setUser(d.user);
            await fetchListings();
        };
        init();
    }, []);

    useEffect(() => {
        if (tab === 'my') fetchMy();
    }, [tab, fetchMy]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
        fetchListings(category, searchInput, condition, minPrice, maxPrice);
    };

    const handleCategoryChange = (cat) => {
        setCategory(cat);
        fetchListings(cat, search, condition, minPrice, maxPrice);
    };

    const applyFilters = () => {
        fetchListings(category, search, condition, minPrice, maxPrice);
        setFilterOpen(false);
    };

    const clearFilters = () => {
        setCondition(''); setMinPrice(''); setMaxPrice('');
        fetchListings(category, search, '', '', '');
        setFilterOpen(false);
    };

    const openListing = async (id) => {
        try {
            const r = await fetch(`/api/marketplace/${id}`, { credentials: 'include' });
            const d = await r.json();
            if (d.listing) setSelected(d.listing);
        } catch (_) {}
    };

    const makeOffer = async () => {
        if (!user) { toast.error('Please log in to make an offer'); return; }
        if (!selected) return;
        setOfferLoading(true);
        try {
            const r = await fetch(`/api/marketplace/${selected.id}/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message: offerMsg }),
            });
            const d = await r.json();
            if (d.order) {
                toast.success('Offer sent! The seller will contact you.');
                setSelected(null);
                setOfferMsg('');
                fetchListings();
            } else { toast.error(d.error || 'Failed to send offer'); }
        } catch (_) { toast.error('Network error'); }
        setOfferLoading(false);
    };

    const createListing = async () => {
        if (!form.title || !form.price_pkr) { toast.error('Title and price are required'); return; }
        setSaving(true);
        try {
            const r = await fetch('/api/marketplace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ...form, price_pkr: parseFloat(form.price_pkr) }),
            });
            const d = await r.json();
            if (d.listing) {
                toast.success('Listing posted!');
                setCreateOpen(false);
                setForm(EMPTY_FORM);
                fetchListings();
                setTab('my');
                fetchMy();
            } else { toast.error(d.error || 'Failed to post listing'); }
        } catch (_) { toast.error('Network error'); }
        setSaving(false);
    };

    const markSold = async (id) => {
        try {
            const r = await fetch(`/api/marketplace/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: 'sold' }),
            });
            const d = await r.json();
            if (d.listing) { toast.success('Marked as sold'); fetchMy(); }
            else toast.error(d.error || 'Failed');
        } catch (_) { toast.error('Network error'); }
    };

    const chatWithSeller = (sellerId) => {
        if (!user) { toast.error('Please log in'); return; }
        navigate(`/chat?user_id=${sellerId}`);
        setSelected(null);
    };

    const getCatInfo = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];

    const hasFilters = condition || minPrice || maxPrice;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                        <ShoppingBag className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
                        Marketplace
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>Buy and sell anything in your neighborhood</p>
                </div>
                {user && (
                    <button onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                        <Plus className="h-3.5 w-3.5" /> Sell Item
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4">
                {[{ key: 'browse', label: 'Browse' }, { key: 'my', label: 'My Listings' }].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={{
                            backgroundColor: tab === t.key ? 'var(--color-primary)' : 'var(--color-surface)',
                            color: tab === t.key ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                            border: `1px solid ${tab === t.key ? 'transparent' : 'var(--color-border)'}`,
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'browse' && (
                <>
                    {/* Search + Filter */}
                    <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-text-subtle)' }} />
                            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                                placeholder="Search listings…"
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                        </div>
                        <button type="submit" className="px-3 py-2 rounded-xl"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                            <Search className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setFilterOpen(f => !f)}
                            className="px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold relative"
                            style={{ backgroundColor: hasFilters ? 'var(--color-primary)' : 'var(--color-surface)', color: hasFilters ? 'var(--color-on-primary)' : 'var(--color-text-muted)', border: `1px solid ${hasFilters ? 'transparent' : 'var(--color-border)'}` }}>
                            <Filter className="h-3.5 w-3.5" /> Filter
                            {hasFilters && <span className="h-2 w-2 rounded-full bg-red-400 absolute -top-0.5 -right-0.5" />}
                        </button>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setViewMode('grid')}
                                className="h-9 w-9 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: viewMode === 'grid' ? 'var(--color-surface-high)' : 'transparent', border: '1px solid var(--color-border)' }}>
                                <Grid3x3 className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
                            </button>
                            <button type="button" onClick={() => setViewMode('list')}
                                className="h-9 w-9 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: viewMode === 'list' ? 'var(--color-surface-high)' : 'transparent', border: '1px solid var(--color-border)' }}>
                                <List className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
                            </button>
                        </div>
                    </form>

                    {/* Filter Panel */}
                    {filterOpen && (
                        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Condition</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                                            <button key={k} onClick={() => setCondition(condition === k ? '' : k)}
                                                className="px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                                                style={{ backgroundColor: condition === k ? v.color + '20' : 'var(--color-surface-high)', color: condition === k ? v.color : 'var(--color-text-muted)', border: `1px solid ${condition === k ? v.color + '30' : 'var(--color-border)'}` }}>
                                                {v.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Min Price (PKR)</label>
                                    <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0"
                                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Max Price (PKR)</label>
                                    <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Any"
                                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button onClick={clearFilters} className="flex-1 py-1.5 rounded-xl text-xs font-semibold"
                                    style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                    Clear
                                </button>
                                <button onClick={applyFilters} className="flex-1 py-1.5 rounded-xl text-xs font-semibold"
                                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Categories */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                        {CATEGORIES.map(cat => {
                            const active = category === cat.key;
                            return (
                                <button key={cat.key} onClick={() => handleCategoryChange(cat.key)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all"
                                    style={{
                                        backgroundColor: active ? (cat.color || 'var(--color-primary)') : 'var(--color-surface)',
                                        color: active ? (cat.color ? '#fff' : 'var(--color-on-primary)') : 'var(--color-text-muted)',
                                        border: `1px solid ${active ? 'transparent' : 'var(--color-border)'}`,
                                    }}>
                                    <cat.icon className="h-3.5 w-3.5" />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Listings */}
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-text-subtle)' }} />
                        </div>
                    ) : listings.length === 0 ? (
                        <div className="text-center py-16" style={{ color: 'var(--color-text-subtle)' }}>
                            <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No listings found</p>
                            {user && <button onClick={() => setCreateOpen(true)} className="text-xs mt-2 font-semibold" style={{ color: 'var(--color-primary)' }}>Be the first to sell something →</button>}
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {listings.map(listing => {
                                const cat = getCatInfo(listing.category);
                                const condCfg = CONDITION_LABELS[listing.condition] || { label: 'Good', color: '#fcd34d' };
                                return (
                                    <button key={listing.id} onClick={() => openListing(listing.id)}
                                        className="rounded-2xl overflow-hidden text-left transition-all hover:scale-[1.01]"
                                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                                        <div className="h-36 flex items-center justify-center relative"
                                            style={{ backgroundColor: (cat.color || '#666') + '10' }}>
                                            {listing.images?.[0] ? (
                                                <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <cat.icon className="h-10 w-10 opacity-30" style={{ color: cat.color || '#666' }} />
                                            )}
                                            <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                                style={{ backgroundColor: STATUS_COLORS[listing.status] + '20', color: STATUS_COLORS[listing.status] }}>
                                                {listing.status === 'active' ? condCfg.label : listing.status}
                                            </span>
                                            {listing.negotiable && (
                                                <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}>
                                                    Negotiable
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <p className="text-xs font-bold line-clamp-2 mb-1" style={{ color: 'var(--color-text)' }}>{listing.title}</p>
                                            <p className="text-sm font-black" style={{ color: 'var(--color-primary)' }}>PKR {parseFloat(listing.price_pkr).toLocaleString()}</p>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{listing.seller_name || 'Unknown'}</p>
                                                <div className="flex items-center gap-0.5">
                                                    <Eye className="h-2.5 w-2.5" style={{ color: 'var(--color-text-subtle)' }} />
                                                    <span className="text-[9px]" style={{ color: 'var(--color-text-subtle)' }}>{listing.views || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {listings.map(listing => {
                                const cat = getCatInfo(listing.category);
                                const condCfg = CONDITION_LABELS[listing.condition] || { label: 'Good', color: '#fcd34d' };
                                return (
                                    <button key={listing.id} onClick={() => openListing(listing.id)}
                                        className="w-full rounded-2xl p-4 text-left flex items-center gap-4 transition-all"
                                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                                        <div className="h-16 w-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                                            style={{ backgroundColor: (cat.color || '#666') + '10' }}>
                                            {listing.images?.[0] ? (
                                                <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <cat.icon className="h-7 w-7 opacity-30" style={{ color: cat.color || '#666' }} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{listing.title}</p>
                                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{listing.description?.slice(0, 60)}{listing.description?.length > 60 ? '…' : ''}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                                    style={{ backgroundColor: condCfg.color + '20', color: condCfg.color }}>
                                                    {condCfg.label}
                                                </span>
                                                <span className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{listing.seller_name}</span>
                                                <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                                                    <Eye className="h-2.5 w-2.5" />{listing.views || 0}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="font-black text-base" style={{ color: 'var(--color-primary)' }}>PKR {parseFloat(listing.price_pkr).toLocaleString()}</p>
                                            {listing.negotiable && <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Negotiable</p>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {tab === 'my' && (
                <div>
                    {!user ? (
                        <div className="text-center py-16" style={{ color: 'var(--color-text-subtle)' }}>
                            <p>Please log in to view your listings</p>
                        </div>
                    ) : myLoading ? (
                        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-text-subtle)' }} /></div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>My Listings ({myListings.length})</h2>
                                <button onClick={() => setCreateOpen(true)}
                                    className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                                    <Plus className="h-3 w-3" /> Add New
                                </button>
                            </div>
                            {myListings.length === 0 ? (
                                <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text)' }} />
                                    <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>No listings yet</p>
                                    <button onClick={() => setCreateOpen(true)} className="text-xs mt-2 font-semibold" style={{ color: 'var(--color-primary)' }}>Start selling →</button>
                                </div>
                            ) : (
                                <div className="space-y-2 mb-6">
                                    {myListings.map(l => {
                                        const cat = getCatInfo(l.category);
                                        const condCfg = CONDITION_LABELS[l.condition] || { label: 'Good', color: '#fcd34d' };
                                        return (
                                            <div key={l.id} className="rounded-2xl p-4 flex items-center gap-3"
                                                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                                                <div className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: (cat.color || '#666') + '10' }}>
                                                    <cat.icon className="h-6 w-6 opacity-40" style={{ color: cat.color || '#666' }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{l.title}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-semibold" style={{ color: STATUS_COLORS[l.status] }}>{l.status}</span>
                                                        <span className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{l.order_count || 0} offers</span>
                                                        <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                                                            <Eye className="h-2.5 w-2.5" />{l.views || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-2">
                                                    <p className="font-black text-sm" style={{ color: 'var(--color-primary)' }}>PKR {parseFloat(l.price_pkr).toLocaleString()}</p>
                                                    {l.status === 'active' && (
                                                        <button onClick={() => markSold(l.id)}
                                                            className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                                                            style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                                            Mark Sold
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {myOrders.length > 0 && (
                                <>
                                    <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Orders & Offers ({myOrders.length})</h2>
                                    <div className="space-y-2">
                                        {myOrders.map(o => (
                                            <div key={o.id} className="rounded-2xl p-4 flex items-center gap-3"
                                                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                                                <Package className="h-5 w-5 shrink-0" style={{ color: 'var(--color-text-subtle)' }} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{o.title}</p>
                                                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                                                        {o.buyer_id === user?.id ? `You offered` : `Offer from ${o.buyer_name}`}
                                                        {o.message ? ` — "${o.message}"` : ''}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>PKR {parseFloat(o.amount_pkr).toLocaleString()}</p>
                                                    <span className="text-[10px] font-semibold" style={{ color: STATUS_COLORS[o.status] || '#888' }}>{o.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Listing Detail Modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    onClick={e => e.target === e.currentTarget && setSelected(null)}>
                    <div className="rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        {/* Image */}
                        <div className="h-48 flex items-center justify-center relative"
                            style={{ backgroundColor: (getCatInfo(selected.category).color || '#666') + '10' }}>
                            {selected.images?.[0] ? (
                                <img src={selected.images[0]} alt={selected.title} className="w-full h-full object-cover" />
                            ) : (
                                (() => { const Cat = getCatInfo(selected.category).icon; return <Cat className="h-16 w-16 opacity-20" style={{ color: getCatInfo(selected.category).color || '#666' }} />; })()
                            )}
                            <button onClick={() => setSelected(null)}
                                className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                <X className="h-4 w-4 text-white" />
                            </button>
                            <span className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full"
                                style={{ backgroundColor: (STATUS_COLORS[selected.status] || '#888') + '20', color: STATUS_COLORS[selected.status] || '#888' }}>
                                {selected.status}
                            </span>
                        </div>

                        <div className="p-5">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1">
                                    <h2 className="font-bold text-lg leading-tight" style={{ color: 'var(--color-text)' }}>{selected.title}</h2>
                                    <p className="text-2xl font-black mt-1" style={{ color: 'var(--color-primary)' }}>
                                        PKR {parseFloat(selected.price_pkr).toLocaleString()}
                                        {selected.negotiable && <span className="text-xs font-normal ml-2" style={{ color: 'var(--color-text-subtle)' }}>Negotiable</span>}
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    <span className="text-xs font-semibold px-2 py-1 rounded-full"
                                        style={{ backgroundColor: (CONDITION_LABELS[selected.condition]?.color || '#fcd34d') + '20', color: CONDITION_LABELS[selected.condition]?.color || '#fcd34d' }}>
                                        {CONDITION_LABELS[selected.condition]?.label || selected.condition}
                                    </span>
                                </div>
                            </div>

                            {selected.description && (
                                <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{selected.description}</p>
                            )}

                            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                                    {(selected.seller_name || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{selected.seller_name || 'Unknown Seller'}</p>
                                    <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{selected.seller_email}</p>
                                </div>
                                <div className="ml-auto flex items-center gap-1">
                                    <Eye className="h-3 w-3" style={{ color: 'var(--color-text-subtle)' }} />
                                    <span className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{selected.views || 0} views</span>
                                </div>
                            </div>

                            {selected.status === 'active' && selected.seller_user_id !== user?.id && (
                                <>
                                    <div className="mb-3">
                                        <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Message to seller (optional)</label>
                                        <textarea value={offerMsg} onChange={e => setOfferMsg(e.target.value)}
                                            placeholder="I'm interested in this item…" rows={2}
                                            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                                            style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => chatWithSeller(selected.seller_user_id)}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                                            style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                            <MessageCircle className="h-4 w-4" /> Chat
                                        </button>
                                        <button onClick={makeOffer} disabled={offerLoading}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
                                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', opacity: offerLoading ? 0.7 : 1 }}>
                                            {offerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                            Make Offer
                                        </button>
                                    </div>
                                </>
                            )}
                            {selected.status !== 'active' && (
                                <div className="text-center py-3 rounded-xl" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-subtle)' }}>
                                        This item is {selected.status}
                                    </p>
                                </div>
                            )}
                            {selected.seller_user_id === user?.id && (
                                <div className="text-center py-3 rounded-xl" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                    <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>This is your listing</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Listing Modal */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    onClick={e => e.target === e.currentTarget && setCreateOpen(false)}>
                    <div className="rounded-2xl p-5 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Post a Listing</h2>
                            <button onClick={() => setCreateOpen(false)} style={{ color: 'var(--color-text-subtle)' }}><X className="h-4 w-4" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Title *</label>
                                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="What are you selling?"
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Describe the item, any defects, reason for selling…" rows={3}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Price (PKR) *</label>
                                    <input type="number" min={0} value={form.price_pkr} onChange={e => setForm(f => ({ ...f, price_pkr: e.target.value }))}
                                        placeholder="0"
                                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Category</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                                        {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                                            <option key={c.key} value={c.key}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Condition</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                                        <button key={k} type="button" onClick={() => setForm(f => ({ ...f, condition: k }))}
                                            className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                                            style={{ backgroundColor: form.condition === k ? v.color + '20' : 'var(--color-surface-high)', color: form.condition === k ? v.color : 'var(--color-text-muted)', border: `1px solid ${form.condition === k ? v.color + '30' : 'var(--color-border)'}` }}>
                                            {v.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => setForm(f => ({ ...f, negotiable: !f.negotiable }))}
                                    className="flex items-center gap-2 text-xs font-semibold"
                                    style={{ color: 'var(--color-text-muted)' }}>
                                    <div className="h-5 w-5 rounded flex items-center justify-center"
                                        style={{ backgroundColor: form.negotiable ? 'var(--color-primary)' : 'var(--color-surface-high)', border: '1px solid var(--color-border)' }}>
                                        {form.negotiable && <CheckCircle className="h-3 w-3" style={{ color: 'var(--color-on-primary)' }} />}
                                    </div>
                                    Price is negotiable
                                </button>
                            </div>
                            <div>
                                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Contact Phone</label>
                                <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                                    placeholder="03XX-XXXXXXX"
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button onClick={() => setCreateOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                                style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                Cancel
                            </button>
                            <button onClick={createListing} disabled={saving || !form.title || !form.price_pkr}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
                                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', opacity: (saving || !form.title || !form.price_pkr) ? 0.5 : 1 }}>
                                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Posting…</> : 'Post Listing'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
