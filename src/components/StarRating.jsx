import { Star } from 'lucide-react';

export default function StarRating({ rating = 0, size = 14, onRate, interactive = false }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    size={size}
                    className={`${star <= Math.round(rating) ? 'fill-foreground text-foreground' : 'text-border'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
                    onClick={() => interactive && onRate?.(star)}
                />
            ))}
        </div>
    );
}