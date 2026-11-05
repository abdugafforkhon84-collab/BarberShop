import { useEffect, useState } from 'react';
import { superadminApi } from '../../api';
import { useToast } from '../../components/Toast';
import { Coins, Save, Plus, Trash2, RotateCcw } from 'lucide-react';

const DEFAULT_TARIFF_PRESETS = [
    { months: 1, price: 0, name: '1 месяц (Пробный период)' },
    { months: 3, price: 15000, name: '3 месяца' },
    { months: 6, price: 27000, name: '6 месяцев' },
    { months: 12, price: 48000, name: '12 месяцев (1 год)' },
];

function defaultNameForMonth(m) {
    if (m === 1) return '1 месяц (Пробный период)';
    if (m === 12) return '12 месяцев (1 год)';
    if (m >= 2 && m <= 4) return `${m} месяца`;
    return `${m} месяцев`;
}

export default function SuperadminTariffs() {
    const showToast = useToast();
    const [rawSettings, setRawSettings] = useState(null);
    const [tariffs, setTariffs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New tariff inline add state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMonths, setNewMonths] = useState(2);
    const [newName, setNewName] = useState(defaultNameForMonth(2));
    const [newPrice, setNewPrice] = useState(10000);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        try {
            const data = await superadminApi.getTariffSettings();
            setRawSettings(data);
            if (data.tariffs && data.tariffs.length > 0) {
                setTariffs(data.tariffs);
            } else {
                setTariffs(DEFAULT_TARIFF_PRESETS);
            }
        } catch (err) {
            showToast('Ошибка загрузки тарифов', true);
        } finally {
            setLoading(false);
        }
    }

    function handleMonthsChange(newM) {
        const m = Number(newM);
        setNewMonths(m);
        setNewName(defaultNameForMonth(m));
    }

    function handleAddTariff(e) {
        e.preventDefault();
        const m = Number(newMonths);
        if (m < 1 || m > 12) {
            showToast('Срок должен быть от 1 до 12 месяцев', true);
            return;
        }
        if (tariffs.some(t => t.months === m)) {
            showToast(`Тариф на ${m} мес уже существует в списке`, true);
            return;
        }

        const newTariff = {
            months: m,
            price: Number(newPrice) || 0,
            name: newName.trim() || defaultNameForMonth(m),
        };

        const updated = [...tariffs, newTariff].sort((a, b) => a.months - b.months);
        setTariffs(updated);
        setShowAddForm(false);

        // Prepare next available month
        const usedMonths = new Set(updated.map(t => t.months));
        let nextM = 1;
        while (usedMonths.has(nextM) && nextM <= 12) nextM++;
        if (nextM <= 12) {
            setNewMonths(nextM);
            setNewName(defaultNameForMonth(nextM));
            setNewPrice(10000);
        }
    }

    function handleRemoveTariff(months) {
        if (tariffs.length <= 1) {
            showToast('Должен остаться хотя бы один тариф', true);
            return;
        }
        setTariffs(tariffs.filter(t => t.months !== months));
    }

    function handleTariffChange(index, field, value) {
        const next = [...tariffs];
        next[index] = { ...next[index], [field]: value };
        setTariffs(next);
    }

    function handleResetToDefaults() {
        setTariffs(DEFAULT_TARIFF_PRESETS);
        showToast('Тарифы сброшены к стандартным (не забудьте сохранить)');
    }

    async function handleSave(e) {
        if (e) e.preventDefault();
        if (tariffs.length === 0) {
            showToast('Список тарифов не может быть пустым', true);
            return;
        }

        setSaving(true);
        try {
            const p1 = tariffs.find(t => t.months === 1)?.price ?? rawSettings?.price_1_month ?? 0;
            const p3 = tariffs.find(t => t.months === 3)?.price ?? rawSettings?.price_3_months ?? 15000;
            const p6 = tariffs.find(t => t.months === 6)?.price ?? rawSettings?.price_6_months ?? 27000;
            const p12 = tariffs.find(t => t.months === 12)?.price ?? rawSettings?.price_12_months ?? 48000;

            const payload = {
                price_1_month: p1,
                price_3_months: p3,
                price_6_months: p6,
                price_12_months: p12,
                tariffs: tariffs.map(t => ({
                    months: Number(t.months),
                    price: Number(t.price) || 0,
                    name: t.name || defaultNameForMonth(t.months)
                }))
            };

            const updated = await superadminApi.updateTariffSettings(payload);
            setRawSettings(updated);
            if (updated.tariffs) {
                setTariffs(updated.tariffs);
            }
            showToast('Тарифы успешно сохранены ✓');
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения тарифов', true);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="empty-state">Загрузка тарифов...</div>;
    }

    const availableMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(
        m => !tariffs.some(t => t.months === m)
    );

    return (
        <div style={{ maxWidth: 760, margin: '0 auto', paddingBottom: 60 }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <Coins color="var(--green)" size={22} />
                        Тарифы
                    </h1>
                    <div className="subtitle">Сроки подписки и стоимость в тенге (₸)</div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%', maxWidth: 360, justifyContent: 'flex-start' }}>
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ height: 38, fontSize: 12, gap: 5, flex: 1 }}
                        onClick={handleResetToDefaults}
                        title="Сбросить"
                    >
                        <RotateCcw size={13} />
                        По умолчанию
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{ height: 38, padding: '0 16px', gap: 6, flex: 1.2 }}
                        onClick={() => handleSave()}
                        disabled={saving}
                    >
                        <Save size={15} />
                        {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </div>

            {/* Compact Tariffs List (fits in viewport without clipping) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {tariffs.map((t, index) => {
                    const isFree = Number(t.price) === 0;
                    return (
                        <div
                            key={t.months}
                            className="card"
                            style={{
                                padding: '10px 12px',
                                background: 'var(--bg-card)',
                                border: isFree ? '1px solid rgba(255, 193, 7, 0.4)' : '1px solid var(--border)',
                                borderRadius: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {/* Card Top: Duration Badge + Free status / toggle + Delete */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        background: 'rgba(var(--green-rgb, 74, 222, 128), 0.12)',
                                        border: '1px solid rgba(var(--green-rgb, 74, 222, 128), 0.25)',
                                        color: 'var(--green)',
                                        fontWeight: 800,
                                        fontSize: 12,
                                        padding: '2px 8px',
                                        borderRadius: 6
                                    }}>
                                        {t.months} {t.months === 1 ? 'мес' : t.months >= 2 && t.months <= 4 ? 'мес' : 'мес'}
                                    </span>
                                    {isFree ? (
                                        <span style={{
                                            background: 'rgba(255, 193, 7, 0.15)',
                                            color: '#ffc107',
                                            fontWeight: 700,
                                            fontSize: 11,
                                            padding: '2px 6px',
                                            borderRadius: 6
                                        }}>
                                            Пробный (0 ₸)
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleTariffChange(index, 'price', 0)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer',
                                                fontSize: 11,
                                                padding: '2px 4px',
                                                textDecoration: 'underline'
                                            }}
                                        >
                                            Сделать 0 ₸
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleRemoveTariff(t.months)}
                                    title="Удалить тариф"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--status-cancelled)',
                                        cursor: 'pointer',
                                        padding: '4px 6px',
                                        borderRadius: 6
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Card Bottom: Name Input + Price Input with ₸ */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 115px', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text"
                                    className="input"
                                    value={t.name || ''}
                                    placeholder={defaultNameForMonth(t.months)}
                                    onChange={(e) => handleTariffChange(index, 'name', e.target.value)}
                                    style={{ height: 34, fontSize: 13, padding: '0 10px' }}
                                />
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        className="input"
                                        value={t.price}
                                        min="0"
                                        step="500"
                                        onChange={(e) => handleTariffChange(index, 'price', Number(e.target.value))}
                                        style={{ height: 34, fontSize: 13, fontWeight: 700, padding: '0 24px 0 8px', textAlign: 'right' }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        right: 8,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text-muted)',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        pointerEvents: 'none'
                                    }}>
                                        ₸
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Tariff Form / Button */}
            {!showAddForm ? (
                availableMonths.length > 0 && (
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{
                            width: '100%',
                            minHeight: 44,
                            borderStyle: 'dashed',
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--green)',
                            borderColor: 'rgba(var(--green-rgb, 74, 222, 128), 0.4)'
                        }}
                        onClick={() => setShowAddForm(true)}
                    >
                        <Plus size={16} /> Добавить срок (от 1 до 12 мес)
                    </button>
                )
            ) : (
                <form
                    onSubmit={handleAddTariff}
                    className="card"
                    style={{
                        padding: 16,
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--green)',
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                        <Plus size={16} color="var(--green)" />
                        Новый тариф
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>Срок (месяцы)</label>
                            <select
                                className="select"
                                value={newMonths}
                                onChange={(e) => handleMonthsChange(e.target.value)}
                                style={{ height: 36, width: '100%' }}
                            >
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>{m} {m === 1 ? 'месяц' : m < 5 ? 'месяца' : 'месяцев'}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>Название</label>
                            <input
                                type="text"
                                className="input"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Например: 2 месяца"
                                style={{ height: 36, fontSize: 13 }}
                                required
                            />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <label style={{ fontSize: 11, margin: 0 }}>Цена (₸)</label>
                                <button
                                    type="button"
                                    onClick={() => setNewPrice(0)}
                                    style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: 10, cursor: 'pointer', padding: 0 }}
                                >
                                    0 ₸ (Пробный)
                                </button>
                            </div>
                            <input
                                type="number"
                                className="input"
                                value={newPrice}
                                min="0"
                                step="500"
                                onChange={(e) => setNewPrice(e.target.value)}
                                style={{ height: 36, fontWeight: 700, fontSize: 13 }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                        <button type="button" className="btn btn-outline" style={{ minHeight: 38, fontSize: 13 }} onClick={() => setShowAddForm(false)}>
                            Отмена
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ minHeight: 38, fontSize: 13 }}>
                            Добавить тариф
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
