import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { History, Scissors, LogOut, ChevronRight, KeyRound, Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../../components/Toast';
import PinScreen from '../../components/PinScreen';
import { authApi } from '../../api';

export default function BarberSettings() {
    const showToast = useToast();
    const navigate = useNavigate();
    const { logout, fullName, hasPin, removePin } = useAuth();
    const [pinModalMode, setPinModalMode] = useState(null);

    const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [pwdLoading, setPwdLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    async function handlePasswordChange(e) {
        e.preventDefault();
        if (pwdForm.newPassword.length < 4) {
            showToast('Новый пароль должен быть не менее 4 символов', true);
            return;
        }
        if (pwdForm.newPassword !== pwdForm.confirmPassword) {
            showToast('Новые пароли не совпадают', true);
            return;
        }
        setPwdLoading(true);
        try {
            await authApi.changePassword({
                old_password: pwdForm.oldPassword || undefined,
                new_password: pwdForm.newPassword,
            });
            showToast('Пароль успешно обновлён ✓');
            setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка смены пароля', true);
        } finally {
            setPwdLoading(false);
        }
    }

    function handleLogout() {
        logout();
        navigate('/login');
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
                    <ChevronRight size={18} color="var(--text-muted)" />
                </button>
                <button className="service-check-item" onClick={() => navigate('/barber/services')}>
                    <div className="sci-left">
                        <Scissors size={20} color="var(--green)" />
                        <span className="sci-name">Мои услуги</span>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
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

            {/* Password Change Card */}
            <div className="card" style={{ marginBottom: 24, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16, color: 'var(--text-main)', marginBottom: 12 }}>
                    <Lock size={18} color="var(--accent)" />
                    <span>Смена личного пароля</span>
                </div>

                <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Текущий пароль (опционально)</label>
                        <input
                            type={showPwd ? 'text' : 'password'}
                            className="input"
                            placeholder="Введите текущий пароль"
                            value={pwdForm.oldPassword}
                            onChange={(e) => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                        />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Новый пароль *</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPwd ? 'text' : 'password'}
                                className="input"
                                placeholder="Минимум 4 символа"
                                required
                                value={pwdForm.newPassword}
                                onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                                style={{ paddingRight: 40 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(!showPwd)}
                                style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4
                                }}
                            >
                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Повторите новый пароль *</label>
                        <input
                            type={showPwd ? 'text' : 'password'}
                            className="input"
                            placeholder="Повторите новый пароль"
                            required
                            value={pwdForm.confirmPassword}
                            onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-outline"
                        disabled={pwdLoading || !pwdForm.newPassword}
                        style={{ height: 38, marginTop: 4, fontSize: 13 }}
                    >
                        {pwdLoading ? 'Сохранение...' : 'Обновить пароль'}
                    </button>
                </form>
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
