import { useEffect, useState } from 'react';
import { superadminApi } from '../../api';
import { useToast } from '../../components/Toast';
import { Coins, Save, Plus, Trash2, Sparkles, Clock, Check, RotateCcw, AlertCircle } from 'lucide-react';
import { formatMoney } from '../../utils';

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
            // Find backwards-compatible fields
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
        <div style={{ maxWidth: 840, margin: '0 auto', paddingBottom: 40 }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.5rem', margin: 0 }}>
                        <Coins color="var(--green)" size={24} />
                        Тарифы платформы
                    </h1>
                    <div className="subtitle" style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                        Гибкая настройка периодов подписки (от 1 до 12 месяцев) и стоимости в тенге (₸)
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ height: 40, fontSize: 13, gap: 6 }}
                        onClick={handleResetToDefaults}
                        title="Вернуть стандартные 1, 3, 6, 12 месяцев"
                    >
                        <RotateCcw size={14} />
                        По умолчанию
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{ height: 40, padding: '0 20px', gap: 8 }}
                        onClick={() => handleSave()}
                        disabled={saving}
                    >
                        <Save size={16} />
                        {saving ? 'Сохранение...' : 'Сохранить тарифы'}
                    </button>
                </div>
            </div>

            {/* Hint Notice */}
            <div style={{
                background: 'rgba(51, 209, 122, 0.08)',
                border: '1px solid rgba(51, 209, 122, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 13,
                color: 'var(--text-main)'
            }}>
                <Sparkles size={18} color="var(--green)" style={{ flexShrink: 0 }} />
                <span>
                    Установите цену <strong>0 ₸</strong>, чтобы тариф считался бесплатным пробным периодом.
                    Все настроенные тарифы будут доступны при создании и продлении барбершопов.
                </span>
            </div>

            {/* Tariffs List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                {tariffs.map((t, index) => {
                    const isFree = Number(t.price) === 0;
                    return (
                        <div
                            key={t.months}
                            className="card"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '80px 1.4fr 1.2fr auto',
                                alignItems: 'center',
                                gap: 16,
                                padding: '16px 20px',
                                background: 'var(--bg-card)',
                                border: isFree ? '1px solid rgba(255, 193, 7, 0.4)' : '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {/* Duration Badge */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(var(--green-rgb, 74, 222, 128), 0.12)',
                                border: '1px solid rgba(var(--green-rgb, 74, 222, 128), 0.25)',
                                borderRadius: 12,
                                height: 52,
                                color: 'var(--green)',
                                fontWeight: 800,
                            }}>
                                <span style={{ fontSize: 18, lineHeight: 1 }}>{t.months}</span>
                                <span style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.85 }}>мес</span>
                            </div>

                            {/* Name Input */}
                            <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                                    Название тарифа
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={t.name || ''}
                                    placeholder={defaultNameForMonth(t.months)}
                                    onChange={(e) => handleTariffChange(index, 'name', e.target.value)}
                                    style={{ height: 38, fontSize: 13 }}
                                />
                            </div>

                            {/* Price Input */}
                            <div className="form-group" style={{ margin: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                                        Стоимость (₸)
                                    </label>
                                    {isFree ? (
                                        <span className="badge" style={{ background: 'rgba(255, 193, 7, 0.15)', color: '#ffc107', fontSize: 10, padding: '2px 6px', borderRadius: 6 }}>
                                            Пробный (0 ₸)
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleTariffChange(index, 'price', 0)}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: 0 }}
                                        >
                                            Сделать пробным
                                        </button>
                                    )}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={t.price}
                                        min="0"
                                        step="500"
                                        onChange={(e) => handleTariffChange(index, 'price', Number(e.target.value))}
                                        style={{ height: 38, fontSize: 14, fontWeight: 700, paddingRight: 32 }}
                                    />
                                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none' }}>
                                        ₸
                                    </span>
                                </div>
                            </div>

                            {/* Delete Action */}
                            <div style={{ display: 'flex', alignItems: 'center', paddingTop: 18 }}>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => handleRemoveTariff(t.months)}
                                    title="Удалить этот тариф"
                                    style={{
                                        color: 'var(--status-cancelled)',
                                        borderColor: 'rgba(239, 68, 68, 0.25)',
                                        padding: '8px 10px',
                                        borderRadius: 8
                                    }}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Tariff Form / Button */}
            {!showAddForm ? (
                availableMonths.length > 0 ? (
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderStyle: 'dashed',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--green)',
                            borderColor: 'rgba(var(--green-rgb, 74, 222, 128), 0.4)'
                        }}
                        onClick={() => setShowAddForm(true)}
                    >
                        <Plus size={16} /> Добавить тариф (на любой срок 1–12 месяцев)
                    </button>
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>
                        Все периоды от 1 до 12 месяцев добавлены.
                    </div>
                )
            ) : (
                <form
                    onSubmit={handleAddTariff}
                    className="card"
                    style={{
                        padding: 20,
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--green)',
                        borderRadius: 'var(--radius-md)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                        <Plus size={18} color="var(--green)" />
                        Новый тариф
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1.4fr 1.2fr', gap: 14, marginBottom: 16 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 12, marginBottom: 6, display: 'block' }}>Срок (месяцы)</label>
                            <select
                                className="form-control"
                                value={newMonths}
                                onChange={(e) => handleMonthsChange(e.target.value)}
                                style={{ height: 40 }}
                            >
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>{m} {m === 1 ? 'месяц' : m < 5 ? 'месяца' : 'месяцев'}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 12, marginBottom: 6, display: 'block' }}>Название</label>
                            <input
                                type="text"
                                className="form-control"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Например: 3 месяца"
                                style={{ height: 40 }}
                                required
                            />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={{ fontSize: 12, margin: 0 }}>Цена (₸)</label>
                                <button
                                    type="button"
                                    onClick={() => setNewPrice(0)}
                                    style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: 11, cursor: 'pointer', padding: 0 }}
                                >
                                    0 ₸ (Пробный)
                                </button>
                            </div>
                            <input
                                type="number"
                                className="form-control"
                                value={newPrice}
                                min="0"
                                step="500"
                                onChange={(e) => setNewPrice(e.target.value)}
                                style={{ height: 40, fontWeight: 700 }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button type="button" className="btn btn-outline" onClick={() => setShowAddForm(false)}>
                            Отмена
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <Plus size={15} /> Добавить в список
                        </button>
                    </div>
                </form>
            )}

            {/* Bottom Save bar */}
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Всего настроено тарифов: <strong>{tariffs.length}</strong>
                </div>
                <button
                    type="button"
                    className="btn btn-primary"
                    style={{ height: 42, padding: '0 24px', fontSize: 14, gap: 8 }}
                    onClick={() => handleSave()}
                    disabled={saving}
                >
                    <Save size={16} />
                    {saving ? 'Сохранение...' : 'Сохранить все тарифы'}
                </button>
            </div>
        </div>
    );
}
