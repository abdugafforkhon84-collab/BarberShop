import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
    Scissors, 
    Palette, 
    LogOut, 
    User, 
    Calendar, 
    Users, 
    BarChart3, 
    Wallet, 
    Settings, 
    History, 
    Inbox, 
    Sparkles,
    Shield,
    Store,
    Coins,
    LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SUPERADMIN_DESKTOP_NAV = [
    { to: '/superadmin/tenants', label: 'Барбершопы', icon: Store },
    { to: '/superadmin/tariffs', label: 'Тарифы', icon: Coins },
    { to: '/superadmin/dashboard', label: 'Отчёт платформы', icon: LayoutDashboard },
];

const ADMIN_DESKTOP_NAV = [
    { to: '/admin/bookings', label: 'Записи', icon: Calendar },
    { to: '/admin/clients', label: 'Клиенты', icon: Users },
    { to: '/admin/barbers', label: 'Сотрудники', icon: User },
    { to: '/admin/services', label: 'Услуги', icon: Scissors },
    { to: '/admin/reports', label: 'Отчёты', icon: BarChart3 },
    { to: '/admin/payments', label: 'Выплаты', icon: Wallet },
    { to: '/admin/history', label: 'История', icon: History },
    { to: '/admin/settings', label: 'Настройки', icon: Settings },
];

const BARBER_DESKTOP_NAV = [
    { to: '/barber/calendar', label: 'Записи', icon: Calendar },
    { to: '/barber/requests', label: 'Заявки', icon: Inbox },
    { to: '/barber/history', label: 'История', icon: History },
    { to: '/barber/services', label: 'Мои услуги', icon: Scissors },
    { to: '/barber/reports', label: 'Отчёт', icon: BarChart3 },
    { to: '/barber/settings', label: 'Настройки', icon: Settings },
];

export default function DashboardLayout({ navItems, children }) {
    const { fullName, shopName, role, logout, shopTheme } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    function handleLogout() {
        logout();
        navigate('/login');
    }

    const desktopNav = role === 'superadmin' 
        ? SUPERADMIN_DESKTOP_NAV 
        : role === 'admin' 
            ? ADMIN_DESKTOP_NAV 
            : BARBER_DESKTOP_NAV;

    const homePath = role === 'superadmin' 
        ? '/superadmin/tenants' 
        : role === 'admin' 
            ? '/admin/bookings' 
            : '/barber/calendar';

    const themesPath = role === 'superadmin' 
        ? '/themes' 
        : role === 'admin' 
            ? '/admin/themes' 
            : '/barber/themes';

    const brandLabel = role === 'superadmin' 
        ? 'Платформа' 
        : (shopName || 'BarberPro');

    const currentTheme = localStorage.getItem('barberpro_theme') || shopTheme || 'dark';

    const THEME_NAMES = {
        dark: 'Тёмный',
        light: 'Светлый',
        pink: 'Розовый',
        luxury: 'Люкс Золото',
        gold: 'Люкс Золото'
    };

    return (
        <div className="app-shell">
            {/* Desktop / Laptop Top Navigation Bar */}
            <header className="desktop-nav-header">
                <div className="dnav-left">
                    <div className="dnav-brand" onClick={() => navigate(homePath)}>
                        <div className="brand-badge-icon">
                            <Scissors size={18} strokeWidth={2.4} />
                        </div>
                        <span className="brand-title">BarberPro</span>
                    </div>

                    <div className="shop-pill" title={role === 'superadmin' ? 'Панель супер-администратора' : `Филиал: ${brandLabel}`}>
                        <span className="status-live-dot" />
                        <span className="shop-name-text">{brandLabel}</span>
                    </div>
                </div>

                {/* Desktop Nav Links */}
                <nav className="dnav-center">
                    {desktopNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.to);

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={`dnav-link ${isActive ? 'active' : ''}`}
                            >
                                <Icon size={15} />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Right Profile & Actions */}
                <div className="dnav-right">
                    {/* Theme Quick Switcher */}
                    <button
                        className="btn btn-outline dnav-theme-btn"
                        onClick={() => navigate(themesPath)}
                        title="Выбрать тему оформления"
                    >
                        <Palette size={16} color="var(--green)" />
                        <span className="theme-text">{THEME_NAMES[currentTheme] || 'Темы'}</span>
                    </button>

                    {/* User Profile Pill */}
                    <div className="user-profile-badge">
                        <div className="user-avatar-circle">
                            {(fullName || 'П')[0].toUpperCase()}
                        </div>
                        <div className="user-info-text">
                            <span className="user-name">{fullName || 'Пользователь'}</span>
                            <span className="user-role-label">
                                {role === 'admin' ? 'Администратор' : role === 'barber' ? 'Мастер' : 'Супер-админ'}
                            </span>
                        </div>
                    </div>

                    {/* Logout */}
                    <button
                        className="btn btn-outline btn-icon-round logout-btn"
                        onClick={handleLogout}
                        title="Выйти из аккаунта"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            {/* Mobile Top Header (compact) */}
            <header className="mobile-nav-header">
                <div className="mnav-left" onClick={() => navigate(homePath)}>
                    <div className="brand-badge-icon sm">
                        <Scissors size={15} strokeWidth={2.4} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.1 }}>BarberPro</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.1, marginTop: 2 }}>{brandLabel}</div>
                    </div>
                </div>

                <div className="mnav-right">
                    <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '6px 10px', fontSize: 11, gap: 5, borderRadius: 999 }}
                        onClick={() => navigate(themesPath)}
                    >
                        <Palette size={13} color="var(--green)" />
                        <span>{THEME_NAMES[currentTheme] || 'Темы'}</span>
                    </button>

                    <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '6px 8px', borderRadius: 999, color: 'var(--status-cancelled)', borderColor: 'rgba(239,68,68,0.2)' }}
                        onClick={handleLogout}
                        title="Выйти"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </header>

            {/* Main Application View */}
            <main className="main-content">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="bottom-nav">
                {(navItems || []).map((item, i) => (
                    item.to ? (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="icon">{item.icon}</span>
                            <span className="label">{item.label}</span>
                        </NavLink>
                    ) : (
                        <button
                            key={i}
                            type="button"
                            className="nav-item"
                            onClick={item.onClick}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                            <span className="icon">{item.icon}</span>
                            <span className="label">{item.label}</span>
                        </button>
                    )
                ))}
            </nav>
        </div>
    );
}
