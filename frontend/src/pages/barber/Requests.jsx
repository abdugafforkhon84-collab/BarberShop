/**
 * pages/barber/Requests.jsx
 * ------------------------------------------------------------
 * "Принимать заявки": incoming bookings assigned to this barber.
 * Accept (-> confirmed), decline (-> cancelled), or mark an
 * accepted booking as done.
 * ------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { barberApi } from '../../api';
import { useToast } from '../../components/Toast';
import { formatDate, formatMoney, statusBadge } from '../../utils';

const FILTERS = [
    { value: '', label: 'Все' },
    { value: 'pending', label: 'Ожидают' },
    { value: 'confirmed', label: 'Принятые' },
    { value: 'done', label: 'Выполненные' },
    { value: 'cancelled', label: 'Отклонённые' },
];

export default function BarberRequests() {
    const showToast = useToast();
    const [filter, setFilter] = useState('');
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, [filter]);

    async function load() {
        setLoading(true);
        try {
            setRequests(await barberApi.requests(filter ? { status: filter } : {}));
        } finally {
            setLoading(false);
        }
    }

    async function accept(id) {
        await barberApi.accept(id);
        showToast('Заявка принята');
        load();
    }
    async function decline(id) {
        if (!confirm('Отклонить эту заявку?')) return;
        await barberApi.decline(id);
        showToast('Заявка отклонена');
        load();
    }
    async function complete(id) {
        await barberApi.complete(id);
        showToast('Отмечено как выполнено');
        load();
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Заявки</h1>
                    <div className="subtitle">Входящие записи клиентов, назначенные вам</div>
                </div>
            </div>

            <div className="tag-switch">
                {FILTERS.map((f) => (
                    <button key={f.value} className={filter === f.value ? 'active' : ''} onClick={() => setFilter(f.value)}>{f.label}</button>
                ))}
            </div>

            <div className="grid grid-3">
                {loading && <p className="empty-state">Загрузка...</p>}
                {!loading && requests.length === 0 && <p className="empty-state">Заявок нет</p>}
                {requests.map((r) => (
                    <div className="card" key={r.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <h3>{r.client_name}</h3>
                            {statusBadge(r.status)}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 6 }}>{r.client_phone}</p>
                        <p style={{ marginBottom: 4 }}><strong>{r.service_name}</strong> — {formatMoney(r.price)}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
                            {formatDate(r.date)} в {r.time.slice(0, 5)} · {r.duration} мин
                        </p>
                        {r.comment && (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                <MessageSquare size={14} style={{ marginTop: 2, flexShrink: 0 }} /> {r.comment}
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {r.status === 'pending' && (
                                <>
                                    <button className="btn btn-sm btn-success" onClick={() => accept(r.id)}>Принять</button>
                                    <button className="btn btn-sm btn-danger" onClick={() => decline(r.id)}>Отклонить</button>
                                </>
                            )}
                            {r.status === 'confirmed' && (
                                <button className="btn btn-sm btn-primary" onClick={() => complete(r.id)}>Отметить выполненной</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
