import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { History, Scissors, LogOut, Palette, ChevronRight, KeyRound } from 'lucide-react';
import { useToast } from '../../components/Toast';
import PinScreen from '../../components/PinScreen';

export default function BarberSettings() {
    const showToast = useToast();
    const navigate = useNavigate();
    const { logout, fullName, role, shopName, shopTheme, hasPin, removePin } = useAuth();
    const [pinModalMode, setPinModalMode] = useState(null);

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

            {/* PIN Code Security Card */}
            <div className="card" style={{ marginBottom: 24, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16, color: 'var(--text-main)' }}>
                        <KeyRound size={18} color="var(--accent)" />
                        <span>Быстрый вход по ПИН-коду (4 цифры)</span>
                    </div>
                    <span className={`badge ${hasPin ? 'badge-done' : 'badge-cancelled'}`}>
                        {hasPin ? 'Активен' : 'Не установлен'}
                    </span>
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                    {hasPin
                        ? 'ПИН-код настроен. При открытии приложения не требуется снова вводить логин и пароль — достаточно ввести 4 цифры.'
                        : 'Придумайте 4 цифры, чтобы мгновенно разблокировать приложение без повторного ввода логина и пароля.'}
                </p>

                <div style={{ display: 'flex', gap: 10 }}>
                    {hasPin ? (
                        <>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => setPinModalMode('change')}
                                style={{ height: 38, fontSize: 13 }}
                            >
                                Изменить ПИН-код
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => {
                                    if (window.confirm('Отключить быстрый вход по ПИН-коду?')) {
                                        removePin();
                                        showToast('ПИН-код отключён');
                                    }
                                }}
                                style={{ height: 38, fontSize: 13, color: 'var(--status-cancelled)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                            >
                                Отключить
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setPinModalMode('setup')}
                            style={{ height: 38, fontSize: 13 }}
                        >
                            Установить 4-значный ПИН-код
                        </button>
                    )}
                </div>
            </div>

            {pinModalMode && (
                <PinScreen
                    mode={pinModalMode}
                    onComplete={() => {
                        setPinModalMode(null);
                        showToast('ПИН-код успешно настроен ✓');
                    }}
                    onCancel={() => setPinModalMode(null)}
                />
            )}
        </div>
    );
}
