import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        checkUserAuth();
    }, []);

    const checkUserAuth = async () => {
        try {
            setIsLoadingAuth(true);
            const res = await fetch('/api/auth/user', { credentials: 'include' });
            const data = await res.json();
            if (data.user) {
                setUser(data.user);
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setAuthError({ type: 'auth_error', message: error.message });
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoadingAuth(false);
            setAuthChecked(true);
        }
    };

    const logout = async (shouldRedirect = true) => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (_) {}
        setUser(null);
        setIsAuthenticated(false);
        if (shouldRedirect) {
            window.location.href = '/login';
        }
    };

    const navigateToLogin = () => {
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            isLoadingAuth,
            authError,
            authChecked,
            logout,
            navigateToLogin,
            checkUserAuth,
            setUser,
            setIsAuthenticated,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
