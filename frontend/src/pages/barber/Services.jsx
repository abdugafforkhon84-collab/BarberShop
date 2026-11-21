/**
 * pages/barber/Services.jsx
 * ------------------------------------------------------------
 * "Услуги": read-only view of the service catalog for barbers
 * (prices/duration are set by the admin).
 * ------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { Scissors, Sparkles } from 'lucide-react';
import { barberApi, sharedSettingsApi } from '../../api';
import { formatMoney } from '../../utils';
import { ICON_MAP } from '../admin/Services';

export default function BarberServices() {
    const [services, setServices] = useState([]);
    const [extraServices, setExtraServices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            barberApi.services(),
            sharedSettingsApi.get().catch(() => ({}))
        ]).then(([srvList, st]) => {
            setServices(srvList || []);
            let extras = [];
            if (st && st.extra_services_json) {
                try {
                    const parsed = JSON.parse(st.extra_services_json);
                    if (Array.isArray(parsed) && parsed.length > 0) extras = parsed;
                } catch (_) {}
            }
            if (extras.length === 0 && st) {
                extras = [
                    { id: 'extra_wash', name: 'Мытьё головы', price: st.price_hair_wash ?? 500, icon: 'Droplets' },
                    { id: 'extra_beard', name: 'Уход за бородой', price: st.price_beard ?? 1000, icon: 'Scissors' },
                    { id: 'extra_mask', name: 'Маска для лица', price: st.price_mask ?? 800, icon: 'Smile' },
                ];
            }
            setExtraServices(extras);
        }).finally(() => setLoading(false));
    }, []);

    return (
        <div style={{ maxWidth: 1040 }}>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div>
                    <h1>Основные услуги</h1>
                    <div className="subtitle">Актуальный список услуг и цен</div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 32 }}>
                {loading && <p className="empty-state">Загрузка...</p>}
                {!loading && services.length === 0 && <p className="empty-state">Услуги пока не добавлены</p>}
                {services.map((s) => (
                    <div
                        className="card"
                        key={s.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            gap: 12,
                            borderRadius: 12,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                            <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: 'rgba(51,209,122,0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--green)',
                                flexShrink: 0
                            }}>
                                <Scissors size={16} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {s.name}
                                </div>
                                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                                    {s.duration} мин
                                </div>
                            </div>
                        </div>

                        <div style={{ color: 'var(--green)', fontSize: 14.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
                            {formatMoney(s.price)}
                        </div>
                    </div>
                ))}
            </div>

            {extraServices.length > 0 && (
                <>
                    <div className="page-header" style={{ marginBottom: 16 }}>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Sparkles size={18} color="var(--green)" />
                                <span>Дополнительные услуги</span>
                            </h2>
                            <div className="subtitle" style={{ fontSize: 12 }}>Доступны для добавления к счёту при оплате</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 32 }}>
                        {extraServices.map((extra) => {
                            const IconComponent = ICON_MAP[extra.icon] || Sparkles;
                            return (
                                <div
                                    className="card"
                                    key={extra.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 14px',
                                        gap: 12,
                                        borderRadius: 12,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                        <div style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: 8,
                                            background: 'var(--green-glow)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--green)',
                                            flexShrink: 0
                                        }}>
                                            <IconComponent size={16} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {extra.name}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--green)', fontSize: 14.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
                                        +{formatMoney(extra.price)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
