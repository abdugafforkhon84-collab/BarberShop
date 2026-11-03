/**
 * pages/admin/Services.jsx
 * ------------------------------------------------------------
 * "Услуги": add/edit/delete main services and additional extra
 * services with custom icons independently.
 * ------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { 
    X, 
    Sparkles, 
    Scissors, 
    Plus, 
    Check, 
    Droplets, 
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
    CheckCircle2,
    Edit2,
    Trash2
} from 'lucide-react';
import { servicesApi, settingsApi } from '../../api';
import { useToast } from '../../components/Toast';
import { formatMoney } from '../../utils';
import ConfirmModal from '../../components/ConfirmModal';

export const EXTRA_ICONS = [
    { id: 'Droplets', label: 'Мытьё / Вода', Icon: Droplets },
    { id: 'Sparkles', label: 'Блеск / Уход', Icon: Sparkles },
    { id: 'Smile', label: 'Маска / Лицо', Icon: Smile },
    { id: 'Flame', label: 'Воск / Огонь', Icon: Flame },
    { id: 'Scissors', label: 'Стрижка', Icon: Scissors },
    { id: 'Coffee', label: 'Напитки', Icon: Coffee },
    { id: 'Wind', label: 'Сушка / Фен', Icon: Wind },
    { id: 'Zap', label: 'Экспресс', Icon: Zap },
    { id: 'Crown', label: 'Премиум / VIP', Icon: Crown },
    { id: 'Heart', label: 'Релакс / Забота', Icon: Heart },
    { id: 'Shield', label: 'Защита', Icon: Shield },
    { id: 'Star', label: 'Топ-услуга', Icon: Star },
    { id: 'Award', label: 'Мастер-класс', Icon: Award },
    { id: 'CheckCircle2', label: 'Стандарт', Icon: CheckCircle2 },
];

export const ICON_MAP = {
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

const emptyMainForm = { id: null, name: '', price: '', duration: 30 };
const emptyExtraForm = { id: null, name: '', price: '', icon: 'Droplets' };

export default function AdminServices() {
    const showToast = useToast();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Main services modal
    const [mainModalOpen, setMainModalOpen] = useState(false);
    const [mainForm, setMainForm] = useState(emptyMainForm);
    
    // Extra services state & modal
    const [extraServices, setExtraServices] = useState([]);
    const [extraModalOpen, setExtraModalOpen] = useState(false);
    const [extraForm, setExtraForm] = useState(emptyExtraForm);
    
    const [confirmConfig, setConfirmConfig] = useState(null);
    const [shopSettings, setShopSettings] = useState(null);

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

            // Parse extra services from settings JSON
            let parsedExtras = [];
            if (st && st.extra_services_json) {
                try {
                    const parsed = JSON.parse(st.extra_services_json);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        parsedExtras = parsed;
                    }
                } catch (_) {}
            }

            // If empty, initialize with default 3 extra services
            if (parsedExtras.length === 0 && st) {
                parsedExtras = [
                    { id: 'extra_wash', name: 'Мытьё головы', price: st.price_hair_wash ?? 500, icon: 'Droplets' },
                    { id: 'extra_beard', name: 'Уход за бородой', price: st.price_beard ?? 1000, icon: 'Scissors' },
                    { id: 'extra_mask', name: 'Маска для лица', price: st.price_mask ?? 800, icon: 'Smile' },
                ];
            }
            setExtraServices(parsedExtras);
        } catch (err) {
            console.error('Error loading services:', err);
            showToast('Ошибка загрузки услуг', true);
        } finally {
            setLoading(false);
        }
    }

    // --- Main Service Handlers ---
    function openCreateMain() {
        setMainForm(emptyMainForm);
        setMainModalOpen(true);
    }

    function openEditMain(s) {
        setMainForm({ id: s.id, name: s.name, price: s.price, duration: s.duration });
        setMainModalOpen(true);
    }

    async function handleSaveMain(e) {
        e.preventDefault();
        const payload = { name: mainForm.name.trim(), price: Number(mainForm.price), duration: Number(mainForm.duration) };
        try {
            if (mainForm.id) await servicesApi.update(mainForm.id, payload);
            else await servicesApi.create(payload);
            showToast('Услуга сохранена ✓');
            setMainModalOpen(false);
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения', true);
        }
    }

    function removeMain(id) {
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

    // --- Extra Service Handlers ---
    function openCreateExtra() {
        setExtraForm({ id: null, name: '', price: '', icon: 'Droplets' });
        setExtraModalOpen(true);
    }

    function openEditExtra(extra) {
        setExtraForm({ id: extra.id, name: extra.name, price: extra.price, icon: extra.icon || 'Droplets' });
        setExtraModalOpen(true);
    }

    async function handleSaveExtra(e) {
        e.preventDefault();
        const name = extraForm.name.trim();
        const price = Number(extraForm.price) || 0;
        const icon = extraForm.icon || 'Droplets';

        let nextList;
        if (extraForm.id) {
            nextList = extraServices.map(item => item.id === extraForm.id ? { ...item, name, price, icon } : item);
        } else {
            const newId = `extra_${Date.now()}`;
            nextList = [...extraServices, { id: newId, name, price, icon }];
        }

        try {
            const updated = await settingsApi.update({
                ...shopSettings,
                extra_services_json: JSON.stringify(nextList)
            });
            setShopSettings(updated);
            setExtraServices(nextList);
            setExtraModalOpen(false);
            showToast('Дополнительная услуга сохранена ✓');
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения доп. услуги', true);
        }
    }

    function removeExtra(id) {
        setConfirmConfig({
            title: 'Удаление доп. услуги',
            text: 'Удалить эту дополнительную услугу из списка?',
            danger: true,
            confirmText: 'Удалить',
            action: async () => {
                const nextList = extraServices.filter(item => item.id !== id);
                try {
                    const updated = await settingsApi.update({
                        ...shopSettings,
                        extra_services_json: JSON.stringify(nextList)
                    });
                    setShopSettings(updated);
                    setExtraServices(nextList);
                    showToast('Дополнительная услуга удалена');
                } catch (err) {
                    showToast('Ошибка удаления', true);
                }
            }
        });
    }

    return (
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
            {/* 1. Main Services Header */}
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div>
                    <h1>Основные услуги</h1>
                    <div className="subtitle">Каталог услуг, длительности и цен</div>
                </div>
                <button className="btn btn-primary" onClick={openCreateMain} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={16} />
                    <span>Добавить услугу</span>
                </button>
            </div>

            <div className="grid grid-3" style={{ marginBottom: 36 }}>
                {loading && <p className="empty-state">Загрузка...</p>}
                {!loading && services.length === 0 && <p className="empty-state">Услуг пока нет</p>}
                {services.map((s) => (
                    <div className="card" key={s.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Scissors size={18} color="var(--green)" />
                                <span>{s.name}</span>
                            </h3>
                            <div style={{ color: 'var(--green)', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{formatMoney(s.price)}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>{s.duration} мин</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                            <button 
                                className="btn btn-sm btn-outline" 
                                onClick={() => openEditMain(s)} 
                                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, fontSize: 13, fontWeight: 600 }}
                            >
                                <Edit2 size={16} color="var(--green)" />
                                <span>Изменить</span>
                            </button>
                            <button 
                                className="btn btn-sm btn-danger" 
                                onClick={() => removeMain(s.id)}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, padding: '0 14px', fontSize: 13 }}
                                title="Удалить услугу"
                            >
                                <Trash2 size={16} />
                                <span>Удалить</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* 2. Additional Services Header & Custom Grid */}
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Sparkles size={20} color="var(--green)" />
                        <span>Дополнительные услуги</span>
                    </h2>
                    <div className="subtitle">Услуги с персональными иконками, которые мастер может добавить при оплате</div>
                </div>
                <button className="btn btn-outline" onClick={openCreateExtra} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={16} />
                    <span>Добавить доп. услугу</span>
                </button>
            </div>

            <div className="grid grid-3" style={{ marginBottom: 32 }}>
                {extraServices.length === 0 && (
                    <p className="empty-state">Дополнительных услуг пока нет. Нажмите «+ Добавить доп. услугу».</p>
                )}
                {extraServices.map((extra) => {
                    const IconComponent = ICON_MAP[extra.icon] || Droplets;
                    return (
                        <div className="card" key={extra.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 14,
                                    background: 'var(--green-glow)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--green)',
                                    flexShrink: 0
                                }}>
                                    <IconComponent size={24} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>
                                        {extra.name}
                                    </div>
                                    <div style={{ color: 'var(--green)', fontSize: 15, fontWeight: 800, marginTop: 2 }}>
                                        +{formatMoney(extra.price)}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button 
                                    type="button"
                                    className="btn btn-outline" 
                                    onClick={() => openEditExtra(extra)} 
                                    title="Изменить доп. услугу"
                                    style={{ 
                                        width: 42, 
                                        height: 42, 
                                        borderRadius: 12,
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderColor: 'var(--border)',
                                        background: 'var(--bg-panel)',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <Edit2 size={20} color="var(--green)" />
                                </button>
                                <button 
                                    type="button"
                                    className="btn btn-danger" 
                                    onClick={() => removeExtra(extra.id)} 
                                    title="Удалить доп. услугу"
                                    style={{ 
                                        width: 42, 
                                        height: 42, 
                                        borderRadius: 12,
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(239,68,68,0.2)'
                                    }}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal: Main Service Create/Edit */}
            {mainModalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setMainModalOpen(false)}>
                    <div className="modal-box" style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <div>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                    <Scissors size={20} color="var(--green)" />
                                    <span>{mainForm.id ? 'Изменить услугу' : 'Новая услуга'}</span>
                                </h2>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    {mainForm.id ? 'Редактирование параметров услуги' : 'Добавление новой услуги в каталог'}
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setMainModalOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveMain}>
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="field-label">Название услуги *</label>
                                <input
                                    className="input"
                                    value={mainForm.name}
                                    placeholder="Например: Мужская стрижка, Стрижка бороды"
                                    onChange={(e) => setMainForm({ ...mainForm, name: e.target.value })}
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
                                        value={mainForm.price}
                                        placeholder="0"
                                        onChange={(e) => setMainForm({ ...mainForm, price: e.target.value })}
                                        min="0"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="field-label">Длительность (мин) *</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={mainForm.duration}
                                        placeholder="30"
                                        onChange={(e) => setMainForm({ ...mainForm, duration: e.target.value })}
                                        min="5"
                                        step="5"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setMainModalOpen(false)}>Отмена</button>
                                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <Check size={16} />
                                    <span>{mainForm.id ? 'Сохранить' : 'Добавить услугу'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Extra Service Create/Edit with Icon Picker */}
            {extraModalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setExtraModalOpen(false)}>
                    <div className="modal-box" style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <div>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                    <Sparkles size={20} color="var(--green)" />
                                    <span>{extraForm.id ? 'Изменить доп. услугу' : 'Новая доп. услуга'}</span>
                                </h2>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Название, цена и персональная иконка услуги
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setExtraModalOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveExtra}>
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="field-label">Название доп. услуги *</label>
                                <input
                                    className="input"
                                    value={extraForm.name}
                                    placeholder="Например: Мытьё головы, Горячий воск, Кофе"
                                    onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 18 }}>
                                <label className="field-label">Цена услуги (₸) *</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={extraForm.price}
                                    placeholder="0"
                                    onChange={(e) => setExtraForm({ ...extraForm, price: e.target.value })}
                                    min="0"
                                    required
                                />
                            </div>

                            {/* Icon Picker Grid */}
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label className="field-label" style={{ marginBottom: 8 }}>Выберите иконку услуги</label>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(7, 1fr)', 
                                    gap: 8, 
                                    background: 'var(--bg-panel)', 
                                    padding: 10, 
                                    borderRadius: 12,
                                    border: '1px solid var(--border)' 
                                }}>
                                    {EXTRA_ICONS.map(({ id, label, Icon }) => {
                                        const isSelected = extraForm.icon === id;
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => setExtraForm({ ...extraForm, icon: id })}
                                                title={label}
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 10,
                                                    border: isSelected ? '2px solid var(--green)' : '1px solid var(--border)',
                                                    background: isSelected ? 'var(--green-glow)' : 'var(--bg-card)',
                                                    color: isSelected ? 'var(--green)' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <Icon size={20} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setExtraModalOpen(false)}>Отмена</button>
                                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <Check size={16} />
                                    <span>{extraForm.id ? 'Сохранить' : 'Добавить'}</span>
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
        </div>
    );
}
