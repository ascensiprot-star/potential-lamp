import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, MapPin, Star, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function WishlistFavorites() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setFavorites([]);
        setLoading(false);
    }, []);

    const remove = (id) => {
        const saved = JSON.parse(localStorage.getItem('sf_favorites') || '[]');
        const updated = saved.filter(s => s !== id);
        localStorage.setItem('sf_favorites', JSON.stringify(updated));
        setFavorites(f => f.filter(p => p.id !== id));
        toast.success('Removed from favorites');
    };

    return (
        <div className="pb-24 md:pb-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)' }}>
                    <Heart className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                    <h1 className="font-black text-xl tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>Favorites</h1>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Your saved providers &amp; services</p>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton-wave h-24 rounded-xl" />)}
                </div>
            ) : favorites.length === 0 ? (
                <div className="rounded-xl p-12 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <Heart className="h-9 w-9 mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
                    <h3 className="font-semibold text-sm mb-1.5" style={{ color: 'var(--color-primary)' }}>No favorites yet</h3>
                    <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>Browse providers and save your favorites for quick access.</p>
                    <Link to="/nearby"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        Browse Providers <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {favorites.map(p => (
                        <div key={p.id} className="rounded-xl p-4 flex items-center gap-3 shimmer"
                            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                                style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)' }}>
                                {p.business_name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--color-primary)' }}>{p.business_name}</h3>
                                <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                    <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-current" style={{ color: '#f59e0b' }} />{p.rating?.toFixed(1) || 'N/A'}</span>
                                    <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{p.city}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Link to={`/providers/${p.id}`}
                                    className="h-8 px-3 rounded-xl text-xs font-semibold flex items-center transition-all"
                                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', textDecoration: 'none' }}>
                                    Book
                                </Link>
                                <button onClick={() => remove(p.id)}
                                    className="h-8 w-8 rounded-xl flex items-center justify-center transition-all"
                                    style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(252,165,165,0.1)', e.currentTarget.style.borderColor = 'rgba(252,165,165,0.3)')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.borderColor = 'var(--color-border)')}>
                                    <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--color-error)' }} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
