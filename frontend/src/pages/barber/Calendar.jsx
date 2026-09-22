/**
 * pages/barber/Calendar.jsx
 * ------------------------------------------------------------
 * Календарь барбера.
 *
 * Форма новой записи:
 *   • Дата и время — берутся автоматически из нажатого слота (не вводятся вручную).
 *   • Услуга — НЕ выбирается при записи; клиент выбирает услугу ПОСЛЕ стрижки в «Истории».
 *   • Комментарий — убран.
 *   • Клиент — два таба: существующий (поиск) или новый (имя + телефон).
 *
 * В одном слоте можно создать сколько угодно записей (WeeklyCalendar показывает их вертикально).
 * ------------------------------------------------------------
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Calendar as CalIcon } from 'lucide-react';
import { barberApi, barberBookingsApi, sharedSettingsApi } from '../../api';
import { useToast } from '../../components/Toast';
import WeeklyCalendar, { getWeekStart } from '../../components/WeeklyCalendar';

function toDateStr(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmtDateRu(str) {
    if (!str) return '';
    const d = new Date(str);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

const STATUS_LABELS = {
    pending: 'Ожидает', confirmed: 'Принято',
    done: 'Выполнено', cancelled: 'Отменено', rescheduled: 'Перенесено',
};
const STATUS_COLORS = {
    pending: 'var(--status-pending)', confirmed: 'var(--status-confirmed)',
    done: 'var(--status-done)', cancelled: 'var(--status-cancelled)',
};
const STATUS_TEXT_COLOR = {
    pending: '#201800', confirmed: '#fff', done: '#06180f', cancelled: '#fff',
};

export default function BarberCalendar() {
    const showToast = useToast();
    const navigate = useNavigate();
    const [weekStart, setWeekStart]   = useState(() => getWeekStart(new Date()));
    const [bookings, setBookings]     = useState([]);
    const [settings, setSettings]     = useState({ work_start: '08:00', work_end: '22:00', slot_minutes: 30 });
    const [loading, setLoading]       = useState(true);

    // modal state
    const [modal, setModal] = useState(null); // null | { mode:'create'|'view', booking?, date?, time? }

    // Create form state
    const [tab, setTab]                     = useState('existing'); // 'existing' | 'new'
    const [search, setSearch]               = useState('');
    const [clients, setClients]             = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [newName, setNewName]             = useState('');
    const [newPhone, setNewPhone]           = useState('');
    const [searching, setSearching]         = useState(false);

    // Body scroll lock
    useEffect(() => {
        if (modal) document.body.classList.add('modal-open');
        else       document.body.classList.remove('modal-open');
        return () => document.body.classList.remove('modal-open');
    }, [modal]);

    useEffect(() => { loadStatic(); }, []);
    useEffect(() => { loadBookings(); }, [weekStart]);

    async function loadStatic() {
        try {
            const st = await sharedSettingsApi.get();
            setSettings(st);
        } catch { showToast('Ошибка загрузки настроек', true); }
    }

    async function loadBookings() {
        setLoading(true);
        try {
            const date_from = toDateStr(weekStart);
            const date_to   = toDateStr(addDays(weekStart, 6));
            const data = await barberApi.requests({ date_from, date_to });
            setBookings(data);
        } catch { showToast('Ошибка загрузки записей', true); }
        finally { setLoading(false); }
    }

    // Debounced client search
    const doSearch = useCallback(async (q) => {
        setSearching(true);
        try {
            const res = await barberApi.searchClients(q);
            setClients(res);
        } catch { setClients([]); }
        finally { setSearching(false); }
    }, []);

    useEffect(() => {
        if (tab !== 'existing') return;
        const timer = setTimeout(() => doSearch(search), 280);
        return () => clearTimeout(timer);
    }, [search, tab, doSearch]);

    // ── Modal helpers ──
    function openCreate(dateStr, timeStr) {
        setTab('existing');
        setSearch('');
        setClients([]);
        setSelectedClient(null);
        setNewName('');
        setNewPhone('');
        setModal({ mode: 'create', date: dateStr, time: timeStr });
        doSearch('');
    }

    function openView(booking) { setModal({ mode: 'view', booking }); }
    function closeModal() { setModal(null); }
    function selectClient(c) { setSelectedClient(c); }

    // ── Create booking (no service — selected later at payment) ──
    async function handleCreate(e) {
        e.preventDefault();
        let clientName, clientPhone;

        if (tab === 'existing') {
            if (!selectedClient) { showToast('Выберите клиента из списка', true); return; }
            clientName  = selectedClient.name;
            clientPhone = selectedClient.phone;
        } else {
            if (!newName.trim() || !newPhone.trim()) {
                showToast('Введите имя и телефон клиента', true); return;
            }
            try {
                const created = await barberApi.createClient({ name: newName.trim(), phone: newPhone.trim() });
                clientName  = created.name;
                clientPhone = created.phone;
            } catch (err) {
                showToast(err.response?.data?.detail || 'Ошибка создания клиента', true); return;
            }
        }

        try {
            await barberBookingsApi.create({
                client_name:  clientName,
                client_phone: clientPhone,
                date:         modal.date,
                time:         modal.time,
            });
            showToast('Клиент записан ✓');
            closeModal();
            loadBookings();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Ошибка сохранения', true);
        }
    }

    async function markDone(bookingId) {
        try {
            await barberApi.complete(bookingId);
            showToast('Отмечено как выполнено ✓');
            closeModal();
            navigate('/barber/history?pay=' + bookingId);
        } catch (err) { showToast(err.response?.data?.detail || 'Ошибка', true); }
    }

    async function markAccept(bookingId) {
        try {
            await barberApi.accept(bookingId);
            showToast('Заявка принята');
            closeModal();
            loadBookings();
        } catch (err) { showToast(err.response?.data?.detail || 'Ошибка', true); }
    }

    async function handleDelete(bookingId) {
        if (!confirm('Удалить эту запись?')) return;
        try {
            await barberBookingsApi.remove(bookingId);
            showToast('Запись удалена');
            closeModal();
            loadBookings();
        } catch (err) { showToast(err.response?.data?.detail || 'Ошибка', true); }
    }

    const b = modal?.booking;
    const isDone      = b?.status === 'done';
    const isCancelled = b?.status === 'cancelled';

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Календарь</h1>
                    <div className="subtitle">Нажмите на слот чтобы записать клиента</div>
                </div>
            </div>

            <div className="legend">
                <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--status-pending)' }} /> Ожидает</div>
                <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--status-confirmed)' }} /> Принято</div>
                <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--status-done)' }} /> Выполнено</div>
                <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--status-cancelled)' }} /> Отменено</div>
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
                    onSlotClick={openCreate}
                    onBookingClick={openView}
                    showBarberName={false}
                />
            )}

            {/* ───── CREATE modal ───── */}
            {modal?.mode === 'create' && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                    <div className="modal-box" style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <div>
                                <h2>Новая запись</h2>
                                {/* Date + time shown as info — not editable */}
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    marginTop: 6, background: 'var(--bg-panel)',
                                    borderRadius: 99, padding: '5px 12px',
                                    fontSize: 12, color: 'var(--text-muted)', fontWeight: 600,
                                }}>
                                    <CalIcon size={12} />
                                    {fmtDateRu(modal.date)} · {modal.time?.slice(0, 5)}
                                </div>
                            </div>
                            <button className="modal-close" onClick={closeModal}><X size={20} /></button>
                        </div>

                        {/* Tabs */}
                        <div className="tag-switch" style={{ marginBottom: 16 }}>
                            <button
                                type="button"
                                className={tab === 'existing' ? 'active' : ''}
                                onClick={() => { setTab('existing'); setSelectedClient(null); doSearch(search); }}
                            >
                                Существующий
                            </button>
                            <button
                                type="button"
                                className={tab === 'new' ? 'active' : ''}
                                onClick={() => { setTab('new'); setSelectedClient(null); }}
                            >
                                Новый клиент
                            </button>
                        </div>

                        <form onSubmit={handleCreate}>
                            {/* ── Existing client search ── */}
                            {tab === 'existing' && (
                                <div className="form-group">
                                    <div style={{ position: 'relative', marginBottom: 10 }}>
                                        <Search size={15} style={{
                                            position: 'absolute', left: 12, top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'var(--text-muted)', pointerEvents: 'none',
                                        }} />
                                        <input
                                            className="form-control"
                                            style={{ paddingLeft: 36 }}
                                            placeholder="Поиск по имени или телефону..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    {/* Selected client chip */}
                                    {selectedClient && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: 'rgba(51,209,122,0.12)', border: '1px solid var(--green)',
                                            borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 10,
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{selectedClient.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedClient.phone}</div>
                                            </div>
                                            <button
                                                type="button"
                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, padding: 4 }}
                                                onClick={() => setSelectedClient(null)}
                                            >×</button>
                                        </div>
                                    )}

                                    {/* Client list */}
                                    {!selectedClient && (
                                        <div style={{
                                            maxHeight: 220, overflowY: 'auto',
                                            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                                        }}>
                                            {searching && (
                                                <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>Поиск...</div>
                                            )}
                                            {!searching && clients.length === 0 && (
                                                <div style={{ padding: '14px 16px', color: 'var(--text-dim)', fontSize: 13 }}>
                                                    {search ? 'Клиент не найден' : 'Нет клиентов — добавьте нового'}
                                                </div>
                                            )}
                                            {!searching && clients.map((c) => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => selectClient(c)}
                                                    style={{
                                                        padding: '12px 16px', cursor: 'pointer',
                                                        borderBottom: '1px solid var(--border)',
                                                        minHeight: 52,
                                                    }}
                                                    onTouchStart={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                                    onTouchEnd={(e) => { e.currentTarget.style.background = ''; }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                                                >
                                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.phone}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── New client ── */}
                            {tab === 'new' && (
                                <>
                                    <div className="form-group">
                                        <label>Имя клиента</label>
                                        <input
                                            className="form-control"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="Например: Алмат"
                                            autoFocus
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Телефон</label>
                                        <input
                                            className="form-control"
                                            value={newPhone}
                                            onChange={(e) => setNewPhone(e.target.value)}
                                            placeholder="+7 777 000 00 00"
                                            type="tel"
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    Записать
                                </button>
                                <button type="button" className="btn btn-outline" onClick={closeModal}>
                                    Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ───── VIEW modal ───── */}
            {modal?.mode === 'view' && b && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                    <div className="modal-box" style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h2>{b.client_name}</h2>
                            <button className="modal-close" onClick={closeModal}><X size={20} /></button>
                        </div>

                        {/* Status badge */}
                        <div style={{ marginBottom: 16 }}>
                            <span style={{
                                display: 'inline-block', padding: '6px 14px', borderRadius: 999,
                                background: STATUS_COLORS[b.status] || 'var(--bg-hover)',
                                color: STATUS_TEXT_COLOR[b.status] || '#fff',
                                fontWeight: 700, fontSize: 13,
                            }}>
                                {STATUS_LABELS[b.status] || b.status}
                            </span>
                        </div>

                        {/* Info rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                            <InfoRow label="Телефон" value={b.client_phone} />
                            <InfoRow label="Дата и время" value={`${fmtDateRu(b.date)} · ${b.time?.slice(0, 5)}`} />
                            {b.service_name && <InfoRow label="Услуга" value={b.service_name} />}
                            {b.is_paid && (
                                <InfoRow
                                    label="Оплата"
                                    value={<span style={{ color: 'var(--green)' }}>✓ Оплачено {b.total_paid ? `${b.total_paid} ₸` : ''}</span>}
                                />
                            )}
                        </div>

                        {/* Actions */}
                        {!isDone && !isCancelled ? (
                            <div className="modal-actions">
                                {b.status === 'pending' && (
                                    <button className="btn btn-primary" onClick={() => markAccept(b.id)}>Принять</button>
                                )}
                                <button className="btn btn-success" onClick={() => markDone(b.id)}>Выполнено ✓</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.id)}>Удалить</button>
                                <button className="btn btn-outline" onClick={closeModal}>Закрыть</button>
                            </div>
                        ) : (
                            <div className="modal-actions">
                                {isDone && !b.is_paid && (
                                    <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
                                        💡 Перейдите в «Историю» чтобы выбрать услугу и принять оплату
                                    </div>
                                )}
                                <button className="btn btn-outline" style={{ flex: 1 }} onClick={closeModal}>Закрыть</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

function InfoRow({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, flexShrink: 0 }}>{label}</span>
            <span style={{ fontWeight: 600, fontSize: 14, textAlign: 'right' }}>{value}</span>
        </div>
    );
}
