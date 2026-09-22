import { useEffect, useState } from 'react';
import { Plus, KeyRound, Power, Trash2, X, Copy, Check, MapPin, RefreshCw, User, Phone, Coins, Settings2, Sparkles } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { superadminApi } from '../../api';
import { useToast } from '../../components/Toast';
import { formatDate, formatMoney } from '../../utils';

// Fix leaflet default marker icon path issue in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const emptyForm = {
    shop_name: '',
    admin_login: '',
    admin_password: '',
    owner_name: '',
    phone: '',
    address: '',
    lat: null,
    lng: null,
    plan_months: 1, // Default to 1-month trial
};

function randomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

function planLabel(months) {
    if (months === 1) return '1 мес (Пробный)';
    if (months === 3) return '3 мес';
    if (months === 6) return '6 мес';
    if (months === 12) return '12 мес';
    return `${months} мес`;
}

function getPlanStatus(t) {
    if (!t.plan_end) return 'none';
    const end = new Date(t.plan_end);
    return end >= new Date() ? 'active' : 'expired';
}

function MapClickHandler({ onLocationSelect }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function SuperadminTenants() {
    const showToast = useToast();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [renewModal, setRenewModal] = useState(null); // tenant to renew
    const [renewMonths, setRenewMonths] = useState(3);
    const [form, setForm] = useState(emptyForm);
    const [copiedId, setCopiedId] = useState(null);

    // Tariff Prices Settings Modal
    const [tariffModalOpen, setTariffModalOpen] = useState(false);
    const [tariffPrices, setTariffPrices] = useState({
        price_1_month: 0,
        price_3_months: 15000,
        price_6_months: 27000,
        price_12_months: 48000,
    });
    const [savingTariffs, setSavingTariffs] = useState(false);

    useEffect(() => {
        const open = modalOpen || !!renewModal || tariffModalOpen;
        document.body.classList.toggle('modal-open', open);
        return () => document.body.classList.remove('modal-open');
    }, [modalOpen, renewModal, tariffModalOpen]);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [tenantsData, pricesData] = await Promise.all([
                superadminApi.list(),
                superadminApi.getTariffSettings(),
            ]);
            setTenants(tenantsData || []);
            if (pricesData) setTariffPrices(pricesData);
        } catch (e) {
            showToast('Ошибка загрузки данных', true);
        } finally {
            setLoading(false);
        }
    }

    function openCreate() {
        setForm({ ...emptyForm, plan_months: 1, admin_password: randomPassword() });
        setModalOpen(true);
    }

    function closeModal() { setModalOpen(false); }

    function handleLocationSelect(lat, lng) {
        setForm((f) => ({ ...f, lat, lng }));
    }

    async function handleSave(e) {
        e.preventDefault();
        try {
            await superadminApi.create({
                ...form,
                plan_months: form.plan_months || undefined,
            });
            showToast('Барбершоп успешно добавлен');
            closeModal();
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения', true);
        }
    }

    async function handleSaveTariffs(e) {
        e.preventDefault();
        setSavingTariffs(true);
        try {
            const updated = await superadminApi.updateTariffSettings(tariffPrices);
            setTariffPrices(updated);
            showToast('Цены на тарифы сохранены ✓');
            setTariffModalOpen(false);
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения цен', true);
        } finally {
            setSavingTariffs(false);
        }
    }

    async function toggleActive(t) {
        await superadminApi.update(t.id, { is_active: !t.is_active });
        showToast(t.is_active ? 'Барбершоп отключён' : 'Барбершоп включён');
        load();
    }

    async function resetPassword(t) {
        let newPassword = prompt(`Укажите новый пароль для барбершопа «${t.shop_name}»:\n\nЕсли оставить пустым, будет сгенерирован случайный пароль.`);
        if (newPassword === null) return; // cancel
        if (newPassword.trim() === '') {
            newPassword = randomPassword();
            alert(`Сгенерирован новый пароль: ${newPassword}\n\nОбязательно скопируйте и сохраните его!`);
        }
        await superadminApi.update(t.id, { admin_password: newPassword });
        showToast('Пароль обновлён');
    }

    async function remove(t) {
        if (!confirm(`Полностью удалить барбершоп «${t.shop_name}»?\n\nЭто необратимо удалит всю его базу данных.`)) return;
        await superadminApi.remove(t.id);
        showToast('Барбершоп удалён');
        load();
    }

    function copyCreds(t) {
        const text = `Логин: ${t.admin_login}`;
        navigator.clipboard?.writeText(text);
        setCopiedId(t.id);
        setTimeout(() => setCopiedId(null), 1500);
    }

    async function handleRenew() {
        if (!renewModal) return;
        try {
            await superadminApi.renew(renewModal.id, { plan_months: renewMonths });
            showToast('Тариф продлён ✓');
            setRenewModal(null);
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка продления', true);
        }
    }

    function getTariffPriceDisplay(months) {
        if (months === 1) return tariffPrices.price_1_month > 0 ? formatMoney(tariffPrices.price_1_month) : 'Бесплатно (Пробный)';
        if (months === 3) return formatMoney(tariffPrices.price_3_months);
        if (months === 6) return formatMoney(tariffPrices.price_6_months);
        if (months === 12) return formatMoney(tariffPrices.price_12_months);
        return '—';
    }

    const DEFAULT_CENTER = [43.238949, 76.889709]; // Almaty

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Барбершопы на платформе</h1>
                    <div className="subtitle" style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
                        Управление локациями, тарифами подписки и пробными периодами
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ height: 42, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8 }}
                        onClick={() => setTariffModalOpen(true)}
                    >
                        <Settings2 size={16} /> Настроить цены тарифов
                    </button>
                    <button className="btn btn-primary" style={{ height: 42 }} onClick={openCreate}>
                        <Plus size={16} /> Добавить барбершоп
                    </button>
                </div>
            </div>

            {loading && <p className="empty-state">Загрузка барбершопов...</p>}
            {!loading && tenants.length === 0 && <p className="empty-state">Барбершопов пока нет — добавьте первый</p>}

            {/* Tenant Cards Grid */}
            <div className="grid grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 16 }}>
                {tenants.map((t) => {
                    const planStatus = getPlanStatus(t);
                    return (
                        <div className="card" key={t.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                                <h3 style={{ flex: 1, fontSize: 17, fontWeight: 700, margin: 0 }}>{t.shop_name}</h3>
                                <span className={`badge ${t.is_active ? 'badge-done' : 'badge-cancelled'}`} style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                                    {t.is_active ? 'Активен' : 'Отключён'}
                                </span>
                            </div>

                            {t.owner_name && (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <User size={13} /> {t.owner_name}
                                </div>
                            )}
                            {t.phone && (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Phone size={13} /> {t.phone}
                                </div>
                            )}
                            {t.address && (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                    <MapPin size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                                    <span>{t.address}</span>
                                </div>
                            )}

                            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Логин администратора:</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <code style={{ background: 'var(--bg-panel)', padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>{t.admin_login}</code>
                                <button className="btn btn-icon" style={{ padding: 4, minHeight: 32, minWidth: 32 }} onClick={() => copyCreds(t)} title="Скопировать логин">
                                    {copiedId === t.id ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                                </button>
                            </div>

                            {/* Subscription Plan & Payment Info */}
                            <div style={{ background: 'var(--bg-panel)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Coins size={14} color="var(--green)" />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Тариф:</span>
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                                        {t.plan_months === 1 ? '🎁 Пробный 1 мес' : t.plan_months ? `${t.plan_months} мес` : 'Без тарифа'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Начало:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                        {t.plan_start ? formatDate(t.plan_start) : '—'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Окончание:</span>
                                    <span style={{ fontWeight: 600, color: planStatus === 'active' ? 'var(--text-main)' : 'var(--status-cancelled)' }}>
                                        {t.plan_end ? (planStatus === 'active' ? formatDate(t.plan_end) : `истёк ${formatDate(t.plan_end)}`) : '—'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Оплачено:</span>
                                    <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                                        {t.subscription_price ? `${t.subscription_price.toLocaleString('ru-RU')} ₸` : '0 ₸ (Пробный)'}
                                    </span>
                                </div>
                            </div>

                            <div style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 14 }}>
                                Добавлен {formatDate(t.created_at?.slice(0, 10))}
                            </div>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button className="btn btn-sm btn-outline" onClick={() => resetPassword(t)}><KeyRound size={14} /> Пароль</button>
                                <button className="btn btn-sm btn-outline" onClick={() => toggleActive(t)}><Power size={14} /> {t.is_active ? 'Отключить' : 'Включить'}</button>
                                <button className="btn btn-sm btn-warning" onClick={() => { setRenewMonths(3); setRenewModal(t); }}>
                                    <RefreshCw size={14} /> Продлить
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => remove(t)}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tariff Prices Modal */}
            {tariffModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <div>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17 }}>
                                    <Coins size={20} color="var(--green)" />
                                    Цены на тарифы подписки
                                </h2>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Укажите стоимость для разных периодов подписки
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setTariffModalOpen(false)}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSaveTariffs}>
                            <div className="form-group">
                                <label>1 месяц (Пробный период 🎁)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={tariffPrices.price_1_month}
                                    onChange={(e) => setTariffPrices({ ...tariffPrices, price_1_month: Number(e.target.value) })}
                                    min="0"
                                    placeholder="0 для бесплатного пробного месяца"
                                />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Укажите 0 ₸ чтобы предоставить 1 месяц как бесплатный пробный тариф
                                </div>
                            </div>

                            <div className="form-group">
                                <label>3 месяца (₸)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={tariffPrices.price_3_months}
                                    onChange={(e) => setTariffPrices({ ...tariffPrices, price_3_months: Number(e.target.value) })}
                                    min="0"
                                />
                            </div>

                            <div className="form-group">
                                <label>6 месяцев (₸)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={tariffPrices.price_6_months}
                                    onChange={(e) => setTariffPrices({ ...tariffPrices, price_6_months: Number(e.target.value) })}
                                    min="0"
                                />
                            </div>

                            <div className="form-group">
                                <label>12 месяцев (1 год) (₸)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={tariffPrices.price_12_months}
                                    onChange={(e) => setTariffPrices({ ...tariffPrices, price_12_months: Number(e.target.value) })}
                                    min="0"
                                />
                            </div>

                            <div className="modal-actions" style={{ marginTop: 20 }}>
                                <button type="submit" className="btn btn-primary" disabled={savingTariffs}>
                                    {savingTariffs ? 'Сохранение...' : 'Сохранить цены'}
                                </button>
                                <button type="button" className="btn btn-outline" onClick={() => setTariffModalOpen(false)}>Отмена</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create modal */}
            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h2>Новый барбершоп</h2>
                            <button className="modal-close" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            {/* Shop name */}
                            <div className="form-group">
                                <label>Название барбершопа *</label>
                                <input className="form-control" value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} required placeholder="Например: Salon Almaty" />
                            </div>

                            {/* Owner info */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>ФИО владельца</label>
                                    <input className="form-control" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} placeholder="Иванов Иван Иванович" />
                                </div>
                                <div className="form-group">
                                    <label>Телефон</label>
                                    <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 777 000 00 00" />
                                </div>
                            </div>

                            {/* Address */}
                            <div className="form-group">
                                <label>Адрес</label>
                                <input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="ул. Абая 1, Алматы" />
                            </div>

                            {/* Map */}
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <MapPin size={14} /> Местоположение на карте
                                    {form.lat && <span style={{ color: 'var(--green)', fontSize: 12 }}> — точка выбрана ✓</span>}
                                </label>
                                <div className="map-container">
                                    <MapContainer
                                        center={form.lat ? [form.lat, form.lng] : DEFAULT_CENTER}
                                        zoom={13}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <MapClickHandler onLocationSelect={handleLocationSelect} />
                                        {form.lat && <Marker position={[form.lat, form.lng]} />}
                                    </MapContainer>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                                    Нажмите на карту, чтобы выбрать местоположение барбершопа
                                </div>
                            </div>

                            {/* Admin credentials */}
                            <div className="form-group">
                                <label>Логин администратора *</label>
                                <input className="form-control" value={form.admin_login} onChange={(e) => setForm({ ...form, admin_login: e.target.value })} required minLength={3} placeholder="Например: almaty_admin" />
                            </div>
                            <div className="form-group">
                                <label>Пароль администратора *</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input className="form-control" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} required minLength={4} />
                                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, admin_password: randomPassword() })}>Сгенерировать</button>
                                </div>
                            </div>

                            {/* Subscription plan */}
                            <div className="form-group">
                                <label>Тарифный план подписки</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                    {[1, 3, 6, 12].map((m) => (
                                        <div
                                            key={m}
                                            onClick={() => setForm({ ...form, plan_months: m })}
                                            style={{
                                                padding: '10px 6px',
                                                borderRadius: 10,
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                border: form.plan_months === m ? '2px solid var(--green)' : '1px solid var(--border)',
                                                background: form.plan_months === m ? 'rgba(51, 209, 122, 0.1)' : 'var(--bg-panel)',
                                            }}
                                        >
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{m} {m === 1 ? 'мес (🎁)' : 'мес'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>{getTariffPriceDisplay(m)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-actions" style={{ marginTop: 20 }}>
                                <button type="submit" className="btn btn-primary">Создать барбершоп</button>
                                <button type="button" className="btn btn-outline" onClick={closeModal}>Отмена</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Renew modal */}
            {renewModal && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h2>Продлить тариф подписки</h2>
                            <button className="modal-close" onClick={() => setRenewModal(null)}><X size={20} /></button>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{renewModal.shop_name}</div>
                            {renewModal.plan_end && (
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Текущий тариф до: {formatDate(renewModal.plan_end)}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Выберите срок продления</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                                {[1, 3, 6, 12].map((m) => (
                                    <div
                                        key={m}
                                        onClick={() => setRenewMonths(m)}
                                        style={{
                                            padding: '10px 6px',
                                            borderRadius: 10,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            border: renewMonths === m ? '2px solid var(--green)' : '1px solid var(--border)',
                                            background: renewMonths === m ? 'rgba(51, 209, 122, 0.1)' : 'var(--bg-panel)',
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{m} {m === 1 ? 'мес (🎁)' : 'мес'}</div>
                                        <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>{getTariffPriceDisplay(m)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ background: 'var(--bg-panel)', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>Стоимость продления:</span>
                                <strong style={{ color: 'var(--green)' }}>{getTariffPriceDisplay(renewMonths)}</strong>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={handleRenew}>
                                <RefreshCw size={16} /> Продлить на {renewMonths} мес
                            </button>
                            <button className="btn btn-outline" onClick={() => setRenewModal(null)}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

