import { useEffect, useState } from 'react';
import { settingsApi } from '../../api';
import { useToast } from '../../components/Toast';
import { Building2, ShieldCheck, Coins, Palette, Users, Wallet, Scissors, History, LogOut, User, Save, Clock, Phone, MapPin, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminSettings() {
    const showToast = useToast();
    const navigate = useNavigate();
    const { logout, fullName } = useAuth();
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    function setTheme(theme) {
        localStorage.setItem('barberpro_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }

    useEffect(() => {
        settingsApi.get().then(setForm).catch((err) => {
            showToast(err.response?.data?.detail || 'Ошибка загрузки настроек', true);
        });
    }, []);

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await settingsApi.update(form);
            setForm(updated);
            showToast('Настройки вашего барбершопа сохранены');
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения', true);
        } finally {
            setSaving(false);
        }
    }

    if (!form) return (
        <div className="card empty-state" style={{ padding: 40 }}>
            <p>Загрузка настроек...</p>
        </div>
    );

    return (
        <div style={{ maxWidth: 640 }}>
            {/* Header */}
            <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Настройки</h1>
                    <p className="page-subtitle" style={{ marginTop: 4 }}>Вы вошли как {fullName}</p>
                </div>
                <button className="btn btn-outline" style={{ color: 'var(--status-cancelled)', borderColor: 'var(--status-cancelled)', padding: '8px 12px', minHeight: 'unset', fontSize: 13 }} onClick={handleLogout}>
                    <LogOut size={16} /> Выйти
                </button>
            </div>

            {/* Navigation Menu (Hub) */}
            <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
                <button className="service-check-item" onClick={() => navigate('/admin/history')}>
                    <div className="sci-left">
                        <History size={20} color="var(--green)" />
                        <span className="sci-name">История записей</span>
                    </div>
                </button>
                <button className="service-check-item" onClick={() => navigate('/admin/barbers')}>
                    <div className="sci-left">
                        <Users size={20} color="var(--green)" />
                        <span className="sci-name">Сотрудники (Барберы)</span>
                    </div>
                </button>
                <button className="service-check-item" onClick={() => navigate('/admin/services')}>
                    <div className="sci-left">
                        <Scissors size={20} color="var(--green)" />
                        <span className="sci-name">Услуги и Цены</span>
                    </div>
                </button>
                <button className="service-check-item" onClick={() => navigate('/admin/payments')}>
                    <div className="sci-left">
                        <Wallet size={20} color="var(--green)" />
                        <span className="sci-name">Выплаты сотрудникам</span>
                    </div>
                </button>
                <button className="service-check-item" onClick={() => navigate('/admin/clients')}>
                    <div className="sci-left">
                        <User size={20} color="var(--green)" />
                        <span className="sci-name">Клиенты</span>
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

            {/* Tenant Security Isolation Pill */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 20,
                fontSize: 13,
                color: 'var(--green)'
            }}>
                <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                <span>Безопасный доступ: данные настройки относятся исключительно к вашему барбершопу <strong>«{form.shop_name}»</strong>.</span>
            </div>

            {/* Tariff Plan Card */}
            <div className="card" style={{ marginBottom: 20, padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15 }}>
                        <Coins size={18} color="var(--green)" />
                        <span>Тариф и подписка на платформу</span>
                    </div>
                    {form.is_trial && (
                        <span className="badge" style={{ background: 'rgba(255, 193, 7, 0.15)', color: '#ffc107', border: '1px solid rgba(255, 193, 7, 0.3)', fontSize: 11, fontWeight: 700 }}>
                            🎁 Пробный период
                        </span>
                    )}
                </div>

                {(() => {
                    const daysLeft = form.plan_end ? Math.ceil((new Date(form.plan_end).setHours(23,59,59,999) - new Date().setHours(0,0,0,0)) / 86400000) : null;
                    const isActive = daysLeft !== null && daysLeft >= 0;

                    return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Текущий тариф</div>
                                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: 'var(--green)' }}>
                                    {form.plan_months === 1 ? '🎁 Пробный 1 месяц' : form.plan_months ? `${form.plan_months} мес` : 'Без тарифа'}
                                </div>
                                {form.plan_start && (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                        С {new Date(form.plan_start).toLocaleDateString('ru-RU')}
                                    </div>
                                )}
                            </div>

                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Статус подписки</div>
                                <div style={{ marginTop: 4 }}>
                                    {isActive ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <span style={{
                                                background: daysLeft <= 5 ? 'rgba(255, 193, 7, 0.15)' : 'rgba(51, 209, 122, 0.15)',
                                                color: daysLeft <= 5 ? '#ffc107' : 'var(--green)',
                                                border: `1px solid ${daysLeft <= 5 ? 'rgba(255, 193, 7, 0.3)' : 'rgba(51, 209, 122, 0.3)'}`,
                                                padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, display: 'inline-block'
                                            }}>
                                                ✓ Активен ({daysLeft} {daysLeft === 1 ? 'день' : daysLeft >= 2 && daysLeft <= 4 ? 'дня' : 'дней'})
                                            </span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                Действует до {new Date(form.plan_end).toLocaleDateString('ru-RU')}
                                            </span>
                                        </div>
                                    ) : form.plan_end ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <span style={{ background: 'rgba(240, 75, 75, 0.15)', color: 'var(--status-cancelled)', border: '1px solid rgba(240, 75, 75, 0.3)', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
                                                Истёк {Math.abs(daysLeft)} {Math.abs(daysLeft) === 1 ? 'день' : 'дн.'} назад
                                            </span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                Истёк {new Date(form.plan_end).toLocaleDateString('ru-RU')}
                                            </span>
                                        </div>
                                    ) : (
                                        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Не установлен</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Оплачено за тариф</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>
                                    {form.subscription_price ? `${form.subscription_price.toLocaleString('ru-RU')} ₸` : '0 ₸ (Пробный)'}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            <form onSubmit={handleSave} className="card" style={{ marginBottom: 16, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                        <Building2 size={18} color="var(--accent)" />
                        <span>Информация о филиале</span>
                    </div>

                    <div className="form-group" style={{ marginBottom: 14 }}>
                        <label className="field-label">Название барбершопа</label>
                        <input
                            className="input"
                            value={form.shop_name || ''}
                            onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="field-label">Телефон</label>
                            <input
                                className="input"
                                placeholder="+7 (700) 000-00-00"
                                value={form.phone || ''}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="field-label">Адрес</label>
                            <input
                                className="input"
                                placeholder="ул. Абая, 10"
                                value={form.address || ''}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                        style={{ marginTop: 16, height: 42, padding: '0 24px', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                        <Save size={16} />
                        {saving ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                </form>

                {/* Working Hours & Slots */}
                <form onSubmit={handleSave} className="card" style={{ marginBottom: 16, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                        <Clock size={18} color="var(--accent)" />
                        <span>Режим работы и слоты</span>
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <div className="form-group">
                            <label className="field-label">Открытие</label>
                            <input
                                type="time"
                                className="input"
                                value={form.work_start || '09:00'}
                                onChange={(e) => setForm({ ...form, work_start: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="field-label">Закрытие</label>
                            <input
                                type="time"
                                className="input"
                                value={form.work_end || '21:00'}
                                onChange={(e) => setForm({ ...form, work_end: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="field-label">Длительность слота (мин)</label>
                            <input
                                type="number"
                                className="input"
                                min="5"
                                step="5"
                                value={form.slot_minutes || 30}
                                onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="field-label">Валюта</label>
                            <input
                                className="input"
                                value={form.currency || '₸'}
                                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                        style={{ marginTop: 16, height: 42, padding: '0 24px', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                        <Save size={16} />
                        {saving ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                </form>
        </div>
    );
}

