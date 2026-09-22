/**
 * pages/superadmin/Dashboard.jsx
 * ------------------------------------------------------------
 * Главная страница суперадмина — список барбершопов:
 * - 2 крупных карточки: всего барбершопов, активных тарифов
 * - Таблица: название, владелец, контакты, тариф, статус
 * Намеренно НЕ показывает выручку, записи, барберов —
 * это приватные данные каждого барбершопа.
 * ------------------------------------------------------------
 */
import { useEffect, useState, useCallback } from 'react';
import {
    Store, CheckCircle, RefreshCw,
    MapPin, Phone, User,
} from 'lucide-react';
import { superadminApi } from '../../api';
import { useToast } from '../../components/Toast';

function planLabel(months) {
    if (!months) return '—';
    if (months === 3) return '3 мес';
    if (months === 6) return '6 мес';
    if (months === 12) return '1 год';
    return `${months} мес`;
}

function fmtDate(d) {
    if (!d) return '—';
    const parts = d.slice(0, 10).split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function PlanBadge({ status, plan_end, plan_months }) {
    if (status === 'active') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="badge badge-done">{planLabel(plan_months)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>до {fmtDate(plan_end)}</span>
            </div>
        );
    }
    if (status === 'expired') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="badge badge-cancelled">Истёк</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(plan_end)}</span>
            </div>
        );
    }
    return <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Без тарифа</span>;
}

function StatCard({ icon, label, value, sub, color }) {
    return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 18, minHeight: 90 }}>
            <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: color || 'rgba(51,209,122,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                {sub && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>}
            </div>
        </div>
    );
}

export default function SuperadminDashboard() {
    const showToast = useToast();
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sortKey, setSortKey]   = useState('shop_name');
    const [sortDir, setSortDir]   = useState(1);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const result = await superadminApi.overview();
            setData(result);
        } catch (e) {
            showToast('Ошибка загрузки отчёта', true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    function toggleSort(key) {
        if (sortKey === key) setSortDir((d) => -d);
        else { setSortKey(key); setSortDir(1); }
    }

    function SortArrow({ k }) {
        if (sortKey !== k) return <span style={{ opacity: 0.25 }}> ↕</span>;
        return <span style={{ color: 'var(--green)' }}>{sortDir === 1 ? ' ↑' : ' ↓'}</span>;
    }

    const t = data?.totals;
    const shops = data?.shops
        ? [...data.shops].sort((a, b) => {
            const av = a[sortKey] ?? '';
            const bv = b[sortKey] ?? '';
            return av < bv ? -sortDir : av > bv ? sortDir : 0;
        })
        : [];

    if (loading) return <p className="empty-state">Загрузка отчёта...</p>;

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Отчёт платформы</h1>
                    <div className="subtitle">Список всех подключённых барбершопов</div>
                </div>
                <button
                    className="btn btn-outline"
                    onClick={() => load(true)}
                    disabled={refreshing}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                    {refreshing ? 'Обновление...' : 'Обновить'}
                </button>
            </div>

            {/* ── Platform totals ── */}
            {t && (
                <div className="grid grid-3" style={{ marginBottom: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                    <StatCard
                        icon={<Store size={22} color="#33d17a" />}
                        label="Барбершопов"
                        value={t.total_shops}
                        sub={`${t.active_shops} активных точек`}
                        color="rgba(51,209,122,0.12)"
                    />
                    <StatCard
                        icon={<CheckCircle size={22} color="#4dabf7" />}
                        label="Подписок и тарифов"
                        value={t.active_plans}
                        sub={t.expired_plans ? `${t.expired_plans} истекших` : 'Все активны'}
                        color="rgba(77,171,247,0.12)"
                    />
                </div>
            )}

            {shops.length === 0 && <p className="empty-state">Барбершопов пока нет</p>}

            {/* ── Shops table ── */}
            {shops.length > 0 && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflowX: 'auto' }}>
                    <div style={{ minWidth: 700 }}>
                        {/* Header */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1.8fr 1.4fr 1.4fr 130px 90px',
                            padding: '12px 20px',
                            borderBottom: '1px solid var(--border)',
                        fontSize: 12, color: 'var(--text-dim)',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                        <span style={{ cursor: 'pointer' }} onClick={() => toggleSort('shop_name')}>Барбершоп<SortArrow k="shop_name" /></span>
                        <span>Владелец</span>
                        <span>Контакты</span>
                        <span style={{ cursor: 'pointer' }} onClick={() => toggleSort('plan_status')}>Тариф<SortArrow k="plan_status" /></span>
                        <span style={{ cursor: 'pointer' }} onClick={() => toggleSort('is_active')}>Статус<SortArrow k="is_active" /></span>
                    </div>

                        {/* Rows */}
                        {shops.map((s, i) => (
                            <div
                                key={s.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1.8fr 1.4fr 1.4fr 130px 90px',
                                    padding: '16px 20px',
                                borderBottom: i < shops.length - 1 ? '1px solid var(--border)' : 'none',
                                alignItems: 'center',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            {/* Shop name */}
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.shop_name}</div>
                                {s.address && (
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <MapPin size={11} style={{ flexShrink: 0 }} /> {s.address}
                                    </div>
                                )}
                            </div>

                            {/* Owner */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {s.owner_name ? (
                                    <>
                                        <User size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>{s.owner_name}</span>
                                    </>
                                ) : (
                                    <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>—</span>
                                )}
                            </div>

                            {/* Contacts */}
                            <div>
                                {s.phone ? (
                                    <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Phone size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> {s.phone}
                                    </div>
                                ) : (
                                    <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>—</span>
                                )}
                            </div>

                            {/* Tariff */}
                            <PlanBadge status={s.plan_status} plan_end={s.plan_end} plan_months={s.plan_months} />

                            {/* Active */}
                            <div>
                                <span className={`badge ${s.is_active ? 'badge-done' : 'badge-cancelled'}`} style={{ fontSize: 11 }}>
                                    {s.is_active ? 'Активен' : 'Выкл.'}
                                </span>
                            </div>
                        </div>
                    ))}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </>
    );
}
