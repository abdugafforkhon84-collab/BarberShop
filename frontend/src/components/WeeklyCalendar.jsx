/**
 * components/WeeklyCalendar.jsx
 * ------------------------------------------------------------
 * Mobile-first weekly calendar used by admin and barber pages.
 *
 * Key behaviour:
 *   - 7 day tabs: tap to switch the visible day.
 *   - Day grid: time column + slot column.
 *   - Empty slot:  whole cell is tappable → onSlotClick(date, time).
 *   - Occupied slot: compact booking chips stacked vertically +
 *     a small "+" button at the bottom → also calls onSlotClick.
 *   - Multiple bookings per slot — no limit, all shown stacked.
 *
 * Props:
 *   weekStart       - Date (Monday) of the currently shown week
 *   onWeekChange    - (newWeekStartDate) => void
 *   bookings        - array of BookingOut for the visible week
 *   workStart       - "08:00"
 *   workEnd         - "22:00"
 *   slotMinutes     - 30
 *   onSlotClick     - (dateStr, timeStr) => void
 *   onBookingClick  - (booking) => void
 *   showBarberName  - bool (admin view shows barber name on chip)
 *   barberId        - int | null  (filter to a specific barber; unused on admin)
 * ------------------------------------------------------------
 */
import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const MONTH_NAMES_RU = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function toDateStr(d) {
    return d.toISOString().slice(0, 10);
}

function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay() === 0 ? 7 : d.getDay(); // Mon=1..Sun=7
    d.setDate(d.getDate() - (day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
}

function buildSlots(workStart, workEnd, slotMinutes) {
    const slots = [];
    const [startH, startM] = workStart.split(':').map(Number);
    const [endH, endM] = workEnd.split(':').map(Number);
    let cursor = startH * 60 + startM;
    const end = endH * 60 + endM;
    while (cursor < end) {
        const h = Math.floor(cursor / 60);
        const m = cursor % 60;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        cursor += slotMinutes;
    }
    return slots;
}

export function getWeekStart(date = new Date()) {
    return startOfWeek(date);
}

export default function WeeklyCalendar({
    weekStart,
    onWeekChange,
    bookings,
    workStart = '08:00',
    workEnd = '22:00',
    slotMinutes = 30,
    onSlotClick,
    onBookingClick,
    showBarberName = false,
    barberId = null,
}) {
    const days = useMemo(() => (
        Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return d;
        })
    ), [weekStart]);

    const slots = useMemo(() => buildSlots(workStart, workEnd, slotMinutes), [workStart, workEnd, slotMinutes]);
    const todayStr = toDateStr(new Date());

    // Selected day defaults to today if it's in the visible week, else Monday.
    const [selectedDate, setSelectedDate] = useState(() => {
        const inWeek = days.find((d) => toDateStr(d) === todayStr);
        return toDateStr(inWeek || days[0]);
    });

    // Keep selected day valid when week changes.
    useEffect(() => {
        const dayStrs = days.map(toDateStr);
        if (!dayStrs.includes(selectedDate)) {
            const inWeek = days.find((d) => toDateStr(d) === todayStr);
            setSelectedDate(toDateStr(inWeek || days[0]));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekStart]);

    const filteredBookings = useMemo(() => {
        if (!bookings) return [];
        if (barberId) return bookings.filter((b) => b.barber_id === barberId);
        return bookings;
    }, [bookings, barberId]);

    const bookingsForSelected = useMemo(
        () => filteredBookings.filter((b) => b.date === selectedDate),
        [filteredBookings, selectedDate]
    );

    function goPrevWeek() {
        const d = new Date(weekStart);
        d.setDate(d.getDate() - 7);
        onWeekChange(d);
    }
    function goNextWeek() {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 7);
        onWeekChange(d);
    }

    const monthLabel = MONTH_NAMES_RU[days[0].getMonth()];
    const weekLabel = `${days[0].toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })} — ${days[6].toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}`;

    return (
        <div className="cal">
            {/* Month label */}
            <div className="cal-month-label">{monthLabel}</div>

            {/* Week navigation */}
            <div className="week-toolbar">
                <button className="btn btn-icon" onClick={goPrevWeek} aria-label="Предыдущая неделя">
                    <ChevronLeft size={18} />
                </button>
                <div className="week-label">{weekLabel}</div>
                <button className="btn btn-icon" onClick={goNextWeek} aria-label="Следующая неделя">
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Day tabs */}
            <div className="day-tabs">
                {days.map((d) => {
                    const dStr = toDateStr(d);
                    const isSelected = dStr === selectedDate;
                    const isToday = dStr === todayStr;
                    // Count bookings for this day to show dot
                    const count = filteredBookings.filter((b) => b.date === dStr).length;
                    return (
                        <button
                            key={dStr}
                            className={`day-tab ${isSelected ? 'active' : ''} ${isToday ? 'today' : ''}`}
                            onClick={() => setSelectedDate(dStr)}
                        >
                            <span className="dt-name">{DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
                            <span className="dt-date">{d.getDate()}</span>
                            {count > 0 && (
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: isSelected ? '#06180f' : 'var(--green)',
                                    marginTop: 1, flexShrink: 0,
                                }} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Day grid */}
            <div className="day-grid">
                {slots.map((t) => {
                    const slotBookings = bookingsForSelected.filter((b) => b.time.slice(0, 5) === t);
                    const isEmpty = slotBookings.length === 0;

                    return (
                        <div className="day-row" key={t}>
                            {/* Time label */}
                            <div className="day-row-time">{t}</div>

                            {/* Slot cell */}
                            <div
                                className={`day-row-cell${isEmpty ? ' empty' : ''}`}
                                onClick={() => isEmpty && onSlotClick && onSlotClick(selectedDate, t)}
                            >
                                {/* Existing bookings — stacked vertically, compact */}
                                {slotBookings.map((b) => (
                                    <button
                                        key={b.id}
                                        className={`day-booking status-${b.status}`}
                                        onClick={(e) => { e.stopPropagation(); onBookingClick(b); }}
                                    >
                                        <span className="db-name">{b.client_name}</span>
                                        {b.service_name && (
                                            <span className="db-service">{b.service_name}</span>
                                        )}
                                        {showBarberName && b.barber_name && (
                                            <span className="db-barber">{b.barber_name}</span>
                                        )}
                                    </button>
                                ))}

                                {/* "+" add button — only shown in occupied slots */}
                                {!isEmpty && onSlotClick && (
                                    <button
                                        className="slot-add-btn"
                                        onClick={(e) => { e.stopPropagation(); onSlotClick(selectedDate, t); }}
                                        title="Добавить ещё запись"
                                    >
                                        <Plus size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
