import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  Info,
  X,
  Check,
  Key,
  Lock,
  Target,
  TrendingUp,
  ListChecks
} from 'lucide-react';
import {
  INDONESIAN_HOLIDAY_CALENDAR_ID,
  calculateTimestandWorkdays,
  calculateDailyTargetValue,
  calculateDailyChaseInfo,
  formatDateId,
  formatShortDateId
} from '../utils/googleCalendar';
import { formatBankingNumber, getMetricKnowledge } from '../utils/knowledgeBase';

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
  currentUser,
  metrics = []
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Expanded by default on main dashboard so daily targets are immediately visible without clicking!
  const [isDailyPanelExpanded, setIsDailyPanelExpanded] = useState(true);
  // Active tab in the inline daily panel: 'allMetrics' | 'dailySchedule'
  const [activeTab, setActiveTab] = useState('allMetrics');
  // Filter in 'allMetrics' tab: true = only under-target metrics, false = all used metrics
  const [onlyUnderTargetInPanel, setOnlyUnderTargetInPanel] = useState(true);

  // Draft state inside modal
  const [draftStart, setDraftStart] = useState(timestandConfig?.startDate || '2026-11-16');
  const [draftEnd, setDraftEnd] = useState(timestandConfig?.endDate || '2026-11-30');
  const [draftApiKey, setDraftApiKey] = useState(timestandConfig?.googleApiKey || '');
  const [draftCustomHolidays, setDraftCustomHolidays] = useState(timestandConfig?.customHolidays || []);
  const [selectionPhase, setSelectionPhase] = useState('start'); // 'start' or 'end'

  // Custom holiday form
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [showApiConfig, setShowApiConfig] = useState(false);

  // Visual Calendar Month/Year cursor (defaults to month of draftStart, e.g. Nov 2026)
  const initialDateParts = (timestandConfig?.startDate || '2026-11-16').split('-').map(Number);
  const [viewYear, setViewYear] = useState(initialDateParts[0] || 2026);
  const [viewMonth, setViewMonth] = useState((initialDateParts[1] || 11) - 1); // 0-indexed

  // Hovered date for tooltip
  const [hoveredDay, setHoveredDay] = useState(null);

  // Selected metric for daily schedule preview
  const [previewMetricRow, setPreviewMetricRow] = useState(10); // Default Endbal DPK (Row 10)

  // Active calculation (for main dashboard)
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

  // Quick inline date change on the main dashboard
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

  // Build calendar grid for a given year & month (0-indexed)
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

  // Metrics for inline daily breakdown table
  const usedMetrics = useMemo(() => metrics.filter(m => m.used && m.target > 0), [metrics]);
  const underTargetMetrics = useMemo(
    () => usedMetrics.filter(m => m.maxAcv < 1).sort((a, b) => b.scoreGap - a.scoreGap),
    [usedMetrics]
  );

  const displayedDailyMetrics = onlyUnderTargetInPanel ? underTargetMetrics : usedMetrics;

  const previewMetric = useMemo(() => {
    return (
      metrics.find(m => m.row === Number(previewMetricRow)) ||
      underTargetMetrics[0] ||
      usedMetrics[0] ||
      metrics[0]
    );
  }, [metrics, previewMetricRow, underTargetMetrics, usedMetrics]);

  const previewUnit = getMetricKnowledge(previewMetric)?.unit || '';
  const activeChaseInfo = useMemo(
    () => calculateDailyChaseInfo(previewMetric, activeSummary.effectiveWorkdays),
    [previewMetric, activeSummary.effectiveWorkdays]
  );
  const draftChaseInfo = useMemo(
    () => calculateDailyChaseInfo(previewMetric, draftSummary.effectiveWorkdays),
    [previewMetric, draftSummary.effectiveWorkdays]
  );

  return (
    <>
      {/* Main Timestand & Daily Target Breakdown Section (Directly Visible on Dashboard) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        {/* Top Banner Header */}
        <div className="p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4 bg-linear-to-r from-white via-slate-50/70 to-blue-50/40">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#003D79] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB81C]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#003D79]">
                  Timestand & Target Kejaran / Hari
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Google Calendar: {INDONESIAN_HOLIDAY_CALENDAR_ID}
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
                  Kalender: <strong>{activeSummary.totalCalendarDays} hr</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-rose-600 font-semibold">
                  Libur: <strong>{activeSummary.totalNonWorkingDays} hr (= 0)</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-[#FFB81C]/30 border border-[#FFB81C] text-[#00254D] font-extrabold">
                  Hari Kerja Efektif: {activeSummary.effectiveWorkdays} HK
                </span>
              </div>
            </div>
          </div>

          {/* Inline Date Range Pickers + Calendar Modal Button */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            {canEditTimestand && (
              <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-xl border border-slate-200 text-[11px] sm:text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase hidden sm:inline">Rentang:</span>
                <input
                  type="date"
                  value={timestandConfig?.startDate || '2026-11-16'}
                  onChange={(e) => handleQuickDateChange(e.target.value, timestandConfig?.endDate || '2026-11-30')}
                  className="font-bold text-[#003D79] text-[11px] sm:text-xs bg-transparent focus:outline-none cursor-pointer"
                  title="Ubah Tanggal Mulai Timestand"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="date"
                  value={timestandConfig?.endDate || '2026-11-30'}
                  min={timestandConfig?.startDate || '2026-11-16'}
                  onChange={(e) => handleQuickDateChange(timestandConfig?.startDate || '2026-11-16', e.target.value)}
                  className="font-bold text-[#003D79] text-[11px] sm:text-xs bg-transparent focus:outline-none cursor-pointer"
                  title="Ubah Tanggal Selesai Timestand"
                />
              </div>
            )}

            <button
              type="button"
              onClick={openModal}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all shadow-xs cursor-pointer ${
                canEditTimestand
                  ? 'bg-[#003D79] hover:bg-[#00254D] text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
              }`}
            >
              <Calendar className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${canEditTimestand ? 'text-[#FFB81C]' : 'text-[#003D79]'}`} />
              <span>Kalender Libur</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDailyPanelExpanded(prev => !prev)}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
            >
              <span>{isDailyPanelExpanded ? 'Sembunyikan Tabel Harian' : 'Tampilkan Tabel Harian'}</span>
              {isDailyPanelExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* DIRECTLY VISIBLE DAILY TARGET BREAKDOWN PANEL (No Click Needed!) */}
        {isDailyPanelExpanded && (
          <div className="border-t border-slate-200/80 p-4 space-y-3 bg-white">
            
            {/* Sub-header & Tab Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('allMetrics')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'allMetrics'
                      ? 'bg-[#003D79] text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5 text-[#FFB81C]" />
                  <span>1. Target Kejaran Per Hari Semua Metrik ({displayedDailyMetrics.length} Metrik)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('dailySchedule')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'dailySchedule'
                      ? 'bg-[#003D79] text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#FFB81C]" />
                  <span>
                    2. Jadwal Tanggal Demi Tanggal s.d. Target ({formatShortDateId(timestandConfig?.startDate)} – {formatShortDateId(timestandConfig?.endDate)})
                  </span>
                </button>
              </div>

              {activeTab === 'allMetrics' ? (
                <div className="flex items-center gap-3 text-xs">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={onlyUnderTargetInPanel}
                      onChange={(e) => setOnlyUnderTargetInPanel(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#003D79]"
                    />
                    <span>Hanya Metrik Belum 100% ({underTargetMetrics.length} Metrik)</span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-600">Pilih Metrik:</span>
                  <select
                    value={previewMetric?.row || ''}
                    onChange={(e) => setPreviewMetricRow(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg border border-blue-300 bg-blue-50/50 text-xs font-extrabold text-[#003D79] max-w-[320px] cursor-pointer"
                  >
                    {usedMetrics.map((m, idx) => (
                      <option key={m.row} value={m.row}>
                        {idx + 1}. [{m.category}] {m.name} ({m.maxAcv >= 1 ? '✓ 100%' : `Acv ${(m.acv * 100).toFixed(0)}%`})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* TAB 1: RINCIAN KEJARAN PER HARI SEMUA METRIK SAMPAI TARGET 100% */}
            {activeTab === 'allMetrics' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3">Kategori & Metrik</th>
                        <th className="py-2.5 px-3 text-right">Realisasi Saat Ini</th>
                        <th className="py-2.5 px-3 text-right">Target (100%)</th>
                        <th className="py-2.5 px-3 text-right">Total Kekurangan</th>
                        <th className="py-2.5 px-3 text-right bg-rose-50/70 text-rose-800">
                          Harus Dikejar / Hari ({activeSummary.effectiveWorkdays} HK)
                        </th>
                        <th className="py-2.5 px-3 text-right bg-blue-50/50 text-[#003D79]">
                          Porsi Target / HK
                        </th>
                        <th className="py-2.5 px-3">
                          Simulasi Estafet Harian s.d. Capai Target ({activeSummary.effectiveWorkdays} HK)
                        </th>
                        <th className="py-2.5 px-3 text-right">+Potensi Skor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedDailyMetrics.map((m, i) => {
                        const unit = getMetricKnowledge(m)?.unit || '';
                        const chase = calculateDailyChaseInfo(m, activeSummary.effectiveWorkdays);
                        const hk = Math.max(1, activeSummary.effectiveWorkdays);
                        const midHk = Math.max(1, Math.ceil(hk / 2));

                        const day1TargetPos = m.isQuality
                          ? Math.max(m.target, m.real - chase.dailyChase)
                          : m.real + chase.dailyChase;
                        const midTargetPos = m.isQuality
                          ? Math.max(m.target, m.real - chase.dailyChase * midHk)
                          : m.real + chase.dailyChase * midHk;

                        return (
                          <tr
                            key={m.row}
                            onClick={() => {
                              setPreviewMetricRow(m.row);
                              setActiveTab('dailySchedule');
                            }}
                            className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                            title="Klik baris ini untuk melihat jadwal kalender harian tanggal demi tanggal"
                          >
                            <td className="py-2.5 px-3 text-center font-mono font-extrabold text-[#003D79]">
                              {i + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[#003D79] font-bold text-[10px] border border-slate-200">
                                  {m.category}
                                </span>
                                <span className="font-bold text-slate-900">{m.name}</span>
                              </div>
                              {unit && <span className="text-[10px] text-slate-400">Satuan: {unit}</span>}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                              {formatBankingNumber(m.real, unit, m.isPct)}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                Acv {(m.acv * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                              {formatBankingNumber(m.target, unit, m.isPct)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              {chase.isAchieved ? (
                                <span className="text-emerald-700">0 (Tercapai)</span>
                              ) : (
                                <span className="text-rose-600">
                                  {m.isQuality ? '−' : '+'}
                                  {formatBankingNumber(chase.gapNominal, unit, m.isPct)}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono bg-rose-50/30">
                              {chase.isAchieved ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  ✓ Tercapai (0/HK)
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 border border-rose-200 font-extrabold text-xs inline-block">
                                  {m.isQuality ? 'Turun −' : 'Kejar +'}
                                  {formatBankingNumber(chase.dailyChase, unit, m.isPct)}/HK
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#003D79] bg-blue-50/20">
                              {formatBankingNumber(chase.dailyFullTarget, unit, m.isPct)}/HK
                            </td>
                            <td className="py-2.5 px-3 text-[11px] font-mono">
                              {chase.isAchieved ? (
                                <span className="text-emerald-700 font-sans font-semibold">
                                  ✓ Pertahankan posisi ≥ {formatBankingNumber(m.target, unit, m.isPct)}
                                </span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1 text-slate-700">
                                  <span className="px-1.5 py-0.2 rounded bg-slate-100">
                                    HK#1: <strong>{formatBankingNumber(day1TargetPos, unit, m.isPct)}</strong>
                                  </span>
                                  <span>→</span>
                                  <span className="px-1.5 py-0.2 rounded bg-blue-50 text-[#003D79]">
                                    HK#{midHk}: <strong>{formatBankingNumber(midTargetPos, unit, m.isPct)}</strong>
                                  </span>
                                  <span>→</span>
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                    HK#{hk}: {formatBankingNumber(m.target, unit, m.isPct)} (100% ✓)
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold">
                              {m.scoreGap > 0.0005 ? (
                                <span className="px-1.5 py-0.5 rounded bg-[#FFB81C]/25 text-[#996000] border border-[#FFB81C]/50">
                                  +{m.scoreGap.toFixed(2).replace('.', ',')}
                                </span>
                              ) : (
                                <span className="text-emerald-600">Penuh</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-3.5 py-2 bg-[#F8FAFC] border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                  <span>
                    💡 <strong>Rumus Kejaran Per Hari:</strong> <code className="font-mono text-[#003D79]">(Target − Realisasi Saat Ini) ÷ {activeSummary.effectiveWorkdays} Hari Kerja Efektif</code>. Klik salah satu baris metrik untuk melihat jadwal tanggal demi tanggal.
                  </span>
                  <span className="font-semibold text-[#003D79]">
                    Periode: {formatShortDateId(timestandConfig?.startDate)} – {formatShortDateId(timestandConfig?.endDate)} ({activeSummary.effectiveWorkdays} HK)
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: JADWAL HARIAN TANGGAL DEMI TANGGAL SAMPAI TARGET 100% */}
            {activeTab === 'dailySchedule' && previewMetric && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#F8FAFC] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-extrabold text-[#003D79]">
                      [{previewMetric.category}] {previewMetric.name}
                    </span>
                    <span>•</span>
                    <span>
                      Realisasi Awal: <strong className="font-mono">{formatBankingNumber(previewMetric.real, previewUnit, previewMetric.isPct)} {previewUnit}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Target 100%: <strong className="font-mono text-[#003D79]">{formatBankingNumber(previewMetric.target, previewUnit, previewMetric.isPct)} {previewUnit}</strong>
                    </span>
                    <span>•</span>
                    {!activeChaseInfo.isAchieved ? (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold font-mono">
                        Wajib {previewMetric.isQuality ? 'Turun −' : 'Kejar +'}
                        {formatBankingNumber(activeChaseInfo.dailyChase, previewUnit, previewMetric.isPct)} {previewUnit}/HK selama {activeSummary.effectiveWorkdays} HK
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        ✓ Sudah Mencapai Target 100%
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">No</th>
                        <th className="py-2 px-3">Tanggal</th>
                        <th className="py-2 px-3">Hari</th>
                        <th className="py-2 px-3">Status Hari (Google Calendar)</th>
                        <th className="py-2 px-3 text-right">Kejaran Hari Ini</th>
                        <th className="py-2 px-3 text-right bg-blue-50/50 text-[#003D79]">
                          Target Posisi Akumulasi s.d. Hari Ini
                        </th>
                        <th className="py-2 px-3 text-right">Proyeksi Acv %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeSummary.daysBreakdown.map((d, dIdx) => {
                        const wkIdx = d.workdayIndex || 0;
                        // Calculate cumulative position up to this day
                        const completedWorkdaysSoFar = activeSummary.daysBreakdown
                          .slice(0, dIdx + 1)
                          .filter(x => x.isEffectiveWorkday).length;

                        const projectedPos = activeChaseInfo.isAchieved
                          ? previewMetric.real
                          : previewMetric.isQuality
                            ? Math.max(previewMetric.target, previewMetric.real - activeChaseInfo.dailyChase * completedWorkdaysSoFar)
                            : Math.min(previewMetric.target, previewMetric.real + activeChaseInfo.dailyChase * completedWorkdaysSoFar);

                        const projectedAcvPct = previewMetric.target > 0
                          ? previewMetric.isQuality
                            ? Math.min(100, Math.max(0, (1 - (projectedPos - previewMetric.target) / previewMetric.target) * 100))
                            : Math.min(100, (projectedPos / previewMetric.target) * 100)
                          : 100;

                        return (
                          <tr
                            key={d.date}
                            className={
                              !d.isEffectiveWorkday
                                ? 'bg-rose-50/40 text-rose-700'
                                : wkIdx === activeSummary.effectiveWorkdays
                                  ? 'bg-emerald-50/60 font-bold text-slate-900'
                                  : 'hover:bg-slate-50 text-slate-700'
                            }
                          >
                            <td className="py-2 px-3 text-center font-mono font-bold">{dIdx + 1}</td>
                            <td className="py-2 px-3 font-mono font-semibold">{formatDateId(d.date)}</td>
                            <td className="py-2 px-3 font-bold">{d.dayName}</td>
                            <td className="py-2 px-3">
                              {d.isNationalHoliday ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px]">
                                  <span>🔴 Libur Nasional: {d.holidayName}</span>
                                </span>
                              ) : d.isWeekend ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 font-semibold text-[10px]">
                                  <span>Akhir Pekan ({d.dayName} = Libur)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                                  <span>Hari Kerja Efektif #{d.workdayIndex} dari {activeSummary.effectiveWorkdays} HK</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              {!d.isEffectiveWorkday ? (
                                <span className="text-rose-500">0 (Libur)</span>
                              ) : activeChaseInfo.isAchieved ? (
                                <span className="text-emerald-700">0 (Sudah Tercapai)</span>
                              ) : (
                                <span className="text-rose-700">
                                  {previewMetric.isQuality ? '−' : '+'}
                                  {formatBankingNumber(activeChaseInfo.dailyChase, previewUnit, previewMetric.isPct)}
                                  {previewUnit ? ` ${previewUnit}` : ''}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-extrabold bg-blue-50/20 text-[#003D79]">
                              {formatBankingNumber(projectedPos, previewUnit, previewMetric.isPct)}
                              {previewUnit ? ` ${previewUnit}` : ''}
                              {d.isEffectiveWorkday && wkIdx === activeSummary.effectiveWorkdays && !activeChaseInfo.isAchieved && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-sans">
                                  100% Target ✓
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              <span className={projectedAcvPct >= 99.9 ? 'text-emerald-700' : 'text-slate-700'}>
                                {projectedAcvPct.toFixed(1).replace('.', ',')}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Timestand & Visual Google Calendar Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="fixed inset-0" onClick={() => setIsModalOpen(false)}></div>

          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200">
            
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
                    Pengaturan Rentang Tanggal Target Harian & Hari Kerja Efektif
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
              
              {/* Role Access Notice if Viewer */}
              {!canEditTimestand && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2 font-semibold">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Anda login sebagai <strong>Viewer</strong>. Pengaturan rentang tanggal Timestand hanya dapat diubah dan disimpan oleh <strong>Admin / Konseptor (michael)</strong> atau <strong>Superadmin</strong>.
                  </span>
                </div>
              )}

              {/* Top Controls: Date Inputs + Presets + Google Calendar Sync */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
                  
                  {/* Date Inputs */}
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

                    {/* Quick Presets */}
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

                  {/* Google Calendar API Sync Controls */}
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

                {/* Optional Google API Key & Custom Holiday Panel */}
                {showApiConfig && canEditTimestand && (
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Google Calendar API Key (Opsional — Otomatis memakai feed publik jika kosong)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={draftApiKey}
                          onChange={(e) => setDraftApiKey(e.target.value)}
                          placeholder="AIzaSy... (Google Calendar API v3 Key)"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                        />
                      </div>
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
                          Klik tanggal untuk memilih: {selectionPhase === 'start' ? '1. Tanggal Mulai' : '2. Tanggal Selesai'}
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

                {/* Hovered Holiday / Date Info Banner */}
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

                {/* 2-Month Grid */}
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
