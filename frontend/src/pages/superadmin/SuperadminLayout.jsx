/**
 * pages/superadmin/SuperadminLayout.jsx
 * ------------------------------------------------------------
 * Platform-owner shell. Deliberately a single section - the
 * superadmin only provisions/manages barbershops, nothing else
 * is reachable from here (see routers/superadmin.py on the
 * backend: there is no endpoint for business data at all).
 * ------------------------------------------------------------
 */
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Store, LogOut, Coins, KeyRound } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import PinScreen from '../../components/PinScreen';
import { useAuth } from '../../context/AuthContext';

export default function SuperadminLayout() {
    const { logout, hasPin } = useAuth();
    const navigate = useNavigate();
    const [pinModalMode, setPinModalMode] = useState(null);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    const NAV_ITEMS = [
        { to: '/superadmin/tenants', icon: <Store size={18} />, label: 'Барбершопы' },
        { to: '/superadmin/tariffs', icon: <Coins size={18} />, label: 'Тарифы' },
        { to: '/superadmin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Отчёт' },
        { onClick: () => setPinModalMode(hasPin ? 'change' : 'setup'), icon: <KeyRound size={18} />, label: hasPin ? 'Сменить ПИН' : 'ПИН-код' },
        { onClick: handleLogout, icon: <LogOut size={18} />, label: 'Выйти' }
    ];

    return (
        <DashboardLayout navItems={NAV_ITEMS}>
            <Outlet />
            {pinModalMode && (
                <PinScreen
                    mode={pinModalMode}
                    onComplete={() => setPinModalMode(null)}
                    onCancel={() => setPinModalMode(null)}
                />
            )}
        </DashboardLayout>
    );
}
