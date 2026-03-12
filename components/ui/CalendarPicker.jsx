"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  format,
  getDay,
  isBefore,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M15.5 19a1 1 0 0 1-.7-.29l-6-6a1 1 0 0 1 0-1.42l6-6a1 1 0 1 1 1.4 1.42L10.91 12l5.29 5.29A1 1 0 0 1 15.5 19z"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.5 19a1 1 0 0 1-.7-1.71L13.09 12 7.8 6.71A1 1 0 1 1 9.2 5.29l6 6a1 1 0 0 1 0 1.42l-6 6A1 1 0 0 1 8.5 19z"
      />
    </svg>
  );
}

export default function CalendarPicker({
  selectedDate = null,
  onDateSelect,
  minDate,
}) {
  const computedMinDate = useMemo(() => {
    const base = minDate ? startOfDay(minDate) : startOfDay(addDays(new Date(), 1));
    return base;
  }, [minDate]);

  const initialMonth = useMemo(() => {
    const base = selectedDate ? startOfDay(selectedDate) : startOfDay(new Date());
    return startOfMonth(base);
  }, [selectedDate]);

  const [viewMonth, setViewMonth] = useState(initialMonth);

  useEffect(() => {
    if (!selectedDate) return;
    setViewMonth(startOfMonth(startOfDay(selectedDate)));
  }, [selectedDate]);

  const days = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const leadingEmpty = useMemo(() => {
    const start = startOfMonth(viewMonth);
    return getDay(start);
  }, [viewMonth]);

  const selectedLabel = selectedDate
    ? `Selected: ${format(selectedDate, "MMMM d, yyyy")}`
    : "No date selected yet";

  return (
    <div className="w-full rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="mb-4">
        {selectedDate ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700">
            <span aria-hidden="true">📅</span>
            <span>{selectedLabel}</span>
          </div>
        ) : (
          <div className="text-sm text-gray-400">{selectedLabel}</div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="rounded-full p-2 text-purple-600 transition-colors hover:bg-purple-50"
          onClick={() => setViewMonth((m) => startOfMonth(subMonths(m, 1)))}
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </button>

        <div className="text-lg font-bold text-gray-900">{format(viewMonth, "MMMM yyyy")}</div>

        <button
          type="button"
          className="rounded-full p-2 text-purple-600 transition-colors hover:bg-purple-50"
          onClick={() => setViewMonth((m) => startOfMonth(addMonths(m, 1)))}
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-400 uppercase">
        {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {Array.from({ length: leadingEmpty }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-10 w-10" />
        ))}

        {days.map((day) => {
          const dayStart = startOfDay(day);
          const disabled = isBefore(dayStart, computedMinDate);
          const selected = selectedDate ? isSameDay(dayStart, startOfDay(selectedDate)) : false;
          const today = !selected && isToday(dayStart);

          const base =
            "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition-all";
          const defaultCls = "cursor-pointer text-gray-700 hover:bg-purple-50 hover:text-purple-600";
          const selectedCls = "bg-purple-600 text-white font-bold shadow-md scale-110 transform";
          const todayCls = "border-2 border-purple-300 text-purple-600 font-semibold";
          const disabledCls = "cursor-not-allowed text-gray-200 hover:bg-transparent hover:text-gray-200";

          let cls = `${base} ${defaultCls}`;
          if (disabled) cls = `${base} ${disabledCls}`;
          if (today) cls = `${base} ${defaultCls} ${todayCls}`;
          if (selected) cls = `${base} ${selectedCls}`;

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={cls}
              onClick={() => {
                if (disabled) return;
                onDateSelect?.(dayStart);
              }}
              disabled={disabled}
              aria-label={format(dayStart, "MMMM d, yyyy")}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

