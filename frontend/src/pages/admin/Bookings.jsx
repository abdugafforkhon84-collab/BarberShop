/**
 * pages/admin/Bookings.jsx
 * ------------------------------------------------------------
 * «Записи клиентов»: недельный календарь. При создании записи
 * нужны только имя + телефон клиента + барбер + дата + время.
 * Услугу и оплату выбирает барбер сам через свою историю.
 * Несколько записей в одном слоте отображаются горизонтально.
 * ------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, Users, X, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { adminBookingsApi, barbersApi, sharedSettingsApi, clientsApi } from '../../api';
import { useToast } from '../../components/Toast';
import CustomSelect from '../../components/CustomSelect';
import WeeklyCalendar, { getWeekStart } from '../../components/WeeklyCalendar';
import ConfirmModal from '../../components/ConfirmModal';
import { STATUS_LABELS } from '../../utils';

function toDateStr(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

const emptyForm = {
    id: null,
    client_name: '',
    client_phone: '',
    barber_id: '',
    date: toDateStr(new Date()),
    time: '10:00',
    status: 'confirmed',
    comment: '',
};

const CALENDAR_STATUSES = [
    { key: 'pending',     label: 'Ожидает',    color: 'var(--status-pending)' },
    { key: 'confirmed',   label: 'Принято',    color: 'var(--status-confirmed)' },
    { key: 'rescheduled', label: 'Перенесено', color: 'var(--status-rescheduled)' },
    { key: 'done',        label: 'Выполнено',  color: 'var(--status-done)' },
    { key: 'cancelled',   label: 'Отменено',   color: 'var(--status-cancelled)' },
];

export default function AdminBookings() {
    const showToast = useToast();
    const navigate = useNavigate();
    const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
    const [bookings, setBookings]   = useState([]);
    const [barbers, setBarbers]     = useState([]);
    const [settings, setSettings]   = useState({ work_start: '08:00', work_end: '22:00', slot_minutes: 30 });
    const [clientsList, setClientsList] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm]           = useState(emptyForm);
    const [confirmConfig, setConfirmConfig] = useState(null);

    useEffect(() => {
        if (modalOpen) document.body.classList.add('modal-open');
        else           document.body.classList.remove('modal-open');
        return () => document.body.classList.remove('modal-open');
    }, [modalOpen]);

    useEffect(() => { loadStatic(); }, []);
    useEffect(() => { loadBookings(); }, [weekStart]);

    async function loadStatic() {
        try {
            const [br, st, cl] = await Promise.all([barbersApi.list(), sharedSettingsApi.get(), clientsApi.list()]);
            setBarbers(br);
            setSettings(st);
            setClientsList(cl || []);
        } catch { showToast('Ошибка загрузки данных', true); }
    }

    async function loadBookings() {
        setLoading(true);
        try {
            const date_from = toDateStr(weekStart);
            const date_to   = toDateStr(addDays(weekStart, 6));
            setBookings(await adminBookingsApi.list({ date_from, date_to }));
        } catch { showToast('Ошибка загрузки записей', true); }
        finally { setLoading(false); }
    }

    function openCreateModal(dateStr, timeStr) {
        setForm({ ...emptyForm, date: dateStr, time: timeStr });
        setModalOpen(true);
    }

    function openEditModal(b) {
        setForm({
            id:           b.id,
            client_name:  b.client_name,
            client_phone: b.client_phone,
            barber_id:    b.barber_id || '',
            date:         b.date,
            time:         b.time.slice(0, 5),
            status:       b.status,
            comment:      b.comment || '',
        });
        setModalOpen(true);
    }

    function closeModal() { setModalOpen(false); }

    async function handleSave(e) {
        e.preventDefault();
        if (!form.client_name.trim() || !form.client_phone.trim()) {
            showToast('Введите имя и телефон клиента', true);
            return;
        }
        try {
            const payload = {
                client_name:  form.client_name.trim(),
                client_phone: form.client_phone.trim(),
                barber_id:    form.barber_id || null,
                date:         form.date,
                time:         form.time,
                comment:      form.comment,
            };
            if (form.id) {
                await adminBookingsApi.update(form.id, { ...payload, status: form.status });
            } else {
                await adminBookingsApi.create(payload);
            }
            showToast('Запись сохранена');
            closeModal();
            loadBookings();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения', true);
        }
    }

    async function markDone() {
        if (!form.id) return;
        try {
            await adminBookingsApi.update(form.id, { status: 'done' });
            showToast('Отмечено как выполнено');
            closeModal();
            navigate('/admin/history?pay=' + form.id);
        } catch (err) { showToast(err.response?.data?.detail || 'Ошибка', true); }
    }

    async function markCancelled() {
        if (!form.id) return;
        setConfirmConfig({
            title: 'Отмена записи',
            text: 'Вы уверены, что хотите отменить эту запись?',
            danger: true,
            action: async () => {
                try {
                    await adminBookingsApi.update(form.id, { status: 'cancelled' });
                    showToast('Запись отменена');
                    closeModal();
                    loadBookings();
                } catch (err) { showToast(err.response?.data?.detail || 'Ошибка', true); }
            }
        });
    }

    async function handleDelete() {
        if (!form.id) return;
        setConfirmConfig({
            title: 'Удаление',
            text: 'Вы уверены, что хотите полностью удалить эту запись? Действие необратимо.',
            danger: true,
            confirmText: 'Удалить',
            action: async () => {
                try {
                    await adminBookingsApi.delete(form.id);
                    showToast('Запись удалена');
                    closeModal();
                    loadBookings();
                } catch (err) { showToast(err.response?.data?.detail || 'Ошибка удаления', true); }
            }
        });
    }

    const isActiveBooking = form.id && form.status !== 'done' && form.status !== 'cancelled';

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Записи клиентов</h1>
                    <div className="subtitle">Кликните на пустой слот, чтобы записать клиента</div>
                </div>
            </div>

            <div className="legend">
                {CALENDAR_STATUSES.map(({ key, label, color }) => (
                    <div className="legend-item" key={key}>
                        <span className="legend-dot" style={{ background: color }} />
                        {label}
                    </div>
                ))}
            </div>

            {loading ? (
                <p className="empty-state">Загрузка...</p>
            ) : (
                <WeeklyCalendar
                    weekStart={weekStart}
                    onWeekChange={setWeekStart}
                    bookings={bookings}
                    workStart={settings.work_start}
                    workEnd={settings.work_end}
                    slotMinutes={settings.slot_minutes}
                    onSlotClick={openCreateModal}
                    onBookingClick={openEditModal}
                    showBarberName={true}
                />
            )}

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <div>
                                <h2>{form.id ? 'Редактировать запись' : 'Новая запись'}</h2>
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    marginTop: 6, background: 'var(--bg-panel)',
                                    borderRadius: 99, padding: '4px 12px',
                                    fontSize: 12, color: 'var(--text-muted)', fontWeight: 600,
                                }}>
                                    {form.date} · {form.time?.slice(0, 5)}
                                </div>
                            </div>
                            <button className="modal-close" onClick={closeModal}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSave}>
                            {/* Client */}
                            <datalist id="admin-clients-list">
                                {clientsList.map(c => <option key={c.id} value={c.name} />)}
                            </datalist>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Имя клиента</label>
                                    <input
                                        className="form-control"
                                        list="admin-clients-list"
                                        value={form.client_name}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const match = clientsList.find(c => c.name === val);
                                            if (match) setForm({ ...form, client_name: val, client_phone: match.phone || form.client_phone });
                                            else setForm({ ...form, client_name: val });
                                        }}
                                        placeholder="Алмат"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Телефон</label>
                                    <input
                                        className="form-control"
                                        value={form.client_phone}
                                        onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                                        placeholder="+7 777 000 00 00"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Barber */}
                            <div className="form-group">
                                <label>Барбер</label>
                                <CustomSelect 
                                    value={form.barber_id} 
                                    onChange={(val) => setForm({ ...form, barber_id: val })}
                                    options={[
                                        { value: '', label: 'Не назначен' },
                                        ...barbers.map(b => ({ value: b.id, label: b.full_name }))
                                    ]}
                                />
                            </div>

                            {/* Status (edit only) */}
                            {form.id && (
                                <div className="form-group">
                                    <label>Статус</label>
                                    <CustomSelect 
                                        value={form.status} 
                                        onChange={(val) => setForm({ ...form, status: val })}
                                        options={CALENDAR_STATUSES.map(({ key, label }) => ({ value: key, label }))}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Сохранить</button>
                                {isActiveBooking && (
                                    <button type="button" className="btn btn-success" style={{ width: '100%' }} onClick={markDone}>
                                        <CheckCircle size={16} /> Выполнено
                                    </button>
                                )}
                                {isActiveBooking && (
                                    <button type="button" className="btn btn-outline" onClick={markCancelled} style={{ width: '100%', color: 'var(--status-cancelled)', borderColor: 'var(--status-cancelled)' }}>
                                        <XCircle size={16} /> Отменить
                                    </button>
                                )}
                                {form.id && (
                                    <button type="button" className="btn btn-danger" style={{ width: '100%' }} onClick={handleDelete}>Удалить</button>
                                )}
                                <button type="button" className="btn btn-outline" style={{ width: '100%', gridColumn: form.id ? '1 / -1' : 'auto' }} onClick={closeModal}>Закрыть</button>
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
