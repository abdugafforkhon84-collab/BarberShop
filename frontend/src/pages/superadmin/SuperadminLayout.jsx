/**
 * pages/superadmin/SuperadminLayout.jsx
 * ------------------------------------------------------------
 * Platform-owner shell.
 * ------------------------------------------------------------
 */
import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Store, Coins, Settings } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

export default function SuperadminLayout() {
    const NAV_ITEMS = [
        { to: '/superadmin/tenants', icon: <Store size={18} />, label: 'Барбершопы' },
        { to: '/superadmin/tariffs', icon: <Coins size={18} />, label: 'Тарифы' },
        { to: '/superadmin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Отчёт' },
        { to: '/superadmin/settings', icon: <Settings size={18} />, label: 'Настройки' },
    ];

    return (
        <DashboardLayout navItems={NAV_ITEMS}>
            <Outlet />
        </DashboardLayout>
    );
}
