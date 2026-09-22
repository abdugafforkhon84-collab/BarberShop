/**
 * pages/admin/AdminLayout.jsx
 * ------------------------------------------------------------
 * Admin profile: записи клиентов, барберы, отчёт, выплаты,
 * настройки, услуги.
 * ------------------------------------------------------------
 */
import { Outlet } from 'react-router-dom';
import { Calendar, Users, BarChart3, Wallet, Scissors, Settings, History } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

const NAV_ITEMS = [
    { to: '/admin/bookings', icon: <Calendar size={18} />, label: 'Записи' },
    { to: '/admin/reports', icon: <BarChart3 size={18} />, label: 'Отчёт' },
    { to: '/admin/settings', icon: <Settings size={18} />, label: 'Настройки' },
];

export default function AdminLayout() {
    return (
        <DashboardLayout navItems={NAV_ITEMS}>
            <Outlet />
        </DashboardLayout>
    );
}
