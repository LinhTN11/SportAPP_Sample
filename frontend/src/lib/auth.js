'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    // Load user from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('sportapp_token');
        const savedUser = localStorage.getItem('sportapp_user');

        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email, password) => {
        const { data } = await authAPI.login({ email, password });
        const { user: userData, token: newToken } = data.data;

        localStorage.setItem('sportapp_token', newToken);
        localStorage.setItem('sportapp_user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);

        return userData;
    }, []);

    const register = useCallback(async (formData) => {
        const { data } = await authAPI.register(formData);
        const { user: userData, token: newToken } = data.data;

        localStorage.setItem('sportapp_token', newToken);
        localStorage.setItem('sportapp_user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);

        return userData;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('sportapp_token');
        localStorage.removeItem('sportapp_user');
        setToken(null);
        setUser(null);
        window.location.href = '/login';
    }, []);

    const updateUser = useCallback((userData) => {
        localStorage.setItem('sportapp_user', JSON.stringify(userData));
        setUser(userData);
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            login,
            register,
            logout,
            updateUser,
            isAuthenticated: !!user,
            isAdmin: user?.role === 'ADMIN',
            isOwner: user?.role === 'OWNER',
            isCustomer: user?.role === 'CUSTOMER',
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
