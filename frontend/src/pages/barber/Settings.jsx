import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { History, Scissors, LogOut, Palette } from 'lucide-react';

export default function BarberSettings() {
    const navigate = useNavigate();
    const { logout, fullName } = useAuth();

    function handleLogout() {
        logout();
        navigate('/login');
    }

    function setTheme(theme) {
        localStorage.setItem('barberpro_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }

    return (
        <div style={{ maxWidth: 640 }}>
            <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Настройки профиля</h1>
                    <p className="page-subtitle" style={{ marginTop: 4 }}>Вы вошли как {fullName}</p>
                </div>
                <button className="btn btn-outline" style={{ color: 'var(--status-cancelled)', borderColor: 'var(--status-cancelled)', padding: '8px 12px', minHeight: 'unset', fontSize: 13 }} onClick={handleLogout}>
                    <LogOut size={16} /> Выйти
                </button>
            </div>

            {/* Navigation Menu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                <button className="service-check-item" onClick={() => navigate('/barber/history')}>
                    <div className="sci-left">
                        <History size={20} color="var(--green)" />
                        <span className="sci-name">Моя история записей</span>
                    </div>
                </button>
                <button className="service-check-item" onClick={() => navigate('/barber/services')}>
                    <div className="sci-left">
                        <Scissors size={20} color="var(--green)" />
                        <span className="sci-name">Мои услуги</span>
                    </div>
                </button>
            </div>

            {/* Themes */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                    <Palette size={18} color="var(--green)" />
                    <span>Тема оформления</span>
                </div>
                <div className="tag-switch">
                    <button onClick={() => setTheme('dark')}>Тёмная</button>
                    <button onClick={() => setTheme('light')}>Светлая</button>
                    <button onClick={() => setTheme('pink')}>Розовая</button>
                </div>
            </div>

        </div>
    );
}
