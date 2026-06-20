import { useState, useEffect } from 'react';
import StarRating from '../../components/StarRating';

export default function Reports() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(false);
    }, []);

    if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

    return (
        <div>
            <h1 className="font-inter font-bold text-2xl mb-6">{"Reports & Reviews"}</h1>
            {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No reviews yet.</p>
            ) : (
                <div className="space-y-3">
                    {reviews.map(r => (
                        <div key={r.id} className="border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{r.customer_name || r.customer_email}</span>
                                <StarRating rating={r.rating} size={12} />
                            </div>
                            {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                            <p className="text-xs text-muted-foreground mt-2">Provider: {r.provider_id}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}