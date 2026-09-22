/**
 * App.jsx
 * ------------------------------------------------------------
 * Top-level routing: /login is public, /superadmin/* is the
 * platform owner only, /admin/* is a shop admin only, /barber/*
 * is a barber only (enforced by ProtectedRoute + the backend's
 * own per-role, per-tenant checks).
 * ------------------------------------------------------------
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';

import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

import Login from './pages/Login';

import SuperadminLayout from './pages/superadmin/SuperadminLayout';
import SuperadminDashboard from './pages/superadmin/Dashboard';
import SuperadminTenants from './pages/superadmin/Tenants';

import AdminLayout from './pages/admin/AdminLayout';
import AdminBookings from './pages/admin/Bookings';
import AdminHistory from './pages/admin/History';
import AdminBarbers from './pages/admin/Barbers';
import AdminReports from './pages/admin/Reports';
import AdminPayments from './pages/admin/Payments';
import AdminSettings from './pages/admin/Settings';
import AdminServices from './pages/admin/Services';

import BarberLayout from './pages/barber/BarberLayout';
import BarberCalendar from './pages/barber/Calendar';
import BarberRequests from './pages/barber/Requests';
import BarberHistory from './pages/barber/History';
import BarberReports from './pages/barber/Reports';
import BarberServices from './pages/barber/Services';
import BarberSettings from './pages/barber/Settings';

const HOME_BY_ROLE = {
    superadmin: '/superadmin',
    admin: '/admin',
    barber: '/barber',
};

export default function App() {
    const { isAuthenticated, role } = useAuth();

    useEffect(() => {
        const savedTheme = localStorage.getItem('barberpro_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route
                path="/superadmin"
                element={
                    <ProtectedRoute allow="superadmin">
                        <SuperadminLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<SuperadminDashboard />} />
                <Route path="tenants" element={<SuperadminTenants />} />
            </Route>

            <Route
                path="/admin"
                element={
                    <ProtectedRoute allow="admin">
                        <AdminLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="bookings" replace />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="history" element={<AdminHistory />} />
                <Route path="barbers" element={<AdminBarbers />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="services" element={<AdminServices />} />
                <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route
                path="/barber"
                element={
                    <ProtectedRoute allow="barber">
                        <BarberLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="calendar" replace />} />
                <Route path="calendar" element={<BarberCalendar />} />
                <Route path="requests" element={<BarberRequests />} />
                <Route path="history" element={<BarberHistory />} />
                <Route path="reports" element={<BarberReports />} />
                <Route path="services" element={<BarberServices />} />
                <Route path="settings" element={<BarberSettings />} />
            </Route>

            <Route
                path="/"
                element={
                    isAuthenticated
                        ? <Navigate to={HOME_BY_ROLE[role] || '/login'} replace />
                        : <Navigate to="/login" replace />
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
