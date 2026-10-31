/**
 * context/AuthContext.jsx
 * ------------------------------------------------------------
 * Holds the logged-in user's token/role/name/shop in memory +
 * localStorage so a page refresh doesn't log the user out.
 * Includes user- and role-scoped 4-digit PIN lock support:
 * - Superadmin has their own personal PIN.
 * - Barbershop admins each have their shop-scoped PIN.
 * - Each barber has their own individual user-scoped PIN.
 * ------------------------------------------------------------
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

/**
 * Returns a unique, isolated storage key for 4-digit PINs based on role, tenant, and identity.
 */
export function getPinStorageKey(role, tenant, fullName, token) {
    const currentRole = role || localStorage.getItem('barberpro_role');
    const currentTenant = tenant || localStorage.getItem('barberpro_tenant') || localStorage.getItem('barberpro_shop');
    const currentName = fullName || localStorage.getItem('barberpro_name');
    const currentToken = token || localStorage.getItem('barberpro_token');

    if (currentRole === 'superadmin') {
        return 'barberpro_pin_superadmin';
    }

    if (currentRole === 'admin') {
        const slug = (currentTenant || 'admin').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
        return `barberpro_pin_admin_${slug}`;
    }

    if (currentRole === 'barber') {
        let barberId = '';
        if (currentToken) {
            try {
                const payload = JSON.parse(atob(currentToken.split('.')[1]));
                if (payload && payload.sub) barberId = String(payload.sub);
            } catch (_) {}
        }
        const slug = (currentTenant || 'shop').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
        const user = (barberId || currentName || 'barber').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
        return `barberpro_pin_barber_${slug}_${user}`;
    }

    return 'barberpro_pin';
}

