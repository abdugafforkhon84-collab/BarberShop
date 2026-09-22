/**
 * pages/barber/Services.jsx
 * ------------------------------------------------------------
 * "Услуги": read-only view of the service catalog for barbers
 * (prices/duration are set by the admin).
 * ------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { barberApi } from '../../api';
import { formatMoney } from '../../utils';

export default function BarberServices() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        barberApi.services().then(setServices).finally(() => setLoading(false));
    }, []);

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Услуги</h1>
                    <div className="subtitle">Актуальный список услуг и цен</div>
                </div>
            </div>

            <div className="grid grid-3">
                {loading && <p className="empty-state">Загрузка...</p>}
                {!loading && services.length === 0 && <p className="empty-state">Услуги пока не добавлены</p>}
                {services.map((s) => (
                    <div className="card" key={s.id}>
                        <h3 style={{ marginBottom: 8 }}>{s.name}</h3>
                        <div style={{ color: 'var(--green)', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{formatMoney(s.price)}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{s.duration} мин</div>
                    </div>
                ))}
            </div>
        </>
    );
}
