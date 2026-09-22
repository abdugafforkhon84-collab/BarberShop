/**
 * components/ProtectedRoute.jsx
 * ------------------------------------------------------------
 * Wraps a page and redirects to /login if not authenticated, or
 * to the correct dashboard if the role doesn't match `allow`.
 * ------------------------------------------------------------
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HOME_BY_ROLE = {
    superadmin: '/superadmin',
    admin: '/admin',
    barber: '/barber',
};

export default function ProtectedRoute({ allow, children }) {
    const { isAuthenticated, role } = useAuth();

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (allow && role !== allow) {
        return <Navigate to={HOME_BY_ROLE[role] || '/login'} replace />;
    }
    return children;
}
