import { Link } from 'react-router-dom';
import { Scissors, Stethoscope, Wrench, Zap, BookOpen, Truck, Dumbbell, UtensilsCrossed, ShoppingBag, Droplets, Paintbrush, Car, ArrowUpRight } from 'lucide-react';

const ICON_MAP = {
    scissors: Scissors, stethoscope: Stethoscope, wrench: Wrench, zap: Zap,
    book: BookOpen, truck: Truck, dumbbell: Dumbbell, utensils: UtensilsCrossed,
    shopping: ShoppingBag, droplets: Droplets, paintbrush: Paintbrush, car: Car,
};

export default function ServiceCategoryCard({ category }) {
    const Icon = ICON_MAP[category.icon] || Wrench;
    return (
        <Link
            to={`/category/${category.slug}`}
            className="group card-premium p-5 block"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="h-11 w-11 rounded-xl bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all duration-200">
                    <Icon className="h-5 w-5 text-zinc-600 group-hover:text-white transition-colors duration-200" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-600 transition-colors duration-200 opacity-0 group-hover:opacity-100" />
            </div>
            <h3 className="font-inter font-semibold text-sm text-zinc-900">{category.name}</h3>
            {category.description && (
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{category.description}</p>
            )}
        </Link>
    );
}