import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { History, Scissors, LogOut, Palette, ChevronRight } from 'lucide-react';

export default function BarberSettings() {
    const navigate = useNavigate();
    const { logout, fullName, role, shopName, shopTheme } = useAuth();

    function handleLogout() {
        logout();
        navigate('/login');
    }

    const currentTheme = localStorage.getItem('barberpro_theme') || shopTheme || 'dark';

    const THEME_NAMES = {
        dark: 'Тёмная',
        light: 'Светлая',
        pink: 'Розовая',
        luxury: 'Люкс Золото',
        gold: 'Люкс Золото'
    };

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
                    <ChevronRight size={18} color="var(--text-muted)" />
                </button>
                <button className="service-check-item" onClick={() => navigate('/barber/services')}>
                    <div className="sci-left">
                        <Scissors size={20} color="var(--green)" />
                        <span className="sci-name">Мои услуги</span>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                </button>
                <button className="service-check-item" onClick={() => navigate('/barber/themes')}>
                    <div className="sci-left">
                        <Palette size={20} color="var(--green)" />
                        <div>
                            <div className="sci-name">Темы оформления</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Выбор: Тёмный, Светлый, Розовый, Золотой Люкс
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge" style={{ background: 'var(--green-glow)', color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>
                            {THEME_NAMES[currentTheme] || 'Тёмная'}
                        </span>
                        <ChevronRight size={18} color="var(--text-muted)" />
                    </div>
                </button>
            </div>
        </div>
    );
}
