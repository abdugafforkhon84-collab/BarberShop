import { useEffect, useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip,
} from 'chart.js';
import { adminReportsApi, barbersApi } from '../../api';
import { formatMoney } from '../../utils';
import { 
    BarChart3, 
    TrendingUp, 
    Calendar, 
    Users, 
    CheckCircle2, 
    Receipt, 
    Clock, 
    XCircle, 
    Scissors, 
    Sparkles,
    Filter,
    CalendarDays
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function monthStart() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function weekStart() {
    const d = new Date();
    const day = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - (day - 1));
    return d.toISOString().slice(0, 10);
}
function today() {
    return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    const dayNum = d.getDate();
    const monthName = d.toLocaleDateString('ru-RU', { month: 'short' });
    return `${dayNum} ${monthName} (${dayName})`;
}

export default function AdminReports() {
    const [dateFrom, setDateFrom] = useState(monthStart());
    const [dateTo, setDateTo] = useState(today());
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [barbers, setBarbers] = useState([]);
    const [selectedBarber, setSelectedBarber] = useState('');
    const { shopType } = useAuth();

    useEffect(() => { 
        load(); 
        loadBarbers();
    }, []);

    async function loadBarbers() {
        try {
            const list = await barbersApi.list();
            setBarbers(list);
        } catch (err) {
            console.error('Failed to load barbers:', err);
        }
    }

    async function load(overrideFrom, overrideTo) {
        setLoading(true);
        try {
            const from = overrideFrom !== undefined ? overrideFrom : dateFrom;
            const to = overrideTo !== undefined ? overrideTo : dateTo;
            const params = { date_from: from, date_to: to };
            if (selectedBarber) params.barber_id = selectedBarber;
            const data = await adminReportsApi.summary(params);
            setSummary(data);
        } catch (err) {
            console.error('Error loading report:', err);
        } finally {
            setLoading(false);
        }
    }

    function handleFilter(e) {
        e.preventDefault();
        load();
    }

    function applyPreset(preset) {
        let from = today();
        let to = today();
        if (preset === 'today') {
            from = today();
            to = today();
        } else if (preset === 'week') {
            from = weekStart();
            to = today();
        } else if (preset === 'month') {
            from = monthStart();
            to = today();
        } else if (preset === 'days30') {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            from = d.toISOString().slice(0, 10);
            to = today();
        }
        setDateFrom(from);
        setDateTo(to);
        load(from, to);
    }

    const sortedDailyData = useMemo(() => {
        if (!summary?.daily_revenue) return [];
        return Object.keys(summary.daily_revenue)
            .sort()
            .map((dateStr) => ({
                date: dateStr,
                label: formatDateLabel(dateStr),
                amount: summary.daily_revenue[dateStr] || 0,
            }));
    }, [summary]);

    const chartData = useMemo(() => {
        if (!sortedDailyData.length) return null;
        return {
            labels: sortedDailyData.map((d) => d.label),
            datasets: [{
                label: 'Выручка (₸)',
                data: sortedDailyData.map((d) => d.amount),
                backgroundColor: 'rgba(51, 209, 122, 0.85)',
                hoverBackgroundColor: 'rgba(51, 209, 122, 1)',
                borderColor: '#33d17a',
                borderWidth: 1,
                borderRadius: 8,
                maxBarThickness: 36,
            }],
        };
    }, [sortedDailyData]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e2622',
                titleColor: '#eef2ef',
                bodyColor: '#33d17a',
                borderColor: '#2a332e',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (context) => `Доход: ${formatMoney(context.raw)}`,
                },
            },
        },
        scales: {
            x: {
                ticks: { color: '#8ea095', font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.04)' },
            },
            y: {
                ticks: {
                    color: '#8ea095',
                    font: { size: 11 },
                    callback: (value) => `${value.toLocaleString('ru-RU')} ₸`,
                },
                grid: { color: 'rgba(255,255,255,0.04)' },
                beginAtZero: true,
            },
        },
    };

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.5rem', margin: 0 }}>
                        <BarChart3 size={24} color="var(--green)" />
                        Финансовый отчёт и доход по дням
                    </h1>
                    <div className="subtitle" style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
                        Детальная аналитика выручки, загрузки барберов и популярности услуг
                    </div>
                </div>
                <button 
                    className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`} 
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={16} /> Фильтры
                </button>
            </div>

            {/* Presets & Filter Panel */}
            {showFilters && (
                <div className="card" style={{ padding: '14px 16px', marginBottom: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                    {/* Period Presets: 3 equal buttons full width */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CalendarDays size={13} /> Быстрый выбор периода
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                            <button
                                type="button"
                                className="btn btn-outline"
                                style={{ height: 34, fontSize: 12, padding: 0, justifyContent: 'center' }}
                                onClick={() => applyPreset('today')}
                            >
                                Сегодня
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                style={{ height: 34, fontSize: 12, padding: 0, justifyContent: 'center' }}
                                onClick={() => applyPreset('week')}
                            >
                                Неделя
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                style={{ height: 34, fontSize: 12, padding: 0, justifyContent: 'center' }}
                                onClick={() => applyPreset('month')}
                            >
                                Месяц
                            </button>
                        </div>
                    </div>

                    {/* Date Picker & Barber Filter Form */}
                    <form onSubmit={handleFilter} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Дата с</label>
                                <input
                                    type="date"
                                    className="input"
                                    style={{ height: 34, padding: '0 8px', fontSize: 12, width: '100%' }}
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Дата по</label>
                                <input
                                    type="date"
                                    className="input"
                                    style={{ height: 34, padding: '0 8px', fontSize: 12, width: '100%' }}
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'flex-end' }}>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Сотрудник</label>
                                <select
                                    className="select"
                                    style={{ height: 36, padding: '0 10px', fontSize: 12, width: '100%' }}
                                    value={selectedBarber}
                                    onChange={(e) => setSelectedBarber(e.target.value)}
                                >
                                    <option value="">Все сотрудники</option>
                                    {barbers.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
                                </select>
                            </div>
                            <button 
                                type="submit" 
                                className="btn btn-primary" 
                                style={{ height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600, minWidth: 100 }}
                            >
                                Применить
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="card empty-state" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>Загрузка отчёта...</p>
                </div>
            ) : summary && (
                <>
                    {/* Top Key Metrics (2x2 Compact Cube Design) */}
                    <div className="kpi-cube-grid">
                        <div className="card kpi-cube">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: 10,
                                    background: 'rgba(51, 209, 122, 0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--green)'
                                }}>
                                    <TrendingUp size={18} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--green)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                                    {formatMoney(summary.revenue)}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>
                                    Общая выручка
                                </div>
                            </div>
                        </div>

                        <div className="card kpi-cube">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: 10,
                                    background: 'rgba(61, 139, 253, 0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#3d8bfd'
                                }}>
                                    <CheckCircle2 size={18} />
                                </div>
                                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                                    {summary.clients_count} уник.
                                </span>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                                    {summary.done_count}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>
                                    Клиентов
                                </div>
                            </div>
                        </div>

                        <div className="card kpi-cube">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: 10,
                                    background: 'rgba(185, 138, 240, 0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#b98af0'
                                }}>
                                    <Receipt size={18} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                                    {formatMoney(summary.average_check)}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>
                                    Средний чек
                                </div>
                            </div>
                        </div>

                        <div className="card kpi-cube">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: 10,
                                    background: 'rgba(245, 158, 11, 0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--status-pending)'
                                }}>
                                    <Clock size={18} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                                    {summary.pending_count} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>ожид.</span> · <span style={{ color: 'var(--status-cancelled)' }}>{summary.cancelled_count}</span> <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>отмен.</span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>
                                    Ожидают / Отменено
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* Chart Card */}
                    <div className="card" style={{ padding: 20, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={18} color="var(--green)" />
                                График дохода по дням
                            </h3>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Нажмите на столбец для деталей
                            </span>
                        </div>

                        <div style={{ height: 280, position: 'relative' }}>
                            {chartData && sortedDailyData.length > 0 ? (
                                <Bar data={chartData} options={chartOptions} />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                                    Нет данных за выбранный период
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Services Breakdown */}
                    {summary.service_counts && Object.keys(summary.service_counts).length > 0 && (
                        <div className="card" style={{ padding: 20, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {shopType === 'salon' ? <Sparkles size={18} color="var(--green)" /> : <Scissors size={18} color="var(--green)" />}
                                Выполненные услуги
                            </h3>
                            <div className="grid grid-2" style={{ gap: 10 }}>
                                {Object.entries(summary.service_counts).sort((a,b) => b[1] - a[1]).map(([name, count]) => (
                                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-panel)', borderRadius: 8 }}>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>
                                        <span style={{ fontWeight: 700, color: 'var(--green)' }}>{count} шт</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Daily Revenue Table Breakdown */}
                    {sortedDailyData.length > 0 && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                                    Детализация выручки по дням
                                </h3>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    Всего дней с выручкой: {sortedDailyData.filter(d => d.amount > 0).length}
                                </span>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Дата</th>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Выручка за день</th>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Доля от общего дохода</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedDailyData.map((d) => {
                                            const percent = summary.revenue > 0 ? Math.round((d.amount / summary.revenue) * 100) : 0;

                                            return (
                                                <tr key={d.date} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>
                                                        {d.label}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 15, color: d.amount > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                                                        {formatMoney(d.amount)}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 200 }}>
                                                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg-panel)', overflow: 'hidden' }}>
                                                                <div style={{ width: `${percent}%`, height: '100%', background: 'var(--green)' }} />
                                                            </div>
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', width: 36 }}>{percent}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