function readScopedPin(key) {
    const scoped = localStorage.getItem(key);
    if (scoped) return scoped;

    // Backward compatibility: migrate global legacy PIN if this is superadmin
    const legacy = localStorage.getItem('barberpro_pin');
    if (legacy && key === 'barberpro_pin_superadmin') {
        localStorage.setItem(key, legacy);
        localStorage.removeItem('barberpro_pin');
        return legacy;
    }
    return null;
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('barberpro_token'));
    const [role, setRole] = useState(() => localStorage.getItem('barberpro_role'));
    const [tenant, setTenant] = useState(() => localStorage.getItem('barberpro_tenant'));
    const [fullName, setFullName] = useState(() => localStorage.getItem('barberpro_name'));
    const [shopName, setShopName] = useState(() => localStorage.getItem('barberpro_shop'));
    const [shopTheme, setShopThemeState] = useState(() => localStorage.getItem('barberpro_theme') || 'dark');
    const [shopType, setShopType] = useState(() => localStorage.getItem('barberpro_shop_type'));

    const getCurrentPinKey = useCallback((overrideRole, overrideTenant, overrideName, overrideToken) => {
        return getPinStorageKey(
            overrideRole !== undefined ? overrideRole : role,
            overrideTenant !== undefined ? overrideTenant : (tenant || shopName),
            overrideName !== undefined ? overrideName : fullName,
            overrideToken !== undefined ? overrideToken : token
        );
    }, [role, tenant, shopName, fullName, token]);

    // PIN lock states - scoped strictly to the current active user/role
    const [hasPin, setHasPin] = useState(() => {
        const k = getPinStorageKey();
        return Boolean(readScopedPin(k));
    });

    const [isLocked, setIsLocked] = useState(() => {
        const t = localStorage.getItem('barberpro_token');
        const k = getPinStorageKey();
        const p = readScopedPin(k);
        const u = sessionStorage.getItem(`${k}_unlocked`);
        return Boolean(t && p && !u);
    });

    const [needsPinSetup, setNeedsPinSetup] = useState(false);

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
        const userTenant = data.tenant || null;

        localStorage.setItem('barberpro_token', data.access_token);
        localStorage.setItem('barberpro_role', data.role);
        localStorage.setItem('barberpro_name', data.full_name);
        if (userTenant) localStorage.setItem('barberpro_tenant', userTenant);
        else localStorage.removeItem('barberpro_tenant');

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
        setTenant(userTenant);
        setFullName(data.full_name);
        setShopName(data.shop_name || null);
        setShopTheme(themeToApply);
        setShopType(data.shop_type || 'barbershop');

        // Check if 4-digit PIN is already configured for THIS specific role & user
        const userPinKey = getPinStorageKey(data.role, userTenant || data.shop_name, data.full_name, data.access_token);
        const existingPin = readScopedPin(userPinKey);

        if (!existingPin) {
            setHasPin(false);
            setNeedsPinSetup(true);
            setIsLocked(false);
        } else {
            sessionStorage.setItem(`${userPinKey}_unlocked`, 'true');
            setHasPin(true);
            setIsLocked(false);
            setNeedsPinSetup(false);
        }

        return data;
    }, [setShopTheme]);

    const unlock = useCallback((enteredPin) => {
        const key = getCurrentPinKey();
        const savedPin = readScopedPin(key);
        if (savedPin && enteredPin === savedPin) {
            sessionStorage.setItem(`${key}_unlocked`, 'true');
            setIsLocked(false);
            return true;
        }
        return false;
    }, [getCurrentPinKey]);

    const verifyPin = useCallback((enteredPin) => {
        const key = getCurrentPinKey();
        const savedPin = readScopedPin(key);
        return Boolean(savedPin && enteredPin === savedPin);
    }, [getCurrentPinKey]);

    const setPin = useCallback((newPin) => {
        const key = getCurrentPinKey();
        localStorage.setItem(key, newPin);
        sessionStorage.setItem(`${key}_unlocked`, 'true');
        setHasPin(true);
        setIsLocked(false);
        setNeedsPinSetup(false);
    }, [getCurrentPinKey]);

    const removePin = useCallback(() => {
        const key = getCurrentPinKey();
        localStorage.removeItem(key);
        sessionStorage.removeItem(`${key}_unlocked`);
        setHasPin(false);
        setIsLocked(false);
        setNeedsPinSetup(false);
    }, [getCurrentPinKey]);

    const skipPinSetup = useCallback(() => {
        const key = getCurrentPinKey();
        sessionStorage.setItem(`${key}_unlocked`, 'true');
        setNeedsPinSetup(false);
    }, [getCurrentPinKey]);

    const logout = useCallback(() => {
        const currentTheme = localStorage.getItem('barberpro_theme') || 'dark';
        const key = getCurrentPinKey();
        sessionStorage.removeItem(`${key}_unlocked`);

        localStorage.removeItem('barberpro_token');
        localStorage.removeItem('barberpro_role');
        localStorage.removeItem('barberpro_tenant');
        localStorage.removeItem('barberpro_name');
        localStorage.removeItem('barberpro_shop');
        localStorage.removeItem('barberpro_shop_type');
        
        // DO NOT remove barberpro_theme! The user's theme selection remains saved permanently.
        localStorage.setItem('barberpro_theme', currentTheme);
        document.documentElement.setAttribute('data-theme', currentTheme);
        
        setToken(null);
        setRole(null);
        setTenant(null);
        setFullName(null);
        setShopName(null);
        setShopType(null);
        setHasPin(false);
        setIsLocked(false);
        setNeedsPinSetup(false);
        setShopThemeState(currentTheme);
    }, [getCurrentPinKey]);

    const switchBranch = useCallback(async (slug) => {
        const data = await authApi.switchBranch(slug);
        const nextTenant = data.tenant || slug;

        localStorage.setItem('barberpro_token', data.access_token);
        localStorage.setItem('barberpro_role', data.role);
        localStorage.setItem('barberpro_tenant', nextTenant);
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
        setTenant(nextTenant);
        setFullName(data.full_name);
        setShopName(data.shop_name || null);
        setShopTheme(themeToApply);
        setShopType(data.shop_type || 'barbershop');

        // Check PIN for new branch
        const nextKey = getPinStorageKey(data.role, nextTenant, data.full_name, data.access_token);
        const branchPin = readScopedPin(nextKey);
        setHasPin(Boolean(branchPin));
        if (branchPin) {
            sessionStorage.setItem(`${nextKey}_unlocked`, 'true');
            setIsLocked(false);
        }

        return data;
    }, [setShopTheme]);

    const value = {
        token,
        role,
        tenant,
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
        // PIN Lock API
        hasPin,
        isLocked,
        needsPinSetup,
        unlock,
        verifyPin,
        setPin,
        removePin,
        skipPinSetup,
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
