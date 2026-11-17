import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
  X,
  Check,
  Key,
  Lock
} from 'lucide-react';
import {
  INDONESIAN_HOLIDAY_CALENDAR_ID,
  calculateTimestandWorkdays,
  formatDateId,
  formatShortDateId
} from '../utils/googleCalendar';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const DAY_HEADERS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function TimestandControl({
  timestandConfig,
  holidaysList = [],
  holidaySyncSource = '',
  isSyncingHolidays = false,
  onSyncHolidays,
  onSaveTimestandConfig,
  canEditTimestand = false,
  currentUser
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Draft state inside modal
  const [draftStart, setDraftStart] = useState(timestandConfig?.startDate || '2026-11-16');
  const [draftEnd, setDraftEnd] = useState(timestandConfig?.endDate || '2026-11-30');
  const [draftApiKey, setDraftApiKey] = useState(timestandConfig?.googleApiKey || '');
  const [draftCustomHolidays, setDraftCustomHolidays] = useState(timestandConfig?.customHolidays || []);
  const [selectionPhase, setSelectionPhase] = useState('start');

  // Custom holiday form
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [showApiConfig, setShowApiConfig] = useState(false);

  // Visual Calendar Month/Year cursor
  const initialDateParts = (timestandConfig?.startDate || '2026-11-16').split('-').map(Number);
  const [viewYear, setViewYear] = useState(initialDateParts[0] || 2026);
  const [viewMonth, setViewMonth] = useState((initialDateParts[1] || 11) - 1);

  const [hoveredDay, setHoveredDay] = useState(null);

  // Active calculation
  const activeSummary = useMemo(() => {
    return calculateTimestandWorkdays(
      timestandConfig?.startDate || '2026-11-16',
      timestandConfig?.endDate || '2026-11-30',
      holidaysList,
      timestandConfig?.customHolidays || []
    );
  }, [timestandConfig, holidaysList]);

  // Draft calculation (inside modal)
  const draftSummary = useMemo(() => {
    return calculateTimestandWorkdays(
      draftStart,
      draftEnd,
      holidaysList,
      draftCustomHolidays
    );
  }, [draftStart, draftEnd, holidaysList, draftCustomHolidays]);

  const handleQuickDateChange = (newStart, newEnd) => {
    if (!canEditTimestand) return;
    const validEnd = newStart > newEnd ? newStart : newEnd;
    const calc = calculateTimestandWorkdays(
      newStart,
      validEnd,
      holidaysList,
      timestandConfig?.customHolidays || []
    );
    onSaveTimestandConfig({
      ...timestandConfig,
      startDate: newStart,
      endDate: validEnd,
      calendarId: INDONESIAN_HOLIDAY_CALENDAR_ID,
      effectiveWorkdays: calc.effectiveWorkdays,
      updatedBy: currentUser?.username || 'michael',
      updatedAt: new Date().toISOString()
    });
  };

  const openModal = () => {
    const s = timestandConfig?.startDate || '2026-11-16';
    const e = timestandConfig?.endDate || '2026-11-30';
    setDraftStart(s);
    setDraftEnd(e);
    setDraftApiKey(timestandConfig?.googleApiKey || '');
    setDraftCustomHolidays(timestandConfig?.customHolidays || []);
    const [y, m] = s.split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m - 1);
    }
    setSelectionPhase('start');
    setIsModalOpen(true);
  };

  const handleDayClick = (isoDate) => {
    if (!canEditTimestand) return;
    if (selectionPhase === 'start' || isoDate < draftStart) {
      setDraftStart(isoDate);
      if (isoDate > draftEnd) {
        setDraftEnd(isoDate);
      }
      setSelectionPhase('end');
    } else {
      setDraftEnd(isoDate);
      setSelectionPhase('start');
    }
  };

  const handlePresetRange = (startStr, endStr) => {
    if (!canEditTimestand) return;
    setDraftStart(startStr);
    setDraftEnd(endStr);
    const [y, m] = startStr.split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m - 1);
    }
  };

  const handleAddCustomHoliday = (e) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) return;
    const filtered = draftCustomHolidays.filter(h => h.date !== newHolidayDate);
    setDraftCustomHolidays([...filtered, { date: newHolidayDate, name: newHolidayName.trim() }]);
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const handleRemoveCustomHoliday = (dateStr) => {
    setDraftCustomHolidays(draftCustomHolidays.filter(h => h.date !== dateStr));
  };

  const handleSave = () => {
    if (!canEditTimestand) return;
    onSaveTimestandConfig({
      startDate: draftStart,
      endDate: draftEnd,
      calendarId: INDONESIAN_HOLIDAY_CALENDAR_ID,
      googleApiKey: draftApiKey.trim(),
      customHolidays: draftCustomHolidays,
      effectiveWorkdays: draftSummary.effectiveWorkdays,
      updatedBy: currentUser?.username || 'michael',
      updatedAt: new Date().toISOString()
    });
    setIsModalOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const buildMonthCells = (year, month) => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const isoDate = `${year}-${mStr}-${dStr}`;
      const dow = new Date(year, month, d).getDay();
      const isSunday = dow === 0;
      const isSaturday = dow === 6;
      const isWeekend = isSunday || isSaturday;
      const holiday = draftSummary.holidayMap[isoDate] || null;
      const isHoliday = Boolean(holiday);
      const isStart = isoDate === draftStart;
      const isEnd = isoDate === draftEnd;
      const isInRange = isoDate >= draftStart && isoDate <= draftEnd;
      const isWorkday = !isWeekend && !isHoliday;

      cells.push({
        day: d,
        isoDate,
        dow,
        isSunday,
        isSaturday,
        isWeekend,
        isHoliday,
        holiday,
        isStart,
        isEnd,
        isInRange,
        isWorkday
      });
    }
    return cells;
  };

  const secondMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  const secondMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;

  const month1Cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth, draftStart, draftEnd, draftSummary.holidayMap]);
  const month2Cells = useMemo(() => buildMonthCells(secondMonthYear, secondMonthIdx), [secondMonthYear, secondMonthIdx, draftStart, draftEnd, draftSummary.holidayMap]);

  const visibleMonthHolidays = useMemo(() => {
    const prefix1 = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const prefix2 = `${secondMonthYear}-${String(secondMonthIdx + 1).padStart(2, '0')}`;
    return Object.values(draftSummary.holidayMap)
      .filter(h => h.date.startsWith(prefix1) || h.date.startsWith(prefix2))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [viewYear, viewMonth, secondMonthYear, secondMonthIdx, draftSummary.holidayMap]);

  return (
    <>
      {/* Clean, Compact Timestand Control Strip (Rincian per metrik langsung tampil di tabel Scorecard di bawah) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-linear-to-r from-white via-slate-50/70 to-blue-50/40">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#003D79] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="w-5 h-5 text-[#FFB81C]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#003D79]">
                Pengaturan Timestand Hari Kerja Efektif
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#FFB81C]/30 border border-[#FFB81C] text-[#00254D] text-xs font-extrabold">
                {activeSummary.effectiveWorkdays} Hari Kerja Efektif (HK)
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Google Calendar Libur Nasional Aktif
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] sm:text-xs text-slate-600">
              <span>
                Periode:{' '}
                <strong className="text-slate-900 font-bold">
                  {formatShortDateId(timestandConfig?.startDate)} – {formatShortDateId(timestandConfig?.endDate)}
                </strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Kalender: <strong>{activeSummary.totalCalendarDays} hari</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-600 font-semibold">
                Sabtu/Minggu & Libur: <strong>{activeSummary.totalNonWorkingDays} hari (Target = 0)</strong>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-[#003D79] font-semibold">
                Target kejaran harian otomatis dihitung langsung di bawah setiap metrik pada tabel Scorecard.
              </span>
            </div>
          </div>
        </div>

        {/* Inline Date Range Pickers + Calendar Modal Button */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canEditTimestand && (
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Rentang:</span>
              <input
                type="date"
                value={timestandConfig?.startDate || '2026-11-16'}
                onChange={(e) => handleQuickDateChange(e.target.value, timestandConfig?.endDate || '2026-11-30')}
                className="font-bold text-[#003D79] text-xs bg-transparent focus:outline-none cursor-pointer"
                title="Ubah Tanggal Mulai Timestand"
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                value={timestandConfig?.endDate || '2026-11-30'}
                min={timestandConfig?.startDate || '2026-11-16'}
                onChange={(e) => handleQuickDateChange(timestandConfig?.startDate || '2026-11-16', e.target.value)}
                className="font-bold text-[#003D79] text-xs bg-transparent focus:outline-none cursor-pointer"
                title="Ubah Tanggal Selesai Timestand"
              />
            </div>
          )}

          <button
            type="button"
            onClick={openModal}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer ${
              canEditTimestand
                ? 'bg-[#003D79] hover:bg-[#00254D] text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            <Calendar className={`w-4 h-4 ${canEditTimestand ? 'text-[#FFB81C]' : 'text-[#003D79]'}`} />
            <span>Kalender Libur Nasional</span>
          </button>
        </div>
      </div>

      {/* Timestand & Visual Google Calendar Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="fixed inset-0" onClick={() => setIsModalOpen(false)}></div>

          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-linear-to-r from-[#00254D] via-[#003D79] to-[#004B94] text-white px-5 py-4 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFB81C]/20 border border-[#FFB81C]/40 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-[#FFB81C]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-[#FFB81C] text-[#00254D] text-[10px] font-black uppercase">
                      Timestand & Google Calendar API
                    </span>
                    <span className="text-xs text-[#FFE5A3] font-mono">
                      {INDONESIAN_HOLIDAY_CALENDAR_ID}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                    Kalender Libur Nasional & Pengaturan Hari Kerja Efektif
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
              
              {!canEditTimestand && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2 font-semibold">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Anda login sebagai <strong>Viewer</strong>. Pengaturan rentang tanggal Timestand hanya dapat diubah oleh <strong>Admin / Konseptor</strong> atau <strong>Superadmin</strong>.
                  </span>
                </div>
              )}

              {/* Top Controls: Date Inputs + Presets + Google Calendar Sync */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
                  
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Tanggal Mulai (Start Date)
                      </label>
                      <input
                        type="date"
                        disabled={!canEditTimestand}
                        value={draftStart}
                        onChange={(e) => {
                          setDraftStart(e.target.value);
                          if (e.target.value > draftEnd) setDraftEnd(e.target.value);
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-[#003D79] text-xs disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Tanggal Selesai (End Date)
                      </label>
                      <input
                        type="date"
                        disabled={!canEditTimestand}
                        value={draftEnd}
                        min={draftStart}
                        onChange={(e) => setDraftEnd(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-[#003D79] text-xs disabled:opacity-60"
                      />
                    </div>

                    {canEditTimestand && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePresetRange('2026-11-16', '2026-11-30')}
                          className="px-2.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#003D79] border border-blue-200 font-bold text-[11px] cursor-pointer"
                        >
                          16–30 Nov 2026
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresetRange('2026-11-01', '2026-11-30')}
                          className="px-2.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px] cursor-pointer"
                        >
                          Full Nov 2026
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresetRange('2026-12-01', '2026-12-31')}
                          className="px-2.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px] cursor-pointer"
                        >
                          Des 2026 (Libur Natal)
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSyncHolidays(draftApiKey)}
                      disabled={isSyncingHolidays}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingHolidays ? 'animate-spin' : ''}`} />
                      <span>{isSyncingHolidays ? 'Menyinkronkan...' : 'Sync Google Calendar'}</span>
                    </button>

                    {canEditTimestand && (
                      <button
                        type="button"
                        onClick={() => setShowApiConfig(!showApiConfig)}
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5 text-[#003D79]" />
                        <span>API & Cuti</span>
                      </button>
                    )}
                  </div>

                </div>

                {showApiConfig && canEditTimestand && (
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Google Calendar API Key (Opsional)
                      </label>
                      <input
                        type="text"
                        value={draftApiKey}
                        onChange={(e) => setDraftApiKey(e.target.value)}
                        placeholder="AIzaSy... (Google Calendar API v3 Key)"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Kalender ID: <code className="font-mono text-[#003D79]">{INDONESIAN_HOLIDAY_CALENDAR_ID}</code> ({holidaySyncSource})
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Tambah Tanggal Merah / Cuti Bersama Khusus Cabang
                      </label>
                      <form onSubmit={handleAddCustomHoliday} className="flex gap-1.5">
                        <input
                          type="date"
                          value={newHolidayDate}
                          onChange={(e) => setNewHolidayDate(e.target.value)}
                          className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                        <input
                          type="text"
                          value={newHolidayName}
                          onChange={(e) => setNewHolidayName(e.target.value)}
                          placeholder="Keterangan libur..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-[#003D79] text-white font-bold text-xs cursor-pointer"
                        >
                          + Tambah
                        </button>
                      </form>
                      {draftCustomHolidays.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {draftCustomHolidays.map(ch => (
                            <span
                              key={ch.date}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold"
                            >
                              <span>{ch.date}: {ch.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomHoliday(ch.date)}
                                className="hover:text-rose-950 ml-0.5"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 4 Calculation Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Total Hari Kalender</p>
                  <p className="text-2xl font-black text-slate-800 font-mono mt-1">
                    {draftSummary.totalCalendarDays} <span className="text-xs font-semibold text-slate-400">hari</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {formatShortDateId(draftStart)} – {formatShortDateId(draftEnd)}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
                  <p className="text-[10px] font-bold text-rose-700 uppercase">Sabtu & Minggu</p>
                  <p className="text-2xl font-black text-rose-600 font-mono mt-1">
                    {draftSummary.weekendDaysCount} <span className="text-xs font-semibold text-rose-400">hari</span>
                  </p>
                  <p className="text-[10px] text-rose-600 mt-0.5">Dikecualikan otomatis (Target = 0)</p>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300">
                  <p className="text-[10px] font-bold text-rose-800 uppercase">Libur Nasional (Hari Kerja)</p>
                  <p className="text-2xl font-black text-rose-700 font-mono mt-1">
                    {draftSummary.holidayWeekdaysCount} <span className="text-xs font-semibold text-rose-500">hari</span>
                  </p>
                  <p className="text-[10px] text-rose-700 mt-0.5">
                    Google Calendar ({draftSummary.holidaysInRange.length} total tgl merah)
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-linear-to-br from-[#003D79] to-[#00254D] text-white shadow-xs">
                  <p className="text-[10px] font-bold text-[#FFE5A3] uppercase">Hari Kerja Efektif</p>
                  <p className="text-2xl font-black text-[#FFB81C] font-mono mt-1">
                    {draftSummary.effectiveWorkdays} <span className="text-xs font-semibold text-white/80">hari kerja</span>
                  </p>
                  <p className="text-[10px] text-white/80 mt-0.5">
                    Pembagi otomatis Target Harian
                  </p>
                </div>
              </div>

              {/* Visual 2-Month Interactive Calendar Picker */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-[#003D79] text-sm flex items-center gap-2">
                      <span>Kalender Visual Libur Nasional Indonesia (Google Calendar)</span>
                      {canEditTimestand && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#003D79] border border-blue-200">
                          Klik tanggal: {selectionPhase === 'start' ? '1. Tanggal Mulai' : '2. Tanggal Selesai'}
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-slate-800 text-xs min-w-[140px] text-center">
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </span>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="min-h-[38px] px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  {hoveredDay ? (
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900">{formatDateId(hoveredDay.isoDate)}:</strong>
                      {hoveredDay.isHoliday ? (
                        <span className="font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                          🎉 LIBUR NASIONAL: {hoveredDay.holiday.name} — Target Harian = 0
                        </span>
                      ) : hoveredDay.isWeekend ? (
                        <span className="font-bold text-rose-600">
                          Akhir Pekan ({hoveredDay.isSunday ? 'Minggu' : 'Sabtu'}) — Target Harian = 0
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700">
                          ✓ Hari Kerja Efektif — Dihitung dalam pembagian Target Harian
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      <span>Arahkan kursor pada tanggal di kalender untuk melihat status Hari Kerja / Libur Nasional.</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { title: `${MONTH_NAMES[viewMonth]} ${viewYear}`, cells: month1Cells },
                    { title: `${MONTH_NAMES[secondMonthIdx]} ${secondMonthYear}`, cells: month2Cells }
                  ].map((mObj, mIdx) => (
                    <div key={mIdx} className="border border-slate-200 rounded-xl p-3 bg-[#F8FAFC]/50">
                      <h4 className="text-center font-extrabold text-[#003D79] text-xs mb-2.5">
                        {mObj.title}
                      </h4>
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 mb-1">
                        {DAY_HEADERS.map((dh, i) => (
                          <div key={dh} className={i === 0 || i === 6 ? 'text-rose-600 font-extrabold' : ''}>
                            {dh}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {mObj.cells.map((cell, cIdx) => {
                          if (!cell) {
                            return <div key={`empty-${cIdx}`} className="h-9" />;
                          }

                          let bgClass = 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200/80';
                          if (cell.isHoliday) {
                            bgClass = cell.isInRange
                              ? 'bg-rose-600 text-white border-rose-700 font-black shadow-2xs'
                              : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300 font-extrabold';
                          } else if (cell.isWeekend) {
                            bgClass = cell.isInRange
                              ? 'bg-rose-100 text-rose-700 border-rose-300 font-bold'
                              : 'bg-rose-50/70 text-rose-500 border-rose-100';
                          } else if (cell.isStart || cell.isEnd) {
                            bgClass = 'bg-[#003D79] text-white border-[#003D79] font-black ring-2 ring-[#FFB81C]';
                          } else if (cell.isInRange) {
                            bgClass = 'bg-blue-100/90 text-[#003D79] border-blue-300 font-bold';
                          }

                          return (
                            <button
                              key={cell.isoDate}
                              type="button"
                              onClick={() => handleDayClick(cell.isoDate)}
                              onMouseEnter={() => setHoveredDay(cell)}
                              onMouseLeave={() => setHoveredDay(null)}
                              className={`relative h-9 rounded-lg border text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${bgClass}`}
                            >
                              <span>{cell.day}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {visibleMonthHolidays.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="font-bold text-rose-700">Libur Nasional Bulan Ini:</span>
                    {visibleMonthHolidays.map(h => (
                      <span
                        key={h.date}
                        className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px]"
                      >
                        {formatShortDateId(h.date)}: {h.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                Terakhir diatur oleh: <strong className="text-slate-700 capitalize">{timestandConfig?.updatedBy || 'michael'}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
                {canEditTimestand && (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#003D79] hover:bg-[#00254D] text-white text-xs font-extrabold shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-[#FFB81C]" />
                    <span>Simpan Timestand ({draftSummary.effectiveWorkdays} Hari Kerja)</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
