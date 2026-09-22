/**
 * components/DashboardLayout.jsx
 * ------------------------------------------------------------
 * Shared shell for both the admin and barber dashboards: sidebar
 * navigation (collapsible on mobile), top bar, logout button.
 * `navItems` is an array of { to, icon, label }.
 * ------------------------------------------------------------
 */
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ navItems, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { fullName, shopName, logout } = useAuth();
    const navigate = useNavigate();
    const brandLabel = shopName || 'BarberPro';

    function handleLogout() {
        logout();
        navigate('/login');
    }

    return (
        <div className="app-shell">
            <main className="main-content">
                {children}
            </main>

            <nav className="bottom-nav">
                {navItems.map((item, i) => (
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
