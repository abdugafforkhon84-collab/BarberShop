/**
 * utils.js - shared formatting helpers for pages.
 */
export const STATUS_LABELS = {
    pending: 'Ожидает',
    confirmed: 'Принято',
    done: 'Выполнено',
    rescheduled: 'Перенесено',
    cancelled: 'Отменено',
};

export function statusBadge(status) {
    return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

export function formatMoney(n, currency = '₸') {
    return Number(n || 0).toLocaleString('ru-RU') + currency;
}

export function formatDate(d) {
    if (!d) return '—';
    const parts = String(d).split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}
