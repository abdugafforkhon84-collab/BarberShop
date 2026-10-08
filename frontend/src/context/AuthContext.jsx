/**
 * context/AuthContext.jsx
 * ------------------------------------------------------------
 * Holds the logged-in user's token/role/name/shop in memory +
 * localStorage so a page refresh doesn't log the user out.
 * Three possible roles: 'superadmin' (platform owner),
 * 'admin' (a barbershop's own admin), 'barber'.
 * ------------------------------------------------------------
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('barberpro_token'));
    const [role, setRole] = useState(() => localStorage.getItem('barberpro_role'));
    const [fullName, setFullName] = useState(() => localStorage.getItem('barberpro_name'));
    const [shopName, setShopName] = useState(() => localStorage.getItem('barberpro_shop'));
    const [shopTheme, setShopTheme] = useState(() => localStorage.getItem('barberpro_theme'));
    const [shopType, setShopType] = useState(() => localStorage.getItem('barberpro_shop_type'));

    const login = useCallback(async (loginValue, password) => {
        const data = await authApi.login(loginValue, password);
        localStorage.setItem('barberpro_token', data.access_token);
        localStorage.setItem('barberpro_role', data.role);
        localStorage.setItem('barberpro_name', data.full_name);
        if (data.shop_name) localStorage.setItem('barberpro_shop', data.shop_name);
        else localStorage.removeItem('barberpro_shop');
        
        if (data.theme) localStorage.setItem('barberpro_theme', data.theme);
        if (data.shop_type) localStorage.setItem('barberpro_shop_type', data.shop_type);

        setToken(data.access_token);
        setRole(data.role);
        setFullName(data.full_name);
        setShopName(data.shop_name || null);
        setShopTheme(data.theme || 'dark');
        setShopType(data.shop_type || 'barbershop');
        return data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('barberpro_token');
        localStorage.removeItem('barberpro_role');
        localStorage.removeItem('barberpro_name');
        localStorage.removeItem('barberpro_shop');
        localStorage.removeItem('barberpro_theme');
        localStorage.removeItem('barberpro_shop_type');
        setToken(null);
        setRole(null);
        setFullName(null);
        setShopName(null);
        setShopTheme(null);
        setShopType(null);
    }, []);

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
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
