import { useState, useEffect } from 'react';

export function useDarkMode() {
    const [dark, setDark] = useState(() => {
        const saved = localStorage.getItem('sf_dark_mode');
        if (saved !== null) return saved === 'true';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (dark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('sf_dark_mode', dark);
    }, [dark]);

    const toggle = () => setDark(d => !d);

    return { dark, toggle };
}