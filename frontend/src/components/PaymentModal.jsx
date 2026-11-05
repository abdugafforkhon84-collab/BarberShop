import { useState, useEffect, useMemo } from 'react';
import { 
    Wallet, 
    Check, 
    X, 
    Scissors, 
    Sparkles, 
    Droplets, 
    CreditCard, 
    RotateCcw,
    Clock,
    User,
    Copy,
    Smartphone,
    Banknote,
    Smile,
    Flame,
    Coffee,
    Wind,
    Zap,
    Crown,
    Heart,
    Shield,
    Star,
    Award,
    CheckCircle2
} from 'lucide-react';
import { servicesApi, sharedSettingsApi, adminBookingsApi, barberApi } from '../api';
import { formatMoney, formatDate } from '../utils';
import { useToast } from './Toast';

const ICON_MAP = {
    Droplets,
    Sparkles,
    Smile,
    Flame,
    Scissors,
    Coffee,
    Wind,
    Zap,
    Crown,
    Heart,
    Shield,
    Star,
    Award,
    CheckCircle2
};

function getExtrasFromSettings(st) {
    if (st && st.extra_services_json) {
        try {
            const parsed = JSON.parse(st.extra_services_json);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((item, idx) => ({
                    key: item.id || `extra_${idx}`,
                    label: item.name,
                    icon: item.icon || 'Sparkles',
                    price: Number(item.price) || 0
                }));
            }
        } catch (_) {}
    }
    return [
        { key: 'extra_wash', label: 'Мытьё', icon: 'Droplets', price: st?.price_hair_wash ?? 500 },
        { key: 'extra_beard', label: 'Борода', icon: 'Scissors', price: st?.price_beard ?? 1000 },
        { key: 'extra_mask', label: 'Маска', icon: 'Smile', price: st?.price_mask ?? 800 },
    ];
}

