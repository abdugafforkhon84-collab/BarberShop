/**
 * pages/superadmin/Dashboard.jsx
 * ------------------------------------------------------------
 * Главная страница суперадмина — финансовый и операционный отчёт:
 * - Карточки: Всего барбершопов, Оплачено за тарифы, Заработано точками, Активные подписки
 * - Строчный список барбершопов: компактный ряд, при нажатии стрелки раскрывается карточка со всеми данными
 * ------------------------------------------------------------
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Store, CheckCircle, RefreshCw,
    MapPin, Phone, User, Coins, TrendingUp, Search, Calendar, ShieldCheck, ChevronDown, ArrowUpDown
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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge badge-done" style={{ fontWeight: 600, fontSize: 11, padding: '2px 7px' }}>
                    {is_trial ? 'Пробный (1 мес)' : planLabel(plan_months)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>до {fmtDate(plan_end)}</span>
            </div>
        );
    }
    if (status === 'expired') {
        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge badge-cancelled" style={{ fontSize: 11, padding: '2px 7px' }}>Истёк</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(plan_end)}</span>
            </div>
        );
    }
    return <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>Без тарифа</span>;
}

function StatCard({ icon, label, value, sub, color }) {
    return (
        <div className="card kpi-cube">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div className="kpi-icon-box" style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: color || 'rgba(51,209,122,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    {icon}
                </div>
                {sub && (
                    <span className="kpi-sub" style={{ fontSize: 9.5, color: 'var(--text-dim)', textAlign: 'right', lineHeight: 1.15, maxWidth: '65%' }}>
                        {sub}
                    </span>
                )}
            </div>
            <div>
                <div className="kpi-value" style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 800, 
                    lineHeight: 1.15, 
                    letterSpacing: '-0.02em', 
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                }}>
                    {value}
                </div>
                <div className="kpi-label" style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600, lineHeight: 1.2 }}>
                    {label}
                </div>
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
    const [expandedIds, setExpandedIds] = useState(new Set());

    function toggleExpand(id) {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

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
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div>
                    <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Финансовый отчёт</h1>
                    <div className="subtitle" style={{ fontSize: 12 }}>Сводка оплат тарифов, выручки и барбершопов</div>
                </div>
                <button
                    className="btn btn-outline btn-sm"
                    onClick={() => load(true)}
                    disabled={refreshing}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px', fontSize: 12 }}
                >
                    <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                    <span>{refreshing ? 'Обновление...' : 'Обновить'}</span>
                </button>
            </div>

            {/* ── Platform KPI Stats (Compact Cube Design) ── */}
            {t && (
                <div className="kpi-cube-grid">
                    <StatCard
                        icon={<Store size={15} color="#33d17a" />}
                        label="Барбершопов"
                        value={t.total_shops}
                        sub={`${t.active_shops} актив.`}
                        color="rgba(51,209,122,0.12)"
                    />
                    <StatCard
                        icon={<Coins size={15} color="#f59e0b" />}
                        label="Оплачено за тарифы"
                        value={formatMoney(t.total_tariffs_paid || 0)}
                        sub="Доход с подписок"
                        color="rgba(245,158,11,0.14)"
                    />
                    <StatCard
                        icon={<TrendingUp size={15} color="#10b981" />}
                        label="Заработано точками"
                        value={formatMoney(t.total_revenue || 0)}
                        sub={`${t.total_bookings} записей`}
                        color="rgba(16,185,129,0.14)"
                    />
                    <StatCard
                        icon={<CheckCircle size={15} color="#4dabf7" />}
                        label="Активных подписок"
                        value={t.active_plans}
                        sub={t.expired_plans ? `${t.expired_plans} истек.` : 'Все активны'}
                        color="rgba(77,171,247,0.12)"
                    />
                </div>
            )}

            {/* ── Filters & Search Bar ── */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 12
            }}>
                {/* Search Input */}
                <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Поиск по названию или владельцу..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ height: 36, paddingLeft: 34, fontSize: 13, width: '100%' }}
                    />
                </div>

                {/* Filter Tabs + Quick Sort Pill */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap'
                }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflowX: 'auto', maxWidth: '100%' }}>
                        <button
                            type="button"
                            onClick={() => setFilterTab('all')}
                            className={`btn btn-sm ${filterTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ border: 'none', height: 28, fontSize: 11.5, padding: '0 10px', whiteSpace: 'nowrap' }}
                        >
                            Все ({data?.shops?.length || 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterTab('paid')}
                            className={`btn btn-sm ${filterTab === 'paid' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ border: 'none', height: 28, fontSize: 11.5, padding: '0 10px', whiteSpace: 'nowrap' }}
                        >
                            С оплатой
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterTab('trial')}
                            className={`btn btn-sm ${filterTab === 'trial' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ border: 'none', height: 28, fontSize: 11.5, padding: '0 10px', whiteSpace: 'nowrap' }}
                        >
                            Пробные
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterTab('expired')}
                            className={`btn btn-sm ${filterTab === 'expired' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ border: 'none', height: 28, fontSize: 11.5, padding: '0 10px', whiteSpace: 'nowrap' }}
                        >
                            Истёкшие
                        </button>
                    </div>

                    {/* Sorting selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
                        <ArrowUpDown size={12} />
                        <select
                            value={sortKey}
                            onChange={(e) => { setSortKey(e.target.value); setSortDir(-1); }}
                            className="form-control"
                            style={{ height: 28, padding: '0 8px', fontSize: 11.5, width: 'auto', background: 'var(--bg-card)' }}
                        >
                            <option value="subscription_price">По оплате тарифа</option>
                            <option value="revenue">По выручке</option>
                            <option value="shop_name">По названию</option>
                            <option value="plan_status">По статусу тарифа</option>
                        </select>
                    </div>
                </div>
            </div>

            {filteredAndSortedShops.length === 0 && (
                <div className="card empty-state" style={{ padding: '36px 16px', textAlign: 'center' }}>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Ни один барбершоп не найден</p>
                </div>
            )}

            {/* ── Accordion List (Строчный вид + раскрытие карточки стрелкой) ── */}
            {filteredAndSortedShops.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredAndSortedShops.map((s) => {
                        const isExpanded = expandedIds.has(s.id);
                        return (
                            <div
                                key={s.id}
                                className="card"
                                style={{
                                    padding: 0,
                                    borderRadius: 12,
                                    border: `1px solid ${isExpanded ? 'var(--green)' : 'var(--border)'}`,
                                    background: 'var(--bg-card)',
                                    overflow: 'hidden',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    boxShadow: isExpanded ? '0 4px 18px rgba(0,0,0,0.25)' : 'none',
                                }}
                            >
                                {/* ── Single Collapsed Row ── */}
                                <div
                                    onClick={() => toggleExpand(s.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 14px',
                                        cursor: 'pointer',
                                        gap: 10,
                                        background: isExpanded ? 'rgba(51,209,122,0.04)' : 'transparent',
                                        userSelect: 'none',
                                    }}
                                >
                                    {/* Left info: Store icon + Name + Subtitle */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                        <div style={{
                                            width: 34, height: 34, borderRadius: 9,
                                            background: s.is_active ? 'rgba(51,209,122,0.12)' : 'rgba(239,68,68,0.12)',
                                            color: s.is_active ? 'var(--green)' : 'var(--status-cancelled)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <Store size={16} />
                                        </div>

                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    fontSize: 13.5,
                                                    color: 'var(--text-main)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    maxWidth: '100%'
                                                }}>
                                                    {s.shop_name}
                                                </span>
                                                <span className={`badge ${s.is_active ? 'badge-done' : 'badge-cancelled'}`} style={{ fontSize: 9.5, padding: '1px 6px', flexShrink: 0 }}>
                                                    {s.is_active ? 'Активен' : 'Выкл'}
                                                </span>
                                            </div>

                                            <div style={{
                                                fontSize: 11,
                                                color: 'var(--text-muted)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                marginTop: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>
                                                {s.address ? (
                                                    <>
                                                        <MapPin size={10} style={{ flexShrink: 0 }} />
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.address}</span>
                                                    </>
                                                ) : (
                                                    <span>{s.owner_name || 'Владелец не указан'}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right info: Metric + Arrow */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: (s.subscription_price || 0) > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                                {formatMoney(s.subscription_price || 0)}
                                            </div>
                                            <div style={{ fontSize: 9.5, color: 'var(--text-dim)', marginTop: 1 }}>
                                                {s.is_trial ? 'Пробный' : (s.subscription_price ? 'Оплачено' : '0 ₸')}
                                            </div>
                                        </div>

                                        <div style={{
                                            width: 28, height: 28, borderRadius: 6,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: isExpanded ? 'rgba(51,209,122,0.15)' : 'var(--bg-hover)',
                                            color: isExpanded ? 'var(--green)' : 'var(--text-muted)',
                                            transition: 'all 0.2s ease',
                                        }}>
                                            <ChevronDown
                                                size={16}
                                                style={{
                                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                    transition: 'transform 0.2s ease'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Expanded Card Details ── */}
                                {isExpanded && (
                                    <div style={{
                                        padding: '12px 14px',
                                        borderTop: '1px solid var(--border)',
                                        background: 'var(--bg-panel)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 10,
                                    }}>
                                        {/* 4 Info Blocks in a 2x2 or auto-fit grid */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                            gap: 8,
                                        }}>
                                            {/* Block 1: Owner & Contact */}
                                            <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: 9.5, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                                                    Владелец / Связь
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>
                                                    <User size={12} color="var(--text-muted)" />
                                                    <span>{s.owner_name || '—'}</span>
                                                </div>
                                                {s.phone && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                                                        <Phone size={11} />
                                                        <a href={`tel:${s.phone}`} style={{ color: 'var(--green)', textDecoration: 'none' }}>{s.phone}</a>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Block 2: Tariff plan */}
                                            <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: 9.5, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                                                    Тариф
                                                </div>
                                                <PlanBadge
                                                    status={s.plan_status}
                                                    plan_end={s.plan_end}
                                                    plan_months={s.plan_months}
                                                    is_trial={s.is_trial}
                                                />
                                            </div>

                                            {/* Block 3: Tariff payment */}
                                            <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: 9.5, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                                                    Оплачено за тариф
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                                                    <Coins size={12} color="#f59e0b" />
                                                    <span>{formatMoney(s.subscription_price || 0)}</span>
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                                                    {s.is_trial ? 'Пробный' : (s.subscription_price ? 'Оплачено платформе' : 'Бесплатно')}
                                                </div>
                                            </div>

                                            {/* Block 4: Shop revenue */}
                                            <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: 9.5, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                                                    Заработано точкой
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>
                                                    <TrendingUp size={12} />
                                                    <span>{formatMoney(s.revenue || 0)}</span>
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                                                    {s.done_bookings || 0} выполненных записей
                                                </div>
                                            </div>
                                        </div>

                                        {/* Full address if specified */}
                                        {s.address && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
                                                <MapPin size={12} color="var(--green)" style={{ flexShrink: 0 }} />
                                                <span>{s.address}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </>
    );
}
