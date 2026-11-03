/**
 * pages/admin/Services.jsx
 * ------------------------------------------------------------
 * "Услуги": add/edit/delete services and their prices.
 * ------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { X, Sparkles, Scissors, Plus, Check } from 'lucide-react';
import { servicesApi, settingsApi } from '../../api';
import { useToast } from '../../components/Toast';
import { formatMoney } from '../../utils';
import ConfirmModal from '../../components/ConfirmModal';

const emptyForm = { id: null, name: '', price: '', duration: 30 };

export default function AdminServices() {
    const showToast = useToast();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [confirmConfig, setConfirmConfig] = useState(null);
    const [shopSettings, setShopSettings] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [svcList, st] = await Promise.all([
                servicesApi.list(),
                settingsApi.get()
            ]);
            setServices(svcList || []);
            setShopSettings(st);
        } catch (err) {
            console.error('Error loading services:', err);
            showToast('Ошибка загрузки услуг', true);
        } finally {
            setLoading(false);
        }
    }

    function openCreate() {
        setForm(emptyForm);
        setModalOpen(true);
    }

    function openEdit(s) {
        setForm({ id: s.id, name: s.name, price: s.price, duration: s.duration });
        setModalOpen(true);
    }

    async function handleSave(e) {
        e.preventDefault();
        const payload = { name: form.name.trim(), price: Number(form.price), duration: Number(form.duration) };
        try {
            if (form.id) await servicesApi.update(form.id, payload);
            else await servicesApi.create(payload);
            showToast('Услуга сохранена ✓');
            setModalOpen(false);
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения', true);
        }
    }

    function remove(id) {
        setConfirmConfig({
            title: 'Удаление услуги',
            text: 'Вы уверены, что хотите удалить эту услугу? Действие необратимо.',
            danger: true,
            confirmText: 'Удалить',
            action: async () => {
                try {
                    await servicesApi.remove(id);
                    showToast('Услуга удалена');
                    load();
                } catch (err) {
                    showToast('Ошибка удаления', true);
                }
            }
        });
    }

    async function handleSaveSettings(e) {
        e.preventDefault();
        setSavingSettings(true);
        try {
            await settingsApi.update(shopSettings);
            showToast('Цены дополнительных услуг сохранены ✓');
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения', true);
        } finally {
            setSavingSettings(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Услуги</h1>
                    <div className="subtitle">Каталог услуг и цен</div>
                </div>
                <button className="btn btn-primary" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={16} />
                    <span>Добавить услугу</span>
                </button>
            </div>

            <div className="grid grid-3">
                {loading && <p className="empty-state">Загрузка...</p>}
                {!loading && services.length === 0 && <p className="empty-state">Услуг пока нет</p>}
                {services.map((s) => (
                    <div className="card" key={s.id}>
                        <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Scissors size={18} color="var(--green)" />
                            <span>{s.name}</span>
                        </h3>
                        <div style={{ color: 'var(--green)', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{formatMoney(s.price)}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>{s.duration} мин</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-sm btn-outline" onClick={() => openEdit(s)}>Изменить</button>
                            <button className="btn btn-sm btn-danger" onClick={() => remove(s.id)}>Удалить</button>
                        </div>
                    </div>
                ))}
            </div>

            {shopSettings && (
                <form onSubmit={handleSaveSettings} className="card" style={{ marginTop: 24, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                        <Sparkles size={18} color="var(--green)" />
                        <span>Прайс дополнительных услуг</span>
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                        <div className="form-group">
                            <label className="field-label">Мытьё головы (₸)</label>
                            <input
                                type="number"
                                className="input"
                                min="0"
                                value={shopSettings.price_hair_wash ?? 500}
                                onChange={(e) => setShopSettings({ ...shopSettings, price_hair_wash: Number(e.target.value) })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="field-label">Уход за бородой (₸)</label>
                            <input
                                type="number"
                                className="input"
                                min="0"
                                value={shopSettings.price_beard ?? 1000}
                                onChange={(e) => setShopSettings({ ...shopSettings, price_beard: Number(e.target.value) })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="field-label">Маска для лица (₸)</label>
                            <input
                                type="number"
                                className="input"
                                min="0"
                                value={shopSettings.price_mask ?? 800}
                                onChange={(e) => setShopSettings({ ...shopSettings, price_mask: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingSettings}
                        style={{ marginTop: 16, height: 42, padding: '0 24px', fontSize: 14, fontWeight: 600 }}
                    >
                        {savingSettings ? 'Сохранение...' : 'Сохранить цены доп. услуг'}
                    </button>
                </form>
            )}

            {modalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal-box" style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <div>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                    <Scissors size={20} color="var(--green)" />
                                    <span>{form.id ? 'Изменить услугу' : 'Новая услуга'}</span>
                                </h2>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    {form.id ? 'Редактирование параметров услуги' : 'Добавление новой услуги в каталог'}
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="field-label">Название услуги *</label>
                                <input
                                    className="input"
                                    value={form.name}
                                    placeholder="Например: Мужская стрижка, Стрижка бороды"
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                <div className="form-group">
                                    <label className="field-label">Цена (₸) *</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={form.price}
                                        placeholder="0"
                                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                                        min="0"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="field-label">Длительность (мин) *</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={form.duration}
                                        placeholder="30"
                                        onChange={(e) => setForm({ ...form, duration: e.target.value })}
                                        min="5"
                                        step="5"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Отмена</button>
                                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <Check size={16} />
                                    <span>{form.id ? 'Сохранить' : 'Добавить услугу'}</span>
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
                    confirmText={confirmConfig.confirmText || 'Подтвердить'}
                    onConfirm={() => {
                        confirmConfig.action();
                        setConfirmConfig(null);
                    }}
                    onCancel={() => setConfirmConfig(null)}
                />
            )}
        </>
    );
}
