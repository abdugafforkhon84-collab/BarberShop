import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Scissors, User, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HOME_BY_ROLE = {
    superadmin: '/superadmin',
    admin: '/admin',
    barber: '/barber',
};

export default function Login() {
    const { login, isAuthenticated, role, shopTheme } = useAuth();
    const navigate = useNavigate();

    const [loginValue, setLoginValue] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('barberpro_theme') || shopTheme || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
    }, [shopTheme]);

    if (isAuthenticated) {
        return <Navigate to={HOME_BY_ROLE[role] || '/login'} replace />;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await login(loginValue.trim(), password);
            navigate(HOME_BY_ROLE[data.role] || '/login');
        } catch (err) {
            setError(err.response?.data?.detail || 'Неверный логин или пароль');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-wrap" style={{ position: 'relative' }}>
            <div className="login-card" style={{ maxWidth: 400 }}>
                {/* Brand Badge */}
                <div className="brand-icon" style={{
                    boxShadow: '0 8px 24px var(--green-glow)',
                    background: 'var(--green)'
                }}>
                    <Scissors size={28} strokeWidth={2.4} />
                </div>

                <h1 style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>BarberPro</h1>
                <p className="hint" style={{ fontSize: 13, marginTop: 4, marginBottom: 24 }}>
                    Система управления барбершопами и салонами
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <User size={13} color="var(--green)" />
                            <span>Логин</span>
                        </label>
                        <input
                            type="text"
                            className="input"
                            value={loginValue}
                            onChange={(e) => setLoginValue(e.target.value)}
                            autoComplete="username"
                            placeholder="Введите ваш логин"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Lock size={13} color="var(--green)" />
                            <span>Пароль</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="input"
                                style={{ paddingRight: 40 }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: 10,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: 4
                                }}
                                title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: 'var(--status-cancelled)',
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 16,
                            animation: 'fadeUp 0.2s ease'
                        }}>
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ width: '100%', minHeight: 44, fontSize: 14, fontWeight: 700, borderRadius: 10 }} 
                        disabled={loading}
                    >
                        {loading ? 'Проверка данных...' : 'Войти в систему'}
                    </button>
                </form>

                {/* Footer security badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 24,
                    fontSize: 11,
                    color: 'var(--text-dim)'
                }}>
                    <ShieldCheck size={14} color="var(--green)" />
                    <span>Мультиарендная защита данных (Multi-tenant)</span>
                </div>
            </div>
        </div>
    );
}
