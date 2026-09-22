/**
 * pages/Login.jsx
 * ------------------------------------------------------------
 * Single login form for the platform owner, shop admins, and
 * barbers alike - the backend decides who's logging in from the
 * login itself, the frontend just redirects wherever /auth/login
 * says.
 * ------------------------------------------------------------
 */
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HOME_BY_ROLE = {
    superadmin: '/superadmin',
    admin: '/admin',
    barber: '/barber',
};

export default function Login() {
    const { login, isAuthenticated, role } = useAuth();
    const navigate = useNavigate();

    const [loginValue, setLoginValue] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (isAuthenticated) {
        return <Navigate to={HOME_BY_ROLE[role] || '/login'} replace />;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await login(loginValue, password);
            navigate(HOME_BY_ROLE[data.role] || '/login');
        } catch (err) {
            setError(err.response?.data?.detail || 'Ошибка входа');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-wrap">
            <div className="login-card">
                <div className="brand-icon"><Scissors size={26} strokeWidth={2.2} /></div>
                <h1>BarberPro</h1>
                <p className="hint">Войдите в свою учётную запись</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Логин</label>
                        <input
                            type="text"
                            className="form-control"
                            value={loginValue}
                            onChange={(e) => setLoginValue(e.target.value)}
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Пароль</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    <div className="error-msg">{error}</div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Вход...' : 'Войти'}
                    </button>
                </form>
            </div>
        </div>
    );
}
