/**
 * pages/admin/Payments.jsx
 * ------------------------------------------------------------
 * "Выплаты": record payouts made to each barber.
 * Now acts as an accounting dashboard showing live balances.
 * ------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Wallet, DollarSign, LayoutGrid, List } from 'lucide-react';
import { paymentsApi, barbersApi } from '../../api';
import { useToast } from '../../components/Toast';
import CustomSelect from '../../components/CustomSelect';
import ConfirmModal from '../../components/ConfirmModal';
import { formatDate, formatMoney } from '../../utils';

const emptyForm = {
    barber_id: '', amount: '', period_from: '', period_to: '', status: 'paid', comment: '',
};

export default function AdminPayments() {
    const showToast = useToast();
    const [payments, setPayments] = useState([]);
    const [balances, setBalances] = useState([]);
    const [barbers, setBarbers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deletePaymentId, setDeletePaymentId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('barberpro_payments_view') || 'grid';
    });

    function handleViewChange(mode) {
        setViewMode(mode);
        localStorage.setItem('barberpro_payments_view', mode);
    }

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [p, b, bal] = await Promise.all([paymentsApi.list(), barbersApi.list(), paymentsApi.balances()]);
            setPayments(p);
            setBarbers(b);
            setBalances(bal);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    function openModal(prefillBarberId = '', prefillAmount = '') {
        const today = new Date().toISOString().slice(0, 10);
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
        setForm({ 
            ...emptyForm, 
            barber_id: prefillBarberId, 
            amount: prefillAmount > 0 ? prefillAmount : '', 
            period_from: firstDay, 
            period_to: today 
        });
        setModalOpen(true);
    }

    async function handleSave(e) {
        e.preventDefault();
        try {
            await paymentsApi.create({ ...form, barber_id: Number(form.barber_id), amount: Number(form.amount) });
            showToast('Выплата сохранена');
            setModalOpen(false);
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения', true);
        }
    }

    function remove(id) {
        setDeletePaymentId(id);
    }

    async function executeRemove() {
        if (!deletePaymentId) return;
        try {
            await paymentsApi.remove(deletePaymentId);
            showToast('Выплата удалена');
            setDeletePaymentId(null);
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка при удалении', true);
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Выплаты и Балансы</h1>
                    <div className="subtitle">Бухгалтерия и расчет зарплат</div>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()} disabled={barbers.length === 0}>
                    <Plus size={16} /> Ручная выплата
                </button>
            </div>

            {loading && <p className="empty-state">Загрузка...</p>}

            {!loading && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                        <h2 style={{ fontSize: 18, margin: 0 }}>Балансы сотрудников</h2>

                        {/* View Switcher: Card vs List */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: 3,
                            gap: 2
                        }}>
                            <button
                                type="button"
                                onClick={() => handleViewChange('grid')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '5px 9px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    background: viewMode === 'grid' ? 'var(--green)' : 'transparent',
                                    color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Отображение карточками"
                            >
                                <LayoutGrid size={14} />
                                <span>Карточки</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleViewChange('list')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '5px 9px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    background: viewMode === 'list' ? 'var(--green)' : 'transparent',
                                    color: viewMode === 'list' ? '#fff' : 'var(--text-muted)',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Отображение списком"
                            >
                                <List size={14} />
                                <span>Список</span>
                            </button>
                        </div>
                    </div>

                    {balances.length === 0 ? (
                        <p className="empty-state">Нет активных сотрудников</p>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-3" style={{ marginBottom: 32 }}>
                            {balances.map(b => (
                                <div className="card" key={b.barber_id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: 16 }}>{b.barber_name}</h3>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ставка: {b.barber_percent}%</div>
                                        </div>
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(51, 209, 122, 0.1)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Wallet size={20} />
                                        </div>
                                    </div>
                                    
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>К выплате (Долг):</div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: b.balance > 0 ? 'var(--status-cancelled)' : 'var(--text-main)' }}>
                                            {formatMoney(b.balance)}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
                                        <div>Заработано: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatMoney(b.total_earned)}</span></div>
                                        <div>Выплачено: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatMoney(b.total_paid)}</span></div>
                                    </div>

                                    <button 
                                        className="btn btn-primary" 
                                        style={{ width: '100%' }}
                                        onClick={() => openModal(b.barber_id, b.balance)}
                                        disabled={b.balance <= 0}
                                    >
                                        Выплатить
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 32 }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Сотрудник</th>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Ставка</th>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Заработано</th>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Выплачено</th>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>К выплате (Долг)</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {balances.map(b => (
                                            <tr key={b.barber_id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(var(--green-rgb, 74, 222, 128), 0.12)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                                            {(b.barber_name || 'М')[0].toUpperCase()}
                                                        </div>
                                                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                                                            {b.barber_name}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                                                    {b.barber_percent}%
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>
                                                    {formatMoney(b.total_earned)}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>
                                                    {formatMoney(b.total_paid)}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: 16, fontWeight: 800, color: b.balance > 0 ? 'var(--status-cancelled)' : 'var(--text-main)' }}>
                                                    {formatMoney(b.balance)}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    <button 
                                                        className="btn btn-sm btn-primary" 
                                                        onClick={() => openModal(b.barber_id, b.balance)}
                                                        disabled={b.balance <= 0}
                                                        style={{ padding: '6px 14px' }}
                                                    >
                                                        Выплатить
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <h2 style={{ fontSize: 18, marginBottom: 16 }}>История выплат</h2>
                    {payments.length === 0 ? (
                        <p className="empty-state">Выплат пока нет</p>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-3">
                            {payments.map((p) => (
                                <div className="card" key={p.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                        <h3>{p.barber_name}</h3>
                                        <span className={`badge ${p.status === 'paid' ? 'badge-done' : 'badge-pending'}`}>
                                            {p.status === 'paid' ? 'Выплачено' : 'Ожидает'}
                                        </span>
                                    </div>

                                    <div style={{ color: 'var(--green)', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{formatMoney(p.amount)}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>{formatDate(p.period_from)} — {formatDate(p.period_to)}</div>
                                    {p.comment && <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 14 }}>{p.comment}</div>}

                                    <button className="btn btn-sm btn-danger" style={{ marginTop: 10 }} onClick={() => remove(p.id)}><Trash2 size={14} /> Отменить</button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Сотрудник</th>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Период</th>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Сумма</th>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Статус</th>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Комментарий</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map(p => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>
                                                    {p.barber_name}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {formatDate(p.period_from)} — {formatDate(p.period_to)}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>
                                                    {formatMoney(p.amount)}
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span className={`badge ${p.status === 'paid' ? 'badge-done' : 'badge-pending'}`}>
                                                        {p.status === 'paid' ? 'Выплачено' : 'Ожидает'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-dim)' }}>
                                                    {p.comment || '—'}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)} style={{ padding: '4px 10px' }}>
                                                        <Trash2 size={13} /> Отменить
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {modalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal-box" style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: 'rgba(var(--green-rgb, 74, 222, 128), 0.12)',
                                    border: '1px solid rgba(var(--green-rgb, 74, 222, 128), 0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--green)', flexShrink: 0
                                }}>
                                    <Wallet size={22} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 18 }}>Новая выплата</h2>
                                    <div className="modal-subtitle">
                                        Начисление или выплата заработанных средств мастеру
                                    </div>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Барбер</label>
                                <CustomSelect 
                                    value={form.barber_id} 
                                    onChange={(val) => setForm({ ...form, barber_id: val })} 
                                    options={[
                                        { value: '', label: 'Выберите барбера...' },
                                        ...barbers.map(b => ({ value: b.id, label: b.full_name }))
                                    ]}
                                />
                            </div>
                            <div className="form-group">
                                <label>Сумма (₸)</label>
                                <input type="number" className="form-control" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min="1" step="any" required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Период с</label>
                                    <input type="date" className="form-control" value={form.period_from} onChange={(e) => setForm({ ...form, period_from: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>По</label>
                                    <input type="date" className="form-control" value={form.period_to} onChange={(e) => setForm({ ...form, period_to: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Статус</label>
                                <CustomSelect 
                                    value={form.status} 
                                    onChange={(val) => setForm({ ...form, status: val })} 
                                    options={[
                                        { value: 'paid', label: 'Выплачено' },
                                        { value: 'pending', label: 'Ожидает' }
                                    ]}
                                />
                            </div>
                            <div className="form-group">
                                <label>Комментарий</label>
                                <textarea className="form-control" rows={2} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Сохранить</button>
                                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Отмена</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete Payment Modal */}
            {deletePaymentId && (
                <ConfirmModal
                    title="Удаление выплаты"
                    text="Вы действительно хотите удалить эту запись о выплате? Баланс сотрудника будет автоматически пересчитан."
                    confirmText="Удалить выплату"
                    danger={true}
                    onConfirm={executeRemove}
                    onCancel={() => setDeletePaymentId(null)}
                />
            )}
        </>
    );
}
