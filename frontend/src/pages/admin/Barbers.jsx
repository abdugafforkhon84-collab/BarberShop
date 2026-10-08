/**
 * pages/admin/Barbers.jsx
 * ------------------------------------------------------------
 * "Барберы": admin manages barber accounts.
 * - Create: login, password, name, phone, percent
 * - Edit percent: click "%" button on barber card
 * - Toggle active, reset password, delete
 * ------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { X, Trash2, KeyRound, Power, Plus, Percent, Phone } from 'lucide-react';
import { barbersApi } from '../../api';
import { useToast } from '../../components/Toast';
import { formatDate } from '../../utils';
import ConfirmModal from '../../components/ConfirmModal';

const emptyForm = { login: '', password: '', full_name: '', phone: '', salary_type: 'percent', salary_amount: 50, barber_percent: 50 };

export default function AdminBarbers() {
    const showToast = useToast();
    const [barbers, setBarbers]       = useState([]);
    const [loading, setLoading]       = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [editBarber, setEditBarber] = useState(null);
    const [editSalaryType, setEditSalaryType] = useState('percent');
    const [editSalaryAmount, setEditSalaryAmount] = useState(50);
    const [form, setForm]             = useState(emptyForm);
    const [confirmConfig, setConfirmConfig] = useState(null);

    useEffect(() => { load(); }, []);

    // Lock body scroll on any modal open
    useEffect(() => {
        const open = createOpen || !!editBarber;
        document.body.classList.toggle('modal-open', open);
        return () => document.body.classList.remove('modal-open');
    }, [createOpen, editBarber]);

    async function load() {
        setLoading(true);
        try { setBarbers(await barbersApi.list()); }
        finally { setLoading(false); }
    }

    // ── Create ──
    function openCreate() { setForm(emptyForm); setCreateOpen(true); }

    async function handleCreate(e) {
        e.preventDefault();
        try {
            await barbersApi.create(form);
            showToast('Барбер добавлен');
            setCreateOpen(false);
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения', true);
        }
    }

    // ── Edit salary ──
    function openEditSalary(b) {
        setEditBarber(b);
        setEditSalaryType(b.salary_type || 'percent');
        setEditSalaryAmount(b.salary_amount ?? b.barber_percent ?? 50);
    }

    async function handleSaveSalary(e) {
        e.preventDefault();
        try {
            await barbersApi.update(editBarber.id, { 
                salary_type: editSalaryType, 
                salary_amount: Number(editSalaryAmount), 
                barber_percent: Number(editSalaryAmount) 
            });
            showToast('Зарплата обновлена');
            setEditBarber(null);
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка', true);
        }
    }

    // ── Other actions ──
    async function toggleActive(b) {
        await barbersApi.update(b.id, { is_active: !b.is_active });
        showToast(b.is_active ? 'Барбер отключён' : 'Барбер включён');
        load();
    }

    async function resetPassword(b) {
        const newPassword = prompt(`Новый пароль для ${b.full_name}:`);
        if (!newPassword) return;
        await barbersApi.update(b.id, { password: newPassword });
        showToast('Пароль обновлён');
    }

    async function remove(b) {
        setConfirmConfig({
            title: 'Удаление барбера',
            text: `Вы уверены, что хотите удалить сотрудника ${b.full_name}? Действие необратимо.`,
            danger: true,
            confirmText: 'Удалить',
            action: async () => {
                try {
                    await barbersApi.remove(b.id);
                    showToast('Барбер удалён');
                    load();
                } catch (err) {
                    showToast('Ошибка удаления', true);
                }
            }
        });
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Барберы</h1>
                    <div className="subtitle">Управление сотрудниками, логины и пароли для входа</div>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Добавить барбера</button>
            </div>

            {loading && <p className="empty-state">Загрузка...</p>}
            {!loading && barbers.length === 0 && <p className="empty-state">Барберов пока нет — добавьте первого</p>}

            <div className="grid grid-3">
                {barbers.map((b) => (
                    <div className="card" key={b.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <h3>{b.full_name}</h3>
                            <span className={`badge ${b.is_active ? 'badge-done' : 'badge-cancelled'}`}>
                                {b.is_active ? 'Активен' : 'Отключён'}
                            </span>
                        </div>

                        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 2 }}>Логин</div>
                        <div style={{ marginBottom: 10 }}>
                            <code style={{ background: 'var(--bg-panel)', padding: '4px 8px', borderRadius: 6, fontSize: 13 }}>{b.login}</code>
                        </div>

                        {b.phone && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={12} /> {b.phone}</div>}

                        {/* Percent badge — clickable */}
                            <div
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                background: 'rgba(51,209,122,0.1)', border: '1px solid var(--green)',
                                borderRadius: 999, padding: '4px 12px', marginBottom: 14,
                                cursor: 'pointer', transition: 'background 0.18s',
                            }}
                            onClick={() => openEditSalary(b)}
                            title="Нажмите чтобы изменить зарплату"
                        >
                            <Percent size={13} style={{ color: 'var(--green)' }} />
                            <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 14 }}>
                                {b.salary_type === 'fixed' ? 'Оклад' : b.salary_type === 'daily' ? 'Ставка/день' : 'Процент'}: {b.salary_amount ?? b.barber_percent ?? 50}{b.salary_type === 'percent' ? '%' : '₸'}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>изменить</span>
                        </div>

                        <div style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 16 }}>Добавлен {formatDate(b.created_at?.slice(0, 10))}</div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button className="btn btn-sm btn-outline" onClick={() => resetPassword(b)}><KeyRound size={14} /> Пароль</button>
                            <button className="btn btn-sm btn-outline" onClick={() => toggleActive(b)}><Power size={14} /> {b.is_active ? 'Отключить' : 'Включить'}</button>
                            <button className="btn btn-sm btn-danger" onClick={() => remove(b)}><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Create modal ── */}
            {createOpen && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h2>Новый барбер</h2>
                            <button className="modal-close" onClick={() => setCreateOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>Имя барбера</label>
                                <input className="form-control" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Телефон</label>
                                <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Логин для входа</label>
                                <input className="form-control" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required minLength={3} />
                            </div>
                            <div className="form-group">
                                <label>Пароль</label>
                                <input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={4} />
                            </div>
                            <div className="form-group">
                                <label>Способ выплаты</label>
                                <select className="form-control" value={form.salary_type} onChange={(e) => setForm({ ...form, salary_type: e.target.value })}>
                                    <option value="percent">Процент от услуг (%)</option>
                                    <option value="fixed">Оклад (фиксированная сумма в месяц)</option>
                                    <option value="daily">Дневная ставка (за смену)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{form.salary_type === 'percent' ? 'Процент от приёма (%)' : 'Сумма (₸)'}</label>
                                <input type="number" className="form-control" value={form.salary_amount} onChange={(e) => setForm({ ...form, salary_amount: Number(e.target.value), barber_percent: Number(e.target.value) })} min="0" step="1" required />
                                {form.salary_type === 'percent' && (
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                        Например: 50 означает, что барбер получает 50% от стоимости каждого заказа
                                    </div>
                                )}
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary">Добавить</button>
                                <button type="button" className="btn btn-outline" onClick={() => setCreateOpen(false)}>Отмена</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit salary modal ── */}
            {editBarber && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 340 }}>
                        <div className="modal-header">
                            <h2>Зарплата</h2>
                            <button className="modal-close" onClick={() => setEditBarber(null)}><X size={20} /></button>
                        </div>
                        <div style={{ marginBottom: 16, fontWeight: 600 }}>{editBarber.full_name}</div>
                        <form onSubmit={handleSaveSalary}>
                            <div className="form-group">
                                <label>Способ выплаты</label>
                                <select className="form-control" value={editSalaryType} onChange={(e) => setEditSalaryType(e.target.value)}>
                                    <option value="percent">Процент от услуг (%)</option>
                                    <option value="fixed">Оклад (фиксированная сумма в месяц)</option>
                                    <option value="daily">Дневная ставка (за смену)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{editSalaryType === 'percent' ? 'Процент (%)' : 'Сумма (₸)'}</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={editSalaryAmount}
                                    onChange={(e) => setEditSalaryAmount(e.target.value)}
                                    min="0" step="1"
                                    autoFocus
                                    required
                                />
                            </div>
                            {editSalaryType === 'percent' && (
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                                    При заказе на 10 000 ₸ → барбер получит {Math.round(10000 * editSalaryAmount / 100)} ₸
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Сохранить</button>
                                <button type="button" className="btn btn-outline" onClick={() => setEditBarber(null)}>Отмена</button>
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
