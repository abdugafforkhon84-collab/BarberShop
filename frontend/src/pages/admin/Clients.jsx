import { useState, useEffect } from 'react';
import { 
    Users, 
    Search, 
    Plus, 
    Phone, 
    MessageCircle, 
    Calendar, 
    History, 
    Edit2, 
    Trash2, 
    X, 
    Clock, 
    DollarSign, 
    Scissors, 
    Sparkles, 
    Award,
    Filter,
    ChevronRight,
    UserCheck,
    CheckCircle2
} from 'lucide-react';
import { clientsApi } from '../../api';
import { useToast } from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';

const emptyClientForm = {
    id: null,
    name: '',
    phone: '',
    notes: ''
};

export default function AdminClients() {
    const showToast = useToast();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('all'); // all, regular, new, inactive
    const [sortBy, setSortBy] = useState('visits'); // visits, spent, name, recent

    // Form Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyClientForm);
    const [saving, setSaving] = useState(false);

    // History Modal
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientHistory, setClientHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Confirm Delete
    const [confirmConfig, setConfirmConfig] = useState(null);

    useEffect(() => {
        loadClients();
    }, []);

    async function loadClients() {
        setLoading(true);
        try {
            const data = await clientsApi.list();
            setClients(data || []);
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка загрузки клиентов', true);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setForm(emptyClientForm);
        setModalOpen(true);
    }

    function openEditModal(client) {
        setForm({
            id: client.id,
            name: client.name || '',
            phone: client.phone || '',
            notes: client.notes || ''
        });
        setModalOpen(true);
    }

    async function handleSaveClient(e) {
        e.preventDefault();
        if (!form.name.trim() || !form.phone.trim()) {
            showToast('Укажите имя и телефон клиента', true);
            return;
        }

        setSaving(true);
        try {
            if (form.id) {
                await clientsApi.update(form.id, {
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    notes: form.notes?.trim() || null
                });
                showToast('Данные клиента обновлены');
            } else {
                await clientsApi.create({
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    notes: form.notes?.trim() || null
                });
                showToast('Новый клиент добавлен');
            }
            setModalOpen(false);
            loadClients();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения', true);
        } finally {
            setSaving(false);
        }
    }

    function handleDeleteClient(client) {
        setConfirmConfig({
            title: 'Удаление клиента',
            text: `Вы действительно хотите удалить клиента «${client.name}»? Все связанные данные будут стёрты.`,
            danger: true,
            confirmText: 'Удалить',
            action: async () => {
                try {
                    await clientsApi.remove(client.id);
                    showToast('Клиент удален');
                    loadClients();
                } catch (err) {
                    showToast(err.response?.data?.detail || 'Ошибка удаления', true);
                }
            }
        });
    }

    async function openHistoryModal(client) {
        setSelectedClient(client);
        setHistoryModalOpen(true);
        setLoadingHistory(true);
        try {
            const history = await clientsApi.history(client.id);
            setClientHistory(history || []);
        } catch (err) {
            showToast(err.response?.data?.detail || 'Не удалось загрузить историю', true);
        } finally {
            setLoadingHistory(false);
        }
    }

    // Format phone for WhatsApp link
    function getWhatsAppLink(phone) {
        if (!phone) return '#';
        const clean = phone.replace(/[^0-9]/g, '');
        return `https://wa.me/${clean}`;
    }

    // Client Category Badge
    function getClientBadge(visits, totalSpent) {
        if (visits >= 5 || totalSpent >= 20000) {
            return { label: 'VIP Клиент', color: 'var(--green)', bg: 'var(--green-glow)' };
        }
        if (visits >= 2) {
            return { label: 'Постоянный', color: 'var(--status-confirmed)', bg: 'rgba(59, 130, 246, 0.15)' };
        }
        if (visits === 1) {
            return { label: 'Новый', color: 'var(--status-pending)', bg: 'rgba(245, 158, 11, 0.15)' };
        }
        return { label: 'Без визитов', color: 'var(--text-muted)', bg: 'var(--bg-panel)' };
    }

    // Filter and Sort Clients
    const filteredClients = clients.filter(c => {
        const matchesSearch = 
            c.name?.toLowerCase().includes(search.toLowerCase()) || 
            c.phone?.includes(search);
        
        if (!matchesSearch) return false;

        if (filterCategory === 'regular') return (c.visits || 0) >= 2;
        if (filterCategory === 'new') return (c.visits || 0) === 1;
        if (filterCategory === 'inactive') return (c.visits || 0) === 0;
        return true;
    }).sort((a, b) => {
        if (sortBy === 'visits') return (b.visits || 0) - (a.visits || 0);
        if (sortBy === 'spent') return (b.total_spent || 0) - (a.total_spent || 0);
        if (sortBy === 'recent') {
            if (!a.last_visit) return 1;
            if (!b.last_visit) return -1;
            return new Date(b.last_visit) - new Date(a.last_visit);
        }
        return (a.name || '').localeCompare(b.name || '');
    });

    // KPI Totals
    const totalClientsCount = clients.length;
    const regularClientsCount = clients.filter(c => (c.visits || 0) >= 2).length;
    const totalRevenue = clients.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const avgCheck = totalClientsCount > 0 ? Math.round(totalRevenue / (clients.reduce((sum, c) => sum + (c.visits || 0), 0) || 1)) : 0;

    return (
        <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 60 }}>
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Users size={26} color="var(--green)" />
                        <span>База клиентов</span>
                    </h1>
                    <div className="subtitle">Управление клиентской базой, статистика визитов и история заказов</div>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={16} /> Добавить клиента
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-4" style={{ marginBottom: 20 }}>
                <div className="card stat-card">
                    <div className="label">Всего клиентов</div>
                    <div className="value green">{totalClientsCount}</div>
                </div>
                <div className="card stat-card">
                    <div className="label">Постоянных (2+ визита)</div>
                    <div className="value">{regularClientsCount}</div>
                </div>
                <div className="card stat-card">
                    <div className="label">Суммарный доход</div>
                    <div className="value green">{totalRevenue.toLocaleString()} ₸</div>
                </div>
                <div className="card stat-card">
                    <div className="label">Средний чек</div>
                    <div className="value">{avgCheck.toLocaleString()} ₸</div>
                </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                        <input
                            type="text"
                            placeholder="Поиск по имени или телефону..."
                            className="input"
                            style={{ paddingLeft: 38 }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button 
                                onClick={() => setSearch('')}
                                style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filter Tags */}
                    <div className="tag-switch" style={{ margin: 0 }}>
                        <button className={filterCategory === 'all' ? 'active' : ''} onClick={() => setFilterCategory('all')}>Все ({clients.length})</button>
                        <button className={filterCategory === 'regular' ? 'active' : ''} onClick={() => setFilterCategory('regular')}>Постоянные</button>
                        <button className={filterCategory === 'new' ? 'active' : ''} onClick={() => setFilterCategory('new')}>Новые</button>
                        <button className={filterCategory === 'inactive' ? 'active' : ''} onClick={() => setFilterCategory('inactive')}>Без визитов</button>
                    </div>

                    {/* Sort Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Сортировка:</span>
                        <select 
                            className="select" 
                            style={{ minWidth: 150, padding: '6px 12px', minHeight: 36 }}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="visits">По числу визитов</option>
                            <option value="spent">По сумме чеков</option>
                            <option value="recent">По последнему визиту</option>
                            <option value="name">По имени (А-Я)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Clients List */}
            {loading ? (
                <div className="empty-state">Загрузка клиентов...</div>
            ) : filteredClients.length === 0 ? (
                <div className="empty-state card" style={{ padding: 40 }}>
                    <Users size={40} color="var(--text-dim)" style={{ marginBottom: 12 }} />
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                        {search ? 'Клиенты не найдены' : 'Список клиентов пуст'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        {search ? 'Попробуйте изменить поисковый запрос' : 'Добавьте первого клиента или создайте запись в календаре'}
                    </div>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={16} /> Добавить клиента
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filteredClients.map((client) => {
                        const badge = getClientBadge(client.visits || 0, client.total_spent || 0);
                        const initials = (client.name || 'К').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                        return (
                            <div 
                                key={client.id}
                                className="hcard"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 18px',
                                    gap: 16,
                                    flexWrap: 'wrap'
                                }}
                            >
                                {/* Left Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 200, flex: 1 }}>
                                    <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        background: 'var(--green-glow)',
                                        color: 'var(--green)',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: 15,
                                        flexShrink: 0
                                    }}>
                                        {initials}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: 15 }}>{client.name}</span>
                                            <span style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: '2px 8px',
                                                borderRadius: 999,
                                                background: badge.bg,
                                                color: badge.color,
                                                border: `1px solid ${badge.color}33`
                                            }}>
                                                {badge.label}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                                            <a 
                                                href={`tel:${client.phone}`}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'inherit' }}
                                                title="Позвонить"
                                            >
                                                <Phone size={12} color="var(--green)" />
                                                <span>{client.phone}</span>
                                            </a>
                                            <a 
                                                href={getWhatsAppLink(client.phone)} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#25D366' }}
                                                title="Написать в WhatsApp"
                                            >
                                                <MessageCircle size={12} />
                                                <span>WhatsApp</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                                    <div style={{ textAlign: 'center', minWidth: 70 }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Визитов</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                                            {client.visits || 0}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Выручка</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)', marginTop: 2 }}>
                                            {(client.total_spent || 0).toLocaleString()} ₸
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center', minWidth: 90 }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Посл. визит</div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {client.last_visit || 'Нет'}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={() => openHistoryModal(client)}
                                        title="История записей"
                                        style={{ gap: 4 }}
                                    >
                                        <History size={14} color="var(--green)" />
                                        <span>История</span>
                                    </button>

                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={() => openEditModal(client)}
                                        title="Редактировать"
                                        style={{ padding: '8px 10px' }}
                                    >
                                        <Edit2 size={14} />
                                    </button>

                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={() => handleDeleteClient(client)}
                                        title="Удалить"
                                        style={{ padding: '8px 10px', color: 'var(--status-cancelled)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Modal */}
            {modalOpen && (
                <div className="modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: 'rgba(var(--green-rgb, 74, 222, 128), 0.12)',
                                    border: '1px solid rgba(var(--green-rgb, 74, 222, 128), 0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--green)', flexShrink: 0
                                }}>
                                    <Users size={22} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 18 }}>{form.id ? 'Редактировать клиента' : 'Новый клиент'}</h2>
                                    <div className="modal-subtitle">
                                        {form.id ? 'Изменение контактных данных клиента' : 'Внесите контакты нового клиента в базу'}
                                    </div>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveClient}>
                            <div className="form-group">
                                <label>Имя клиента</label>
                                <input
                                    className="input"
                                    type="text"
                                    required
                                    placeholder="Например, Арман"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>Номер телефона</label>
                                <input
                                    className="input"
                                    type="tel"
                                    required
                                    placeholder="+7 (777) 123-45-67"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Заметки / Предпочтения (необязательно)</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    placeholder="Любимая стрижка, напиток, аллергии и т.д."
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    style={{ flex: 1 }}
                                    onClick={() => setModalOpen(false)}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={saving}
                                >
                                    {saving ? 'Сохранение...' : 'Сохранить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {historyModalOpen && selectedClient && (
                <div className="modal-overlay" onClick={() => setHistoryModalOpen(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: 'rgba(var(--green-rgb, 74, 222, 128), 0.12)',
                                    border: '1px solid rgba(var(--green-rgb, 74, 222, 128), 0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--green)', flexShrink: 0
                                }}>
                                    <History size={22} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 18 }}>История: {selectedClient.name}</h2>
                                    <div className="modal-subtitle">
                                        {selectedClient.phone} · Всего визитов: {selectedClient.visits || 0}
                                    </div>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setHistoryModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        {loadingHistory ? (
                            <div className="empty-state">Загрузка истории...</div>
                        ) : clientHistory.length === 0 ? (
                            <div className="empty-state" style={{ padding: '30px 10px' }}>
                                У клиента пока нет завершенных или запланированных записей.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                                {clientHistory.map((b) => (
                                    <div key={b.id} className="card" style={{ padding: '12px 14px', background: 'var(--bg-panel)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 14 }}>
                                                    {b.service_name || 'Стрижка'}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Calendar size={12} />
                                                    <span>{b.date} в {b.time?.slice(0, 5)}</span>
                                                    <span>· Мастер: {b.barber_name || 'Не указан'}</span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--green)' }}>
                                                    {(b.price || 0).toLocaleString()} ₸
                                                </div>
                                                <span className={`badge badge-${b.status}`} style={{ marginTop: 4 }}>
                                                    {b.status === 'done' ? 'Выполнено' : b.status === 'confirmed' ? 'Принято' : b.status === 'cancelled' ? 'Отменено' : b.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: 20 }}>
                            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setHistoryModalOpen(false)}>
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
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
