import { useEffect, useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip,
} from 'chart.js';
import { barberApi } from '../../api';
import { formatMoney } from '../../utils';
import { 
    BarChart3, 
    TrendingUp, 
    CalendarDays, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Wallet,
    Filter
} from 'lucide-react';

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

export default function BarberReports() {
    const [dateFrom, setDateFrom] = useState(monthStart());
    const [dateTo, setDateTo] = useState(today());
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => { load(); }, []);

    async function load(overrideFrom, overrideTo) {
        setLoading(true);
        try {
            const from = overrideFrom !== undefined ? overrideFrom : dateFrom;
            const to = overrideTo !== undefined ? overrideTo : dateTo;
            const data = await barberApi.reportsSummary({ date_from: from, date_to: to });
            setSummary(data);
        } catch (err) {
            console.error('Error loading barber report:', err);
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
                label: 'Доход (₸)',
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
        <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.5rem', margin: 0 }}>
                        <BarChart3 size={24} color="var(--green)" />
                        Мои отчёты и доход по дням
                    </h1>
                    <div className="subtitle" style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
                        Статистика ваших выполненных стрижек, принятых клиентов и заработка
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
            <div className="card" style={{ padding: 18, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                    
                    {/* Presets */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
                            <CalendarDays size={14} /> Период:
                        </span>
                        <button
                            type="button"
                            className="btn btn-outline"
                            style={{ height: 32, padding: '0 10px', fontSize: 12, borderRadius: 'var(--radius-sm)' }}
                            onClick={() => applyPreset('today')}
                        >
                            Сегодня
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline"
                            style={{ height: 32, padding: '0 10px', fontSize: 12, borderRadius: 'var(--radius-sm)' }}
                            onClick={() => applyPreset('week')}
                        >
                            Неделя
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline"
                            style={{ height: 32, padding: '0 10px', fontSize: 12, borderRadius: 'var(--radius-sm)' }}
                            onClick={() => applyPreset('month')}
                        >
                            Месяц
                        </button>
                    </div>

                    {/* Date Picker Form */}
                    <form onSubmit={handleFilter} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>С</label>
                            <input
                                type="date"
                                className="form-control"
                                style={{ height: 32, padding: '0 8px', fontSize: 12, width: 130 }}
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>По</label>
                            <input
                                type="date"
                                className="form-control"
                                style={{ height: 32, padding: '0 8px', fontSize: 12, width: 130 }}
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ height: 32, fontSize: 12, padding: '0 12px' }}>
                            Применить
                        </button>
                    </form>
                </div>
            </div>
            )}

            {loading ? (
                <div className="card empty-state" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>Загрузка отчёта...</p>
                </div>
            ) : summary && (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-4" style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                        <div className="card stat-card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3d8bfd', marginBottom: 4 }}>
                                <CheckCircle2 size={18} />
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Принято записей</span>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }}>{summary.accepted_count}</div>
                        </div>

                        <div className="card stat-card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--status-cancelled)', marginBottom: 4 }}>
                                <XCircle size={18} />
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Отказы / Отмены</span>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-cancelled)' }}>{summary.declined_count}</div>
                        </div>

                        <div className="card stat-card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)', marginBottom: 4 }}>
                                <Clock size={18} />
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Выполнено услуг</span>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }}>{summary.done_count}</div>
                        </div>

                        <div className="card stat-card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)', marginBottom: 4 }}>
                                <Wallet size={18} />
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Заработанный доход</span>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>
                                {formatMoney(summary.revenue)}
                            </div>
                        </div>
                    </div>

                    {/* Chart Card */}
                    <div className="card" style={{ padding: 20, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={18} color="var(--green)" />
                                Мой доход по дням
                            </h3>
                        </div>

                        <div style={{ height: 260, position: 'relative' }}>
                            {chartData && sortedDailyData.length > 0 ? (
                                <Bar data={chartData} options={chartOptions} />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                                    Нет данных за выбранный период
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Daily Breakdown Table */}
                    {sortedDailyData.length > 0 && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                                    Детализация кассы по дням
                                </h3>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Дата</th>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Заработок</th>
                                            <th style={{ padding: '12px 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Доля</th>
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
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 180 }}>
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

