import { useAuth } from '@/lib/AuthContext';
import { ShieldX } from 'lucide-react';

export default function AdminGuard({ children }) {
    const { user, isAuthenticated, isLoadingAuth } = useAuth();

    if (isLoadingAuth) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-6 text-center">
                <ShieldX className="h-12 w-12 text-zinc-600 mb-4" />
                <h1 className="text-2xl font-bold text-zinc-300 mb-2">Access Denied</h1>
                <p className="text-zinc-600 text-sm">This page doesn't exist or you don't have permission.</p>
            </div>
        );
    }

    return children;
}