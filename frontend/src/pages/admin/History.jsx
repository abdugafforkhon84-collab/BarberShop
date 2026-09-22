import { useEffect, useState, useMemo } from 'react';
import { barbersApi, adminHistoryApi } from '../../api';
import { useToast } from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';
import CustomSelect from '../../components/CustomSelect';
import { formatMoney, formatDate } from '../../utils';
import { 
    History, 
    Search, 
    RotateCcw, 
    CheckCircle2, 
    Wallet, 
    CreditCard, 
    Trash2, 
    Scissors, 
    Clock, 
    Calendar,
    XCircle,
    User,
    Check,
    Filter
} from 'lucide-react';

export default function AdminHistory() {
    const showToast = useToast();
    const [bookings, setBookings] = useState([]);
    const [barbers, setBarbers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedBarber, setSelectedBarber] = useState('');
    const [statusFilter, setStatusFilter] = useState('done'); // 'done', 'cancelled', 'all'
    const [paidFilter, setPaidFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');

    // Delete modal
    const [deleteId, setDeleteId] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    function loadData() {
        setLoading(true);
        Promise.all([
            adminHistoryApi.list(), // fetch all completed & archived bookings
            barbersApi.list(),
        ])
            .then(([bRes, barRes]) => {
                setBookings(bRes || []);
                setBarbers(barRes || []);
            })
            .catch((err) => showToast(err.response?.data?.detail || 'Ошибка загрузки данных', true))
            .finally(() => setLoading(false));
    }

    const filteredBookings = useMemo(() => {
        return bookings.filter((b) => {
            // Status filter
            if (statusFilter === 'done' && b.status !== 'done') return false;
            if (statusFilter === 'cancelled' && b.status !== 'cancelled') return false;

            if (search) {
                const s = search.toLowerCase();
                const matchName = b.client_name?.toLowerCase().includes(s);
                const matchPhone = b.client_phone?.toLowerCase().includes(s);
                const matchService = b.service_name?.toLowerCase().includes(s);
                if (!matchName && !matchPhone && !matchService) return false;
            }

            if (selectedBarber && b.barber_id !== Number(selectedBarber)) return false;
            if (paidFilter === 'paid' && !b.is_paid) return false;
            if (paidFilter === 'unpaid' && b.is_paid) return false;
            if (dateFrom && b.date < dateFrom) return false;

            return true;
        });
    }, [bookings, search, selectedBarber, statusFilter, paidFilter, dateFrom]);

    const stats = useMemo(() => {
        const totalAmount = filteredBookings.reduce((sum, b) => sum + (b.total_paid || b.final_price || b.service_price || b.price || 0), 0);
        const paidCount = filteredBookings.filter((b) => b.is_paid).length;
        const doneCount = filteredBookings.filter((b) => b.status === 'done').length;
        return { totalAmount, paidCount, doneCount, total: filteredBookings.length };
    }, [filteredBookings]);

    function confirmDelete() {
        if (!deleteId) return;
        adminHistoryApi.remove(deleteId)
            .then(() => {
                showToast('Запись успешно удалена');
                setBookings((prev) => prev.filter((b) => b.id !== deleteId));
            })
            .catch((err) => showToast(err.response?.data?.detail || 'Не удалось удалить', true))
            .finally(() => setDeleteId(null));
    }

    const hasFilters = search || selectedBarber || paidFilter || dateFrom || statusFilter !== 'done';

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.5rem', margin: 0 }}>
                        <History size={24} color="var(--green)" />
                        История записей
                    </h1>
                    <div className="subtitle" style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
                        Архив выполненных и прошлых записей клиентов
                    </div>
                </div>
                <button 
                    className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`} 
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={16} /> {hasFilters && !showFilters ? 'Фильтры (активны)' : 'Фильтры'}
                </button>
            </div>

            {/* Filter Controls Panel */}
            {showFilters && (
                <div className="card" style={{ padding: 16, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div className="form-row" style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: 10 }}>
                    
                    {/* Search */}
                    <div className="form-group" style={{ marginBottom: 0, flex: 2, minWidth: 160 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>
                            Поиск клиента / услуги
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="form-control"
                                style={{ paddingLeft: 30, height: 36, fontSize: 13 }}
                                placeholder="Имя, телефон..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Barber Select */}
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 120 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>
                            Барбер
                        </label>
                        <CustomSelect 
                            value={selectedBarber}
                            onChange={(val) => setSelectedBarber(val)}
                            options={[
                                { value: '', label: 'Все' },
                                ...barbers.map(b => ({ value: b.id, label: b.full_name }))
                            ]}
                        />
                    </div>

                    {/* Status Select */}
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 110 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>
                            Статус
                        </label>
                        <CustomSelect 
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val)}
                            options={[
                                { value: 'done', label: 'Выполнено' },
                                { value: 'cancelled', label: 'Отменено' },
                                { value: 'all', label: 'Все' }
                            ]}
                        />
                    </div>

                    {/* Payment Select */}
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 110 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>
                            Оплата
                        </label>
                        <CustomSelect 
                            value={paidFilter}
                            onChange={(val) => setPaidFilter(val)}
                            options={[
                                { value: '', label: 'Все' },
                                { value: 'paid', label: 'Оплачено' },
                                { value: 'unpaid', label: 'Долг' }
                            ]}
                        />
                    </div>

                    {/* Date From */}
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 120 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>
                            С даты
                        </label>
                        <input
                            type="date"
                            className="form-control"
                            style={{ height: 36, fontSize: 13, padding: '0 8px' }}
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>

                    {/* Reset Button */}
                    {hasFilters && (
                        <button
                            type="button"
                            className="btn btn-outline"
                            style={{ height: 36, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                            onClick={() => { setSearch(''); setSelectedBarber(''); setStatusFilter('done'); setPaidFilter(''); setDateFrom(''); }}
                        >
                            <RotateCcw size={12} />
                            Сброс
                        </button>
                    )}
                </div>
            </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-3" style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div className="card stat-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(51, 209, 122, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', flexShrink: 0 }}>
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Выполнено записей</div>
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2, color: 'var(--text-main)' }}>{stats.doneCount}</div>
                    </div>
                </div>

                <div className="card stat-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(51, 209, 122, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', flexShrink: 0 }}>
                        <Wallet size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Выручка по выборке</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)', marginTop: 2 }}>
                            {formatMoney(stats.totalAmount)}
                        </div>
                    </div>
                </div>

                <div className="card stat-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(61, 139, 253, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3d8bfd', flexShrink: 0 }}>
                        <CreditCard size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Оплачено заказов</div>
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2, color: 'var(--text-main)' }}>
                            {stats.paidCount} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>/ {stats.total}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="card empty-state" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>Загрузка истории записей...</p>
                </div>
            ) : filteredBookings.length === 0 ? (
                <div className="card empty-state" style={{ padding: 48, textAlign: 'center', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <History size={36} style={{ color: 'var(--text-dim)', marginBottom: 12 }} />
                    <h3 style={{ fontSize: 15, color: 'var(--text-main)', margin: '0 0 4px 0' }}>Записей не найдено</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                        {hasFilters ? 'Попробуйте сбросить параметры поиска' : 'В истории пока нет записей'}
                    </p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Дата и время</th>
                                    <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Клиент</th>
                                    <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Барбер</th>
                                    <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Услуга и допы</th>
                                    <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Сумма</th>
                                    <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Статус</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBookings.map((b) => {
                                    const price = b.total_paid || b.final_price || b.service_price || b.price || 0;
                                    const extrasList = b.extra_services || b.extras || [];

                                    return (
                                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{formatDate(b.date)}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Clock size={12} /> {b.time?.slice(0, 5) || '—'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-main)' }}>{b.client_name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{b.client_phone || 'Без телефона'}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                                    <Scissors size={14} color="var(--text-muted)" />
                                                    <span>{b.barber_name || 'Не указан'}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: 500, fontSize: 13 }}>{b.service_name || 'Услуга не указана'}</div>
                                                {Array.isArray(extrasList) && extrasList.length > 0 && (
                                                    <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {extrasList.map((ex, idx) => (
                                                            <span key={idx} style={{ background: 'rgba(51, 209, 122, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                                                +{ex}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--green)' }}>
                                                    {formatMoney(price)}
                                                </div>
                                                {b.payment_method && (
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                        {b.payment_method === 'kaspi' ? 'Kaspi' : b.payment_method === 'cash' ? 'Наличные' : b.payment_method}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                {b.status === 'cancelled' ? (
                                                    <span style={{ background: 'rgba(240, 75, 75, 0.15)', color: 'var(--status-cancelled)', border: '1px solid rgba(240, 75, 75, 0.3)', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                                                        Отменено
                                                    </span>
                                                ) : b.is_paid ? (
                                                    <span style={{ background: 'rgba(51, 209, 122, 0.15)', color: 'var(--green)', border: '1px solid rgba(51, 209, 122, 0.3)', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                                                        Оплачено
                                                    </span>
                                                ) : (
                                                    <span style={{ background: 'rgba(240, 196, 25, 0.15)', color: '#f0c419', border: '1px solid rgba(240, 196, 25, 0.3)', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                                                        Не оплачено
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-icon"
                                                    onClick={() => setDeleteId(b.id)}
                                                    title="Удалить запись из истории"
                                                    style={{ color: 'var(--status-cancelled)', padding: 6, borderRadius: 8, background: 'transparent', border: 'none' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {deleteId && (
                <ConfirmModal
                    title="Удалить запись из истории?"
                    text="Вы действительно хотите полностью удалить эту запись? Данная операция необратима."
                    confirmText="Удалить"
                    danger
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteId(null)}
                />
            )}
        </div>
    );
}




