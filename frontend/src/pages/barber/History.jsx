/**
 * pages/barber/History.jsx
 * ------------------------------------------------------------
 * «История» — все записи барбера.
 *
 * Новый поток оплаты:
 *   1. Барбер нажимает на строку «Выполнено» → открывается модал.
 *   2. Барбер выбирает основную УСЛУГУ из каталога магазина.
 *   3. Барбер отмечает доп. услуги (мытьё, борода, маска).
 *   4. Итог = цена_услуги + доп_услуги.
 *   5. Комиссия барбера = итог × barber_percent / 100 — показывается сразу.
 *   6. Барбер выбирает способ оплаты (телефон / наличка) → подтверждает.
 * ------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, X, Wallet, Check, Droplets, Scissors, Sparkles, Smartphone, Banknote } from 'lucide-react';
import { barberApi, barberBookingsApi } from '../../api';
import { useToast } from '../../components/Toast';
import CustomSelect from '../../components/CustomSelect';

const STATUS_LABELS = {
    pending: 'Ожидает', confirmed: 'Принято',
    done: 'Выполнено', cancelled: 'Отменено', rescheduled: 'Перенесено',
};
const STATUS_BADGE = {
    pending: 'badge-pending', confirmed: 'badge-confirmed',
    done: 'badge-done', cancelled: 'badge-cancelled', rescheduled: 'badge-rescheduled',
};

const EXTRA_SERVICES = [
    { key: 'hair_wash', icon: <Droplets size={18} />, emoji: '🧴', name: 'Мытьё головы', priceKey: 'price_hair_wash' },
    { key: 'beard',     icon: <Scissors size={18} />, emoji: '🧔', name: 'Борода',       priceKey: 'price_beard' },
    { key: 'mask',      icon: <Sparkles size={18} />, emoji: '💆', name: 'Маска',        priceKey: 'price_mask' },
];

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fmtTime(t) { return t ? t.slice(0, 5) : '—'; }
function formatMoney(n) { return n != null ? `${n.toLocaleString('ru-RU')} ₸` : '—'; }

export default function BarberHistory() {
    const showToast = useToast();
    const [history, setHistory]             = useState([]);
    const [services, setServices]           = useState([]);
    const [shopSettings, setShopSettings]   = useState({ price_hair_wash: 500, price_beard: 1000, price_mask: 800 });
    const [loading, setLoading]             = useState(true);
    const [filter, setFilter]               = useState('all');
    const [searchParams, setSearchParams]   = useSearchParams();

    // Pay modal
    const [payModal, setPayModal]             = useState(null);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [payMethod, setPayMethod]           = useState('');
    const [paying, setPaying]                 = useState(false);

    useEffect(() => {
        if (payModal) document.body.classList.add('modal-open');
        else          document.body.classList.remove('modal-open');
        return () => document.body.classList.remove('modal-open');
    }, [payModal]);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [hist, settings, svcs] = await Promise.all([
                barberApi.history(),
                barberApi.settings(),
                barberApi.services(),
            ]);
            setHistory(hist);
            setShopSettings(settings);
            setServices(svcs);
            
            // Check if we need to auto-open pay modal
            const payId = searchParams.get('pay');
            if (payId) {
                const b = hist.find(x => String(x.id) === String(payId));
                if (b && b.status === 'done' && !b.is_paid) {
                    // pre-select
                    const existingId = b.service_id ? String(b.service_id) : '';
                    setSelectedServiceId(existingId || (svcs.length > 0 ? String(svcs[0].id) : ''));
                    setSelectedExtras(b.extra_services || []);
                    setPayMethod(b.payment_method || '');
                    setPayModal(b);
                }
                // Clear the query param
                setSearchParams({}, { replace: true });
            }
        } catch {
            showToast('Ошибка загрузки истории', true);
        } finally {
            setLoading(false);
        }
    }

    function openPayModal(booking) {
        // Pre-select existing service (if already set) or first service in catalog
        const existingId = booking.service_id ? String(booking.service_id) : '';
        setSelectedServiceId(existingId || (services.length > 0 ? String(services[0].id) : ''));
        setSelectedExtras(booking.extra_services || []);
        setPayMethod(booking.payment_method || '');
        setPayModal(booking);
    }

    function closePayModal() {
        setPayModal(null);
        setSelectedExtras([]);
        setPayMethod('');
        setSelectedServiceId('');
    }

    function toggleExtra(key) {
        setSelectedExtras((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    }

    function computeTotal() {
        if (!payModal) return 0;
        // Use selected service price (or booking price if no service selected)
        const service = services.find((s) => String(s.id) === String(selectedServiceId));
        const base    = service?.price ?? payModal.price ?? 0;
        const extras  = selectedExtras.reduce((sum, key) => {
            const svc = EXTRA_SERVICES.find((s) => s.key === key);
            return sum + (svc ? (shopSettings[svc.priceKey] || 0) : 0);
        }, 0);
        return base + extras;
    }

    async function handlePay() {
        if (!payMethod) { showToast('Выберите способ оплаты', true); return; }
        if (!selectedServiceId && services.length > 0) { showToast('Выберите услугу', true); return; }
        setPaying(true);
        try {
            await barberApi.pay(payModal.id, {
                service_id:     selectedServiceId ? Number(selectedServiceId) : undefined,
                extra_services: selectedExtras,
                payment_method: payMethod,
                total_paid:     computeTotal(),
            });
            showToast('Оплата принята ✓');
            closePayModal();
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка оплаты', true);
        } finally {
            setPaying(false);
        }
    }

    function handleRowClick(b) {
        if (b.status === 'done' && !b.is_paid) openPayModal(b);
    }

    async function handleCancel(b, e) {
        e.stopPropagation();
        if (!confirm(`Отменить запись клиента ${b.client_name}?`)) return;
        try {
            await barberApi.updateBookingStatus(b.id, 'cancelled');
            showToast('Запись отменена');
            load();
        } catch (err) { showToast(err.response?.data?.detail || 'Ошибка', true); }
    }

    async function handleReschedule(b, e) {
        e.stopPropagation();
        try {
            await barberApi.updateBookingStatus(b.id, 'rescheduled');
            showToast('Запись помечена как перенесённая');
            load();
        } catch (err) { showToast(err.response?.data?.detail || 'Ошибка', true); }
    }

    const displayed = filter === 'all' ? history : history.filter((b) => b.status === filter);
    const total = computeTotal();
    const selectedService = services.find((s) => String(s.id) === String(selectedServiceId));
    const commission = payModal?.barber_percent != null
        ? Math.round(total * payModal.barber_percent / 100)
        : null;

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>История</h1>
                    <div className="subtitle">Нажмите на «Выполнено» чтобы выбрать услугу и принять оплату</div>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="tag-switch">
                {[
                    { k: 'all',       l: 'Все' },
                    { k: 'done',      l: 'Выполнено' },
                    { k: 'confirmed', l: 'Принято' },
                    { k: 'pending',   l: 'Ожидает' },
                    { k: 'cancelled', l: 'Отменено' },
                ].map(({ k, l }) => (
                    <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>{l}</button>
                ))}
            </div>

            {loading && <p className="empty-state">Загрузка...</p>}
            {!loading && displayed.length === 0 && <p className="empty-state">Записей нет</p>}

            {!loading && displayed.length > 0 && (
                <div className="history-list">
                    {displayed.map((b) => {
                        const canPay = b.status === 'done' && !b.is_paid;
                        const myEarn = b.barber_percent != null
                            ? Math.round((b.total_paid ?? b.price ?? 0) * b.barber_percent / 100)
                            : null;
                        return (
                            <div
                                key={b.id}
                                className="hcard"
                                onClick={() => handleRowClick(b)}
                                style={{ cursor: canPay ? 'pointer' : 'default' }}
                            >
                                <div className="hcard-top">
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="hcard-name">{b.client_name}</div>
                                        <div className="hcard-sub">{b.client_phone}</div>
                                        {b.service_name && <div className="hcard-service">✂️ {b.service_name}</div>}
                                        {b.extra_services?.length > 0 && (
                                            <div className="hcard-service">
                                                {b.extra_services.map((k) => EXTRA_SERVICES.find((s) => s.key === k)?.emoji || k).join(' ')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="hcard-right">
                                        <div className="hcard-amount" style={{ color: b.is_paid ? 'var(--green)' : 'var(--text-main)' }}>
                                            {formatMoney(b.total_paid ?? b.price)}
                                        </div>
                                        {myEarn != null && b.is_paid && (
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                вам: {formatMoney(myEarn)}
                                            </div>
                                        )}
                                        <div className="hcard-date">{fmtDate(b.date)} {fmtTime(b.time)}</div>
                                    </div>
                                </div>

                                <div className="hcard-bottom">
                                    <span className={`badge ${STATUS_BADGE[b.status] || ''}`}>
                                        {STATUS_LABELS[b.status] || b.status}
                                    </span>
                                    {b.is_paid && <span className="hi-paid">✓ Оплачено</span>}
                                    {canPay && (
                                        <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                                            → Нажмите для оплаты
                                        </span>
                                    )}
                                    {(b.status === 'pending' || b.status === 'confirmed') && (
                                        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                                            <button
                                                className="btn btn-sm btn-outline"
                                                style={{ fontSize: 12, padding: '4px 10px', color: 'var(--status-rescheduled)' }}
                                                onClick={(e) => handleReschedule(b, e)}
                                                title="Перенос"
                                            >
                                                <Clock size={12} /> Перенос
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline"
                                                style={{ fontSize: 12, padding: '4px 10px', color: 'var(--status-cancelled)' }}
                                                onClick={(e) => handleCancel(b, e)}
                                                title="Отмена"
                                            >
                                                <XCircle size={12} /> Отмена
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ───── Payment modal ───── */}
            {payModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closePayModal()}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <div>
                                <h2>Оплата</h2>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{payModal.client_name} · {fmtDate(payModal.date)} {fmtTime(payModal.time)}</div>
                            </div>
                            <button className="modal-close" onClick={closePayModal}><X size={20} /></button>
                        </div>

                        {/* ── Service selector ── */}
                        {services.length > 0 && (
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
                                    Выберите услугу
                                </label>
                                <CustomSelect 
                                    value={selectedServiceId}
                                    onChange={(val) => setSelectedServiceId(val)}
                                    options={[
                                        { value: '', label: '— не выбрано —' },
                                        ...services.map(s => ({ value: s.id, label: `${s.name} — ${s.price} ₸` }))
                                    ]}
                                />
                            </div>
                        )}

                        {/* ── Extra services ── */}
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
                            Дополнительные услуги:
                        </div>
                        <div className="service-checklist">
                            {EXTRA_SERVICES.map((svc) => {
                                const isSelected = selectedExtras.includes(svc.key);
                                const price = shopSettings[svc.priceKey] || 0;
                                return (
                                    <div
                                        key={svc.key}
                                        className={`service-check-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleExtra(svc.key)}
                                    >
                                        <div className="sci-left">
                                            <span className="sci-emoji">{svc.icon}</span>
                                            <span className="sci-name">{svc.name}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span className="sci-price">+{price} ₸</span>
                                            <div className="check-box">
                                                {isSelected && <Check size={14} color="#06180f" strokeWidth={3} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Total + commission ── */}
                        <div className="pay-total">{total.toLocaleString('ru-RU')} ₸</div>
                        {commission != null && (
                            <div className="pay-commission">
                                Ваш заработок ({payModal.barber_percent}%): <span>{commission.toLocaleString('ru-RU')} ₸</span>
                            </div>
                        )}

                        {/* ── Payment method ── */}
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
                            Способ оплаты
                        </div>
                        <div className="payment-method-row">
                            <button
                                type="button"
                                className={`pay-method-btn ${payMethod === 'phone' ? 'active' : ''}`}
                                onClick={() => setPayMethod('phone')}
                            >
                                <span className="pm-icon"><Smartphone size={22} /></span>
                                Kaspi
                            </button>
                            <button
                                type="button"
                                className={`pay-method-btn ${payMethod === 'cash' ? 'active' : ''}`}
                                onClick={() => setPayMethod('cash')}
                            >
                                <span className="pm-icon"><Banknote size={22} /></span>
                                Наличка
                            </button>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                onClick={handlePay}
                                disabled={paying || !payMethod}
                            >
                                {paying ? 'Обработка...' : `Принять оплату — ${total.toLocaleString('ru-RU')} ₸`}
                            </button>
                            <button className="btn btn-outline" onClick={closePayModal}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
