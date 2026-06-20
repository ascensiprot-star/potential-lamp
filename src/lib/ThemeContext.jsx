import { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('truvornex-theme') || 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('light');
            root.classList.remove('dark');
        } else {
            root.classList.remove('light');
            root.classList.add('dark');
        }
        localStorage.setItem('truvornex-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        const root = document.documentElement;
        root.classList.add('theme-switching');
        setTheme(t => t === 'dark' ? 'light' : 'dark');
        requestAnimationFrame(() =>
            requestAnimationFrame(() =>
                setTimeout(() => root.classList.remove('theme-switching'), 50)
            )
        );
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};
