/**
 * context/AuthContext.jsx
 * ------------------------------------------------------------
 * Holds the logged-in user's token/role/name/shop in memory +
 * localStorage so a page refresh doesn't log the user out.
 * Three possible roles: 'superadmin' (platform owner),
 * 'admin' (a barbershop's own admin), 'barber'.
 * ------------------------------------------------------------
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('barberpro_token'));
    const [role, setRole] = useState(() => localStorage.getItem('barberpro_role'));
    const [fullName, setFullName] = useState(() => localStorage.getItem('barberpro_name'));
    const [shopName, setShopName] = useState(() => localStorage.getItem('barberpro_shop'));
    const [shopTheme, setShopThemeState] = useState(() => localStorage.getItem('barberpro_theme') || 'dark');
    const [shopType, setShopType] = useState(() => localStorage.getItem('barberpro_shop_type'));

    const setShopTheme = useCallback((theme) => {
        const next = theme || 'dark';
        setShopThemeState(next);
        localStorage.setItem('barberpro_theme', next);
        document.documentElement.setAttribute('data-theme', next);
    }, []);

    // Apply saved theme immediately on mount
    useEffect(() => {
        const saved = localStorage.getItem('barberpro_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    const login = useCallback(async (loginValue, password) => {
        const data = await authApi.login(loginValue, password);
        localStorage.setItem('barberpro_token', data.access_token);
        localStorage.setItem('barberpro_role', data.role);
        localStorage.setItem('barberpro_name', data.full_name);
        if (data.shop_name) localStorage.setItem('barberpro_shop', data.shop_name);
        else localStorage.removeItem('barberpro_shop');
        
        if (data.shop_type) localStorage.setItem('barberpro_shop_type', data.shop_type);

        // Preserve user's explicitly selected theme or adopt tenant default
        const existingLocalTheme = localStorage.getItem('barberpro_theme');
        const themeToApply = existingLocalTheme || data.theme || 'dark';
        localStorage.setItem('barberpro_theme', themeToApply);
        document.documentElement.setAttribute('data-theme', themeToApply);

        setToken(data.access_token);
        setRole(data.role);
        setFullName(data.full_name);
        setShopName(data.shop_name || null);
        setShopTheme(themeToApply);
        setShopType(data.shop_type || 'barbershop');
        return data;
    }, [setShopTheme]);

    const logout = useCallback(() => {
        localStorage.removeItem('barberpro_token');
        localStorage.removeItem('barberpro_role');
        localStorage.removeItem('barberpro_name');
        localStorage.removeItem('barberpro_shop');
        // DO NOT remove barberpro_theme! The user's theme selection remains saved permanently.
        localStorage.removeItem('barberpro_shop_type');
        setToken(null);
        setRole(null);
        setFullName(null);
        setShopName(null);
        setShopType(null);
    }, []);

    const switchBranch = useCallback(async (slug) => {
        const data = await authApi.switchBranch(slug);
        localStorage.setItem('barberpro_token', data.access_token);
        localStorage.setItem('barberpro_role', data.role);
        localStorage.setItem('barberpro_name', data.full_name);
        if (data.shop_name) localStorage.setItem('barberpro_shop', data.shop_name);
        else localStorage.removeItem('barberpro_shop');
        
        if (data.shop_type) localStorage.setItem('barberpro_shop_type', data.shop_type);

        const existingLocalTheme = localStorage.getItem('barberpro_theme');
        const themeToApply = existingLocalTheme || data.theme || 'dark';
        localStorage.setItem('barberpro_theme', themeToApply);
        document.documentElement.setAttribute('data-theme', themeToApply);

        setToken(data.access_token);
        setRole(data.role);
        setFullName(data.full_name);
        setShopName(data.shop_name || null);
        setShopTheme(themeToApply);
        setShopType(data.shop_type || 'barbershop');
        return data;
    }, [setShopTheme]);

    const value = {
        token,
        role,
        fullName,
        shopName,
        shopTheme,
        shopType,
        setShopTheme,
        setShopType,
        isAuthenticated: !!token,
        isSuperAdmin: role === 'superadmin',
        isAdmin: role === 'admin',
        isBarber: role === 'barber',
        login,
        logout,
        switchBranch,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