export default function PaymentModal({ booking, onClose, onSuccess, role = 'admin' }) {
    const showToast = useToast();
    const [services, setServices] = useState([]);
    const [settings, setSettings] = useState({});
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [payMethod, setPayMethod] = useState('cash'); // 'cash' | 'kaspi' | 'card'
    const [amount, setAmount] = useState(0);
    const [isCustomAmount, setIsCustomAmount] = useState(false);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);

    const extrasList = useMemo(() => getExtrasFromSettings(settings), [settings]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [srvs, st] = await Promise.all([
                servicesApi.list(),
                sharedSettingsApi.get().catch(() => ({})),
            ]);
            setServices(srvs || []);
            setSettings(st || {});

            // Initialize service selection
            const initialServiceId = booking.service_id 
                ? String(booking.service_id) 
                : (srvs && srvs.length > 0 ? String(srvs[0].id) : '');
            
            setSelectedServiceId(initialServiceId);

            // Initial extras
            const initialExtras = Array.isArray(booking.extra_services) 
                ? booking.extra_services 
                : [];
            setSelectedExtras(initialExtras);

            // Calculate initial amount
            const dynamicExtras = getExtrasFromSettings(st);
            const matchedService = (srvs || []).find(s => String(s.id) === String(initialServiceId));
            const basePrice = matchedService ? matchedService.price : (booking.price || 0);
            const extrasPrice = initialExtras.reduce((sum, key) => {
                const item = dynamicExtras.find(e => e.key === key || e.key === `extra_${key}`);
                return sum + (item ? item.price : 0);
            }, 0);
            const computed = basePrice + extrasPrice;

            if (booking.total_paid && booking.total_paid > 0) {
                setAmount(booking.total_paid);
                if (booking.total_paid !== computed) setIsCustomAmount(true);
            } else {
                setAmount(computed);
            }

            if (booking.payment_method) {
                setPayMethod(booking.payment_method);
            }
        } catch (err) {
            console.error('Error loading payment modal data:', err);
            showToast('Ошибка загрузки услуг', true);
        } finally {
            setLoading(false);
        }
    }

    function calculateCatalogTotal(srvId, nextExtrasList, currentSettings = settings) {
        const matchedService = services.find(s => String(s.id) === String(srvId));
        const basePrice = matchedService ? matchedService.price : (booking.price || 0);
        const dynamicExtras = getExtrasFromSettings(currentSettings);
        const extrasPrice = (nextExtrasList || []).reduce((sum, key) => {
            const item = dynamicExtras.find(e => e.key === key || e.key === `extra_${key}`);
            return sum + (item ? item.price : 0);
        }, 0);
        return basePrice + extrasPrice;
    }

    function handleServiceSelect(idStr) {
        setSelectedServiceId(idStr);
        if (!isCustomAmount) {
            const newTotal = calculateCatalogTotal(idStr, selectedExtras);
            setAmount(newTotal);
        }
    }

    function toggleExtra(key) {
        const nextExtras = selectedExtras.includes(key)
            ? selectedExtras.filter(k => k !== key)
            : [...selectedExtras, key];
        setSelectedExtras(nextExtras);

        if (!isCustomAmount) {
            const newTotal = calculateCatalogTotal(selectedServiceId, nextExtras);
            setAmount(newTotal);
        }
    }

    function handleAmountChange(val) {
        const num = val === '' ? '' : Number(val);
        setAmount(num);
        setIsCustomAmount(true);
    }

    function handleResetToCatalog() {
        const catalogTotal = calculateCatalogTotal(selectedServiceId, selectedExtras);
        setAmount(catalogTotal);
        setIsCustomAmount(false);
        showToast('Установлена цена по прайсу');
    }

    async function handleConfirmPay(e) {
        if (e) e.preventDefault();
        const finalAmount = Number(amount);
        if (isNaN(finalAmount) || finalAmount < 0) {
            showToast('Укажите корректную сумму оплаты', true);
            return;
        }
        if (!payMethod) {
            showToast('Выберите способ оплаты', true);
            return;
        }

        setPaying(true);
        try {
            const serviceIdNum = selectedServiceId ? Number(selectedServiceId) : null;
            
            if (role === 'barber') {
                await barberApi.pay(booking.id, {
                    service_id: serviceIdNum,
                    extra_services: selectedExtras,
                    payment_method: payMethod,
                    total_paid: finalAmount
                });
            } else {
                await adminBookingsApi.update(booking.id, {
                    service_id: serviceIdNum,
                    extra_services: selectedExtras,
                    payment_method: payMethod,
                    total_paid: finalAmount,
                    status: 'done'
                });
            }

            showToast('Оплата успешно зафиксирована ✓');
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            console.error('Payment error:', err);
            showToast(err.response?.data?.detail || 'Ошибка при проведении оплаты', true);
        } finally {
            setPaying(false);
        }
    }

    const currentCatalogTotal = calculateCatalogTotal(selectedServiceId, selectedExtras);

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose && onClose()}>
            <div className="modal-box" style={{ maxWidth: 440, padding: '24px 22px' }}>
                <div className="modal-header" style={{ marginBottom: 16 }}>
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800 }}>
                            <Wallet size={20} color="var(--green)" />
                            <span>Оплата и завершение</span>
                        </h2>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>Клиент: <strong style={{ color: 'var(--text-main)' }}>{booking.client_name}</strong></span>
                            {booking.client_phone && !booking.client_phone.startsWith('no-phone-') && <span>· {booking.client_phone}</span>}
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>

                {loading ? (
                    <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Загрузка каталога услуг...
                    </div>
                ) : (
                    <form onSubmit={handleConfirmPay}>
                        {/* 1. Primary Service */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Основная услуга
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 2 }}>
                                {services.map((s) => {
                                    const isSelected = selectedServiceId === String(s.id);
                                    return (
                                        <div
                                            key={s.id}
                                            onClick={() => handleServiceSelect(String(s.id))}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 14px',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                border: isSelected ? '1.5px solid var(--green)' : '1px solid var(--border)',
                                                background: isSelected ? 'rgba(var(--green-rgb, 74, 222, 128), 0.12)' : 'var(--bg-card)',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Scissors size={15} color={isSelected ? 'var(--green)' : 'var(--text-muted)'} />
                                                <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: 'var(--text-main)' }}>
                                                    {s.name}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                                                {formatMoney(s.price)}
                                            </div>
                                        </div>
                                    );
                                })}
                                {services.length === 0 && (
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 10, background: 'var(--bg-card)', borderRadius: 8, textAlign: 'center' }}>
                                        Услуги не найдены
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Extra Services */}
                        {extrasList.length > 0 && (
                            <div style={{ marginBottom: 18 }}>
                                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Дополнительные услуги
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
                                    {extrasList.map((item) => {
                                        const isActive = selectedExtras.includes(item.key);
                                        const extraPrice = item.price;
                                        const IconComponent = ICON_MAP[item.icon] || Sparkles;
                                        return (
                                            <div
                                                key={item.key}
                                                onClick={() => toggleExtra(item.key)}
                                                style={{
                                                    padding: '10px 6px',
                                                    borderRadius: 'var(--radius-md)',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    border: isActive ? '1.5px solid var(--green)' : '1px solid var(--border)',
                                                    background: isActive ? 'rgba(var(--green-rgb, 74, 222, 128), 0.1)' : 'var(--bg-card)',
                                                    userSelect: 'none',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                                                    <IconComponent size={18} color={isActive ? 'var(--green)' : 'var(--text-muted)'} />
                                                </div>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? 'var(--green)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.label}>
                                                    {item.label}
                                                </div>
                                                {extraPrice > 0 && (
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                                        +{extraPrice}₸
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 3. Editable Final Amount (Barber can change by discretion) */}
                        <div style={{
                            background: 'var(--bg-panel)',
                            border: '1.5px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '14px 16px',
                            marginBottom: 18
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                                    Сумма к оплате (₸)
                                </label>
                                {isCustomAmount && (
                                    <span style={{
                                        fontSize: 10,
                                        background: 'rgba(var(--green-rgb, 74, 222, 128), 0.15)',
                                        color: 'var(--green)',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        fontWeight: 700
                                    }}>
                                        Своя сумма
                                    </span>
                                )}
                            </div>

                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={amount}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    min="0"
                                    step="50"
                                    style={{
                                        height: 46,
                                        fontSize: 20,
                                        fontWeight: 800,
                                        color: 'var(--green)',
                                        paddingRight: 36
                                    }}
                                    required
                                />
                                <span style={{
                                    position: 'absolute',
                                    right: 14,
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    pointerEvents: 'none'
                                }}>
                                    ₸
                                </span>
                            </div>

                            {/* Help hint and reset button */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 8,
                                fontSize: 11,
                                color: 'var(--text-muted)'
                            }}>
                                <span>По прайсу: <strong>{formatMoney(currentCatalogTotal)}</strong></span>
                                {Number(amount) !== currentCatalogTotal && (
                                    <button
                                        type="button"
                                        onClick={handleResetToCatalog}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--green)',
                                            cursor: 'pointer',
                                            fontSize: 11,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: 0,
                                            fontWeight: 600
                                        }}
                                    >
                                        <RotateCcw size={11} /> Сбросить к прайсу
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 4. Payment Methods */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Способ оплаты
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('cash')}
                                    style={{
                                        height: 44,
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        cursor: 'pointer',
                                        border: payMethod === 'cash' ? '1.5px solid var(--green)' : '1px solid var(--border)',
                                        background: payMethod === 'cash' ? 'rgba(var(--green-rgb, 74, 222, 128), 0.12)' : 'var(--bg-card)',
                                        color: payMethod === 'cash' ? 'var(--green)' : 'var(--text-main)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Wallet size={16} /> Наличные
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('kaspi')}
                                    style={{
                                        height: 44,
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        cursor: 'pointer',
                                        border: payMethod === 'kaspi' ? '1.5px solid var(--green)' : '1px solid var(--border)',
                                        background: payMethod === 'kaspi' ? 'rgba(var(--green-rgb, 74, 222, 128), 0.12)' : 'var(--bg-card)',
                                        color: payMethod === 'kaspi' ? 'var(--green)' : 'var(--text-main)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <CreditCard size={16} /> Kaspi
                                </button>
                            </div>
                        </div>

                        {/* Submit & Cancel Actions */}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                type="button"
                                className="btn btn-outline"
                                style={{ flex: 1, height: 44 }}
                                onClick={onClose}
                                disabled={paying}
                            >
                                Отмена
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 2, height: 44, fontSize: 14, fontWeight: 700, gap: 6 }}
                                disabled={paying || amount === '' || Number(amount) < 0}
                            >
                                <Check size={16} />
                                {paying ? 'Сохранение...' : `Подтвердить (${formatMoney(amount)})`}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
