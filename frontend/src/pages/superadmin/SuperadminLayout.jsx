/**
 * pages/superadmin/SuperadminLayout.jsx
 * ------------------------------------------------------------
 * Platform-owner shell. Deliberately a single section - the
 * superadmin only provisions/manages barbershops, nothing else
 * is reachable from here (see routers/superadmin.py on the
 * backend: there is no endpoint for business data at all).
 * ------------------------------------------------------------
 */
import { Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Store, LogOut } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

export default function SuperadminLayout() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login');
    }

    const NAV_ITEMS = [
        { to: '/superadmin/tenants', icon: <Store size={18} />, label: 'Барбершопы' },
        { to: '/superadmin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Отчёт' },
        { onClick: handleLogout, icon: <LogOut size={18} />, label: 'Выйти' }
    ];

    return (
        <DashboardLayout navItems={NAV_ITEMS}>
            <Outlet />
        </DashboardLayout>
    );
}
