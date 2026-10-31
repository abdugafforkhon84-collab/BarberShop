import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, KeyRound, Power, Trash2, X, Copy, Check, MapPin, RefreshCw, User, Phone, Coins, Settings2, Sparkles, Building2, Eye, EyeOff, Navigation, Search, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { superadminApi } from '../../api';
import { useToast } from '../../components/Toast';
import { formatDate, formatMoney } from '../../utils';
import ConfirmModal from '../../components/ConfirmModal';

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
    custom_price: '',
    parent_id: null,
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

function MapViewController({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.flyTo(center, zoom || 15, { duration: 1.2 });
        }
    }, [center, zoom, map]);
    return null;
}

export default function SuperadminTenants() {
    const showToast = useToast();
    const navigate = useNavigate();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [renewModal, setRenewModal] = useState(null); // tenant to renew
    const [renewMonths, setRenewMonths] = useState(3);
    const [renewCustomPrice, setRenewCustomPrice] = useState('');
    const [form, setForm] = useState(emptyForm);
    const [copiedId, setCopiedId] = useState(null);
    const [confirmConfig, setConfirmConfig] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);
    const searchTimeoutRef = useRef(null);

    const [tariffPrices, setTariffPrices] = useState({
        price_1_month: 0,
        price_3_months: 15000,
        price_6_months: 27000,
        price_12_months: 48000,
        tariffs: []
    });

    // Password reset modal
    const [passwordTenant, setPasswordTenant] = useState(null);
    const [newAdminPassword, setNewAdminPassword] = useState('');
    const [showAdminPassword, setShowAdminPassword] = useState(false);

    useEffect(() => {
        const open = modalOpen || !!renewModal || !!passwordTenant;
        document.body.classList.toggle('modal-open', open);
        return () => document.body.classList.remove('modal-open');
    }, [modalOpen, renewModal, passwordTenant]);

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

    // Auto-detect current geolocation via GPS/browser
    function handleAutoDetectLocation() {
        if (!navigator.geolocation) {
            showToast('Геолокация не поддерживается вашим браузером', true);
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setForm((prev) => ({ ...prev, lat, lng }));
                setIsLocating(false);
                showToast('Ваше местоположение успешно определено ✓');

                // Try reverse geocoding to fill address if empty
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                        headers: { 'Accept-Language': 'ru' }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.display_name) {
                            // Extract cleaner street address if available
                            const addr = data.address;
                            const road = addr?.road || addr?.pedestrian || addr?.street || '';
                            const houseNumber = addr?.house_number || '';
                            const city = addr?.city || addr?.town || addr?.village || '';
                            const cleanAddress = road ? `${road}${houseNumber ? ', ' + houseNumber : ''}${city ? ', ' + city : ''}` : data.display_name;
                            
                            setForm((prev) => ({
                                ...prev,
                                address: prev.address ? prev.address : cleanAddress
                            }));
                        }
                    }
                } catch (e) {
                    // Ignore reverse geocoding error
                }
            },
            (error) => {
                setIsLocating(false);
                let msg = 'Не удалось определить местоположение';
                if (error.code === 1) msg = 'Доступ к геолокации запрещен в браузере';
                else if (error.code === 2) msg = 'Геолокация недоступна';
                else if (error.code === 3) msg = 'Превышено время ожидания геолокации';
                showToast(msg, true);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }

    // Search address and set map location
    async function searchAddress(query) {
        if (!query || query.trim().length < 3) return;
        setIsSearchingAddress(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=1`, {
                headers: { 'Accept-Language': 'ru' }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    setForm((prev) => ({ ...prev, lat, lng }));
                    showToast('Местоположение по адресу найдено ✓');
                } else {
                    showToast('Адрес не найден на карте', true);
                }
            }
        } catch (e) {
            showToast('Ошибка поиска адреса', true);
        } finally {
            setIsSearchingAddress(false);
        }
    }

    function handleAddressChange(e) {
        const val = e.target.value;
        setForm((prev) => ({ ...prev, address: val }));

        // Debounced search when user stops typing
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (val.trim().length >= 4) {
            searchTimeoutRef.current = setTimeout(() => {
                searchAddress(val);
            }, 1000);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        try {
            await superadminApi.create({
                ...form,
                plan_months: form.plan_months ? Number(form.plan_months) : undefined,
                custom_price: form.custom_price === '' ? null : Number(form.custom_price),
            });
            showToast('Барбершоп успешно добавлен');
            closeModal();
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения', true);
        }
    }

    async function toggleActive(t) {
        await superadminApi.update(t.id, { is_active: !t.is_active });
        showToast(t.is_active ? 'Барбершоп отключён' : 'Барбершоп включён');
        load();
    }

    function resetPassword(t) {
        setPasswordTenant(t);
        setNewAdminPassword(randomPassword());
        setShowAdminPassword(true);
    }

    async function handleSaveAdminPassword(e) {
        e.preventDefault();
        if (!newAdminPassword || newAdminPassword.length < 4) {
            showToast('Пароль должен быть не менее 4 символов', true);
            return;
        }
        try {
            await superadminApi.update(passwordTenant.id, { admin_password: newAdminPassword });
            showToast('Пароль администратора обновлён ✓');
            setPasswordTenant(null);
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка обновления пароля', true);
        }
    }

    function remove(t) {
        setConfirmConfig({
            title: 'Удаление барбершопа',
            text: `Полностью удалить барбершоп «${t.shop_name}»?\nЭто необратимо удалит всю его базу данных.`,
            danger: true,
            confirmText: 'Удалить',
            action: async () => {
                try {
                    await superadminApi.remove(t.id);
                    showToast('Барбершоп удалён');
                    load();
                } catch (err) {
                    showToast('Ошибка удаления', true);
                }
            }
        });
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
            await superadminApi.renew(renewModal.id, { 
                plan_months: Number(renewMonths), 
                custom_price: renewCustomPrice === '' ? null : Number(renewCustomPrice) 
            });
            showToast('Тариф продлён ✓');
            setRenewModal(null);
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка продления', true);
        }
    }

    function getTariffPriceDisplay(months) {
        const m = Number(months);
        if (tariffPrices?.tariffs && tariffPrices.tariffs.length > 0) {
            const match = tariffPrices.tariffs.find(t => t.months === m);
            if (match) {
                return match.price === 0 ? 'Бесплатно (Пробный)' : formatMoney(match.price);
            }
        }
        if (m === 1) return tariffPrices.price_1_month > 0 ? formatMoney(tariffPrices.price_1_month) : 'Бесплатно (Пробный)';
        if (m === 3) return formatMoney(tariffPrices.price_3_months);
        if (m === 6) return formatMoney(tariffPrices.price_6_months);
        if (m === 12) return formatMoney(tariffPrices.price_12_months);
        return '— (Укажите свою цену)';
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
                        onClick={() => navigate('/superadmin/tariffs')}
                    >
                        <Settings2 size={16} /> Настроить тарифы
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
                                        {t.plan_months === 1 ? 'Пробный 1 мес' : t.plan_months ? `${t.plan_months} мес` : 'Без тарифа'}
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
                                {!t.parent_id && (
                                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--green)', borderColor: 'var(--green)' }} onClick={() => {
                                        setForm({...emptyForm, parent_id: t.id});
                                        setModalOpen(true);
                                    }}><Plus size={14} /> Филиал</button>
                                )}
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

            {/* Create modal */}
            {modalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                    <div className="modal-box" style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: 'rgba(var(--green-rgb, 74, 222, 128), 0.12)',
                                    border: '1px solid rgba(var(--green-rgb, 74, 222, 128), 0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--green)', flexShrink: 0
                                }}>
                                    <Building2 size={22} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 18 }}>{form.parent_id ? "Новый филиал" : "Новый барбершоп"}</h2>
                                    <div className="modal-subtitle">Регистрация точки и учетной записи администратора</div>
                                </div>
                            </div>
                            <button className="modal-close" onClick={closeModal}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            {/* Shop name */}
                            <div className="form-group">
                                <label>{form.parent_id ? "Название филиала *" : "Название барбершопа *"}</label>
                                <input className="form-control" value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} required />
                            </div>

                            {/* Owner info */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>ФИО владельца</label>
                                    <input className="form-control" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Телефон</label>
                                    <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                                </div>
                            </div>

                            {/* Address with Auto-search */}
                            <div className="form-group">
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Адрес</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>поиск по адресу обновляет точку на карте</span>
                                </label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <input
                                            className="form-control"
                                            value={form.address}
                                            onChange={handleAddressChange}
                                            placeholder="Введите город, улицу, дом (напр. Алматы, Абая 50)"
                                            style={{ paddingRight: isSearchingAddress ? 36 : 12 }}
                                        />
                                        {isSearchingAddress && (
                                            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--green)' }}>
                                                <Loader2 size={16} className="spin" />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => searchAddress(form.address)}
                                        disabled={isSearchingAddress || !form.address || form.address.trim().length < 3}
                                        style={{ height: 42, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, flexShrink: 0 }}
                                        title="Найти указанный адрес на карте"
                                    >
                                        <Search size={14} /> Найти
                                    </button>
                                </div>
                            </div>

                            {/* Map with GPS auto-locate button */}
                            <div className="form-group">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                                        <MapPin size={14} color="var(--green)" />
                                        <span>Местоположение на карте</span>
                                        {form.lat && <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 600 }}> — точка выбрана ✓</span>}
                                    </label>
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        onClick={handleAutoDetectLocation}
                                        disabled={isLocating}
                                        style={{
                                            height: 28,
                                            padding: '0 10px',
                                            fontSize: 11,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            borderRadius: 999,
                                            background: 'rgba(var(--green-rgb, 74, 222, 128), 0.08)',
                                            borderColor: 'rgba(var(--green-rgb, 74, 222, 128), 0.3)',
                                            color: 'var(--green)',
                                            fontWeight: 600
                                        }}
                                    >
                                        {isLocating ? <Loader2 size={12} className="spin" /> : <Navigation size={12} />}
                                        {isLocating ? 'Определение...' : 'Моё местоположение'}
                                    </button>
                                </div>
                                <div className="map-container" style={{ position: 'relative' }}>
                                    <MapContainer
                                        center={form.lat ? [form.lat, form.lng] : DEFAULT_CENTER}
                                        zoom={form.lat ? 15 : 13}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <MapClickHandler onLocationSelect={handleLocationSelect} />
                                        {form.lat && <MapViewController center={[form.lat, form.lng]} zoom={15} />}
                                        {form.lat && <Marker position={[form.lat, form.lng]} />}
                                    </MapContainer>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Нажмите на карту или используйте поиск адреса / кнопку «Моё местоположение»</span>
                                    {form.lat && (
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Admin credentials */}
                            {!form.parent_id && (
                                <>
                                    <div className="form-group">
                                        <label>Логин администратора *</label>
                                        <input className="form-control" value={form.admin_login} onChange={(e) => setForm({ ...form, admin_login: e.target.value })} required minLength={3} />
                                    </div>
                                    <div className="form-group">
                                        <label>Пароль администратора *</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input className="form-control" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} required minLength={4} />
                                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, admin_password: randomPassword() })}>Сгенерировать</button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Subscription plan */}
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Срок подписки</span>
                                    <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                                        {getTariffPriceDisplay(Number(form.plan_months))}
                                    </span>
                                </label>
                                {tariffPrices?.tariffs && tariffPrices.tariffs.length > 0 && (
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                                        {tariffPrices.tariffs.map((tar) => (
                                            <button
                                                key={tar.months}
                                                type="button"
                                                className={`btn btn-sm ${Number(form.plan_months) === tar.months ? 'btn-primary' : 'btn-outline'}`}
                                                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999 }}
                                                onClick={() => setForm({ ...form, plan_months: tar.months, custom_price: '' })}
                                            >
                                                {tar.name || `${tar.months} мес`} {tar.price === 0 ? '(0 ₸)' : `(${formatMoney(tar.price)})`}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="form-row">
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={form.plan_months}
                                            onChange={(e) => setForm({ ...form, plan_months: e.target.value })}
                                            min="1"
                                            max="12"
                                            placeholder="Срок (мес)"
                                            required
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={form.custom_price}
                                            onChange={(e) => setForm({ ...form, custom_price: e.target.value })}
                                            min="0"
                                            placeholder="Своя цена (₸) — опционально"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions" style={{ marginTop: 20 }}>
                                <button type="submit" className="btn btn-primary">{form.parent_id ? "Создать филиал" : "Создать барбершоп"}</button>
                                <button type="button" className="btn btn-outline" onClick={closeModal}>Отмена</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Renew modal */}
            {renewModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRenewModal(null)}>
                    <div className="modal-box" style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: 'rgba(var(--green-rgb, 74, 222, 128), 0.12)',
                                    border: '1px solid rgba(var(--green-rgb, 74, 222, 128), 0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--green)', flexShrink: 0
                                }}>
                                    <RefreshCw size={22} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 18 }}>Продлить тариф</h2>
                                    <div className="modal-subtitle">Подписка: {renewModal.shop_name}</div>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setRenewModal(null)}><X size={18} /></button>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{renewModal.shop_name}</div>
                            {renewModal.plan_end && (
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Текущий тариф действует до: {formatDate(renewModal.plan_end)}
                                </div>
                            )}
                        </div>

                        {tariffPrices?.tariffs && tariffPrices.tariffs.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                    Выберите тариф для продления:
                                </label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {tariffPrices.tariffs.map((tar) => (
                                        <button
                                            key={tar.months}
                                            type="button"
                                            className={`btn btn-sm ${Number(renewMonths) === tar.months ? 'btn-primary' : 'btn-outline'}`}
                                            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999 }}
                                            onClick={() => { setRenewMonths(tar.months); setRenewCustomPrice(''); }}
                                        >
                                            {tar.name || `${tar.months} мес`} {tar.price === 0 ? '(0 ₸)' : `(${formatMoney(tar.price)})`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label>Срок продления (мес)</label>
                                <input type="number" className="form-control" value={renewMonths} onChange={(e) => setRenewMonths(e.target.value)} min="1" max="12" required />
                            </div>
                            <div className="form-group">
                                <label>Своя цена (₸) — опционально</label>
                                <input type="number" className="form-control" value={renewCustomPrice} onChange={(e) => setRenewCustomPrice(e.target.value)} min="0" placeholder="По умолчанию" />
                            </div>
                        </div>

                        <div style={{ background: 'var(--bg-panel)', padding: 14, borderRadius: 12, fontSize: 13, marginBottom: 16, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span>Стоимость по тарифу ({renewMonths} мес):</span>
                                <strong style={{ color: 'var(--text-muted)' }}>{getTariffPriceDisplay(Number(renewMonths))}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Итого к оплате:</span>
                                <strong style={{ color: 'var(--green)', fontSize: 17 }}>
                                    {renewCustomPrice !== '' ? formatMoney(Number(renewCustomPrice)) : getTariffPriceDisplay(Number(renewMonths))}
                                </strong>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRenew}>
                                <RefreshCw size={16} /> Продлить на {renewMonths} мес
                            </button>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setRenewModal(null); setRenewCustomPrice(''); }}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Reset Modal */}
            {passwordTenant && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setPasswordTenant(null)}>
                    <div className="modal-box" style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: 'rgba(var(--green-rgb, 74, 222, 128), 0.12)',
                                    border: '1px solid rgba(var(--green-rgb, 74, 222, 128), 0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--green)', flexShrink: 0
                                }}>
                                    <KeyRound size={22} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 18 }}>Смена пароля</h2>
                                    <div className="modal-subtitle">
                                        Барбершоп: {passwordTenant.shop_name}
                                    </div>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setPasswordTenant(null)}><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSaveAdminPassword}>
                            <div className="form-group">
                                <label>Логин администратора</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={passwordTenant.admin_login}
                                    disabled
                                    style={{ opacity: 0.7 }}
                                />
                            </div>

                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <label style={{ margin: 0 }}>Новый пароль</label>
                                    <button
                                        type="button"
                                        onClick={() => setNewAdminPassword(randomPassword())}
                                        style={{
                                            background: 'none', border: 'none', color: 'var(--green)',
                                            cursor: 'pointer', fontSize: 12, display: 'inline-flex',
                                            alignItems: 'center', gap: 4, padding: 0
                                        }}
                                    >
                                        <RefreshCw size={12} /> Сгенерировать
                                    </button>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showAdminPassword ? 'text' : 'password'}
                                        className="form-control"
                                        value={newAdminPassword}
                                        onChange={(e) => setNewAdminPassword(e.target.value)}
                                        placeholder="Минимум 4 символа"
                                        required
                                        style={{ paddingRight: 40 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                                        style={{
                                            position: 'absolute', right: 10, top: '50%',
                                            transform: 'translateY(-50%)', background: 'none',
                                            border: 'none', color: 'var(--text-muted)',
                                            cursor: 'pointer', padding: 4
                                        }}
                                    >
                                        {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    Сохранить пароль
                                </button>
                                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setPasswordTenant(null)}>
                                    Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmConfig && (
                <ConfirmModal
                    title={confirmConfig.title}
                    text={confirmConfig.text}
                    danger={confirmConfig.danger}
                    confirmText={confirmConfig.confirmText}
                    onConfirm={() => {
                        confirmConfig.action();
                        setConfirmConfig(null);
                    }}
                    onCancel={() => setConfirmConfig(null)}
                />
            )}
        </div>
    );
}

