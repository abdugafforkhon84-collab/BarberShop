import { useEffect, useState } from 'react';
import { superadminApi } from '../../api';
import { useToast } from '../../components/Toast';
import { Coins, Save } from 'lucide-react';

export default function SuperadminTariffs() {
    const showToast = useToast();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        try {
            const data = await superadminApi.getTariffSettings();
            setForm(data);
        } catch (err) {
            showToast('Ошибка загрузки тарифов', true);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await superadminApi.updateTariffSettings(form);
            setForm(updated);
            showToast('Тарифы успешно сохранены');
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения', true);
        } finally {
            setSaving(false);
        }
    }

    if (loading || !form) {
        return <div className="empty-state">Загрузка тарифов...</div>;
    }

    return (
        <div style={{ maxWidth: 600 }}>
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Coins color="var(--green)" />
                        Тарифы и цены
                    </h1>
                    <div className="subtitle">
                        Управление стандартными ценами на подписку для барбершопов (₸)
                    </div>
                </div>
            </div>

            <form className="card" onSubmit={handleSave} style={{ padding: 24 }}>
                <div className="grid grid-2" style={{ gap: 20 }}>
                    <div className="form-group">
                        <label>Цена за 1 месяц</label>
                        <input
                            type="number"
                            className="form-control"
                            value={form.price_1_month}
                            onChange={(e) => setForm({ ...form, price_1_month: Number(e.target.value) })}
                            min="0"
                            step="100"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Цена за 3 месяца</label>
                        <input
                            type="number"
                            className="form-control"
                            value={form.price_3_months}
                            onChange={(e) => setForm({ ...form, price_3_months: Number(e.target.value) })}
                            min="0"
                            step="100"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Цена за 6 месяцев</label>
                        <input
                            type="number"
                            className="form-control"
                            value={form.price_6_months}
                            onChange={(e) => setForm({ ...form, price_6_months: Number(e.target.value) })}
                            min="0"
                            step="100"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Цена за 12 месяцев</label>
                        <input
                            type="number"
                            className="form-control"
                            value={form.price_12_months}
                            onChange={(e) => setForm({ ...form, price_12_months: Number(e.target.value) })}
                            min="0"
                            step="100"
                            required
                        />
                    </div>
                </div>

                <div style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        <Save size={16} />
                        {saving ? 'Сохранение...' : 'Сохранить тарифы'}
                    </button>
                </div>
            </form>
        </div>
    );
}
