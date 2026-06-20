import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';

export default function DarkModeToggle({ className = '' }) {
    const { dark, toggle } = useDarkMode();
    return (
        <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 ${className}`}
        >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
    );
}