import re

with open('frontend/src/pages/admin/History.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
content = content.replace(
    "import { useEffect, useState, useMemo } from 'react';",
    "import { useEffect, useState, useMemo } from 'react';\nimport { useSearchParams } from 'react-router-dom';"
)

content = content.replace(
    "import { barbersApi, adminHistoryApi } from '../../api';",
    "import { barbersApi, adminHistoryApi, servicesApi, settingsApi, adminBookingsApi } from '../../api';"
)

# Add EXTRA_SERVICES
extra_services = """
const EXTRA_SERVICES = [
    { key: 'hair_wash', label: 'Мытье', emoji: '💧', priceKey: 'price_hair_wash' },
    { key: 'beard', label: 'Борода', emoji: '🧔', priceKey: 'price_beard' },
    { key: 'mask', label: 'Маска', emoji: '🎭', priceKey: 'price_mask' },
    { key: 'patch', label: 'Патчи', emoji: '👁️', priceKey: 'price_patch' },
    { key: 'scrub', label: 'Скраб', emoji: '💆', priceKey: 'price_scrub' },
    { key: 'wax', label: 'Воск', emoji: '🕯️', priceKey: 'price_wax' },
    { key: 'styling', label: 'Укладка', emoji: '✨', priceKey: 'price_styling' },
];

"""
content = content.replace("export default function AdminHistory() {", extra_services + "export default function AdminHistory() {")

# Add state
state_code = """
    const [searchParams, setSearchParams] = useSearchParams();
    const [services, setServices] = useState([]);
    const [settings, setSettings] = useState({});
    const [payModal, setPayModal] = useState(null);
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [payMethod, setPayMethod] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [paying, setPaying] = useState(false);
"""
content = content.replace("    const [loading, setLoading] = useState(true);", "    const [loading, setLoading] = useState(true);\n" + state_code)

# Add to loadData
load_data_orig = """    function loadData() {
        setLoading(true);
        Promise.all([
            adminHistoryApi.list(), // fetch all completed & archived bookings
            barbersApi.list(),
        ])
            .then(([bRes, barRes]) => {
                setBookings(bRes || []);
                setBarbers(barRes || []);
            })"""

load_data_new = """    function loadData() {
        setLoading(true);
        Promise.all([
            adminHistoryApi.list(),
            barbersApi.list(),
            servicesApi.list(),
            settingsApi.get(),
        ])
            .then(([bRes, barRes, sRes, setRes]) => {
                setBookings(bRes || []);
                setBarbers(barRes || []);
                setServices(sRes || []);
                setSettings(setRes || {});
                
                const payId = searchParams.get('pay');
                if (payId && (bRes || []).length > 0) {
                    const found = bRes.find(b => String(b.id) === payId);
                    if (found && found.status === 'done' && !found.is_paid) {
                        openPayModal(found, sRes || []);
                    }
                    setSearchParams({}, { replace: true });
                }
            })"""
content = content.replace(load_data_orig, load_data_new)


# Add modal logic
modal_logic = """
    function openPayModal(booking, srvs) {
        const s = srvs || services;
        const existingId = booking.service_id ? String(booking.service_id) : '';
        setSelectedServiceId(existingId || (s.length > 0 ? String(s[0].id) : ''));
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
        const service = services.find((s) => String(s.id) === String(selectedServiceId));
        const base    = service?.price ?? payModal.price ?? 0;
        const extras  = selectedExtras.reduce((sum, key) => {
            const svc = EXTRA_SERVICES.find((s) => s.key === key);
            return sum + (svc ? (settings[svc.priceKey] || 0) : 0);
        }, 0);
        return base + extras;
    }

    async function handlePay() {
        if (!payMethod) { showToast('Выберите способ оплаты', true); return; }
        if (!selectedServiceId && services.length > 0) { showToast('Выберите услугу', true); return; }
        setPaying(true);
        try {
            await adminBookingsApi.update(payModal.id, {
                service_id: selectedServiceId ? Number(selectedServiceId) : null,
                extra_services: selectedExtras,
                payment_method: payMethod,
                is_paid: true,
                total_paid: computeTotal()
            });
            showToast('Оплата сохранена ✓');
            closePayModal();
            loadData();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка оплаты', true);
        } finally {
            setPaying(false);
        }
    }
"""
content = content.replace("    const hasFilters = search || selectedBarber || paidFilter || dateFrom || statusFilter !== 'done';", modal_logic + "\n    const hasFilters = search || selectedBarber || paidFilter || dateFrom || statusFilter !== 'done';")

# Add onClick to row
row_orig = """                                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>"""
row_new = """                                        <tr key={b.id} onClick={() => { if (b.status === 'done' && !b.is_paid) openPayModal(b); }} style={{ borderBottom: '1px solid var(--border)', cursor: (b.status === 'done' && !b.is_paid) ? 'pointer' : 'default' }}>"""
content = content.replace(row_orig, row_new)

# Hide delete button
del_btn_orig = """                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-icon"
                                                    onClick={() => setDeleteId(b.id)}
                                                    title="Удалить запись из истории"
                                                    style={{ color: 'var(--status-cancelled)', padding: 6, borderRadius: 8, background: 'transparent', border: 'none' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>"""
del_btn_new = """                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                {b.status !== 'done' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-icon"
                                                        onClick={(e) => { e.stopPropagation(); setDeleteId(b.id); }}
                                                        title="Удалить запись из истории"
                                                        style={{ color: 'var(--status-cancelled)', padding: 6, borderRadius: 8, background: 'transparent', border: 'none' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>"""
content = content.replace(del_btn_orig, del_btn_new)


# Add modal UI at the end
modal_ui = """
            {/* Pay Modal */}
            {payModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closePayModal()}>
                    <div className="modal-box" style={{ maxWidth: 440 }}>
                        <div className="modal-header" style={{ marginBottom: 20 }}>
                            <div>
                                <h2 style={{ fontSize: 18 }}>Оплата ({payModal.client_name})</h2>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Выберите услугу, допы и способ оплаты
                                </div>
                            </div>
                            <button className="modal-close" onClick={closePayModal}><XCircle size={20} /></button>
                        </div>

                        {/* Services List */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Основная услуга
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                                {services.map((s) => (
                                    <div
                                        key={s.id}
                                        onClick={() => setSelectedServiceId(String(s.id))}
                                        style={{
                                            padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            border: selectedServiceId === String(s.id) ? '1.5px solid var(--green)' : '1.5px solid var(--border)',
                                            background: selectedServiceId === String(s.id) ? 'rgba(51,209,122,0.08)' : 'var(--bg-card)',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, color: selectedServiceId === String(s.id) ? 'var(--green)' : 'var(--text-main)' }}>
                                            {s.name}
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{formatMoney(s.price)}</div>
                                    </div>
                                ))}
                                {services.length === 0 && (
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 12, background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        Услуги не настроены. <br/> Добавьте услуги в разделе Настройки.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Extras Grid */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Дополнительно
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                                {EXTRA_SERVICES.map((s) => {
                                    const active = selectedExtras.includes(s.key);
                                    const price = settings[s.priceKey] || 0;
                                    return (
                                        <div
                                            key={s.key}
                                            onClick={() => toggleExtra(s.key)}
                                            style={{
                                                padding: '10px 8px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'center',
                                                border: active ? '1.5px solid var(--green)' : '1.5px solid var(--border)',
                                                background: active ? 'rgba(51,209,122,0.08)' : 'var(--bg-card)',
                                                userSelect: 'none', transition: 'all 0.1s'
                                            }}
                                        >
                                            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</div>
                                            <div style={{ fontSize: 11, fontWeight: 600, color: active ? 'var(--green)' : 'var(--text-main)' }}>
                                                {s.label}
                                            </div>
                                            {price > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>+{price}₸</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Total Display */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', marginBottom: 20, border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>К оплате</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>
                                {formatMoney(computeTotal())}
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setPayMethod('cash')}
                                style={{
                                    height: 48, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    border: payMethod === 'cash' ? '1.5px solid var(--green)' : '1.5px solid var(--border)',
                                    background: payMethod === 'cash' ? 'rgba(51,209,122,0.1)' : 'var(--bg-card)',
                                    color: payMethod === 'cash' ? 'var(--green)' : 'var(--text-main)'
                                }}
                            >
                                <Wallet size={18} /> Наличные
                            </button>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setPayMethod('kaspi')}
                                style={{
                                    height: 48, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    border: payMethod === 'kaspi' ? '1.5px solid var(--green)' : '1.5px solid var(--border)',
                                    background: payMethod === 'kaspi' ? 'rgba(51,209,122,0.1)' : 'var(--bg-card)',
                                    color: payMethod === 'kaspi' ? 'var(--green)' : 'var(--text-main)'
                                }}
                            >
                                <CreditCard size={18} /> Kaspi
                            </button>
                        </div>

                        {/* Submit */}
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handlePay}
                            disabled={paying || !payMethod || (!selectedServiceId && services.length > 0)}
                            style={{ width: '100%', height: 48, fontSize: 15, marginTop: 16 }}
                        >
                            {paying ? 'Сохранение...' : 'Подтвердить оплату ✓'}
                        </button>
                    </div>
                </div>
            )}
"""
content = content.replace("        </div>\n    );\n}", modal_ui + "\n        </div>\n    );\n}")

with open('frontend/src/pages/admin/History.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
