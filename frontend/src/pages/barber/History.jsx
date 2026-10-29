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
import ConfirmModal from '../../components/ConfirmModal';
import PaymentModal from '../../components/PaymentModal';

const STATUS_LABELS = {
    pending: 'Ожидает', confirmed: 'Принято',
    done: 'Выполнено', cancelled: 'Отменено', rescheduled: 'Перенесено',
};
const STATUS_BADGE = {
    pending: 'badge-pending', confirmed: 'badge-confirmed',
    done: 'badge-done', cancelled: 'badge-cancelled', rescheduled: 'badge-rescheduled',
};

const EXTRA_SERVICES = [
    { key: 'hair_wash', icon: Droplets, name: 'Мытьё головы', priceKey: 'price_hair_wash' },
    { key: 'beard',     icon: Scissors, name: 'Борода',        priceKey: 'price_beard' },
    { key: 'mask',      icon: Sparkles, name: 'Маска',         priceKey: 'price_mask' },
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
    const [cancelBooking, setCancelBooking]   = useState(null);
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

    function handleCancel(b, e) {
        e.stopPropagation();
        setCancelBooking(b);
    }

    async function executeCancel() {
        if (!cancelBooking) return;
        try {
            await barberApi.updateBookingStatus(cancelBooking.id, 'cancelled');
            showToast('Запись отменена');
            setCancelBooking(null);
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
                                        {b.service_name && <div className="hcard-service" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Scissors size={12} color="var(--text-muted)" /> {b.service_name}</div>}
                                        {b.extra_services?.length > 0 && (
                                            <div className="hcard-service" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                                                {b.extra_services.map((k) => {
                                                    const svc = EXTRA_SERVICES.find((s) => s.key === k);
                                                    const Icon = svc?.icon;
                                                    return Icon ? <Icon key={k} size={13} color="var(--text-muted)" title={svc.name} /> : <span key={k}>{k}</span>;
                                                })}
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
                <PaymentModal
                    booking={payModal}
                    role="barber"
                    onClose={() => setPayModal(null)}
                    onSuccess={() => {
                        setPayModal(null);
                        load();
                    }}
                />
            )}

            {/* Confirm Cancel Modal */}
            {cancelBooking && (
                <ConfirmModal
                    title="Отмена записи"
                    text={`Вы действительно хотите отменить запись клиента «${cancelBooking.client_name}»?`}
                    confirmText="Отменить запись"
                    danger={true}
                    onConfirm={executeCancel}
                    onCancel={() => setCancelBooking(null)}
                />
            )}
        </>
    );
}
