import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  Info,
  CheckCircle2,
  Lightbulb,
  ExternalLink,
  Sliders,
  Sparkles,
  Building2,
  Calculator,
  Edit3,
  Plus,
  Minus,
  Calendar,
  ListOrdered,
  Target,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  X,
  RotateCcw,
  Check,
  Search
} from 'lucide-react';
import { formatBankingNumber, getMetricKnowledge } from '../utils/knowledgeBase';
import {
  CAT_ORDER,
  CATEGORY_MULTIPLIERS,
  getActionText,
  getDefaultStrategyText,
  calcMetricScore
} from '../utils/excelParser';
import {
  calculateDailyTargetValue,
  calculateDailyChaseInfo,
  formatDateId,
  formatShortDateId
} from '../utils/googleCalendar';
import { getCategoryTheme, CATEGORY_THEMES } from '../utils/categoryColors';

export function MetricsTable({
  metrics = [],
  categorySummary = {},
  totalScore = 85.53,
  filterCategory = 'all',
  onSelectCategory,
  filterUnderTarget = false,
  searchQuery = '',
  onSearchChange,
  branchInfo = { code: '10125', name: 'Jakarta Pondok Indah Office 3', head: 'MICHAEL DANNIEL', grade: 'B.3' },
  onSelectMetricForDetail,
  onOpenSimulatorForMetric,
  // RBAC & Edit Props
  canEditMaster = false,
  isViewerSimMode = false,
  masterStrategies = {},
  viewerSimStrategies = {},
  viewerSimTargets = {},
  viewerSimReals = {},
  onSaveMasterTarget,
  onResetMasterTarget,
  onSaveMasterStrategy,
  onResetMasterStrategy,
  onUpdateViewerSimTarget,
  onUpdateViewerSimReal,
  onUpdateViewerSimStrategy,
  onActivateViewerSimMode,
  // Timestand Props
  effectiveWorkdays = 11,
  timestandConfig = null,
  timestandSummary = null
}) {
  const [sortMode, setSortMode] = useState('excel'); // 'excel' | 'scoreGap' | 'acv' | 'nominalGap'
  const [sortOrder, setSortOrder] = useState('asc');
  const [showZeroWeightRows, setShowZeroWeightRows] = useState(true);

  // Per-row expandable panels directly below each metric:
  // 'timestand' | 'rumus' | 'edit' | null
  const [activeSubPanelByRow, setActiveSubPanelByRow] = useState({});

  // Strategy visibility state inside cell: hidden by default, shown when clicked
  const [openStrategyRows, setOpenStrategyRows] = useState({});
  const [showAllStrategies, setShowAllStrategies] = useState(false);

  // Full-Width Editor State (for comfortable editing of Target, Realisasi Simulation & Strategy)
  const [editingRowId, setEditingRowId] = useState(null);
  const [activeEditorTab, setActiveEditorTab] = useState('realisasi'); // 'realisasi' | 'target'
  const [draftRealVal, setDraftRealVal] = useState('');
  const [draftTargetVal, setDraftTargetVal] = useState('');
  const [draftStrategyText, setDraftStrategyText] = useState('');
  const [draftStrategyScope, setDraftStrategyScope] = useState('branch'); // 'branch' | 'all'

  const canInlineEdit = canEditMaster || isViewerSimMode;
  const branchCode = String(branchInfo?.code || '10125');
  const periodLabel = timestandConfig?.startDate && timestandConfig?.endDate
    ? `${formatShortDateId(timestandConfig.startDate)} – ${formatShortDateId(timestandConfig.endDate)}`
    : '16 Nov – 30 Nov 2026';

  const daysBreakdown = timestandSummary?.daysBreakdown || [];

  const toggleStrategyRow = (e, rowId) => {
    if (e) e.stopPropagation();
    setOpenStrategyRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const isStrategyVisible = (rowId) => {
    return showAllStrategies || Boolean(openStrategyRows[rowId]);
  };

  const toggleSubPanel = (e, rowId, panelType) => {
    if (e) e.stopPropagation();
    setActiveSubPanelByRow(prev => ({
      ...prev,
      [rowId]: prev[rowId] === panelType ? null : panelType
    }));
  };

  // Resolve strategy text for a metric
  const resolveStrategyInfo = (item) => {
    const info = getMetricKnowledge(item);
    const branchKey = `b${branchCode}~${item.row}`;
    const globalKey = `g~${item.row}`;

    if (isViewerSimMode && viewerSimStrategies[item.row]) {
      return {
        text: viewerSimStrategies[item.row],
        tacticalList: viewerSimStrategies[item.row].split('\n').filter(Boolean),
        scope: 'simulasi',
        updatedBy: 'Simulasi Viewer'
      };
    }

    if (masterStrategies[branchKey]?.text) {
      return {
        text: masterStrategies[branchKey].text,
        tacticalList: masterStrategies[branchKey].text.split('\n').filter(Boolean),
        scope: 'branch',
        updatedBy: masterStrategies[branchKey].updatedBy || 'michael'
      };
    }

    if (masterStrategies[globalKey]?.text) {
      return {
        text: masterStrategies[globalKey].text,
        tacticalList: masterStrategies[globalKey].text.split('\n').filter(Boolean),
        scope: 'all',
        updatedBy: masterStrategies[globalKey].updatedBy || 'michael'
      };
    }

    const defaultText =
      info.tacticalAction && info.tacticalAction.length > 0
        ? info.tacticalAction.join('\n')
        : getDefaultStrategyText(item);

    return {
      text: defaultText,
      tacticalList:
        info.tacticalAction && info.tacticalAction.length > 0
          ? info.tacticalAction
          : [getDefaultStrategyText(item)],
      scope: null,
      updatedBy: null
    };
  };

  // Open Full-Width Editor Panel for a row (Realisasi + Target + Rumus + Strategy)
  const handleOpenFullEditor = (e, item) => {
    if (e) e.stopPropagation();
    const resolved = resolveStrategyInfo(item);
    const displayReal = item.isPct ? Number((item.real * 100).toFixed(4)) : Number(item.real.toFixed(4));
    const displayTgt = item.isPct ? Number((item.target * 100).toFixed(4)) : Number(item.target.toFixed(4));
    setDraftRealVal(String(displayReal));
    setDraftTargetVal(String(displayTgt));
    setDraftStrategyText(resolved.text);
    setDraftStrategyScope(resolved.scope === 'all' ? 'all' : 'branch');
    // If viewer simulation mode, default to Realisasi simulation tab; otherwise Target
    setActiveEditorTab(isViewerSimMode ? 'realisasi' : 'target');
    setEditingRowId(prev => (prev === item.row ? null : item.row));
  };

  const handleStepReal = (e, item, factorPct) => {
    if (e) e.stopPropagation();
    const cur = parseFloat(draftRealVal);
    const base = !isNaN(cur) ? cur : (item.isPct ? item.real * 100 : item.real);
    const step = base !== 0 ? Math.abs(base) * Math.abs(factorPct) : 1;
    const next = Math.max(0, Number((base + (factorPct > 0 ? step : -step)).toFixed(4)));
    setDraftRealVal(String(next));
  };

  const handleSetRealToTarget = (e, item) => {
    if (e) e.stopPropagation();
    const curTarget = parseFloat(draftTargetVal);
    const baseTgt = !isNaN(curTarget) ? curTarget : (item.isPct ? item.target * 100 : item.target);
    setDraftRealVal(String(Number(baseTgt.toFixed(4))));
  };

  const handleSaveReal = (e, item) => {
    if (e) e.stopPropagation();
    const parsed = parseFloat(draftRealVal);
    if (!isNaN(parsed) && parsed >= 0) {
      const actualRealValue = item.isPct ? parsed / 100 : parsed;
      if (onUpdateViewerSimReal) {
        onUpdateViewerSimReal(item.row, actualRealValue);
      }
    }
  };

  const handleResetReal = (e, item) => {
    if (e) e.stopPropagation();
    if (onUpdateViewerSimReal) {
      onUpdateViewerSimReal(item.row, undefined);
    }
    const orig = item.masterReal !== undefined ? item.masterReal : (item.originalReal !== undefined ? item.originalReal : item.real);
    const displayVal = item.isPct ? Number((orig * 100).toFixed(4)) : Number(orig.toFixed(4));
    setDraftRealVal(String(displayVal));
  };

  const handleStepTarget = (e, item, factorPct) => {
    if (e) e.stopPropagation();
    const cur = parseFloat(draftTargetVal);
    const base = !isNaN(cur) ? cur : (item.isPct ? item.target * 100 : item.target);
    const step = base !== 0 ? Math.abs(base) * Math.abs(factorPct) : 1;
    const next = Math.max(0, Number((base + (factorPct > 0 ? step : -step)).toFixed(4)));
    setDraftTargetVal(String(next));
  };

  const handleSaveTarget = (e, item) => {
    if (e) e.stopPropagation();
    const parsed = parseFloat(draftTargetVal);
    if (!isNaN(parsed) && parsed >= 0) {
      const actualTargetValue = item.isPct ? parsed / 100 : parsed;
      if (isViewerSimMode) {
        onUpdateViewerSimTarget(item.row, actualTargetValue);
      } else if (canEditMaster) {
        onSaveMasterTarget(branchCode, item.row, actualTargetValue);
      }
    }
  };

  const handleResetTarget = (e, item) => {
    if (e) e.stopPropagation();
    if (isViewerSimMode) {
      onUpdateViewerSimTarget(item.row, undefined);
    } else if (canEditMaster) {
      onResetMasterTarget(branchCode, item.row);
    }
    const orig = item.konseptorTarget !== undefined ? item.konseptorTarget : (item.originalTarget !== undefined ? item.originalTarget : item.target);
    const displayVal = item.isPct ? Number((orig * 100).toFixed(4)) : Number(orig.toFixed(4));
    setDraftTargetVal(String(displayVal));
  };

  const handleSaveStrategy = (e, item) => {
    if (e) e.stopPropagation();
    const clean = draftStrategyText.trim();
    if (isViewerSimMode) {
      onUpdateViewerSimStrategy(item.row, clean);
    } else if (canEditMaster) {
      onSaveMasterStrategy(branchCode, item.row, {
        text: clean,
        scope: draftStrategyScope,
        metricName: item.name,
        category: item.category
      });
    }
    setOpenStrategyRows(prev => ({ ...prev, [item.row]: true }));
  };

  const handleSaveBothAndClose = (e, item) => {
    if (e) e.stopPropagation();
    handleSaveReal(e, item);
    handleSaveTarget(e, item);
    handleSaveStrategy(e, item);
    setEditingRowId(null);
  };

  const handleResetStrategy = (e, item) => {
    if (e) e.stopPropagation();
    if (isViewerSimMode) {
      onUpdateViewerSimStrategy(item.row, undefined);
    } else if (canEditMaster) {
      onResetMasterStrategy(branchCode, item.row);
    }
    const info = getMetricKnowledge(item);
    const defaultText =
      info.tacticalAction && info.tacticalAction.length > 0
        ? info.tacticalAction.join('\n')
        : getDefaultStrategyText(item);
    setDraftStrategyText(defaultText);
  };

  // Filter metrics
  const filteredMetrics = useMemo(() => {
    const isSearching = Boolean(searchQuery && searchQuery.trim());
    const q = isSearching ? searchQuery.trim().toLowerCase() : '';

    const base = metrics.filter((m) => {
      if (!m.metric && !m.subMetric && !m.name) return false;
      if (!showZeroWeightRows && (!m.bobot || m.bobot <= 0)) return false;

      // When searching, perform global search across ALL categories so items like "livin", "kpr", "giro" are never hidden by active category filters!
      if (isSearching) {
        const matchName = m.name?.toLowerCase().includes(q);
        const matchMetric = m.metric?.toLowerCase().includes(q);
        const matchSub = m.subMetric?.toLowerCase().includes(q);
        const matchCat = m.category?.toLowerCase().includes(q);
        const matchRow = String(m.row).includes(q);
        return matchName || matchMetric || matchSub || matchCat || matchRow;
      }

      if (filterCategory !== 'all' && m.category !== filterCategory) return false;
      if (filterUnderTarget && (!m.used || m.scoreGap <= 0.0005)) return false;

      return true;
    });

    if (sortMode === 'excel') {
      return [...base].sort((a, b) => {
        const catDiff = CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category);
        if (catDiff !== 0) return catDiff;
        return a.row - b.row;
      });
    }

    return [...base].sort((a, b) => {
      const valA = Number(a[sortMode]) || 0;
      const valB = Number(b[sortMode]) || 0;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [metrics, showZeroWeightRows, filterCategory, filterUnderTarget, searchQuery, sortMode, sortOrder]);

  const handleColumnSort = (field) => {
    if (sortMode === field) {
      if (sortOrder === 'desc') {
        setSortOrder('asc');
      } else {
        setSortMode('excel');
        setSortOrder('asc');
      }
    } else {
      setSortMode(field);
      setSortOrder('desc');
    }
  };

  // Distinct category theme helper
  const getCatBadge = (cat) => getCategoryTheme(cat).badge;
  const getCatTag = (cat) => getCategoryTheme(cat).tag;
  const getCatBanner = (cat) => getCategoryTheme(cat).banner;

  // Render Per-Metric Timestand Daily Schedule Table (Directly below the metric!)
  const renderPerMetricTimestandSchedule = (item, displayNumber, unit, chaseInfo) => {
    return (
      <div className="bg-white rounded-xl border-2 border-[#003D79]/30 shadow-xs overflow-hidden space-y-0">
        <div className="px-4 py-3 bg-linear-to-r from-[#00254D] via-[#003D79] to-[#004B94] text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#FFB81C] text-[#00254D] font-black text-[10px] uppercase">
              Timestand Per Metrik #{displayNumber}
            </span>
            <h4 className="font-extrabold text-xs sm:text-sm text-white">
              [{item.category}] {item.name} — Jadwal Kejaran Harian ({periodLabel} • {effectiveWorkdays} HK)
            </h4>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {!chaseInfo.isAchieved && chaseInfo.hasTarget ? (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold text-[11px]">
                {item.isQuality ? 'Turunkan −' : 'Wajib Kejar +'}
                {formatBankingNumber(chaseInfo.dailyChase, unit, item.isPct)} {unit}/HK
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[11px]">
                ✓ Target 100% Tercapai
              </span>
            )}
            <button
              type="button"
              onClick={(e) => toggleSubPanel(e, item.row, 'timestand')}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              title="Tutup Jadwal Harian"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="px-4 py-2.5 bg-blue-50/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-700">
            <span>
              Realisasi Saat Ini: <strong className="font-mono text-slate-900">{formatBankingNumber(item.real, unit, item.isPct)} {unit}</strong>
            </span>
            <span>•</span>
            <span>
              Target 100%: <strong className="font-mono text-[#003D79]">{formatBankingNumber(item.target, unit, item.isPct)} {unit}</strong>
            </span>
            <span>•</span>
            <span>
              Total Selisih: <strong className="font-mono text-rose-700">{item.isQuality ? '−' : '+'}{formatBankingNumber(chaseInfo.gapNominal, unit, item.isPct)} {unit}</strong>
            </span>
            <span>•</span>
            <span>
              Porsi Target Harian (Target ÷ {effectiveWorkdays} HK): <strong className="font-mono text-[#003D79]">{formatBankingNumber(chaseInfo.dailyFullTarget, unit, item.isPct)} {unit}/HK</strong>
            </span>
          </div>
        </div>

        {/* Day-by-Day Table */}
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px] uppercase">
              <tr>
                <th className="py-2 px-3 w-10 text-center">Hari</th>
                <th className="py-2 px-3">Tanggal</th>
                <th className="py-2 px-3">Nama Hari</th>
                <th className="py-2 px-3">Status Kalender Kerja</th>
                <th className="py-2 px-3 text-right">Target Kejaran Hari Ini</th>
                <th className="py-2 px-3 text-right bg-blue-50/60 text-[#003D79]">
                  Target Posisi Akumulasi s.d. Hari Ini
                </th>
                <th className="py-2 px-3 text-right">Proyeksi Acv %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {daysBreakdown.map((d, dIdx) => {
                const wkIdx = d.workdayIndex || 0;
                const completedWorkdaysSoFar = daysBreakdown
                  .slice(0, dIdx + 1)
                  .filter(x => x.isEffectiveWorkday).length;

                const projectedPos = chaseInfo.isAchieved
                  ? item.real
                  : item.isQuality
                    ? Math.max(item.target, item.real - chaseInfo.dailyChase * completedWorkdaysSoFar)
                    : Math.min(item.target, item.real + chaseInfo.dailyChase * completedWorkdaysSoFar);

                const projectedAcvPct = item.target > 0
                  ? item.isQuality
                    ? Math.min(100, Math.max(0, (1 - (projectedPos - item.target) / item.target) * 100))
                    : Math.min(100, (projectedPos / item.target) * 100)
                  : 100;

                return (
                  <tr
                    key={d.date}
                    className={
                      !d.isEffectiveWorkday
                        ? 'bg-rose-50/40 text-rose-700'
                        : wkIdx === effectiveWorkdays
                          ? 'bg-emerald-50/70 font-bold text-slate-900'
                          : 'hover:bg-slate-50 text-slate-700'
                    }
                  >
                    <td className="py-2 px-3 text-center font-mono font-bold">{dIdx + 1}</td>
                    <td className="py-2 px-3 font-mono font-semibold">{formatDateId(d.date)}</td>
                    <td className="py-2 px-3 font-bold">{d.dayName}</td>
                    <td className="py-2 px-3">
                      {d.isNationalHoliday ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px]">
                          🔴 Libur Nasional: {d.holidayName}
                        </span>
                      ) : d.isWeekend ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 font-semibold text-[10px]">
                          Akhir Pekan ({d.dayName} = Libur)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                          Hari Kerja Efektif #{d.workdayIndex} dari {effectiveWorkdays} HK
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      {!d.isEffectiveWorkday ? (
                        <span className="text-rose-500">0 (Libur)</span>
                      ) : chaseInfo.isAchieved ? (
                        <span className="text-emerald-700">0 (Tercapai)</span>
                      ) : (
                        <span className="text-rose-700">
                          {item.isQuality ? '−' : '+'}
                          {formatBankingNumber(chaseInfo.dailyChase, unit, item.isPct)} {unit}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-extrabold bg-blue-50/30 text-[#003D79]">
                      {formatBankingNumber(projectedPos, unit, item.isPct)} {unit}
                      {d.isEffectiveWorkday && wkIdx === effectiveWorkdays && !chaseInfo.isAchieved && (
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
    );
  };

  // Render Large, Spacious Full-Width Editor Panel for Realisasi, Target, Rumus & Strategy
  const renderFullWidthEditorPanel = (item, displayNumber, unit, resolvedStrategy) => {
    const parsedDraftTgt = parseFloat(draftTargetVal);
    const previewTargetVal = !isNaN(parsedDraftTgt) && parsedDraftTgt >= 0
      ? (item.isPct ? parsedDraftTgt / 100 : parsedDraftTgt)
      : item.target;

    const parsedDraftReal = parseFloat(draftRealVal);
    const previewRealVal = !isNaN(parsedDraftReal) && parsedDraftReal >= 0
      ? (item.isPct ? parsedDraftReal / 100 : parsedDraftReal)
      : item.real;

    const previewScoreObj = calcMetricScore(
      previewRealVal,
      previewTargetVal,
      item.bobot,
      item.category,
      item.isQuality,
      item.rndAcv !== false,
      item.scored !== false
    );
    const previewChase = calculateDailyChaseInfo(
      { ...item, real: previewRealVal, target: previewTargetVal, maxAcv: previewScoreObj.maxAcv },
      effectiveWorkdays
    );
    const baseScore = item.masterScore !== undefined ? item.masterScore : (item.originalScore !== undefined ? item.originalScore : item.score);
    const previewScoreDelta = Number((previewScoreObj.score - baseScore).toFixed(4));

    return (
      <div
        className="bg-white rounded-2xl border-2 border-[#003D79] shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Editor Header */}
        <div className="bg-linear-to-r from-[#00254D] via-[#003D79] to-[#004B94] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-4 h-4 text-[#FFB81C]" />
            <h4 className="font-extrabold text-sm sm:text-base">
              Panel Simulasi Capaian, Target & Strategi — No. #{displayNumber} [{item.category}] {item.name}
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setEditingRowId(null)}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Wide Editor Body */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          
          {/* Left Column (5 cols): Large Realisasi / Target & Formula Editor */}
          <div className="lg:col-span-5 space-y-4 bg-[#F8FAFC] p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="font-extrabold text-[#003D79] text-sm flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-[#003D79]" />
                <span>1. Simulasi Angka & Rumus Skor</span>
              </span>
              {unit && (
                <span className="px-2 py-0.5 rounded bg-blue-100 text-[#003D79] font-bold text-[11px]">
                  Satuan: {unit}
                </span>
              )}
            </div>

            {/* Sub-Tabs: Simulasi Realisasi (Capaian) vs Edit Target KPI */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveEditorTab('realisasi')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-extrabold text-xs transition-colors cursor-pointer ${
                  activeEditorTab === 'realisasi'
                    ? 'bg-[#003D79] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/60'
                }`}
              >
                Simulasi Realisasi (Capaian)
              </button>
              <button
                type="button"
                onClick={() => setActiveEditorTab('target')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-extrabold text-xs transition-colors cursor-pointer ${
                  activeEditorTab === 'target'
                    ? 'bg-[#003D79] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/60'
                }`}
              >
                Edit / Simulasi Target KPI
              </button>
            </div>

            {/* TAB 1: SIMULASI REALISASI (CAPAIAN) */}
            {activeEditorTab === 'realisasi' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 text-xs">
                    Masukkan Simulasi Realisasi (Capaian) {item.isPct ? '(%)' : `(${unit || 'Nominal'})`}:
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Target: <strong className="font-mono text-[#003D79]">{formatBankingNumber(previewTargetVal, unit, item.isPct)}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleSetRealToTarget(e, item)}
                    className="px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] cursor-pointer shadow-2xs"
                    title="Set realisasi langsung sama dengan target 100%"
                  >
                    Set 100% Target
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStepReal(e, item, 0.05)}
                    className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer shadow-2xs"
                  >
                    +5%
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStepReal(e, item, 0.10)}
                    className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer shadow-2xs"
                  >
                    +10%
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStepReal(e, item, -0.05)}
                    className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer shadow-2xs"
                  >
                    −5%
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={draftRealVal}
                  onChange={(e) => setDraftRealVal(e.target.value)}
                  className="w-full px-4 py-2.5 text-right font-mono font-black text-base text-[#003D79] bg-white border-2 border-[#003D79] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB81C]"
                  placeholder="Ketik angka realisasi yang ingin dicapai..."
                />

                {/* Baseline Realisasi Aktual */}
                <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/90 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Realisasi Aktual Saat Ini:
                    </span>
                    <strong className="font-mono text-sm text-slate-900">
                      {formatBankingNumber(
                        item.masterReal !== undefined ? item.masterReal : (item.originalReal !== undefined ? item.originalReal : item.real),
                        unit,
                        item.isPct
                      )} {unit}
                    </strong>
                  </div>
                  {item.isRealModified && (
                    <button
                      type="button"
                      onClick={(e) => handleResetReal(e, item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-[#FFB81C]" />
                      <span>Pakai Realisasi Aktual</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: EDIT / SIMULASI TARGET KPI */}
            {activeEditorTab === 'target' && (
              <div className="space-y-2.5">
                <label className="block font-bold text-slate-700 text-xs">
                  Masukkan Nilai Target Baru {item.isPct ? '(dalam %)' : `(${unit || 'Nominal'})`}:
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleStepTarget(e, item, -0.10)}
                    className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer shadow-2xs"
                  >
                    −10%
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStepTarget(e, item, -0.05)}
                    className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer shadow-2xs"
                  >
                    −5%
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStepTarget(e, item, 0.05)}
                    className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer shadow-2xs"
                  >
                    +5%
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStepTarget(e, item, 0.10)}
                    className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer shadow-2xs"
                  >
                    +10%
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={draftTargetVal}
                  onChange={(e) => setDraftTargetVal(e.target.value)}
                  className="w-full px-4 py-2.5 text-right font-mono font-black text-base text-[#003D79] bg-white border-2 border-[#003D79] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB81C]"
                />

                {/* Baseline Target Awal dari Konseptor */}
                <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/90 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Target Awal (Ditetapkan Konseptor):
                    </span>
                    <strong className="font-mono text-sm text-[#003D79]">
                      {formatBankingNumber(
                        item.konseptorTarget !== undefined ? item.konseptorTarget : (item.originalTarget !== undefined ? item.originalTarget : item.target),
                        unit,
                        item.isPct
                      )} {unit}
                    </strong>
                  </div>
                  {item.isTargetModified && (
                    <button
                      type="button"
                      onClick={(e) => handleResetTarget(e, item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-[#FFB81C]" />
                      <span>Pakai Target Konseptor</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Live Formula Preview Box */}
            <div className="p-3.5 rounded-xl bg-white border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-[#003D79] uppercase tracking-wider">
                  Pratinjau Hasil Rumus Otomatis:
                </p>
                {previewScoreDelta !== 0 && (
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                    previewScoreDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {previewScoreDelta > 0 ? 'Naik +' : 'Turun '}{previewScoreDelta.toFixed(2).replace('.', ',')} pt
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-500 block text-[10px]">Realisasi Proyeksi:</span>
                  <strong className="font-mono text-sm text-slate-900">
                    {formatBankingNumber(previewRealVal, unit, item.isPct)} {unit}
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-blue-50/60">
                  <span className="text-slate-500 block text-[10px]">Pencapaian (Acv Baru):</span>
                  <strong className="font-mono text-sm text-[#003D79]">
                    {(previewScoreObj.acv * 100).toFixed(1).replace('.', ',')}% (Max {(previewScoreObj.maxAcv * 100).toFixed(0)}%)
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-rose-50/60">
                  <span className="text-slate-500 block text-[10px]">Kejaran Harian ({effectiveWorkdays} HK):</span>
                  <strong className="font-mono text-sm text-rose-700">
                    {previewChase.isAchieved
                      ? '0 / HK (Tercapai ✓)'
                      : `${item.isQuality ? '−' : '+'}${formatBankingNumber(previewChase.dailyChase, unit, item.isPct)}/HK`}
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-amber-50/70">
                  <span className="text-slate-500 block text-[10px]">Skor Metrik Baru:</span>
                  <strong className={`font-mono text-sm ${previewScoreDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {previewScoreObj.score.toFixed(2).replace('.', ',')} / {previewScoreObj.maxScore.toFixed(2).replace('.', ',')} pt
                  </strong>
                </div>
              </div>

              {/* Informative Guidance */}
              {previewScoreDelta < -0.0005 && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 leading-relaxed font-medium">
                  ⚠️ <strong>Skor berjalan metrik ini turun {Math.abs(previewScoreDelta).toFixed(2).replace('.', ',')} pt</strong> karena Target KPI dinaikkan tanpa menaikkan Realisasi berjalan. Jika Anda ingin menguji proyeksi kenaikan skor dari capaian kinerja cabang, gunakan tab <strong>"Simulasi Realisasi (Capaian)"</strong> di atas untuk menaikkan angka Realisasi!
                </div>
              )}
              {previewScoreDelta > 0.0005 && (
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 leading-relaxed font-bold">
                  ✓ Proyeksi simulasi ini akan menambah <strong>+{previewScoreDelta.toFixed(2).replace('.', ',')} poin</strong> ke total skor cabang!
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  if (activeEditorTab === 'realisasi') handleSaveReal(e, item);
                  else handleSaveTarget(e, item);
                }}
                className="px-4 py-2 rounded-xl bg-[#003D79] hover:bg-[#00254D] text-white font-extrabold text-xs cursor-pointer shadow-xs"
              >
                {activeEditorTab === 'realisasi' ? 'Simpan Realisasi Simulasi' : 'Simpan Angka Target'}
              </button>
              {(item.isTargetModified || item.isRealModified) && (
                <button
                  type="button"
                  onClick={(e) => {
                    handleResetReal(e, item);
                    handleResetTarget(e, item);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Metrik ke Awal</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column (7 cols): Large Wide Textarea for Strategy & Tactical Notes */}
          <div className="lg:col-span-7 space-y-4 bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <span className="font-extrabold text-[#003D79] text-sm flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-[#FFB81C]" />
                  <span>2. Edit Strategi, Cara Mengejar & Catatan Rumus</span>
                </span>
                {canEditMaster && !isViewerSimMode && (
                  <div className="flex items-center gap-3 text-xs text-slate-700 font-semibold">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={`scope_full_${item.row}`}
                        checked={draftStrategyScope === 'branch'}
                        onChange={() => setDraftStrategyScope('branch')}
                      />
                      <span>Khusus Cabang {branchCode}</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={`scope_full_${item.row}`}
                        checked={draftStrategyScope === 'all'}
                        onChange={() => setDraftStrategyScope('all')}
                      />
                      <span>Semua Cabang</span>
                    </label>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                Tuliskan poin-poin strategi atau rumus eksekusi harian (pisahkan dengan baris baru / Enter untuk setiap poin):
              </p>

              <textarea
                rows={6}
                value={draftStrategyText}
                onChange={(e) => setDraftStrategyText(e.target.value)}
                className="w-full p-3.5 text-sm leading-relaxed border-2 border-blue-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#003D79] focus:border-[#003D79] text-slate-800 font-medium resize-y min-h-[140px]"
                placeholder="Tuliskan rincian strategi dan langkah eksekusi..."
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                {resolvedStrategy.scope && (
                  <button
                    type="button"
                    onClick={(e) => handleResetStrategy(e, item)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset ke Strategi Bawaan</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRowId(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Tutup / Batal
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveBothAndClose(e, item)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#003D79] hover:bg-[#00254D] text-white font-extrabold text-xs shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4 text-[#FFB81C]" />
                  <span>Simpan Semua Perubahan</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div id="scorecard-table-section" className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden scroll-mt-4">
      
      {/* Table Header Controls */}
      <div className="px-3.5 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-2.5 h-2.5 rounded-full bg-[#003D79] shrink-0"></div>
          <h3 className="text-xs sm:text-base font-extrabold text-[#003D79] tracking-tight">
            Tabel Scorecard BranchIQ & Target Kejaran Harian ({effectiveWorkdays} HK)
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-mono">
            No. 1–{filteredMetrics.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600">
          {/* Quick Search in Table Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari metrik di tabel (livin, kpr...)"
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-44 sm:w-56 text-xs bg-white border border-slate-300 rounded-lg pl-8 pr-7 py-1 font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange && onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Show/Hide All Strategies */}
          <button
            type="button"
            onClick={() => {
              if (showAllStrategies) {
                setShowAllStrategies(false);
                setOpenStrategyRows({});
              } else {
                setShowAllStrategies(true);
              }
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
              showAllStrategies
                ? 'bg-[#003D79] text-white border-[#003D79]'
                : 'bg-white hover:bg-slate-100 text-[#003D79] border-slate-300'
            }`}
          >
            {showAllStrategies ? <EyeOff className="w-3 h-3 text-[#FFB81C]" /> : <Eye className="w-3 h-3 text-[#003D79]" />}
            <span>{showAllStrategies ? 'Sembunyikan Semua Strategi' : 'Buka Semua Strategi'}</span>
          </button>

          {/* Toggle 0% weight rows */}
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none font-semibold text-slate-600 text-[11px] sm:text-xs">
            <input
              type="checkbox"
              checked={showZeroWeightRows}
              onChange={(e) => setShowZeroWeightRows(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-[#003D79] focus:ring-[#003D79] border-slate-300"
            />
            <span>Baris Bobot 0%</span>
          </label>

          {/* Sort Mode Selector */}
          <div className="flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-[#003D79] shrink-0" />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="font-bold text-[#003D79] bg-blue-50 border border-blue-200/80 px-2 py-1 rounded-lg text-[11px] sm:text-xs cursor-pointer focus:outline-none max-w-[220px] sm:max-w-none"
            >
              <option value="excel">Urutan Baku Kategori (No. 1–{filteredMetrics.length})</option>
              <option value="scoreGap">Prioritas Potensi Skor Terbesar</option>
              <option value="acv">Pencapaian (Acv %) Terendah</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search / Filter Notification Strip */}
      {searchQuery && searchQuery.trim() !== '' && (
        <div className="px-3.5 sm:px-5 py-2 bg-blue-50/90 border-b border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#003D79] shrink-0" />
            <span className="font-bold text-[#003D79]">
              Hasil Pencarian: <span className="underline font-black">"{searchQuery}"</span> — Ditemukan {filteredMetrics.length} Sub-Metrik di Semua Kategori
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSearchChange && onSearchChange('')}
            className="px-2.5 py-0.5 rounded bg-white hover:bg-slate-100 text-[#003D79] border border-blue-300 font-bold text-[11px] cursor-pointer"
          >
            Reset Pencarian
          </button>
        </div>
      )}
      {!searchQuery && filterCategory !== 'all' && (
        <div className="px-3.5 sm:px-5 py-2 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">
              Filter Aktif: Kategori <span className="text-[#003D79] font-black">{filterCategory}</span> ({filteredMetrics.length} Metrik)
            </span>
          </div>
          {onSelectCategory && (
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="px-2.5 py-0.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-[11px] cursor-pointer"
            >
              Tampilkan Semua Kategori
            </button>
          )}
        </div>
      )}

      {/* MOBILE CARD VIEW (Shown on HP / screens < md) */}
      <div className="md:hidden divide-y divide-slate-200/80">
        {filteredMetrics.length === 0 ? (
          <div className="py-10 px-4 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="font-semibold text-sm text-slate-700">Tidak ada metrik yang sesuai dengan filter.</p>
          </div>
        ) : (
          filteredMetrics.map((item, idx) => {
            const displayNumber = idx + 1;
            const prevItem = idx > 0 ? filteredMetrics[idx - 1] : null;
            const isNewCategorySection = sortMode === 'excel' && (!prevItem || prevItem.category !== item.category);
            const catSum = categorySummary?.[item.category] || {
              category: item.category,
              maxScore: CATEGORY_MULTIPLIERS[item.category] || 0,
              actualScore: 0,
              gapScore: 0
            };

            const info = getMetricKnowledge(item);
            const unit = info.unit || '';
            const isAchieved = item.maxAcv >= 1.0;
            const isAlmost = item.maxAcv >= 0.9 && item.maxAcv < 1.0;
            const resolvedStrategy = resolveStrategyInfo(item);
            const actionNeededText = getActionText(item, (v) => formatBankingNumber(v, unit, item.isPct));
            const dailyTargetVal = calculateDailyTargetValue(item.target, effectiveWorkdays, item.isQuality);
            const chaseInfo = calculateDailyChaseInfo(item, effectiveWorkdays);
            const stratOpen = isStrategyVisible(item.row);
            const activeSubPanel = activeSubPanelByRow[item.row];
            const isEditingRow = editingRowId === item.row;

            return (
              <React.Fragment key={`mob-${item.row}`}>
                {isNewCategorySection && (
                  <div
                    id={`cat-section-mob-${item.category}`}
                    className={`px-3.5 py-2.5 font-extrabold flex items-center justify-between text-xs scroll-mt-4 ${
                      getCatBanner(item.category)
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="uppercase tracking-wide font-black">KATEGORI: {item.category}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/80 text-slate-700">
                        Max {catSum.maxScore}
                      </span>
                    </div>
                    <div className="font-mono font-black">
                      {catSum.actualScore?.toFixed(2).replace('.', ',')} / {catSum.maxScore}
                      {catSum.gapScore > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px]">
                          -{catSum.gapScore.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className={`p-3.5 space-y-2.5 ${!item.used ? 'bg-slate-50/60 opacity-75' : 'bg-white'}`}>
                  {/* Top Row: Number + Category + Metric Name + Bobot */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-[#003D79] text-white font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {displayNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={`px-1.5 py-0.1 rounded text-[10px] border ${getCatBadge(item.category)}`}>
                            {item.category}
                          </span>
                          {item.subMetric && item.subMetric !== item.metric && (
                            <span className={`text-[10px] px-1.5 py-0.1 rounded ${getCatTag(item.category)}`}>
                              {item.metric}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 text-xs mt-0.5 leading-snug">
                          {item.subMetric && item.subMetric !== item.metric ? item.subMetric : (item.metric || item.name)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block">Bobot</span>
                      <span className="font-mono font-bold text-xs text-slate-800">
                        {(item.bobot * 100).toFixed(1).replace('.0', '')}%
                      </span>
                    </div>
                  </div>

                  {/* Middle 3-Box Grid: Realisasi | Target & Kejaran/HK | Acv & Skor */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-[11px]">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 block">Realisasi</span>
                        {item.isRealModified && (
                          <span className="text-[8px] font-bold px-1 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            Sim
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-900 block">
                        {formatBankingNumber(item.real, unit, item.isPct)}
                      </span>
                      {item.isRealModified && item.masterReal !== undefined && (
                        <span className="text-[9px] text-slate-400 font-mono block">
                          Aktual: {formatBankingNumber(item.masterReal, unit, item.isPct)}
                        </span>
                      )}
                      {item.used && !isAchieved && item.target > 0 && (
                        <span className="text-[9px] text-rose-600 font-semibold leading-tight block mt-0.5">
                          {actionNeededText}
                        </span>
                      )}
                    </div>

                    <div className="border-x border-slate-200/80 px-2">
                      <span className="text-[10px] text-slate-400 block">
                        {item.isTargetModified ? 'Target Simulasi' : `Target (${effectiveWorkdays} HK)`}
                      </span>
                      <span className="font-mono font-bold text-slate-900 block">
                        {item.target ? formatBankingNumber(item.target, unit, item.isPct) : '–'}
                      </span>
                      {/* Target Awal dari Konseptor */}
                      <div className="text-[9px] text-slate-500 mt-0.5 leading-tight">
                        <span className="text-slate-400" title="Target Awal dari Konseptor">Awal:</span>{' '}
                        <strong className="font-mono text-[#003D79]">
                          {formatBankingNumber(
                            item.konseptorTarget !== undefined ? item.konseptorTarget : (item.originalTarget !== undefined ? item.originalTarget : item.target),
                            unit,
                            item.isPct
                          )}
                        </strong>
                      </div>
                      {item.target > 0 && effectiveWorkdays > 0 && !isAchieved && (
                        <span className="mt-1 inline-block px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-mono font-extrabold text-[9px]">
                          {item.isQuality ? 'Turun ' : 'Kejar +'}
                          {formatBankingNumber(chaseInfo.dailyChase, unit, item.isPct)}/HK
                        </span>
                      )}
                      {item.target > 0 && effectiveWorkdays > 0 && (
                        <span className="text-[9px] text-[#003D79] block mt-0.5 font-mono">
                          Porsi: {formatBankingNumber(dailyTargetVal, unit, item.isPct)}/HK
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Acv & Skor</span>
                      <span
                        className={`font-mono font-black ${
                          isAchieved ? 'text-emerald-600' : isAlmost ? 'text-amber-600' : 'text-rose-600'
                        }`}
                      >
                        {(item.acv * 100).toFixed(0)}%
                      </span>
                      {item.used && (
                        <div className="font-mono text-[10px] text-slate-800 font-bold">
                          <div>{item.score.toFixed(2).replace('.', ',')}/{item.maxScore.toFixed(2).replace('.', ',')}</div>
                          {isViewerSimMode && item.isScoreChanged ? (
                            <span
                              className={`mt-0.5 inline-block text-[9px] font-black px-1.5 py-0.1 rounded ${
                                item.scoreDelta > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                              title={`Skor Master: ${item.masterScore?.toFixed(2)} → Simulasi: ${item.score?.toFixed(2)}`}
                            >
                              Δ {item.scoreDelta > 0 ? '+' : ''}{item.scoreDelta.toFixed(2).replace('.', ',')} pt
                            </span>
                          ) : (
                            item.scoreGap > 0.0005 && (
                              <span className="mt-0.5 inline-block text-[9px] text-amber-800 font-bold">
                                Gap: +{item.scoreGap.toFixed(2).replace('.', ',')}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons on Mobile */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {item.target > 0 && (
                      <button
                        type="button"
                        onClick={(e) => toggleSubPanel(e, item.row, 'timestand')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          activeSubPanel === 'timestand'
                            ? 'bg-[#003D79] text-white border-[#003D79]'
                            : 'bg-amber-50 text-[#003D79] border-amber-300'
                        }`}
                      >
                        <Calendar className="w-3 h-3 text-[#FFB81C]" />
                        <span>{activeSubPanel === 'timestand' ? 'Tutup Jadwal HK' : `Jadwal ${effectiveWorkdays} HK`}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => toggleStrategyRow(e, item.row)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        stratOpen
                          ? 'bg-[#003D79] text-white border-[#003D79]'
                          : 'bg-blue-50/80 text-[#003D79] border-blue-200'
                      }`}
                    >
                      <Lightbulb className={`w-3 h-3 ${stratOpen ? 'text-[#FFB81C]' : 'text-[#003D79]'}`} />
                      <span>{stratOpen ? 'Tutup Strategi' : 'Lihat Strategi'}</span>
                    </button>

                    {canInlineEdit ? (
                      <button
                        type="button"
                        onClick={(e) => handleOpenFullEditor(e, item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-[#003D79] border border-slate-300 text-[11px] font-bold cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3 text-[#FFB81C]" />
                        <span>{isViewerSimMode ? 'Simulasi' : 'Edit'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          if (onActivateViewerSimMode) onActivateViewerSimMode();
                          handleOpenFullEditor(e, item);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-[#00254D] border border-amber-300 text-[11px] font-bold cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3 text-[#FFB81C]" />
                        <span>Simulasi</span>
                      </button>
                    )}
                  </div>

                  {/* Collapsible Strategy Content on Mobile */}
                  {stratOpen && (
                    <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2 text-xs">
                      <div className="text-[11px] text-slate-700 leading-relaxed space-y-1">
                        {resolvedStrategy.tacticalList.map((line, lIdx) => (
                          <p key={lIdx} className="flex items-start gap-1.5">
                            <span className="text-[#003D79] font-bold shrink-0">•</span>
                            <span>{line}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-Metric Timestand Schedule on Mobile */}
                  {activeSubPanel === 'timestand' && (
                    <div className="pt-1">
                      {renderPerMetricTimestandSchedule(item, displayNumber, unit, chaseInfo)}
                    </div>
                  )}

                  {/* Full Editor on Mobile */}
                  {isEditingRow && (
                    <div className="pt-1">
                      {renderFullWidthEditorPanel(item, displayNumber, unit, resolvedStrategy)}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW (Shown on md and above) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th scope="col" className="py-3 px-3 w-12 text-center" title="Nomor Urut Metrik (1 s.d. N)">
                No
              </th>

              <th scope="col" className="py-3 px-3 w-24">
                Kategori
              </th>

              <th scope="col" className="py-3 px-3 min-w-[205px]">
                Metrik & Sub-Metrik
              </th>

              <th scope="col" className="py-3 px-2.5 text-right w-18">
                Bobot
              </th>

              <th scope="col" className="py-3 px-3 text-right w-32">
                Realisasi & Selisih
              </th>

              <th scope="col" className="py-3 px-3 text-right min-w-[225px] bg-blue-50/50">
                <div className="flex flex-col items-end">
                  <span className="text-[#003D79]">Target & Timestand / Metrik</span>
                  <span className="text-[9px] text-[#003D79] font-semibold normal-case">
                    ({effectiveWorkdays} HK • {periodLabel})
                  </span>
                </div>
              </th>

              <th
                scope="col"
                className="py-3 px-3 w-34 cursor-pointer hover:text-[#003D79] transition-colors"
                onClick={() => handleColumnSort('acv')}
              >
                <div className="flex items-center gap-1">
                  <span>Acv / Max Acv</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                scope="col"
                className="py-3 px-3 text-right w-28 cursor-pointer hover:text-[#003D79] transition-colors bg-amber-50/40"
                onClick={() => handleColumnSort('scoreGap')}
              >
                <div className="flex items-center justify-end gap-1 text-[#003D79]">
                  <span>Skor / +Potensi</span>
                  <ArrowUpDown className="w-3 h-3 text-[#FFB81C]" />
                </div>
              </th>

              <th scope="col" className="py-3 px-3 min-w-[235px]">
                <span>Strategi & Edit Rumus</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredMetrics.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                  <p className="font-semibold text-sm text-slate-700">Tidak ada metrik yang sesuai dengan filter.</p>
                  <p className="text-xs text-slate-500 mt-1">Ubah filter kategori atau pencarian untuk menampilkan seluruh baris.</p>
                </td>
              </tr>
            ) : (
              filteredMetrics.map((item, idx) => {
                const displayNumber = idx + 1;
                const prevItem = idx > 0 ? filteredMetrics[idx - 1] : null;
                const isNewCategorySection = sortMode === 'excel' && (!prevItem || prevItem.category !== item.category);
                const isSameParentMetricAsPrev =
                  sortMode === 'excel' &&
                  prevItem &&
                  prevItem.category === item.category &&
                  prevItem.metric === item.metric &&
                  Boolean(item.subMetric);

                const catSum = categorySummary?.[item.category] || {
                  category: item.category,
                  maxScore: CATEGORY_MULTIPLIERS[item.category] || 0,
                  actualScore: 0,
                  gapScore: 0
                };

                const info = getMetricKnowledge(item);
                const unit = info.unit || '';
                const isAchieved = item.maxAcv >= 1.0;
                const isAlmost = item.maxAcv >= 0.9 && item.maxAcv < 1.0;
                const stratOpen = isStrategyVisible(item.row);
                const activeSubPanel = activeSubPanelByRow[item.row];
                const isEditingRow = editingRowId === item.row;

                const resolvedStrategy = resolveStrategyInfo(item);
                const actionNeededText = getActionText(item, (v) => formatBankingNumber(v, unit, item.isPct));
                const dailyTargetVal = calculateDailyTargetValue(item.target, effectiveWorkdays, item.isQuality);
                const chaseInfo = calculateDailyChaseInfo(item, effectiveWorkdays);

                // Dynamic impact statement
                let dynamicSentence = '';
                if (!item.used) {
                  dynamicSentence = `Baris informasi template Excel (Bobot 0% pada matriks cabang saat ini). Data Realisasi dan Target tetap ditampilkan lengkap.`;
                } else if (isAchieved) {
                  dynamicSentence = `Target telah tercapai ${(item.acv * 100).toFixed(0)}%! Cabang ${branchInfo.code} mengamankan ${item.score.toFixed(2).replace('.', ',')} poin penuh.`;
                } else if (item.isQuality) {
                  dynamicSentence = `Turunkan ${item.name} sebesar -${formatBankingNumber(chaseInfo.dailyChase, unit, item.isPct)}/HK selama ${effectiveWorkdays} HK (dari ${formatBankingNumber(item.real, unit, item.isPct)} ke ≤ ${formatBankingNumber(item.target, unit, item.isPct)}) → Skor naik +${item.scoreGap.toFixed(2).replace('.', ',')} poin menjadi ${item.maxScore.toFixed(2).replace('.', ',')} poin penuh.`;
                } else {
                  dynamicSentence = `Kejar +${formatBankingNumber(chaseInfo.dailyChase, unit, item.isPct)} ${unit}/HK selama ${effectiveWorkdays} HK (total +${formatBankingNumber(chaseInfo.gapNominal, unit, item.isPct)} ${unit}) hingga mencapai target ${formatBankingNumber(item.target, unit, item.isPct)} ${unit} → Skor naik +${item.scoreGap.toFixed(2).replace('.', ',')} poin (menjadi ${item.maxScore.toFixed(2).replace('.', ',')} poin).`;
                }

                return (
                  <React.Fragment key={item.row}>
                    {/* CATEGORY HEADER ROW */}
                    {isNewCategorySection && (
                      <tr
                        id={`cat-section-${item.category}`}
                        className={`border-y-2 border-slate-200 font-extrabold scroll-mt-6 ${
                          getCatBanner(item.category)
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-xs opacity-70">
                          •
                        </td>
                        <td colSpan="2" className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-black uppercase tracking-wide">
                              KATEGORI: {item.category}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-slate-700 border border-slate-200/80">
                              Nilai Max: {catSum.maxScore} Poin
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-xs">
                          100%
                        </td>
                        <td colSpan="3" className="py-2.5 px-3 text-right text-[11px] font-semibold">
                          <span>
                            Pencapaian Kategori: <strong>{catSum.achievementPct || 0}%</strong>
                          </span>
                          {catSum.gapScore > 0 ? (
                            <span className="ml-2 px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                              Poin Hilang: -{catSum.gapScore.toFixed(2).replace('.', ',')} poin
                            </span>
                          ) : (
                            <span className="ml-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                              ✓ Penuh ({catSum.maxScore} Poin)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs sm:text-sm font-black">
                          {catSum.actualScore?.toFixed(2).replace('.', ',')} <span className="text-[11px] font-normal opacity-75">/ {catSum.maxScore}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] font-semibold opacity-85">
                          Skor Kategori: {catSum.actualScore?.toFixed(2).replace('.', ',')} dari {catSum.maxScore} Poin
                        </td>
                      </tr>
                    )}

                    {/* METRIC ROW */}
                    <tr
                      className={`hover:bg-slate-50/90 transition-colors group ${
                        isEditingRow || activeSubPanel ? 'bg-blue-50/30 border-l-4 border-l-[#003D79]' : ''
                      } ${!item.used ? 'bg-slate-50/40 text-slate-500' : item.scoreGap >= 1.0 ? 'bg-amber-50/15' : ''}`}
                    >
                      {/* 1. Sequential Number (1, 2, 3...) */}
                      <td className="py-3 px-3 text-center font-mono font-extrabold text-[#003D79] text-xs">
                        {displayNumber}
                      </td>

                      {/* 2. Category Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] border inline-block ${
                            getCatBadge(item.category)
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>

                      {/* 3. Metrik & Sub-Metrik */}
                      <td className="py-3 px-3">
                        <div className="min-w-0">
                          {item.subMetric && item.subMetric !== item.metric ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded ${
                                    isSameParentMetricAsPrev
                                      ? 'bg-slate-100 text-slate-500 font-bold'
                                      : getCatTag(item.category)
                                  }`}
                                >
                                  {item.metric}
                                </span>
                                {item.isQuality && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200">
                                    Kualitas (↓)
                                  </span>
                                )}
                              </div>
                              <p className={`font-bold mt-0.5 leading-snug ${item.used ? 'text-slate-900' : 'text-slate-600'}`}>
                                {item.subMetric}
                              </p>
                            </>
                          ) : (
                            <p className={`font-bold leading-snug ${item.used ? 'text-slate-900' : 'text-slate-600'}`}>
                              {item.metric || item.name}
                            </p>
                          )}

                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Nilai Max Kat: <strong>{CATEGORY_MULTIPLIERS[item.category]}</strong>
                            {unit && <span> • Satuan: {unit}</span>}
                          </p>
                        </div>
                      </td>

                      {/* 4. Bobot */}
                      <td className="py-3 px-2.5 text-right font-mono">
                        <span className={`font-bold ${item.used ? 'text-slate-800' : 'text-slate-400'}`}>
                          {(item.bobot * 100).toFixed(1).replace('.0', '')}%
                        </span>
                        {!item.used && (
                          <span className="block text-[9px] text-slate-400 font-sans">Bobot 0%</span>
                        )}
                      </td>

                      {/* 5. Realisasi & Total Kekurangan ke Target */}
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.isRealModified && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-sans font-bold text-[9px]">
                              Simulasi
                            </span>
                          )}
                          <p className={`font-bold text-xs sm:text-sm ${item.used ? 'text-slate-900' : 'text-slate-500'}`}>
                            {formatBankingNumber(item.real, unit, item.isPct)}
                          </p>
                        </div>
                        {item.isRealModified && item.masterReal !== undefined && (
                          <div className="text-[10px] font-sans text-slate-500 flex items-center justify-end gap-1">
                            <span className="text-slate-400">Aktual:</span>
                            <strong className="font-mono text-slate-700">
                              {formatBankingNumber(item.masterReal, unit, item.isPct)}
                            </strong>
                          </div>
                        )}
                        {item.used && item.target > 0 && (
                          isAchieved ? (
                            <p className="text-[10px] text-emerald-700 font-sans font-bold mt-0.5">
                              ✓ Sudah capai target
                            </p>
                          ) : (
                            <p className="text-[10px] text-rose-600 font-sans font-bold mt-0.5">
                              {actionNeededText}
                            </p>
                          )
                        )}
                      </td>

                      {/* 6. Target + Kejaran Harian s.d. Target + Button to Open Per-Metric Timestand Schedule */}
                      <td className="py-3 px-3 text-right font-mono bg-blue-50/20">
                        <div className="space-y-1">
                          {/* Total Target */}
                          <div className="flex items-center justify-end gap-1.5">
                            {item.isTargetModified && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-sans font-bold text-[9px]">
                                {isViewerSimMode ? 'Simulasi' : 'Diedit'}
                              </span>
                            )}
                            <span className="text-[10px] font-sans text-slate-400">
                              {item.isTargetModified ? 'Target Simulasi:' : 'Target:'}
                            </span>
                            <span className={`font-extrabold text-xs sm:text-sm ${item.used ? 'text-slate-900' : 'text-slate-500'}`}>
                              {item.target ? formatBankingNumber(item.target, unit, item.isPct) : '–'}
                            </span>
                          </div>

                          {/* Target Awal dari Konseptor (Always Visible Directly Below) */}
                          <div className="text-[10px] font-sans text-slate-500 flex items-center justify-end gap-1">
                            <span className="text-slate-400">Target Awal (Konseptor):</span>
                            <strong className="font-mono text-slate-800">
                              {formatBankingNumber(
                                item.konseptorTarget !== undefined ? item.konseptorTarget : (item.originalTarget !== undefined ? item.originalTarget : item.target),
                                unit,
                                item.isPct
                              )}
                            </strong>
                          </div>

                          {/* KEJARAN PER HARI S.D. TARGET (BERDASARKAN TIMESTAND) */}
                          {item.target > 0 && effectiveWorkdays > 0 && (
                            <>
                              {!isAchieved ? (
                                <div className="inline-flex flex-col items-end bg-rose-50 border border-rose-200 rounded-md px-2 py-1 text-right">
                                  <span className="text-[10px] font-sans font-extrabold text-rose-700 flex items-center gap-1">
                                    <Target className="w-3 h-3 text-rose-600 shrink-0" />
                                    <span>
                                      {item.isQuality ? 'Turunkan ' : 'Kejar +'}
                                      {formatBankingNumber(chaseInfo.dailyChase, unit, item.isPct)}/HK
                                    </span>
                                  </span>
                                  <span className="text-[9px] font-sans text-rose-600/90">
                                    ({item.isQuality ? 'Turun ' : '+'}
                                    {formatBankingNumber(chaseInfo.gapNominal, unit, item.isPct)} ÷ {effectiveWorkdays} HK)
                                  </span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5 text-[10px] font-sans font-bold text-emerald-700">
                                  <span>✓ Target Tercapai (0/HK)</span>
                                </div>
                              )}

                              {/* Porsi Target Harian Penuh */}
                              <div className="text-[10px] text-[#003D79] font-sans font-semibold flex items-center justify-end gap-1">
                                <span>Porsi Target: {formatBankingNumber(dailyTargetVal, unit, item.isPct)}/HK</span>
                              </div>

                              {/* Button to open Per-Metric Timestand Daily Schedule directly under this metric! */}
                              <div className="pt-0.5 flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => toggleSubPanel(e, item.row, 'timestand')}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-bold border transition-colors cursor-pointer ${
                                    activeSubPanel === 'timestand'
                                      ? 'bg-[#003D79] text-white border-[#003D79]'
                                      : 'bg-white hover:bg-blue-50 text-[#003D79] border-blue-200'
                                  }`}
                                  title="Lihat jadwal kejaran per tanggal khusus metrik ini"
                                >
                                  <Calendar className="w-2.5 h-2.5 text-[#FFB81C]" />
                                  <span>{activeSubPanel === 'timestand' ? 'Tutup Jadwal HK' : `Jadwal ${effectiveWorkdays} HK`}</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 7. Acv & Max Acv */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span
                              className={`font-black font-mono ${
                                !item.used
                                  ? 'text-slate-400'
                                  : isAchieved
                                    ? 'text-emerald-600'
                                    : isAlmost
                                      ? 'text-amber-600'
                                      : 'text-rose-600'
                              }`}
                            >
                              {(item.acv * 100).toFixed(0)}%
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Max {(item.maxAcv * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                !item.used
                                  ? 'bg-slate-300'
                                  : isAchieved
                                    ? 'bg-emerald-500'
                                    : isAlmost
                                      ? 'bg-[#FFB81C]'
                                      : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, item.maxAcv * 100)}%` }}
                            ></div>
                          </div>
                          <div>
                            {!item.used ? (
                              <span className="text-[10px] text-slate-400 font-medium">Bobot 0% (Info)</span>
                            ) : isAchieved ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Tercapai
                              </span>
                            ) : isAlmost ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB81C]"></span>
                                Dekat Target (≥90%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Di Bawah Target
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 8. Skor Kinerja & Potensi (+Poin) */}
                      <td className="py-3 px-3 text-right font-mono bg-amber-50/20">
                        {item.used ? (
                          <div>
                            <p className="font-bold text-slate-900">
                              {item.score.toFixed(2).replace('.', ',')}{' '}
                              <span className="text-[10px] text-slate-400 font-normal">
                                / {item.maxScore.toFixed(2).replace('.', ',')}
                              </span>
                            </p>
                            {isViewerSimMode && item.isScoreChanged ? (
                              <div className="mt-1 flex flex-col items-end">
                                <span
                                  className={`inline-flex items-center gap-1 font-mono font-black text-[10px] px-1.5 py-0.2 rounded ${
                                    item.scoreDelta > 0
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                                  }`}
                                  title={`Skor Master: ${item.masterScore?.toFixed(2)} → Simulasi: ${item.score?.toFixed(2)} (${item.scoreDelta > 0 ? '+' : ''}${item.scoreDelta?.toFixed(2)} pt)`}
                                >
                                  <span>Δ {item.scoreDelta > 0 ? '+' : ''}{item.scoreDelta.toFixed(2).replace('.', ',')} pt</span>
                                </span>
                                {item.scoreGap > 0.0005 && (
                                  <span className="text-[9px] text-slate-400 font-sans mt-0.5">
                                    Gap max: {item.scoreGap.toFixed(2).replace('.', ',')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                {item.scoreGap > 0.0005 ? (
                                  <span
                                    className="mt-1 inline-block font-bold text-[#996000] text-[10px] bg-[#FFB81C]/25 border border-[#FFB81C]/50 px-1.5 py-0.2 rounded"
                                    title="Potensi poin tambahan jika metrik ini mencapai target 100%"
                                  >
                                    Gap: +{item.scoreGap.toFixed(2).replace('.', ',')}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 font-sans font-bold text-[10px] block mt-0.5">
                                    Penuh ✓
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">–</span>
                        )}
                      </td>

                      {/* 9. Strategi & Full-Width Editor Trigger */}
                      <td className="py-3 px-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => toggleStrategyRow(e, item.row)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                stratOpen
                                  ? 'bg-[#003D79] text-white border-[#003D79] shadow-2xs'
                                  : 'bg-blue-50/80 hover:bg-blue-100 text-[#003D79] border-blue-200'
                              }`}
                            >
                              <Lightbulb className={`w-3 h-3 ${stratOpen ? 'text-[#FFB81C]' : 'text-[#003D79]'}`} />
                              <span>{stratOpen ? 'Tutup Strategi' : 'Lihat Strategi'}</span>
                              {stratOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {canInlineEdit ? (
                              <button
                                type="button"
                                onClick={(e) => handleOpenFullEditor(e, item)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                  isEditingRow
                                    ? 'bg-[#FFB81C] text-[#00254D] border-[#FFB81C]'
                                    : 'bg-white hover:bg-[#003D79] text-[#003D79] hover:text-white border-slate-300'
                                }`}
                                title="Buka Panel Lebar untuk Edit Target, Rumus & Strategi"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>{isViewerSimMode ? (isEditingRow ? 'Tutup Simulasi' : 'Simulasi Target') : (isEditingRow ? 'Tutup Edit' : 'Edit Target / Strategi')}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onActivateViewerSimMode) onActivateViewerSimMode();
                                  handleOpenFullEditor(e, item);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-[#00254D] border border-[#FFB81C] text-[11px] font-bold cursor-pointer shadow-2xs"
                                title="Klik untuk langsung mensimulasikan angka target metrik ini"
                              >
                                <Edit3 className="w-3 h-3 text-[#FFB81C]" />
                                <span>Simulasi Target</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => toggleSubPanel(e, item.row, 'rumus')}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                                activeSubPanel === 'rumus'
                                  ? 'bg-slate-700 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                            >
                              <span>{activeSubPanel === 'rumus' ? 'Tutup Rumus' : 'Detail Rumus'}</span>
                            </button>
                          </div>

                          {/* Strategy Details (Appears when clicked!) */}
                          {stratOpen && (
                            <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-1.5">
                              {resolvedStrategy.scope && (
                                <span className="inline-block px-2 py-0.2 rounded-full bg-blue-100 text-[#003D79] font-bold text-[9px]">
                                  {resolvedStrategy.scope === 'simulasi'
                                    ? '⚡ Strategi Simulasi Viewer'
                                    : resolvedStrategy.scope === 'branch'
                                      ? `✓ Diedit Konseptor (${resolvedStrategy.updatedBy}) · Cabang ${branchCode}`
                                      : `✓ Diedit Konseptor (${resolvedStrategy.updatedBy}) · Semua Cabang`}
                                </span>
                              )}

                              <div className="text-[11px] text-slate-700 leading-relaxed space-y-1">
                                {resolvedStrategy.tacticalList.map((line, lIdx) => (
                                  <p key={lIdx} className="flex items-start gap-1.5">
                                    <span className="text-[#003D79] font-bold shrink-0">•</span>
                                    <span>{line}</span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* FULL-WIDTH EDITOR PANEL (Target, Formula Preview & Wide Strategy Textarea) */}
                    {isEditingRow && (
                      <tr className="bg-blue-50/50 border-b-2 border-[#003D79]">
                        <td colSpan="9" className="p-4">
                          {renderFullWidthEditorPanel(item, displayNumber, unit, resolvedStrategy)}
                        </td>
                      </tr>
                    )}

                    {/* PER-METRIC TIMESTAND DAILY SCHEDULE ROW (Directly below this metric!) */}
                    {activeSubPanel === 'timestand' && (
                      <tr className="bg-amber-50/30 border-b-2 border-[#003D79]">
                        <td colSpan="9" className="p-4">
                          {renderPerMetricTimestandSchedule(item, displayNumber, unit, chaseInfo)}
                        </td>
                      </tr>
                    )}

                    {/* INLINE EXPANDED ACCORDION ROW: DETAIL RUMUS & IMPACT ANALYSIS */}
                    {activeSubPanel === 'rumus' && (
                      <tr className="bg-linear-to-r from-blue-50/80 via-slate-50 to-amber-50/40 border-b-2 border-[#003D79]">
                        <td colSpan="9" className="p-5">
                          <div className="space-y-4 text-xs">
                            
                            {/* Top Dynamic Impact Banner */}
                            <div className="p-3.5 rounded-xl bg-white border border-blue-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="flex items-start gap-2.5">
                                <Sparkles className="w-5 h-5 text-[#FFB81C] shrink-0 mt-0.5" />
                                <div>
                                  <h4 className="font-extrabold text-[#003D79] text-xs uppercase tracking-wider mb-0.5">
                                    Simulasi Dampak Skor & Target Harian — Metrik No. #{displayNumber}: {item.name}
                                  </h4>
                                  <p className="text-slate-700 leading-relaxed font-medium">
                                    {dynamicSentence}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {canInlineEdit && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenFullEditor(e, item)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFB81C] text-[#00254D] hover:bg-[#f3aa0d] text-xs font-extrabold transition-all cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit Target & Strategi</span>
                                  </button>
                                )}
                                {item.scoreGap > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenSimulatorForMetric(item)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003D79] text-white hover:bg-[#00254D] text-xs font-bold transition-all shadow-xs cursor-pointer"
                                  >
                                    <Sliders className="w-3.5 h-3.5 text-[#FFB81C]" />
                                    <span>Uji di Simulator</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onSelectMetricForDetail(item)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <span>Buka Modal Penuh</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                            </div>

                            {/* Two Column Layout: Definition & Tactical Action Plan */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                                <div className="flex items-center gap-2 text-[#003D79] font-bold text-xs pb-1.5 border-b border-slate-100">
                                  <Calculator className="w-4 h-4 text-[#003D79]" />
                                  <span>Definisi & Rumus Perhitungan (No. #{displayNumber})</span>
                                </div>
                                <p className="text-slate-600 leading-relaxed">
                                  {info.definition || `Metrik ${item.name} pada kategori ${item.category} dengan bobot ${(item.bobot * 100).toFixed(1)}% dari nilai maksimal ${CATEGORY_MULTIPLIERS[item.category]} poin.`}
                                </p>
                                {info.importance && (
                                  <p className="text-slate-500 text-[11px] pt-1.5 border-t border-slate-100">
                                    <strong className="text-slate-700">Signifikansi:</strong> {info.importance}
                                  </p>
                                )}
                              </div>

                              <div className="bg-white p-4 rounded-xl border border-blue-200/90 space-y-2.5 shadow-2xs">
                                <div className="flex items-center justify-between pb-1.5 border-b border-blue-100">
                                  <div className="flex items-center gap-2 text-[#003D79] font-bold text-xs">
                                    <Building2 className="w-4 h-4 text-[#003D79]" />
                                    <span>Taktik Eksekusi Lapangan — {branchInfo.name}</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {resolvedStrategy.tacticalList.map((act, aIdx) => (
                                    <div key={aIdx} className="flex items-start gap-2">
                                      <span className="w-4 h-4 rounded-full bg-[#003D79] text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                                        {aIdx + 1}
                                      </span>
                                      <p className="text-slate-700 leading-snug font-medium">
                                        {act}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}

            {/* SKOR TOTAL FOOTER ROW */}
            {filteredMetrics.length > 0 && filterCategory === 'all' && !filterUnderTarget && (
              <tr className="bg-linear-to-r from-[#00254D] via-[#003D79] to-[#004B94] text-white font-black text-xs sm:text-sm border-t-2 border-[#00254D]">
                <td className="py-3.5 px-3 text-center font-mono text-[#FFE5A3]">★</td>
                <td colSpan="2" className="py-3.5 px-3 uppercase tracking-wider">
                  SKOR TOTAL BRANCHIQ ({branchInfo.name} — {branchInfo.code})
                </td>
                <td className="py-3.5 px-2.5 text-right font-mono text-[#FFE5A3]">100%</td>
                <td colSpan="3" className="py-3.5 px-3 text-right text-xs text-white/85">
                  Nilai Maksimal Seluruh Kategori (DPK 30 + Kredit 20 + Livin 15 + Kopra 10 + Acquiring 15 + GMM 5 + Ekosistem 5) = 100 Poin
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-base text-[#FFB81C]">
                  {totalScore.toFixed(2).replace('.', ',')} <span className="text-xs text-white/80">/ 100</span>
                </td>
                <td className="py-3.5 px-3 text-xs text-[#FFE5A3]">
                  ✓ Sesuai Rumus Sheet Level Cabang
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info of Table */}
      <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-t border-slate-100 bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            Penomoran berurutan <strong>No. 1 s.d. {filteredMetrics.length}</strong>. Klik <strong>Jadwal {effectiveWorkdays} HK</strong> untuk rincian harian per metrik, atau <strong>Edit Target / Strategi</strong> untuk membuka panel edit lebar.
          </span>
        </div>
        <div className="font-mono text-slate-600">
          Menampilkan {filteredMetrics.length} dari {metrics.length} metrik
        </div>
      </div>

    </div>
  );
}
