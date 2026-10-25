'use client';

import { useMemo, useState } from 'react';

/** Dates are yyyy-mm-dd strings in the browser's local time zone. */
type Props = {
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
  onClear: () => void;
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function label(key: string) {
  return fromKey(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Month calendar: tap one date, or two dates for a range, then Apply. */
export default function DateRangeCalendar({ from, to, onApply, onClear }: Props) {
  const todayKey = toKey(new Date());
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(from && to && to !== from ? to : '');
  const [month, setMonth] = useState(() => {
    const base = from ? fromKey(from) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: Array<string | null> = Array.from({ length: first.getDay() }, () => null);
    for (let d = 1; d <= count; d++) cells.push(toKey(new Date(month.getFullYear(), month.getMonth(), d)));
    return cells;
  }, [month]);

  function pick(key: string) {
    if (!start || end) {
      setStart(key);
      setEnd('');
      return;
    }
    if (key === start) return;
    if (key < start) {
      setEnd(start);
      setStart(key);
    } else {
      setEnd(key);
    }
  }

  function shiftMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  const summary = !start
    ? 'Select one date, or two for a range'
    : end
      ? `${label(start)} – ${label(end)}`
      : `${label(start)} (tap another date for a range)`;

  return (
    <div className="w-[300px] bg-white border border-gray-200 rounded-2xl shadow-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="w-8 h-8 rounded-full text-navy hover:bg-navy/5 flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="text-sm font-bold text-navy">
          {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="w-8 h-8 rounded-full text-navy hover:bg-navy/5 flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-[13px]">
        {days.map((key, idx) => {
          if (!key) return <span key={`blank-${idx}`} />;
          const isStart = key === start;
          const isEnd = key === end;
          const inRange = Boolean(start && end && key > start && key < end);
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => pick(key)}
              className={`mx-auto w-9 h-9 rounded-full transition-colors ${
                isStart || isEnd
                  ? 'bg-navy text-white font-semibold'
                  : inRange
                    ? 'bg-navy/10 text-navy'
                    : 'text-[#222] hover:bg-navy/5'
              } ${isToday && !isStart && !isEnd ? 'ring-1 ring-[#f1592a] text-[#f1592a] font-semibold' : ''}`}
            >
              {fromKey(key).getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-gray-500 min-h-[16px]">{summary}</p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClear}
          className="px-3 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-navy"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={!start}
          onClick={() => onApply(start, end || start)}
          className="px-5 py-2 rounded-full bg-[#f1592a] hover:bg-[#d94a1f] text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
