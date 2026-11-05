/**
 * pages/superadmin/Settings.jsx
 * ------------------------------------------------------------
 * Настройки суперадмина (владельца платформы):
 * - Смена и настройка 4-значного ПИН-кода для быстрого входа
 * - Оформление / выбор темы
 * - Выход из системы
 * ------------------------------------------------------------
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Shield, Palette, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import PinScreen from '../../components/PinScreen';

export default function SuperadminSettings() {
    const { logout, hasPin, removePin, fullName } = useAuth();
    const navigate = useNavigate();
    const showToast = useToast();
    const [pinModalMode, setPinModalMode] = useState(null);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    function handleRemovePin() {
        if (window.confirm('Отключить быстрый вход по ПИН-коду? При следующем входе потребуется логин и пароль.')) {
            removePin();
            showToast('ПИН-код отключён');
        }
    }

    return (
        <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 60 }}>
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.4rem', margin: 0 }}>
                        <Shield color="var(--green)" size={24} />
                        Настройки
                    </h1>
                    <div className="subtitle" style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                        {fullName || 'Владелец платформы'} · управление доступом и безопасностью
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* ── PIN Code Card ── */}
                <div className="card" style={{ padding: '18px 20px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: 'rgba(var(--green-rgb, 74, 222, 128), 0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--green)'
                            }}>
                                <KeyRound size={20} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>Быстрый вход по ПИН-коду</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>4-значный персональный код</div>
                            </div>
                        </div>

                        <span className={`badge ${hasPin ? 'badge-done' : 'badge-cancelled'}`} style={{ fontSize: 11 }}>
                            {hasPin ? 'Активен ✓' : 'Не установлен'}
                        </span>
                    </div>

                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.45, margin: '0 0 16px 0' }}>
                        {hasPin
                            ? 'ПИН-код настроен. При повторном открытии платформы не нужно каждый раз вводить логин и пароль — достаточно набрать 4 цифры.'
                            : 'Установите 4 цифры для быстрого входа без постоянного ввода пароля.'}
                    </p>

                    {hasPin ? (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setPinModalMode('change')}
                                style={{ flex: 1, minWidth: 160, minHeight: 44, fontSize: 13 }}
                            >
                                <KeyRound size={15} />
                                Изменить ПИН-код
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={handleRemovePin}
                                style={{
                                    color: 'var(--status-cancelled)',
                                    borderColor: 'rgba(239, 68, 68, 0.3)',
                                    minHeight: 44,
                                    fontSize: 13
                                }}
                            >
                                Отключить
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setPinModalMode('setup')}
                            style={{ width: '100%', minHeight: 44, fontSize: 13 }}
                        >
                            <KeyRound size={15} />
                            Установить 4-значный ПИН-код
                        </button>
                    )}
                </div>

                {/* ── Theme Switch Card ── */}
                <div 
                    className="card" 
                    onClick={() => navigate('/themes')}
                    style={{ 
                        padding: '16px 20px', 
                        borderRadius: 'var(--radius-md)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'rgba(59, 130, 246, 0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#3b82f6'
                        }}>
                            <Palette size={20} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>Тема оформления</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Выбрать минималистичный стиль интерфейса</div>
                        </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
                </div>

                {/* ── Logout Card ── */}
                <div className="card" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>Сессия владельца</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Завершить текущий сеанс на этом устройстве</div>
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handleLogout}
                            style={{
                                color: 'var(--status-cancelled)',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                                minHeight: 42,
                                fontSize: 13
                            }}
                        >
                            <LogOut size={15} />
                            Выйти из системы
                        </button>
                    </div>
                </div>
            </div>

            {/* PIN Screen Modal */}
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

