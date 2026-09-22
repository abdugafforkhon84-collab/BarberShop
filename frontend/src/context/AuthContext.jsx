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

    const login = useCallback(async (loginValue, password) => {
        const data = await authApi.login(loginValue, password);
        localStorage.setItem('barberpro_token', data.access_token);
        localStorage.setItem('barberpro_role', data.role);
        localStorage.setItem('barberpro_name', data.full_name);
        if (data.shop_name) localStorage.setItem('barberpro_shop', data.shop_name);
        else localStorage.removeItem('barberpro_shop');
        setToken(data.access_token);
        setRole(data.role);
        setFullName(data.full_name);
        setShopName(data.shop_name || null);
        return data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('barberpro_token');
        localStorage.removeItem('barberpro_role');
        localStorage.removeItem('barberpro_name');
        localStorage.removeItem('barberpro_shop');
        setToken(null);
        setRole(null);
        setFullName(null);
        setShopName(null);
    }, []);

    const value = {
        token,
        role,
        fullName,
        shopName,
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
