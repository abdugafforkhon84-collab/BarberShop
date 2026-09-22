/**
 * pages/admin/Payments.jsx
 * ------------------------------------------------------------
 * "Выплаты": record payouts made to each barber.
 * Now acts as an accounting dashboard showing live balances.
 * ------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Wallet, DollarSign } from 'lucide-react';
import { paymentsApi, barbersApi } from '../../api';
import { useToast } from '../../components/Toast';
import CustomSelect from '../../components/CustomSelect';
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
    const [form, setForm] = useState(emptyForm);

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

    async function remove(id) {
        if (!confirm('Удалить выплату? Баланс сотрудника будет пересчитан.')) return;
        await paymentsApi.remove(id);
        showToast('Выплата удалена');
        load();
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
                    <h2 style={{ fontSize: 18, marginBottom: 16 }}>Балансы сотрудников</h2>
                    {balances.length === 0 ? (
                        <p className="empty-state">Нет активных сотрудников</p>
                    ) : (
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
                    )}

                    <h2 style={{ fontSize: 18, marginBottom: 16 }}>История выплат</h2>
                    {payments.length === 0 ? (
                        <p className="empty-state">Выплат пока нет</p>
                    ) : (
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
                    )}
                </>
            )}

            {modalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal-box" style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h2>Новая выплата</h2>
                            <button className="modal-close" onClick={() => setModalOpen(false)}><X size={20} /></button>
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
                                <button type="submit" className="btn btn-primary">Сохранить</button>
                                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Отмена</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
