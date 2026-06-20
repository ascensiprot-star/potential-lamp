import { createContext, useContext, useState, useCallback } from 'react';

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
    const [open, setOpen]   = useState(false);
    const [tab, setTab]     = useState('login');
    const [onSuccess, setOnSuccess] = useState(null);

    const openModal  = useCallback((initialTab = 'login', successCallback = null) => {
        setTab(initialTab);
        setOnSuccess(() => successCallback);
        setOpen(true);
    }, []);

    const closeModal = useCallback(() => setOpen(false), []);

    const handleSuccess = useCallback(() => {
        setOpen(false);
        if (typeof onSuccess === 'function') onSuccess();
    }, [onSuccess]);

    return (
        <AuthModalContext.Provider value={{ open, tab, setTab, openModal, closeModal, handleSuccess }}>
            {children}
        </AuthModalContext.Provider>
    );
}

export function useAuthModal() {
    const ctx = useContext(AuthModalContext);
    if (!ctx) throw new Error('useAuthModal must be used inside AuthModalProvider');
    return ctx;
}
