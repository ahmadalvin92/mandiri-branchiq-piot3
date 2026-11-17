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
  EyeOff
} from 'lucide-react';
import { formatBankingNumber, getMetricKnowledge } from '../utils/knowledgeBase';
import {
  CAT_ORDER,
  CATEGORY_MULTIPLIERS,
  getActionText,
  getDefaultStrategyText
} from '../utils/excelParser';
import {
  calculateDailyTargetValue,
  calculateDailyChaseInfo,
  formatShortDateId
} from '../utils/googleCalendar';

export function MetricsTable({
  metrics = [],
  categorySummary = {},
  totalScore = 85.53,
  filterCategory = 'all',
  filterUnderTarget = false,
  searchQuery = '',
  branchInfo = { code: '10125', name: 'Jakarta Pondok Indah Office 3', head: 'MICHAEL DANNIEL', grade: 'B.3' },
  onSelectMetricForDetail,
  onOpenSimulatorForMetric,
  // RBAC & Edit Props
  canEditMaster = false,
  isViewerSimMode = false,
  masterStrategies = {},
  viewerSimStrategies = {},
  onSaveMasterTarget,
  onResetMasterTarget,
  onSaveMasterStrategy,
  onResetMasterStrategy,
  onUpdateViewerSimTarget,
  onUpdateViewerSimStrategy,
  onActivateViewerSimMode,
  // Timestand Props
  effectiveWorkdays = 11,
  timestandConfig = null
}) {
  const [sortMode, setSortMode] = useState('excel'); // 'excel' | 'scoreGap' | 'acv' | 'nominalGap'
  const [sortOrder, setSortOrder] = useState('asc');
  const [showZeroWeightRows, setShowZeroWeightRows] = useState(true);
  // Expanded row for extra formula / impact view
  const [expandedRow, setExpandedRow] = useState(null);

  // Strategy visibility state: hidden by default, shown only when clicked!
  const [openStrategyRows, setOpenStrategyRows] = useState({});
  const [showAllStrategies, setShowAllStrategies] = useState(false);

  // Inline Target Editor State
  const [editingTargetRow, setEditingTargetRow] = useState(null);
  const [draftTargetVal, setDraftTargetVal] = useState('');

  // Inline Strategy Editor State
  const [editingStrategyRow, setEditingStrategyRow] = useState(null);
  const [draftStrategyText, setDraftStrategyText] = useState('');
  const [draftStrategyScope, setDraftStrategyScope] = useState('branch'); // 'branch' | 'all'

  const canInlineEdit = canEditMaster || isViewerSimMode;
  const branchCode = String(branchInfo?.code || '10125');
  const periodLabel = timestandConfig?.startDate && timestandConfig?.endDate
    ? `${formatShortDateId(timestandConfig.startDate)} – ${formatShortDateId(timestandConfig.endDate)}`
    : '16 Nov – 30 Nov 2026';

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

  // Start editing Target
  const handleStartEditTarget = (e, item) => {
    e.stopPropagation();
    setEditingTargetRow(item.row);
    const displayVal = item.isPct ? Number((item.target * 100).toFixed(4)) : Number(item.target.toFixed(4));
    setDraftTargetVal(String(displayVal));
  };

  const handleStepTarget = (e, item, factorPct) => {
    e.stopPropagation();
    const cur = parseFloat(draftTargetVal);
    const base = !isNaN(cur) ? cur : (item.isPct ? item.target * 100 : item.target);
    const step = base !== 0 ? Math.abs(base) * factorPct : 1;
    const next = Math.max(0, Number((base + (factorPct > 0 ? step : -step)).toFixed(4)));
    setDraftTargetVal(String(next));
  };

  const handleSaveTarget = (e, item) => {
    e.stopPropagation();
    const parsed = parseFloat(draftTargetVal);
    if (isNaN(parsed) || parsed < 0) return;
    const actualTargetValue = item.isPct ? parsed / 100 : parsed;

    if (isViewerSimMode) {
      onUpdateViewerSimTarget(item.row, actualTargetValue);
    } else if (canEditMaster) {
      onSaveMasterTarget(branchCode, item.row, actualTargetValue);
    }
    setEditingTargetRow(null);
  };

  const handleResetTarget = (e, item) => {
    e.stopPropagation();
    if (isViewerSimMode) {
      onUpdateViewerSimTarget(item.row, undefined);
    } else if (canEditMaster) {
      onResetMasterTarget(branchCode, item.row);
    }
    setEditingTargetRow(null);
  };

  // Start editing Strategy
  const handleStartEditStrategy = (e, item) => {
    e.stopPropagation();
    const resolved = resolveStrategyInfo(item);
    setOpenStrategyRows(prev => ({ ...prev, [item.row]: true }));
    setEditingStrategyRow(item.row);
    setDraftStrategyText(resolved.text);
    setDraftStrategyScope(resolved.scope === 'all' ? 'all' : 'branch');
  };

  const handleSaveStrategy = (e, item) => {
    e.stopPropagation();
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
    setEditingStrategyRow(null);
  };

  const handleResetStrategy = (e, item) => {
    e.stopPropagation();
    if (isViewerSimMode) {
      onUpdateViewerSimStrategy(item.row, undefined);
    } else if (canEditMaster) {
      onResetMasterStrategy(branchCode, item.row);
    }
    setEditingStrategyRow(null);
  };

  // Filter metrics
  const filteredMetrics = useMemo(() => {
    const base = metrics.filter((m) => {
      if (!m.metric && !m.subMetric && !m.name) return false;
      if (!showZeroWeightRows && (!m.bobot || m.bobot <= 0)) return false;
      if (filterCategory !== 'all' && m.category !== filterCategory) return false;
      if (filterUnderTarget && (!m.used || m.scoreGap <= 0.0005)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.name?.toLowerCase().includes(q);
        const matchMetric = m.metric?.toLowerCase().includes(q);
        const matchSub = m.subMetric?.toLowerCase().includes(q);
        const matchCat = m.category?.toLowerCase().includes(q);
        if (!matchName && !matchMetric && !matchSub && !matchCat) return false;
      }

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

  const toggleRowExpand = (rowId) => {
    setExpandedRow(prev => (prev === rowId ? null : rowId));
  };

  const catColors = {
    DPK: 'bg-blue-50 text-blue-700 border-blue-200',
    Kredit: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Livin: 'bg-sky-50 text-sky-700 border-sky-200',
    Kopra: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Acquiring: 'bg-purple-50 text-purple-700 border-purple-200',
    GMM: 'bg-amber-50 text-amber-700 border-amber-200',
    Ekosistem: 'bg-teal-50 text-teal-700 border-teal-200'
  };

  const catHeaderBannerColors = {
    DPK: 'bg-[#E6EEF6] text-[#003D79] border-blue-200',
    Kredit: 'bg-emerald-50/90 text-emerald-900 border-emerald-200',
    Livin: 'bg-sky-50/90 text-sky-900 border-sky-200',
    Kopra: 'bg-indigo-50/90 text-indigo-900 border-indigo-200',
    Acquiring: 'bg-purple-50/90 text-purple-900 border-purple-200',
    GMM: 'bg-amber-50/90 text-amber-900 border-amber-200',
    Ekosistem: 'bg-teal-50/90 text-teal-900 border-teal-200'
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      
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

      {/* MOBILE CARD VIEW (Shown on HP / screens < md for 100% responsive readability) */}
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

            return (
              <React.Fragment key={`mob-${item.row}`}>
                {isNewCategorySection && (
                  <div
                    id={`cat-section-mob-${item.category}`}
                    className={`px-3.5 py-2.5 font-extrabold flex items-center justify-between text-xs ${
                      catHeaderBannerColors[item.category] || 'bg-slate-100 text-[#003D79]'
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
                          <span className={`px-1.5 py-0.1 rounded text-[10px] font-bold border ${catColors[item.category] || ''}`}>
                            {item.category}
                          </span>
                          {item.subMetric && item.subMetric !== item.metric && (
                            <span className="text-[10px] font-bold text-[#003D79] bg-blue-50 px-1.5 py-0.1 rounded">
                              {item.metric}
                            </span>
                          )}
                          {item.isQuality && (
                            <span className="text-[9px] font-bold px-1.5 py-0.1 rounded bg-orange-50 text-orange-700 border border-orange-200">
                              Kualitas ↓
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
                    {/* Col 1: Realisasi */}
                    <div>
                      <span className="text-[10px] text-slate-400 block">Realisasi</span>
                      <span className="font-mono font-bold text-slate-900 block">
                        {formatBankingNumber(item.real, unit, item.isPct)}
                      </span>
                      {item.used && !isAchieved && item.target > 0 && (
                        <span className="text-[9px] text-rose-600 font-semibold leading-tight block mt-0.5">
                          {actionNeededText}
                        </span>
                      )}
                    </div>

                    {/* Col 2: Target & Kejaran/Hari */}
                    <div className="border-x border-slate-200/80 px-2">
                      <span className="text-[10px] text-slate-400 block">Target ({effectiveWorkdays} HK)</span>
                      <span className="font-mono font-bold text-slate-900 block">
                        {item.target ? formatBankingNumber(item.target, unit, item.isPct) : '–'}
                      </span>
                      {item.target > 0 && effectiveWorkdays > 0 && !isAchieved && (
                        <span className="mt-0.5 inline-block px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-mono font-extrabold text-[9px]">
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

                    {/* Col 3: Acv & Skor */}
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
                          {item.score.toFixed(2).replace('.', ',')}/{item.maxScore.toFixed(2).replace('.', ',')}
                          {item.scoreGap > 0.0005 && (
                            <span className="ml-1 px-1 py-0.1 rounded bg-[#FFB81C]/30 text-[#996000] font-black">
                              +{item.scoreGap.toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Bar: Click to Show/Hide Strategy */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => toggleStrategyRow(e, item.row)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        stratOpen
                          ? 'bg-[#003D79] text-white border-[#003D79]'
                          : 'bg-blue-50/80 hover:bg-blue-100 text-[#003D79] border-blue-200'
                      }`}
                    >
                      <Lightbulb className={`w-3.5 h-3.5 ${stratOpen ? 'text-[#FFB81C]' : 'text-[#003D79]'}`} />
                      <span>{stratOpen ? 'Tutup Strategi' : 'Lihat Strategi & Cara Mengejar'}</span>
                      {stratOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectMetricForDetail(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold"
                    >
                      <span>Detail Rumus</span>
                    </button>
                  </div>

                  {/* Collapsible Strategy Content on Mobile (Shown only when clicked!) */}
                  {stratOpen && (
                    <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2 text-xs animate-in fade-in duration-150">
                      <div className="text-[11px] text-slate-700 leading-relaxed space-y-1">
                        {resolvedStrategy.tacticalList.map((line, lIdx) => (
                          <p key={lIdx} className="flex items-start gap-1.5">
                            <span className="text-[#003D79] font-bold shrink-0">•</span>
                            <span>{line}</span>
                          </p>
                        ))}
                      </div>
                      {item.used && !isAchieved && chaseInfo.hasTarget && (
                        <div className="p-2 rounded-lg bg-white border border-blue-200 text-[10px] text-[#003D79]">
                          <strong>Target Harian ({effectiveWorkdays} HK):</strong>{' '}
                          {item.isQuality ? 'Turunkan ' : 'Kejar +'}
                          <strong className="font-mono text-rose-700">
                            {formatBankingNumber(chaseInfo.dailyChase, unit, item.isPct)} {unit}/hari
                          </strong>{' '}
                          sampai target <strong>{formatBankingNumber(item.target, unit, item.isPct)}</strong> → Skor naik{' '}
                          <strong className="text-emerald-700">+{item.scoreGap.toFixed(2).replace('.', ',')} poin</strong>.
                        </div>
                      )}
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

              <th scope="col" className="py-3 px-3 text-right min-w-[215px] bg-blue-50/50">
                <div className="flex flex-col items-end">
                  <span className="text-[#003D79]">Target & Kejaran / Hari</span>
                  <span className="text-[9px] text-[#003D79] font-semibold normal-case">
                    (Timestand: {effectiveWorkdays} HK • {periodLabel})
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

              <th scope="col" className="py-3 px-3 min-w-[230px]">
                <span>Strategi (Klik untuk Lihat)</span>
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
                const isExpanded = expandedRow === item.row;
                const isEditingTarget = editingTargetRow === item.row;
                const isEditingStrategy = editingStrategyRow === item.row;
                const stratOpen = isStrategyVisible(item.row);

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
                        className={`border-y-2 border-slate-200 font-extrabold ${
                          catHeaderBannerColors[item.category] || 'bg-slate-100 text-[#003D79]'
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

                    {/* METRIC ROW (Numbered 1..N sequentially!) */}
                    <tr
                      className={`hover:bg-slate-50/90 transition-colors group cursor-pointer ${
                        isExpanded ? 'bg-blue-50/40 border-l-4 border-l-[#003D79]' : ''
                      } ${!item.used ? 'bg-slate-50/40 text-slate-500' : item.scoreGap >= 1.0 && !isExpanded ? 'bg-amber-50/15' : ''}`}
                      onClick={(e) => toggleStrategyRow(e, item.row)}
                    >
                      {/* 1. Sequential Number (1, 2, 3...) */}
                      <td className="py-3 px-3 text-center font-mono font-extrabold text-[#003D79] text-xs">
                        {displayNumber}
                      </td>

                      {/* 2. Category Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${
                            catColors[item.category] || 'bg-slate-100 text-slate-700 border-slate-200'
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
                                  className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                                    isSameParentMetricAsPrev
                                      ? 'bg-slate-100 text-slate-500'
                                      : 'bg-[#003D79]/10 text-[#003D79]'
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
                              <p className={`font-bold mt-0.5 leading-snug ${item.used ? 'text-slate-900 group-hover:text-[#003D79]' : 'text-slate-600'}`}>
                                {item.subMetric}
                              </p>
                            </>
                          ) : (
                            <p className={`font-bold leading-snug ${item.used ? 'text-slate-900 group-hover:text-[#003D79]' : 'text-slate-600'}`}>
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
                        <p className={`font-bold text-xs sm:text-sm ${item.used ? 'text-slate-900' : 'text-slate-500'}`}>
                          {formatBankingNumber(item.real, unit, item.isPct)}
                        </p>
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

                      {/* 6. Target + Kejaran Harian s.d. Target (Berdasarkan Timestand) + Inline Edit Target */}
                      <td
                        className="py-3 px-3 text-right font-mono bg-blue-50/20"
                        onClick={(e) => {
                          if (isEditingTarget) e.stopPropagation();
                        }}
                      >
                        {isEditingTarget ? (
                          <div className="space-y-1.5 bg-white p-2 rounded-lg border border-[#003D79] shadow-xs">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleStepTarget(e, item, -0.05)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                title="Turunkan Target -5%"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                step="any"
                                value={draftTargetVal}
                                onChange={(e) => setDraftTargetVal(e.target.value)}
                                className="w-24 px-2 py-1 text-right font-mono font-bold text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-[#003D79]"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={(e) => handleStepTarget(e, item, 0.05)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                title="Naikkan Target +5%"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center justify-end gap-1 font-sans">
                              <button
                                type="button"
                                onClick={(e) => handleSaveTarget(e, item)}
                                className="px-2 py-0.5 rounded bg-[#003D79] text-white text-[10px] font-bold cursor-pointer"
                              >
                                Simpan
                              </button>
                              {item.isTargetModified && (
                                <button
                                  type="button"
                                  onClick={(e) => handleResetTarget(e, item)}
                                  className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold cursor-pointer"
                                  title="Reset ke Target Excel"
                                >
                                  Reset
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTargetRow(null);
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {/* Total Target */}
                            <div className="flex items-center justify-end gap-1.5">
                              {item.isTargetModified && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-sans font-bold text-[9px]">
                                  {isViewerSimMode ? 'Simulasi' : 'Diedit'}
                                </span>
                              )}
                              <span className="text-[10px] font-sans text-slate-400">Target:</span>
                              <span className={`font-extrabold text-xs sm:text-sm ${item.used ? 'text-slate-900' : 'text-slate-500'}`}>
                                {item.target ? formatBankingNumber(item.target, unit, item.isPct) : '–'}
                              </span>
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
                                      {formatBankingNumber(chaseInfo.gapNominal, unit, item.isPct)} ÷ {effectiveWorkdays} HK s.d. Target)
                                    </span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5 text-[10px] font-sans font-bold text-emerald-700">
                                    <span>✓ Target Tercapai (0/HK)</span>
                                  </div>
                                )}

                                {/* Porsi Target Harian Penuh (Total Target / HK) */}
                                <div
                                  className="text-[10px] text-[#003D79] font-sans font-semibold flex items-center justify-end gap-1"
                                  title={`Porsi Target Harian = Total Target ÷ ${effectiveWorkdays} Hari Kerja Efektif`}
                                >
                                  <Calendar className="w-2.5 h-2.5 text-[#FFB81C] shrink-0" />
                                  <span>
                                    Porsi Target: {formatBankingNumber(dailyTargetVal, unit, item.isPct)}/HK
                                  </span>
                                </div>
                              </>
                            )}

                            {/* Edit Target Button */}
                            {canInlineEdit && (
                              <button
                                type="button"
                                onClick={(e) => handleStartEditTarget(e, item)}
                                className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-[#003D79] text-[#003D79] hover:text-white border border-blue-200 text-[10px] font-sans font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                <span>{isViewerSimMode ? 'Simulasi Target' : 'Edit Target'}</span>
                              </button>
                            )}
                          </div>
                        )}
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
                            {item.scoreGap > 0.0005 ? (
                              <span className="mt-1 inline-block font-black text-[#996000] text-[11px] bg-[#FFB81C]/25 border border-[#FFB81C]/50 px-1.5 py-0.2 rounded">
                                +{item.scoreGap.toFixed(2).replace('.', ',')}
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-sans font-bold text-[10px] block mt-0.5">
                                Penuh ✓
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">–</span>
                        )}
                      </td>

                      {/* 9. Strategi (Hidden by default -> Click to Show!) */}
                      <td
                        className="py-3 px-3"
                        onClick={(e) => {
                          if (isEditingStrategy) e.stopPropagation();
                        }}
                      >
                        {isEditingStrategy ? (
                          <div className="space-y-2 bg-white p-2.5 rounded-xl border border-[#003D79] shadow-xs">
                            <textarea
                              rows={3}
                              value={draftStrategyText}
                              onChange={(e) => setDraftStrategyText(e.target.value)}
                              className="w-full p-2 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#003D79] text-slate-800"
                              placeholder="Tuliskan rincian strategi / keterangan..."
                              autoFocus
                            />
                            {canEditMaster && !isViewerSimMode && (
                              <div className="flex items-center gap-3 text-[11px] text-slate-600">
                                <label className="inline-flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`scope_${item.row}`}
                                    checked={draftStrategyScope === 'branch'}
                                    onChange={() => setDraftStrategyScope('branch')}
                                  />
                                  <span>Khusus Cabang {branchCode}</span>
                                </label>
                                <label className="inline-flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`scope_${item.row}`}
                                    checked={draftStrategyScope === 'all'}
                                    onChange={() => setDraftStrategyScope('all')}
                                  />
                                  <span>Semua Cabang</span>
                                </label>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => handleSaveStrategy(e, item)}
                                className="px-2.5 py-1 rounded-md bg-[#003D79] text-white text-[11px] font-bold cursor-pointer"
                              >
                                Simpan Strategi
                              </button>
                              {resolvedStrategy.scope && (
                                <button
                                  type="button"
                                  onClick={(e) => handleResetStrategy(e, item)}
                                  className="px-2 py-1 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold cursor-pointer"
                                >
                                  Reset Bawaan
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingStrategyRow(null);
                                }}
                                className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Compact Action Buttons Always Visible */}
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

                              {canInlineEdit && (
                                <button
                                  type="button"
                                  onClick={(e) => handleStartEditStrategy(e, item)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-[#003D79] text-[#003D79] hover:text-white border border-slate-300 text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-2.5 h-2.5 text-[#FFB81C]" />
                                  <span>Edit</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRowExpand(item.row);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold transition-colors cursor-pointer"
                              >
                                <span>{isExpanded ? 'Tutup Rumus' : 'Rumus'}</span>
                              </button>
                            </div>

                            {/* Strategy Details (Appears ONLY when clicked!) */}
                            {stratOpen && (
                              <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-1.5 animate-in fade-in duration-150">
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

                                {item.used && !isAchieved && chaseInfo.hasTarget && (
                                  <div className="p-2 rounded-lg bg-white border border-blue-200/80 text-[10px] text-[#003D79] font-medium leading-snug">
                                    <strong className="font-extrabold">Target Harian ({effectiveWorkdays} HK):</strong>{' '}
                                    {item.isQuality ? 'Turunkan ' : 'Kejar +'}
                                    <strong className="font-mono font-extrabold text-rose-700">
                                      {formatBankingNumber(chaseInfo.dailyChase, unit, item.isPct)} {unit}/hari
                                    </strong>{' '}
                                    sampai capai target{' '}
                                    <strong className="font-mono">{formatBankingNumber(item.target, unit, item.isPct)}</strong>{' '}
                                    → Skor bertambah{' '}
                                    <strong className="font-mono text-emerald-700">
                                      +{item.scoreGap.toFixed(2).replace('.', ',')} poin
                                    </strong>.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* INLINE EXPANDED ACCORDION ROW: ACTIONABLE STRATEGY & IMPACT ANALYSIS */}
                    {isExpanded && (
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
                                {item.scoreGap > 0 && (
                                  <button
                                    onClick={() => onOpenSimulatorForMetric(item)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003D79] text-white hover:bg-[#00254D] text-xs font-bold transition-all shadow-xs cursor-pointer"
                                  >
                                    <Sliders className="w-3.5 h-3.5 text-[#FFB81C]" />
                                    <span>Uji di Simulator</span>
                                  </button>
                                )}
                                <button
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
                              
                              {/* Left: Definition & Exact Formula */}
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

                              {/* Right: Tactical Action Plan */}
                              <div className="bg-white p-4 rounded-xl border border-blue-200/90 space-y-2.5 shadow-2xs">
                                <div className="flex items-center justify-between pb-1.5 border-b border-blue-100">
                                  <div className="flex items-center gap-2 text-[#003D79] font-bold text-xs">
                                    <Building2 className="w-4 h-4 text-[#003D79]" />
                                    <span>Taktik Eksekusi Lapangan — {branchInfo.name}</span>
                                  </div>
                                  {canInlineEdit && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleStartEditStrategy(e, item)}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#003D79] hover:underline cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Edit Strategi</span>
                                    </button>
                                  )}
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
            Penomoran berurutan <strong>No. 1 s.d. {filteredMetrics.length}</strong>. Klik tombol <strong>Lihat Strategi</strong> pada baris untuk membuka rincian strategi.
          </span>
        </div>
        <div className="font-mono text-slate-600">
          Menampilkan {filteredMetrics.length} dari {metrics.length} metrik
        </div>
      </div>

    </div>
  );
}
