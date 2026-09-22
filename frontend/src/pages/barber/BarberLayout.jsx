/**
 * pages/barber/BarberLayout.jsx
 * ------------------------------------------------------------
 * Barber profile: принимать заявки, история (все заказы +
 * оплата), услуги.
 * ------------------------------------------------------------
 */
import { Outlet } from 'react-router-dom';
import { Calendar, Inbox, History, Scissors, BarChart2 } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';

import { Settings as SettingsIcon } from 'lucide-react';
const NAV_ITEMS = [
    { to: '/barber/calendar', icon: <Calendar size={18} />, label: 'Записи' },
    { to: '/barber/reports', icon: <BarChart2 size={18} />, label: 'Отчёт' },
    { to: '/barber/settings', icon: <SettingsIcon size={18} />, label: 'Настройки' },
];

export default function BarberLayout() {
    return (
        <DashboardLayout navItems={NAV_ITEMS}>
            <Outlet />
        </DashboardLayout>
    );
}
