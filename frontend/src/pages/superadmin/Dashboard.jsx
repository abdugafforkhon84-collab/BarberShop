/**
 * pages/superadmin/Dashboard.jsx
 * ------------------------------------------------------------
 * Главная страница суперадмина — финансовый и операционный отчёт:
 * - Карточки: Всего барбершопов, Оплачено за тарифы, Заработано барбершопами, Активные подписки
 * - Таблица барбершопов: название, владелец, контакты, тариф, оплата за тариф, заработано, статус
 * ------------------------------------------------------------
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Store, CheckCircle, RefreshCw,
    MapPin, Phone, User, Coins, TrendingUp, Search, Calendar, ShieldCheck
} from 'lucide-react';
import { superadminApi } from '../../api';
import { useToast } from '../../components/Toast';
import { formatMoney } from '../../utils';

function planLabel(months) {
    if (!months) return '—';
    if (months === 1) return '1 мес (Пробный)';
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

function PlanBadge({ status, plan_end, plan_months, is_trial }) {
    if (status === 'active') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="badge badge-done" style={{ fontWeight: 600 }}>
                    {is_trial ? 'Пробный (1 мес)' : planLabel(plan_months)}
                </span>
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
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, minHeight: 92, padding: '16px 20px' }}>
            <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: color || 'rgba(51,209,122,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                {icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {value}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>
                    {label}
                </div>
                {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>}
            </div>
        </div>
    );
}

export default function SuperadminDashboard() {
    const showToast = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTab, setFilterTab] = useState('all'); // all | paid | trial | expired
    const [sortKey, setSortKey] = useState('subscription_price');
    const [sortDir, setSortDir] = useState(-1); // default descending (top payers first)

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
        else { setSortKey(key); setSortDir(-1); }
    }

    function SortArrow({ k }) {
        if (sortKey !== k) return <span style={{ opacity: 0.25 }}> ↕</span>;
        return <span style={{ color: 'var(--green)', fontWeight: 'bold' }}>{sortDir === 1 ? ' ↑' : ' ↓'}</span>;
    }

    const t = data?.totals;

    const filteredAndSortedShops = useMemo(() => {
        if (!data?.shops) return [];
        let list = [...data.shops];

        // Search filter
        if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            list = list.filter(s =>
                (s.shop_name && s.shop_name.toLowerCase().includes(q)) ||
                (s.owner_name && s.owner_name.toLowerCase().includes(q)) ||
                (s.phone && s.phone.toLowerCase().includes(q)) ||
                (s.address && s.address.toLowerCase().includes(q))
            );
        }

        // Tab filter
        if (filterTab === 'paid') {
            list = list.filter(s => (s.subscription_price || 0) > 0);
        } else if (filterTab === 'trial') {
            list = list.filter(s => s.is_trial || s.plan_months === 1);
        } else if (filterTab === 'expired') {
            list = list.filter(s => s.plan_status === 'expired');
        }

        // Sorting
        list.sort((a, b) => {
            let av = a[sortKey];
            let bv = b[sortKey];
            if (typeof av === 'string') av = av.toLowerCase();
            if (typeof bv === 'string') bv = bv.toLowerCase();
            if (av == null) av = 0;
            if (bv == null) bv = 0;
            return av < bv ? -sortDir : av > bv ? sortDir : 0;
        });

        return list;
    }, [data?.shops, searchTerm, filterTab, sortKey, sortDir]);

    if (loading) return <p className="empty-state">Загрузка отчёта...</p>;

    return (
        <>
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1>Финансовый отчёт платформы</h1>
                    <div className="subtitle">Сводка оплат тарифов, выручки и подключённых барбершопов</div>
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

            {/* ── Platform KPI Stats ── */}
            {t && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 16,
                    marginBottom: 24
                }}>
                    <StatCard
                        icon={<Store size={22} color="#33d17a" />}
                        label="Барбершопов"
                        value={t.total_shops}
                        sub={`${t.active_shops} активных точек`}
                        color="rgba(51,209,122,0.12)"
                    />
                    <StatCard
                        icon={<Coins size={22} color="#f59e0b" />}
                        label="Оплачено за тарифы"
                        value={formatMoney(t.total_tariffs_paid || 0)}
                        sub="Доход платформы с подписок"
                        color="rgba(245,158,11,0.14)"
                    />
                    <StatCard
                        icon={<TrendingUp size={22} color="#10b981" />}
                        label="Заработано барбершопами"
                        value={formatMoney(t.total_revenue || 0)}
                        sub={`${t.total_bookings} выполненных записей`}
                        color="rgba(16,185,129,0.14)"
                    />
                    <StatCard
                        icon={<CheckCircle size={22} color="#4dabf7" />}
                        label="Активных подписок"
                        value={t.active_plans}
                        sub={t.expired_plans ? `${t.expired_plans} истекших` : 'Все активны'}
                        color="rgba(77,171,247,0.12)"
                    />
                </div>
            )}

            {/* ── Filters & Search Bar ── */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 16
            }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <button
                        type="button"
                        onClick={() => setFilterTab('all')}
                        className={`btn btn-sm ${filterTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ border: 'none', height: 32, fontSize: 12, padding: '0 12px' }}
                    >
                        Все ({data?.shops?.length || 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterTab('paid')}
                        className={`btn btn-sm ${filterTab === 'paid' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ border: 'none', height: 32, fontSize: 12, padding: '0 12px' }}
                    >
                        С оплатой
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterTab('trial')}
                        className={`btn btn-sm ${filterTab === 'trial' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ border: 'none', height: 32, fontSize: 12, padding: '0 12px' }}
                    >
                        Пробные
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterTab('expired')}
                        className={`btn btn-sm ${filterTab === 'expired' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ border: 'none', height: 32, fontSize: 12, padding: '0 12px' }}
                    >
                        Истёкшие
                    </button>
                </div>

                {/* Search Input */}
                <div style={{ position: 'relative', width: 260 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Поиск по названию или владельцу..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ height: 38, paddingLeft: 34, fontSize: 13 }}
                    />
                </div>
            </div>

            {filteredAndSortedShops.length === 0 && (
                <div className="card empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Ни один барбершоп не найден</p>
                </div>
            )}

            {/* ── Shops Table ── */}
            {filteredAndSortedShops.length > 0 && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflowX: 'auto' }}>
                    <div style={{ minWidth: 860 }}>
                        {/* Header */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1.6fr 1.2fr 1.1fr 140px 140px 80px',
                            padding: '12px 20px',
                            borderBottom: '1px solid var(--border)',
                            fontSize: 11, color: 'var(--text-dim)',
                            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                            <span style={{ cursor: 'pointer' }} onClick={() => toggleSort('shop_name')}>
                                Барбершоп<SortArrow k="shop_name" />
                            </span>
                            <span>Владелец / Контакты</span>
                            <span style={{ cursor: 'pointer' }} onClick={() => toggleSort('plan_status')}>
                                Тариф<SortArrow k="plan_status" />
                            </span>
                            <span style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('subscription_price')}>
                                За тариф<SortArrow k="subscription_price" />
                            </span>
                            <span style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('revenue')}>
                                Заработано<SortArrow k="revenue" />
                            </span>
                            <span style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => toggleSort('is_active')}>
                                Статус<SortArrow k="is_active" />
                            </span>
                        </div>

                        {/* Rows */}
                        {filteredAndSortedShops.map((s, i) => (
                            <div
                                key={s.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1.6fr 1.2fr 1.1fr 140px 140px 80px',
                                    padding: '16px 20px',
                                    borderBottom: i < filteredAndSortedShops.length - 1 ? '1px solid var(--border)' : 'none',
                                    alignItems: 'center',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                {/* Shop name & address */}
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{s.shop_name}</div>
                                    {s.address ? (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <MapPin size={11} style={{ flexShrink: 0 }} /> {s.address}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Адрес не указан</div>
                                    )}
                                </div>

                                {/* Owner & Phone */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
                                        <User size={12} color="var(--text-muted)" />
                                        <span>{s.owner_name || '—'}</span>
                                    </div>
                                    {s.phone && (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Phone size={11} /> {s.phone}
                                        </div>
                                    )}
                                </div>

                                {/* Tariff Plan */}
                                <PlanBadge
                                    status={s.plan_status}
                                    plan_end={s.plan_end}
                                    plan_months={s.plan_months}
                                    is_trial={s.is_trial}
                                />

                                {/* Subscription Price Paid */}
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: (s.subscription_price || 0) > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                        {formatMoney(s.subscription_price || 0)}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                                        {s.is_trial ? 'Пробный' : (s.subscription_price ? 'Оплачено' : 'Бесплатно')}
                                    </div>
                                </div>

                                {/* Revenue earned by shop */}
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>
                                        {formatMoney(s.revenue || 0)}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                                        {s.done_bookings || 0} вып. записей
                                    </div>
                                </div>

                                {/* Status */}
                                <div style={{ textAlign: 'center' }}>
                                    <span className={`badge ${s.is_active ? 'badge-done' : 'badge-cancelled'}`} style={{ fontSize: 11, padding: '3px 8px' }}>
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
