import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowUpDown,
  Info,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Calculator,
  Edit3,
  Calendar,
  ListOrdered,
  Target,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Eye,
  EyeOff,
  X,
  RotateCcw,
  Check,
  Search
} from 'lucide-react';
import metricDefinitions from '../data/metricDefinitions.json';
import { formatBankingNumber, getMetricKnowledge } from '../utils/knowledgeBase';
import {
  CAT_ORDER,
  CATEGORY_MULTIPLIERS,
  getActionText,
  getDefaultStrategyText,
  calcMetricScore,
  xround
} from '../utils/excelParser';
import {
  calculateDailyTargetValue,
  calculateDailyChaseInfo,
  formatDateId,
  formatShortDateId
} from '../utils/googleCalendar';
import { getCategoryTheme, CATEGORY_THEMES } from '../utils/categoryColors';
import { InfoTooltip } from './InfoTooltip';

export function MetricsTable({
  metrics = [],
  categorySummary = {},
  totalScore = 85.53,
  masterTotalScore = 85.53,
  filterCategory = 'all',
  onSelectCategory,
  filterUnderTarget = false,
  searchQuery = '',
  onSearchChange,
  branchInfo = { code: '10125', name: 'Jakarta Pondok Indah Office 3', head: 'MICHAEL DANNIEL', grade: 'B.3' },
  onSelectMetricForDetail,
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

  // Full-Width Editor State (for comfortable editing of Master Target or Simulasi Realisasi/Target Viewer & Strategy)
  const [editingRowId, setEditingRowId] = useState(null);
  const [viewerSimTab, setViewerSimTab] = useState('realisasi'); // 'realisasi' | 'target' (khusus Viewer di Mode Simulasi)
  const pendingOpenRowRef = useRef(null);
  const [draftRealVal, setDraftRealVal] = useState('');
  const [draftTargetVal, setDraftTargetVal] = useState('');
  const [draftStrategyText, setDraftStrategyText] = useState('');
  const [draftStrategyScope, setDraftStrategyScope] = useState('branch'); // 'branch' | 'all'
  const [initialDraftStrategyText, setInitialDraftStrategyText] = useState('');
  const [initialDraftStrategyScope, setInitialDraftStrategyScope] = useState('branch');
  const [savedBannerMsg, setSavedBannerMsg] = useState('');

  const isMasterEditMode = canEditMaster && !isViewerSimMode;
  const isViewerTargetSimEnabled = !canEditMaster && isViewerSimMode;
  const canInlineEdit = canEditMaster || isViewerSimMode;
  const branchCode = String(branchInfo?.code || '10125');

  // Reset inline editor cleanly whenever user switches between Master Mode & Simulation Mode or changes branch
  // (Preserve pendingOpenRowRef when Viewer clicked Simulasi Capaian directly from Read-Only mode)
  useEffect(() => {
    if (pendingOpenRowRef.current !== null && isViewerSimMode) {
      setEditingRowId(pendingOpenRowRef.current);
      pendingOpenRowRef.current = null;
      return;
    }
    setEditingRowId(null);
    setSavedBannerMsg('');
  }, [isViewerSimMode, branchCode]);
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
    if (editingRowId === item.row) {
      setEditingRowId(null);
      return;
    }
    const resolved = resolveStrategyInfo(item);
    const displayReal = item.isPct ? Number((item.real * 100).toFixed(4)) : Number(item.real.toFixed(4));
    const displayTgt = item.isPct ? Number((item.target * 100).toFixed(4)) : Number(item.target.toFixed(4));
    const initialScope = resolved.scope === 'all' ? 'all' : 'branch';
    setDraftRealVal(String(displayReal));
    setDraftTargetVal(String(displayTgt));
    setDraftStrategyText(resolved.text);
    setDraftStrategyScope(initialScope);
    setInitialDraftStrategyText(resolved.text);
    setInitialDraftStrategyScope(initialScope);
    setSavedBannerMsg('');
    setViewerSimTab('realisasi');
    // CRITICAL: Only auto-activate Simulation Mode for Viewers (who cannot edit Master). NEVER flip Konseptor/Superadmin!
    if (!canEditMaster && !isViewerSimMode && onActivateViewerSimMode) {
      pendingOpenRowRef.current = item.row;
      onActivateViewerSimMode();
    }
    setEditingRowId(item.row);
  };

  // Helpers: convert draft input (display units) <-> stored value, and detect real changes
  const toDisplayVal = (item, v) => (item.isPct ? Number((v * 100).toFixed(4)) : Number(Number(v).toFixed(4)));
  const parseDraft = (item, draft) => {
    const parsed = parseFloat(draft);
    if (isNaN(parsed) || parsed < 0) return null;
    return item.isPct ? parsed / 100 : parsed;
  };
  // True only if the user actually typed a different number (ignores display rounding to 4 decimals)
  const isDraftDifferent = (item, draft, currentVal) => {
    const parsed = parseFloat(draft);
    if (isNaN(parsed)) return false;
    return Math.abs(parsed - toDisplayVal(item, currentVal)) > 1e-9;
  };
  const ensureSimMode = () => {
    if (!isViewerSimMode && onActivateViewerSimMode) onActivateViewerSimMode();
  };
  // Target diedit LIVE sebagai simulasi hanya saat berada di Mode Simulasi (bukan saat Konseptor edit Data Master)
  const isTargetLive = isViewerSimMode || !canEditMaster;

  // LIVE: terapkan angka realisasi simulasi langsung ke Total Skor Simulasi (Hanya saat bukan Mode Master)
  const commitReal = (item, draft) => {
    if (isMasterEditMode || !onUpdateViewerSimReal) return;
    const val = parseDraft(item, draft);
    if (val === null) return;
    const base = item.masterReal !== undefined ? item.masterReal : item.real;
    const isBase = !isDraftDifferent(item, draft, base);
    if (isBase && !isViewerSimMode) return;
    ensureSimMode();
    onUpdateViewerSimReal(item.row, isBase ? undefined : val);
  };

  // LIVE: terapkan angka target simulasi langsung ke Total Skor Simulasi
  const commitTarget = (item, draft) => {
    if (isMasterEditMode || !onUpdateViewerSimTarget) return;
    const val = parseDraft(item, draft);
    if (val === null) return;
    const base = item.masterTarget !== undefined ? item.masterTarget : item.target;
    const isBase = !isDraftDifferent(item, draft, base);
    if (isBase && !isViewerSimMode) return;
    ensureSimMode();
    onUpdateViewerSimTarget(item.row, isBase ? undefined : val);
  };

  const handleChangeReal = (item, v) => {
    setDraftRealVal(v);
    commitReal(item, v);
  };

  const handleChangeTarget = (item, v) => {
    setDraftTargetVal(v);
    if (isViewerTargetSimEnabled) {
      commitTarget(item, v);
    }
  };

  const handleStepReal = (e, item, factorPct) => {
    if (e) e.stopPropagation();
    const cur = parseFloat(draftRealVal);
    const base = !isNaN(cur) ? cur : (item.isPct ? item.real * 100 : item.real);
    const step = base !== 0 ? Math.abs(base) * Math.abs(factorPct) : 1;
    const next = Math.max(0, Number((base + (factorPct > 0 ? step : -step)).toFixed(4)));
    handleChangeReal(item, String(next));
  };

  const handleSetRealToTarget = (e, item) => {
    if (e) e.stopPropagation();
    const curDraftTgt = parseFloat(draftTargetVal);
    const baseTgt = isViewerTargetSimEnabled && !isNaN(curDraftTgt) && curDraftTgt >= 0
      ? curDraftTgt
      : (item.isPct ? item.target * 100 : item.target);
    handleChangeReal(item, String(Number(baseTgt.toFixed(4))));
  };

  const handleSaveReal = (e, item) => {
    if (e) e.stopPropagation();
    commitReal(item, draftRealVal);
  };

  const handleResetReal = (e, item) => {
    if (e) e.stopPropagation();
    if (onUpdateViewerSimReal) {
      onUpdateViewerSimReal(item.row, undefined);
    }
    const orig = item.masterReal !== undefined ? item.masterReal : (item.originalReal !== undefined ? item.originalReal : item.real);
    setDraftRealVal(String(toDisplayVal(item, orig)));
  };

  const handleStepTarget = (e, item, factorPct) => {
    if (e) e.stopPropagation();
    const cur = parseFloat(draftTargetVal);
    const base = !isNaN(cur) ? cur : (item.isPct ? item.target * 100 : item.target);
    const step = base !== 0 ? Math.abs(base) * Math.abs(factorPct) : 1;
    const next = Math.max(0, Number((base + (factorPct > 0 ? step : -step)).toFixed(4)));
    handleChangeTarget(item, String(next));
  };

  const handleSaveTarget = (e, item) => {
    if (e) e.stopPropagation();
    if (isMasterEditMode) {
      // Konseptor / Superadmin Mode Master: simpan permanen ke Supabase & DB Master
      const val = parseDraft(item, draftTargetVal);
      if (val === null) return;
      onSaveMasterTarget(branchCode, item.row, val);
      setSavedBannerMsg('✓ Target Master tersimpan permanen ke Supabase & tampil di semua Viewer!');
      return;
    }
    commitTarget(item, draftTargetVal);
  };

  const handleResetTarget = (e, item) => {
    if (e) e.stopPropagation();
    if (isViewerSimMode) {
      onUpdateViewerSimTarget(item.row, undefined);
      const orig = item.konseptorTarget !== undefined ? item.konseptorTarget : (item.originalTarget !== undefined ? item.originalTarget : item.target);
      setDraftTargetVal(String(toDisplayVal(item, orig)));
    } else if (canEditMaster) {
      onResetMasterTarget(branchCode, item.row);
      const origExcel = item.originalTarget !== undefined ? item.originalTarget : item.target;
      setDraftTargetVal(String(toDisplayVal(item, origExcel)));
      setSavedBannerMsg('✓ Target Master dikembalikan ke nilai asli Excel');
    }
  };

  const handleSaveStrategy = (e, item, { onlyIfDirty = false } = {}) => {
    if (e) e.stopPropagation();
    const clean = draftStrategyText.trim();
    const resolved = resolveStrategyInfo(item);
    const scopeChanged = isMasterEditMode && Boolean(resolved.scope) && draftStrategyScope !== initialDraftStrategyScope;
    const textChanged = clean !== initialDraftStrategyText.trim();

    if (onlyIfDirty && !textChanged && !scopeChanged) {
      return;
    }

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
    setInitialDraftStrategyText(clean);
    setInitialDraftStrategyScope(draftStrategyScope);
    setOpenStrategyRows(prev => ({ ...prev, [item.row]: true }));
  };

  const handleSaveBothAndClose = (e, item) => {
    if (e) e.stopPropagation();
    if (isMasterEditMode) {
      // Mode Master: HANYA simpan Target Master & Strategi Master jika diubah; JANGAN sentuh Simulasi Realisasi!
      if (isDraftDifferent(item, draftTargetVal, item.target)) {
        const val = parseDraft(item, draftTargetVal);
        if (val !== null) onSaveMasterTarget(branchCode, item.row, val);
      }
      handleSaveStrategy(e, item, { onlyIfDirty: true });
      setEditingRowId(null);
      return;
    }
    // Mode Simulasi: simpan Simulasi Realisasi (+ Simulasi Target khusus Viewer) & Strategi Simulasi
    handleSaveReal(e, item);
    if (isViewerTargetSimEnabled) {
      commitTarget(item, draftTargetVal);
    }
    handleSaveStrategy(e, item, { onlyIfDirty: true });
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

  // Nested Accordion / Collapse States:
  // Level 1: Category collapsed state
  const [collapsedCategories, setCollapsedCategories] = useState({});
  // Level 2: Sub-group collapsed state (keyed by `${category}__${metric}`)
  const [collapsedSubGroups, setCollapsedSubGroups] = useState({});

  // Permanent standard row map based on metricDefinitions (No. 1 to 74)
  const STANDARD_ROW_MAP = useMemo(() => {
    const map = new Map();
    metricDefinitions.forEach((def, idx) => {
      map.set(def.row, idx + 1);
    });
    return map;
  }, []);

  const getStandardNumber = (row, fallbackIdx) => {
    return STANDARD_ROW_MAP.get(row) ?? (fallbackIdx + 1);
  };

  // Check if a category has metric sub-groupings (Level 2)
  const hasSubGroups = (cat) => {
    const c = String(cat || '').toLowerCase();
    return c === 'kredit' || c === 'acquiring' || c === 'gmm';
  };

  const categoryMetricsCount = useMemo(() => {
    const counts = {};
    metrics.forEach((m) => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });
    return counts;
  }, [metrics]);

  // Aggregate sub-group totals (Bobot, Score, Gap, Count, Achieved)
  const subGroupSummaries = useMemo(() => {
    const summaries = {};
    metrics.forEach((m) => {
      if (!hasSubGroups(m.category)) return;
      const key = `${m.category}__${m.metric}`;
      if (!summaries[key]) {
        summaries[key] = {
          category: m.category,
          metric: m.metric,
          totalItems: 0,
          usedItems: 0,
          totalBobot: 0,
          totalScore: 0,
          totalMaxScore: 0,
          totalGap: 0,
          achievedCount: 0,
          hasBobot: false
        };
      }
      const s = summaries[key];
      s.totalItems += 1;
      if (m.used) s.usedItems += 1;
      s.totalBobot += m.bobot || 0;
      s.totalScore += m.score || 0;
      s.totalMaxScore += m.maxScore || 0;
      s.totalGap += m.scoreGap || 0;
      if (m.maxAcv >= 1.0) s.achievedCount += 1;
      if (m.bobot && m.bobot > 0) s.hasBobot = true;
    });
    return summaries;
  }, [metrics]);

  const isSearching = Boolean(searchQuery && searchQuery.trim());

  const isCategoryCollapsed = (cat) => {
    if (isSearching) return false;
    return Boolean(collapsedCategories[cat]);
  };

  const isSubGroupCollapsed = (cat, metric) => {
    if (isSearching) return false;
    return Boolean(collapsedSubGroups[`${cat}__${metric}`]);
  };

  const toggleCategory = (cat) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const toggleSubGroup = (cat, metric) => {
    const key = `${cat}__${metric}`;
    setCollapsedSubGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Check if all active categories are currently collapsed
  const isAllCollapsed = useMemo(() => {
    const activeCats = filterCategory === 'all'
      ? CAT_ORDER
      : [filterCategory];
    return activeCats.length > 0 && activeCats.every(cat => Boolean(collapsedCategories[cat]));
  }, [collapsedCategories, filterCategory]);

  const handleToggleAllCollapse = () => {
    if (isAllCollapsed) {
      // Buka Semua
      setCollapsedCategories({});
      setCollapsedSubGroups({});
    } else {
      // Minimize Semua
      const allCats = {};
      CAT_ORDER.forEach(c => { allCats[c] = true; });
      const allSGs = {};
      Object.keys(subGroupSummaries).forEach(k => { allSGs[k] = true; });
      setCollapsedCategories(allCats);
      setCollapsedSubGroups(allSGs);
    }
  };

  // Auto-expand any category or sub-group containing matched metrics when user searches
  React.useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      setCollapsedCategories(prev => {
        let changed = false;
        const next = { ...prev };
        filteredMetrics.forEach(m => {
          if (next[m.category]) {
            delete next[m.category];
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setCollapsedSubGroups(prev => {
        let changed = false;
        const next = { ...prev };
        filteredMetrics.forEach(m => {
          const key = `${m.category}__${m.metric}`;
          if (next[key]) {
            delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [searchQuery, filteredMetrics]);

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

  // Render Large, Spacious Full-Width Editor Panel for Realisasi / Target, Rumus & Strategy
  const renderFullWidthEditorPanel = (item, displayNumber, unit, resolvedStrategy) => {
    const canEditTargetInput = isMasterEditMode || isViewerTargetSimEnabled;
    const parsedDraftTgt = parseFloat(draftTargetVal);
    const previewTargetVal = canEditTargetInput && !isNaN(parsedDraftTgt) && parsedDraftTgt >= 0
      ? (item.isPct ? parsedDraftTgt / 100 : parsedDraftTgt)
      : item.target;

    const parsedDraftReal = parseFloat(draftRealVal);
    const previewRealVal = !isMasterEditMode && !isNaN(parsedDraftReal) && parsedDraftReal >= 0
      ? (item.isPct ? parsedDraftReal / 100 : parsedDraftReal)
      : item.real;

    const excelBaselineTarget = item.originalTarget !== undefined ? item.originalTarget : item.target;
    const konseptorBaselineTarget = item.konseptorTarget !== undefined ? item.konseptorTarget : excelBaselineTarget;
    const isMasterTargetChanged = item.originalTarget !== undefined && Math.abs(item.target - item.originalTarget) > 1e-6;
    const isKonseptorTargetEditedFromExcel = item.originalTarget !== undefined && Math.abs(konseptorBaselineTarget - item.originalTarget) > 1e-6;
    const dailyTargetPreview = calculateDailyTargetValue(previewTargetVal, effectiveWorkdays, item.isQuality);
    const masterRealBaseline = item.masterReal !== undefined ? item.masterReal : (item.originalReal !== undefined ? item.originalReal : item.real);

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
    // Presisi pembulatan konsisten 2 desimal (menggunakan xround) agar selaras dengan total skor
    const previewScoreDelta = xround(previewScoreObj.score - baseScore, 2);
    // Proyeksi Total Skor cabang dibanding skor master awal (konseptor)
    const baseTotalScore = masterTotalScore !== undefined ? masterTotalScore : totalScore;
    const projectedTotal = Number((totalScore - item.score + previewScoreObj.score).toFixed(2));
    const totalSimDelta = Number((projectedTotal - baseTotalScore).toFixed(2));
    const isRealDirty = isDraftDifferent(item, draftRealVal, item.real);
    const isTargetDirty = isDraftDifferent(item, draftTargetVal, item.target);
    const isSimulated = item.isRealModified || item.isTargetModified || isRealDirty || isTargetDirty;
    // Rekomendasi metrik berbobot dengan potensi poin terbesar (prioritaskan kategori yang sama)
    const sameCatGap = metrics.filter(x => x.category === item.category && x.used && x.scoreGap > 0.0005);
    const otherCatGap = metrics.filter(x => x.category !== item.category && x.used && x.scoreGap > 0.0005);
    const topGapSuggestions = !item.used
      ? [...sameCatGap.sort((a, b) => b.scoreGap - a.scoreGap), ...otherCatGap.sort((a, b) => b.scoreGap - a.scoreGap)].slice(0, 3)
      : [];

    return (
      <div
        className="bg-white rounded-2xl border-2 border-[#003D79] shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Editor Header */}
        <div className="bg-linear-to-r from-[#00254D] via-[#003D79] to-[#004B94] text-white px-5 py-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Edit3 className="w-4 h-4 text-[#FFB81C]" />
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              isMasterEditMode
                ? 'bg-emerald-400 text-[#00254D]'
                : 'bg-[#FFB81C] text-[#00254D]'
            }`}>
              {isMasterEditMode ? '🔒 MODE MASTER (Permanen ke Semua Viewer)' : (isViewerTargetSimEnabled ? '⚡ MODE SIMULASI VIEWER (Draft Lokal)' : '⚡ MODE SIMULASI (Draft Lokal)')}
            </span>
            <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
              <span>No. #{displayNumber} [{item.category}] {item.name}</span>
              <InfoTooltip type="metric" item={item} align="left" iconSize="w-4 h-4" />
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

        {savedBannerMsg && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center justify-between gap-2">
            <span>{savedBannerMsg}</span>
            <button type="button" onClick={() => setSavedBannerMsg('')} className="text-emerald-700 hover:text-emerald-950 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 2-Column Wide Editor Body */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">

          {/* Left Column (5 cols): Focused Single-Mode Input + Rumus Skor */}
          <div className="lg:col-span-5 space-y-4 bg-[#F8FAFC] p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="font-extrabold text-[#003D79] text-sm flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-[#003D79]" />
                <span>
                  {isMasterEditMode
                    ? '1. Edit Target Master & Rumus Skor'
                    : (isViewerTargetSimEnabled ? '1. Simulasi Angka & Rumus Skor' : '1. Simulasi Realisasi & Rumus Skor')}
                </span>
              </span>
              {unit && (
                <span className="px-2 py-0.5 rounded bg-blue-100 text-[#003D79] font-bold text-[11px]">
                  Satuan: {unit}
                </span>
              )}
            </div>

            {/* WARNING & REKOMENDASI: Metrik Bobot 0% tidak mempengaruhi skor */}
            {!item.used && (
              <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-[11px] text-amber-950 leading-relaxed space-y-2.5">
                <div className="flex items-start gap-2">
                  <span className="text-amber-700 font-black text-sm">⚠️</span>
                  <div>
                    <p className="font-extrabold text-xs text-amber-900">
                      Metrik #{displayNumber} [{item.category}] {item.name} memiliki BOBOT 0% (Hanya Monitoring)
                    </p>
                    <p className="text-amber-800 mt-0.5">
                      Metrik ini <strong>tidak memiliki porsi poin</strong> di sistem scorecard Mandiri. Berapa pun angka Realisasi atau Target yang Anda isi, <strong>Total Skor cabang tidak akan bertambah atau berkurang</strong> (tetap +0,00 pt).
                    </p>
                  </div>
                </div>

                {topGapSuggestions.length > 0 && (
                  <div className="bg-white/90 p-3 rounded-xl border border-amber-200 space-y-2">
                    <p className="font-bold text-xs text-[#003D79]">
                      🎯 Untuk menaikkan skor, silakan pilih salah satu metrik berbobot di bawah ini:
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {topGapSuggestions.map((rec) => (
                        <button
                          key={rec.row}
                          type="button"
                          onClick={(e) => {
                            handleOpenFullEditor(e, rec);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg bg-blue-50/80 hover:bg-blue-100 border border-blue-200 text-left cursor-pointer transition-all hover:shadow-xs group"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">
                              [{rec.category}] Bobot {(rec.bobot * 100).toFixed(0)}%
                            </span>
                            <span className="text-xs font-bold text-[#003D79] group-hover:text-blue-900 block truncate">
                              {rec.name}
                            </span>
                          </div>
                          <span className="shrink-0 px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-mono font-extrabold text-xs group-hover:bg-emerald-200">
                            Simulasikan Metrik Ini (+{rec.scoreGap.toFixed(2).replace('.', ',')} pt) →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* KHUSUS VIEWER DI MODE SIMULASI: Pilihan Simulasi Realisasi vs Simulasi Target */}
            {isViewerTargetSimEnabled && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewerSimTab('realisasi')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    viewerSimTab === 'realisasi'
                      ? 'bg-[#003D79] text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white/60'
                  }`}
                >
                  <span>Simulasi Realisasi</span>
                  {item.isRealModified && <span className="w-2 h-2 rounded-full bg-[#FFB81C]" />}
                </button>
                <button
                  type="button"
                  onClick={() => setViewerSimTab('target')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    viewerSimTab === 'target'
                      ? 'bg-[#003D79] text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white/60'
                  }`}
                >
                  <span>Simulasi Target</span>
                  {item.isTargetModified && <span className="w-2 h-2 rounded-full bg-[#FFB81C]" />}
                </button>
              </div>
            )}

            {/* MODE SIMULASI TAB 1: UBAH REALISASI (CAPAIAN) */}
            {!isMasterEditMode && (!isViewerTargetSimEnabled || viewerSimTab === 'realisasi') && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 text-xs">
                    Masukkan Simulasi Realisasi (Capaian) {item.isPct ? '(%)' : `(${unit || 'Nominal'})`}:
                  </label>
                  <span className="text-[10px] text-slate-500">
                    {isViewerTargetSimEnabled && item.isTargetModified ? 'Target Simulasi:' : 'Target Master:'}{' '}
                    <strong className="font-mono text-[#003D79]">{formatBankingNumber(previewTargetVal, unit, item.isPct)}</strong>
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
                  onChange={(e) => handleChangeReal(item, e.target.value)}
                  className="w-full px-4 py-2.5 text-right font-mono font-black text-base text-[#003D79] bg-white border-2 border-[#003D79] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB81C]"
                  placeholder="Ketik angka realisasi yang ingin dicapai..."
                />

                {/* Baseline Realisasi Aktual + Info Target & Porsi Target */}
                <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/90 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Realisasi Aktual Saat Ini:
                      </span>
                      <strong className="font-mono text-sm text-slate-900">
                        {formatBankingNumber(masterRealBaseline, unit, item.isPct)} {unit}
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
                  <div className="pt-1.5 border-t border-blue-200/70 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600">
                    <span>
                      {isViewerTargetSimEnabled && item.isTargetModified ? 'Target Simulasi:' : 'Target Master (Tetap):'}{' '}
                      <strong className="font-mono text-[#003D79]">{formatBankingNumber(previewTargetVal, unit, item.isPct)} {unit}</strong>
                      {isMasterTargetChanged && (
                        <span className="ml-1 text-slate-400">
                          ({isViewerTargetSimEnabled && item.isTargetModified ? `Master: ${formatBankingNumber(konseptorBaselineTarget, unit, item.isPct)}` : `Excel: ${formatBankingNumber(excelBaselineTarget, unit, item.isPct)}`})
                        </span>
                      )}
                    </span>
                    {previewTargetVal > 0 && effectiveWorkdays > 0 && (
                      <span>
                        Porsi Target: <strong className="font-mono text-[#003D79]">{formatBankingNumber(dailyTargetPreview, unit, item.isPct)}/HK</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MODE SIMULASI TAB 2 (KHUSUS VIEWER): UBAH SIMULASI TARGET KPI */}
            {isViewerTargetSimEnabled && viewerSimTab === 'target' && (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-950 leading-relaxed">
                  ⚡ <strong>Simulasi Target Viewer (Draft Lokal):</strong> Ubah proyeksi target untuk simulasi/presentasi ke Konseptor. Data Master tidak berubah.
                </div>
                <label className="block font-bold text-slate-700 text-xs">
                  Masukkan Proyeksi Target Simulasi {item.isPct ? '(dalam %)' : `(${unit || 'Nominal'})`}:
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
                  onChange={(e) => handleChangeTarget(item, e.target.value)}
                  className="w-full px-4 py-2.5 text-right font-mono font-black text-base text-[#003D79] bg-white border-2 border-[#003D79] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB81C]"
                  placeholder="Ketik target simulasi..."
                />

                {/* Baseline Target Master Konseptor + Realisasi Proyeksi & Porsi Target */}
                <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/90 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Target Master (Konseptor):
                      </span>
                      <strong className="font-mono text-sm text-[#003D79]">
                        {formatBankingNumber(konseptorBaselineTarget, unit, item.isPct)} {unit}
                      </strong>
                      {isKonseptorTargetEditedFromExcel && (
                        <span className="ml-1.5 text-[10px] text-slate-400">
                          (Excel: {formatBankingNumber(excelBaselineTarget, unit, item.isPct)})
                        </span>
                      )}
                    </div>
                    {item.isTargetModified && (
                      <button
                        type="button"
                        onClick={(e) => handleResetTarget(e, item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-[#FFB81C]" />
                        <span>Pakai Target Master</span>
                      </button>
                    )}
                  </div>
                  <div className="pt-1.5 border-t border-blue-200/70 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600">
                    <span>
                      Realisasi Proyeksi: <strong className="font-mono text-slate-800">{formatBankingNumber(previewRealVal, unit, item.isPct)} {unit}</strong>
                    </span>
                    {previewTargetVal > 0 && effectiveWorkdays > 0 && (
                      <span>
                        Porsi Target: <strong className="font-mono text-[#003D79]">{formatBankingNumber(dailyTargetPreview, unit, item.isPct)}/HK</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MODE MASTER: HANYA UBAH TARGET MASTER & STRATEGI (Permanen ke Semua Viewer) */}
            {isMasterEditMode && (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-[#003D79] leading-relaxed">
                  🔒 <strong>Mode Master Konseptor:</strong> Perubahan angka <strong>Target KPI</strong> &amp; <strong>Strategi</strong> akan tersimpan permanen ke Supabase dan langsung tampil ke seluruh Viewer.
                </div>
                <label className="block font-bold text-slate-700 text-xs">
                  Masukkan Nilai Target Master Baru {item.isPct ? '(dalam %)' : `(${unit || 'Nominal'})`}:
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
                  onChange={(e) => handleChangeTarget(item, e.target.value)}
                  className="w-full px-4 py-2.5 text-right font-mono font-black text-base text-[#003D79] bg-white border-2 border-[#003D79] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB81C]"
                />

                {/* Baseline Target Excel + Realisasi Aktual & Porsi Target */}
                <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/90 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Target Asli File Excel:
                      </span>
                      <strong className="font-mono text-sm text-[#003D79]">
                        {formatBankingNumber(excelBaselineTarget, unit, item.isPct)} {unit}
                      </strong>
                    </div>
                    {isMasterTargetChanged && (
                      <button
                        type="button"
                        onClick={(e) => handleResetTarget(e, item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-[#FFB81C]" />
                        <span>Reset ke Excel Asli</span>
                      </button>
                    )}
                  </div>
                  <div className="pt-1.5 border-t border-blue-200/70 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600">
                    <span>
                      Realisasi Aktual: <strong className="font-mono text-slate-800">{formatBankingNumber(item.real, unit, item.isPct)} {unit}</strong>
                    </span>
                    {previewTargetVal > 0 && effectiveWorkdays > 0 && (
                      <span>
                        Porsi Target: <strong className="font-mono text-[#003D79]">{formatBankingNumber(dailyTargetPreview, unit, item.isPct)}/HK</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Live Formula Preview Box */}
            <div className="p-3.5 rounded-xl bg-white border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-[#003D79] uppercase tracking-wider">
                  Pratinjau Hasil Rumus Otomatis:
                </p>
                {Math.abs(previewScoreDelta) > 0.0005 && (
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${previewScoreDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    title="Selisih skor metrik ini dibanding data awal (konseptor)"
                  >
                    Metrik vs Awal: {previewScoreDelta > 0 ? '+' : ''}{previewScoreDelta.toFixed(2).replace('.', ',')} pt
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-500 block text-[10px]">Realisasi Proyeksi:</span>
                  <strong className="font-mono text-sm text-slate-900 block">
                    {formatBankingNumber(previewRealVal, unit, item.isPct)} {unit}
                  </strong>
                  {isViewerTargetSimEnabled && (item.isTargetModified || isTargetDirty) && (
                    <span className="text-[10px] text-amber-800 font-semibold block mt-0.5">
                      vs Target Sim: <strong className="font-mono">{formatBankingNumber(previewTargetVal, unit, item.isPct)}</strong>
                    </span>
                  )}
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
                  <strong className={`font-mono text-sm ${!item.used ? 'text-slate-500' : previewScoreDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {item.used
                      ? `${previewScoreObj.score.toFixed(2).replace('.', ',')} / ${previewScoreObj.maxScore.toFixed(2).replace('.', ',')} pt`
                      : 'Tidak dihitung (Bobot 0%)'}
                  </strong>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 font-mono bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                Rumus: {item.isQuality ? 'Acv = 1 − (Real − Target) ÷ Target' : 'Acv = Realisasi ÷ Target'} (maks 100%) × Bobot {(item.bobot * 100).toFixed(1).replace('.0', '')}% × Max {CATEGORY_MULTIPLIERS[item.category]} pt
              </p>

              {/* Dampak langsung ke Total Skor Cabang (LIVE REACTIVE vs AWAL KONSEPTOR) */}
              <div className="p-2.5 rounded-lg bg-[#00254D] text-white flex flex-wrap items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isMasterEditMode ? 'bg-[#FFB81C]' : 'bg-emerald-400 animate-pulse'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    {isMasterEditMode ? 'Pratinjau Dampak ke Skor Master:' : 'Dampak ke Total Skor (Live):'}
                  </span>
                </div>
                <span className="font-mono text-sm font-black">
                  {baseTotalScore.toFixed(2).replace('.', ',')} → {projectedTotal.toFixed(2).replace('.', ',')}
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-[11px] ${totalSimDelta > 0
                      ? 'bg-emerald-500 text-white'
                      : totalSimDelta < 0
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-500 text-white'
                      }`}
                  >
                    {totalSimDelta > 0 ? '+' : ''}{totalSimDelta.toFixed(2).replace('.', ',')} pt
                  </span>
                </span>
              </div>

              {/* Status & Guidance Live Simulasi */}
              {item.used && totalSimDelta > 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-[11px] text-emerald-900 leading-relaxed font-bold flex items-start gap-1.5">
                  <span className="text-emerald-600 font-black">✓</span>
                  <span>
                    Simulasi Aktif (Live): Total Skor cabang naik <strong>+{totalSimDelta.toFixed(2).replace('.', ',')} pt</strong> dibanding skor awal ({baseTotalScore.toFixed(2).replace('.', ',')} pt).
                  </span>
                </div>
              )}

              {item.used && totalSimDelta < 0 && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-[11px] text-rose-900 leading-relaxed font-medium">
                  ⚠️ <strong>Total Skor turun {Math.abs(totalSimDelta).toFixed(2).replace('.', ',')} pt</strong> ({baseTotalScore.toFixed(2).replace('.', ',')} → {projectedTotal.toFixed(2).replace('.', ',')} pt) karena Target yang dinaikkan memperbesar gap kekurangan. Jika ingin melihat skor cabang naik, gunakan tab <strong>"Simulasi Realisasi (Capaian)"</strong>.
                </div>
              )}

              {item.used && totalSimDelta === 0 && previewScoreObj.maxAcv >= 1 && (
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 leading-relaxed font-medium">
                  ℹ️ Pencapaian metrik ini sudah 100% penuh (skor maksimal tercapai). Kenaikan realisasi lebih lanjut tidak menambah skor lagi karena dibatasi 100%.
                </div>
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
                  Tutup Panel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveBothAndClose(e, item)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#003D79] hover:bg-[#00254D] text-white font-extrabold text-xs shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4 text-[#FFB81C]" />
                  <span>{isMasterEditMode ? 'Simpan ke Master (Permanen)' : 'Selesai & Simpan Catatan'}</span>
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
            {filteredMetrics.length === 74 ? 'No. 1–74' : `${filteredMetrics.length} / 74 Metrik`}
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

          {/* Toggle Minimize/Expand All Categories & Sub-Groups */}
          <button
            type="button"
            onClick={handleToggleAllCollapse}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${isAllCollapsed
              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-2xs'
              : 'bg-white hover:bg-slate-100 text-[#003D79] border-slate-300'
              }`}
            title={isAllCollapsed ? 'Buka seluruh kategori dan sub-group tabel' : 'Tutup / minimize seluruh kategori tabel'}
          >
            {isAllCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-white" />
                <span>Buka Semua</span>
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-[#003D79]" />
                <span>Minimize Semua</span>
              </>
            )}
          </button>

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
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${showAllStrategies
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
            const displayNumber = getStandardNumber(item.row, idx);
            const prevItem = idx > 0 ? filteredMetrics[idx - 1] : null;
            const isNewCategorySection = sortMode === 'excel' && (!prevItem || prevItem.category !== item.category);
            const isSubGroupCat = hasSubGroups(item.category);
            const isNewSubGroupSection =
              sortMode === 'excel' &&
              isSubGroupCat &&
              (!prevItem || prevItem.category !== item.category || prevItem.metric !== item.metric);

            const subGroupKey = `${item.category}__${item.metric}`;
            const isCatClosed = isCategoryCollapsed(item.category);
            const isSGClosed = isSubGroupCollapsed(item.category, item.metric);

            const sgSummary = subGroupSummaries[subGroupKey] || {
              totalItems: 0,
              usedItems: 0,
              totalBobot: 0,
              totalScore: 0,
              totalMaxScore: 0,
              totalGap: 0,
              achievedCount: 0,
              hasBobot: false
            };

            const catSum = categorySummary?.[item.category] || {
              category: item.category,
              maxScore: CATEGORY_MULTIPLIERS[item.category] || 0,
              actualScore: 0,
              gapScore: 0
            };

            const catMetricsCount = categoryMetricsCount[item.category] || 0;

            // If Category is collapsed on mobile:
            if (sortMode === 'excel' && isCatClosed) {
              if (isNewCategorySection) {
                return (
                  <div
                    key={`mob-cat-${item.category}`}
                    id={`cat-section-mob-${item.category}`}
                    onClick={() => toggleCategory(item.category)}
                    className={`px-3.5 py-2.5 font-extrabold flex items-center justify-between text-xs cursor-pointer select-none scroll-mt-4 ${getCatBanner(item.category)}`}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-slate-800 shrink-0" />
                      <span className="uppercase tracking-wide font-black">KATEGORI: {item.category}</span>
                      <InfoTooltip type="category" id={item.category} align="left" iconSize="w-3 h-3" />
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/80 text-slate-700">
                        {catMetricsCount} Metrik
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="font-mono font-black">
                        {catSum.actualScore?.toFixed(2).replace('.', ',')} / {catSum.maxScore}
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/80 text-slate-700 font-bold">
                        Buka
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            }

            const skipMetricCard = sortMode === 'excel' && isSubGroupCat && isSGClosed;

            const info = getMetricKnowledge(item);
            const unit = info.unit || '';
            const isAchieved = item.maxAcv >= 1.0;
            const isAlmost = item.maxAcv >= 0.9 && item.maxAcv < 1.0;
            const resolvedStrategy = resolveStrategyInfo(item);
            const actionNeededText = getActionText(item, (v) => formatBankingNumber(v, unit, item.isPct));
            const chaseInfo = calculateDailyChaseInfo(item, effectiveWorkdays);
            const isMasterTargetEdited = item.originalTarget !== undefined && Math.abs(item.target - item.originalTarget) > 1e-6;
            const stratOpen = isStrategyVisible(item.row);
            const activeSubPanel = activeSubPanelByRow[item.row];
            const isEditingRow = editingRowId === item.row;

            return (
              <React.Fragment key={`mob-${item.row}`}>
                {/* LEVEL 1: CATEGORY HEADER (OPEN) */}
                {isNewCategorySection && (
                  <div
                    id={`cat-section-mob-${item.category}`}
                    onClick={() => toggleCategory(item.category)}
                    className={`px-3.5 py-2.5 font-extrabold flex items-center justify-between text-xs cursor-pointer select-none scroll-mt-4 ${getCatBanner(item.category)}`}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown className="w-4 h-4 text-slate-800 shrink-0" />
                      <span className="uppercase tracking-wide font-black">KATEGORI: {item.category}</span>
                      <InfoTooltip type="category" id={item.category} align="left" iconSize="w-3 h-3" />
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/80 text-slate-700">
                        {catMetricsCount} Metrik
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="font-mono font-black">
                        {catSum.actualScore?.toFixed(2).replace('.', ',')} / {catSum.maxScore}
                        {catSum.gapScore > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px]">
                            -{catSum.gapScore.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* LEVEL 2: SUB-GROUP HEADER */}
                {isNewSubGroupSection && (
                  <div
                    onClick={() => toggleSubGroup(item.category, item.metric)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/90 border-y border-slate-200/80 flex items-center justify-between text-xs cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-1.5 pl-2">
                      {isSGClosed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-[#003D79]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#003D79]" />
                      )}
                      <span className="font-black text-[#003D79] uppercase">{item.metric}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-[#003D79]">
                        {sgSummary.totalItems} Sub-Metrik
                      </span>
                      {isSGClosed && (
                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-200 text-slate-600">
                          Buka
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs font-bold text-slate-700">
                      {(sgSummary.totalBobot * 100).toFixed(0)}% • {sgSummary.totalScore.toFixed(2).replace('.', ',')} pt
                    </div>
                  </div>
                )}

                {/* LEVEL 3: METRIC CARD */}
                {!skipMetricCard && (
                  <div id={`metric-mob-${item.row}`} className={`p-3.5 space-y-2.5 ${!item.used ? 'bg-slate-50/60 opacity-75' : 'bg-white'} ${isSubGroupCat ? 'pl-5 border-l-3 border-[#003D79]/30' : ''}`}>
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
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="font-bold text-slate-900 text-xs leading-snug">
                              {item.subMetric && item.subMetric !== item.metric ? item.subMetric : (item.metric || item.name)}
                            </p>
                            <InfoTooltip type="metric" item={item} align="left" iconSize="w-3.5 h-3.5" />
                          </div>
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
                        {item.used && !isAchieved && item.target > 0 && (
                          <span className="text-[9px] text-rose-600 font-semibold leading-tight block mt-0.5">
                            {actionNeededText}
                          </span>
                        )}
                      </div>

                      <div className="border-x border-slate-200/80 px-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] text-slate-400 block">Target</span>
                          {isViewerSimMode && item.isTargetModified ? (
                            <span className="text-[8px] font-bold px-1 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              Sim
                            </span>
                          ) : isMasterTargetEdited ? (
                            <span className="text-[8px] font-bold px-1 rounded bg-blue-100 text-[#003D79] border border-blue-300">
                              Master
                            </span>
                          ) : null}
                        </div>
                        <span className="font-mono font-bold text-slate-900 block">
                          {item.target ? formatBankingNumber(item.target, unit, item.isPct) : '–'}
                        </span>
                        {item.target > 0 && effectiveWorkdays > 0 && !isAchieved && (
                          <span className="mt-1 inline-block px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-mono font-extrabold text-[9px]">
                            {item.isQuality ? 'Turun ' : 'Kejar +'}
                            {formatBankingNumber(chaseInfo.dailyChase, unit, item.isPct)}/HK
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Acv & Skor</span>
                        <span
                          className={`font-mono font-black ${isAchieved ? 'text-emerald-600' : isAlmost ? 'text-amber-600' : 'text-rose-600'
                            }`}
                        >
                          {(item.acv * 100).toFixed(0)}%
                        </span>
                        {item.used && (
                          <div className="font-mono text-[10px] text-slate-800 font-bold">
                            <div>{item.score.toFixed(2).replace('.', ',')}/{item.maxScore.toFixed(2).replace('.', ',')}</div>
                            {isViewerSimMode && item.isScoreChanged ? (
                              <span
                                className={`mt-0.5 inline-block text-[9px] font-black px-1.5 py-0.1 rounded ${item.scoreDelta > 0
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
                                  Potensi +{item.scoreGap.toFixed(2).replace('.', ',')} pt
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
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${activeSubPanel === 'timestand'
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
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${stratOpen
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
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${!item.used
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-white text-[#003D79] border-slate-300'
                            }`}
                        >
                          <Edit3 className="w-3 h-3 text-[#FFB81C]" />
                          <span>{!item.used ? 'Info (0%)' : (isViewerSimMode ? (isEditingRow ? 'Tutup Panel' : 'Simulasi Capaian') : (isEditingRow ? 'Tutup Panel' : 'Edit Target / Strategi'))}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleOpenFullEditor(e, item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${!item.used
                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : 'bg-amber-50 hover:bg-amber-100 text-[#00254D] border-amber-300'
                            }`}
                        >
                          <Edit3 className="w-3 h-3 text-[#FFB81C]" />
                          <span>{!item.used ? 'Info (0%)' : 'Simulasi Capaian'}</span>
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
                )}
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
                <span>Kategori</span>
              </th>

              <th scope="col" className="py-3 px-3 min-w-[205px]">
                <div className="flex items-center gap-1">
                  <span>Metrik & Sub-Metrik</span>
                  <InfoTooltip title="Metrik & Sub-Metrik Scorecard" description="Daftar 74 indikator capaian kinerja cabang Bank Mandiri, dikelompokkan ke dalam 7 kategori bisnis." align="left" iconSize="w-3 h-3" />
                </div>
              </th>

              <th scope="col" className="py-3 px-2.5 text-right w-18">
                <div className="flex items-center justify-end gap-1">
                  <span>Bobot</span>
                  <InfoTooltip type="term" term="Bobot" align="center" iconSize="w-3 h-3" />
                </div>
              </th>

              <th scope="col" className="py-3 px-3 text-right w-32">
                <div className="flex items-center justify-end gap-1">
                  <span>Realisasi & Selisih</span>
                  <InfoTooltip type="term" term="Realisasi" align="center" iconSize="w-3 h-3" />
                </div>
              </th>

              <th scope="col" className="py-3 px-3 text-right min-w-[180px] bg-blue-50/50">
                <div className="flex flex-col items-end">
                  <div className="flex items-center justify-end gap-1 text-[#003D79]">
                    <span>Target &amp; Kejaran</span>
                    <InfoTooltip type="term" term="HK" align="right" iconSize="w-3 h-3" />
                  </div>
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
                  <InfoTooltip type="term" term="Acv" align="center" iconSize="w-3 h-3" />
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
                  <InfoTooltip type="term" term="Potensi" align="right" iconSize="w-3 h-3" />
                  <ArrowUpDown className="w-3 h-3 text-[#FFB81C]" />
                </div>
              </th>

              <th scope="col" className="py-3 px-3 min-w-[215px]">
                <span>Strategi &amp; Aksi</span>
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
                const displayNumber = getStandardNumber(item.row, idx);
                const prevItem = idx > 0 ? filteredMetrics[idx - 1] : null;

                const isNewCategorySection = sortMode === 'excel' && (!prevItem || prevItem.category !== item.category);
                const isSubGroupCat = hasSubGroups(item.category);
                const isNewSubGroupSection =
                  sortMode === 'excel' &&
                  isSubGroupCat &&
                  (!prevItem || prevItem.category !== item.category || prevItem.metric !== item.metric);

                const subGroupKey = `${item.category}__${item.metric}`;
                const isCatClosed = isCategoryCollapsed(item.category);
                const isSGClosed = isSubGroupCollapsed(item.category, item.metric);

                const sgSummary = subGroupSummaries[subGroupKey] || {
                  totalItems: 0,
                  usedItems: 0,
                  totalBobot: 0,
                  totalScore: 0,
                  totalMaxScore: 0,
                  totalGap: 0,
                  achievedCount: 0,
                  hasBobot: false
                };

                const catSum = categorySummary?.[item.category] || {
                  category: item.category,
                  maxScore: CATEGORY_MULTIPLIERS[item.category] || 0,
                  actualScore: 0,
                  gapScore: 0
                };

                const catMetricsCount = categoryMetricsCount[item.category] || 0;

                // If Category is collapsed on desktop:
                if (sortMode === 'excel' && isCatClosed) {
                  if (isNewCategorySection) {
                    return (
                      <React.Fragment key={`cat-${item.category}`}>
                        <tr
                          id={`cat-section-${item.category}`}
                          onClick={() => toggleCategory(item.category)}
                          className={`border-y-2 border-slate-300 font-extrabold scroll-mt-6 cursor-pointer select-none hover:brightness-95 transition-all group ${getCatBanner(item.category)}`}
                          title={`Klik untuk membuka seluruh baris kategori ${item.category}`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center">
                              <span className="p-1 rounded-md bg-white/40 text-slate-900 shadow-2xs group-hover:bg-white/70">
                                <ChevronRight className="w-4 h-4 font-black" />
                              </span>
                            </div>
                          </td>
                          <td colSpan="2" className="py-2.5 px-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-black uppercase tracking-wide">
                                KATEGORI: {item.category}
                              </span>
                              <InfoTooltip type="category" id={item.category} align="left" iconSize="w-3.5 h-3.5" />
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-slate-700 border border-slate-200/80">
                                Nilai Max: {catSum.maxScore} Poin
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-white">
                                {catMetricsCount} Metrik
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                (Diminimize — Klik untuk Buka)
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono text-xs font-bold">
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
                            {catSum.actualScore?.toFixed(2).replace('.', ',')}{' '}
                            <span className="text-[11px] font-normal opacity-75">/ {catSum.maxScore}</span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] font-semibold">
                            <span className="font-bold underline decoration-slate-400 underline-offset-2">
                              ▶ Klik untuk Buka Kategori
                            </span>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  }
                  return null;
                }

                const skipMetricRow = sortMode === 'excel' && isSubGroupCat && isSGClosed;

                const info = getMetricKnowledge(item);
                const unit = info.unit || '';
                const isAchieved = item.maxAcv >= 1.0;
                const isAlmost = item.maxAcv >= 0.9 && item.maxAcv < 1.0;
                const stratOpen = isStrategyVisible(item.row);
                const activeSubPanel = activeSubPanelByRow[item.row];
                const isEditingRow = editingRowId === item.row;

                const resolvedStrategy = resolveStrategyInfo(item);
                const actionNeededText = getActionText(item, (v) => formatBankingNumber(v, unit, item.isPct));
                const chaseInfo = calculateDailyChaseInfo(item, effectiveWorkdays);
                const isMasterTargetEdited = item.originalTarget !== undefined && Math.abs(item.target - item.originalTarget) > 1e-6;

                return (
                  <React.Fragment key={item.row}>
                    {/* LEVEL 1: CATEGORY HEADER ROW (OPEN) */}
                    {isNewCategorySection && (
                      <tr
                        id={`cat-section-${item.category}`}
                        onClick={() => toggleCategory(item.category)}
                        className={`border-y-2 border-slate-300 font-extrabold scroll-mt-6 cursor-pointer select-none hover:brightness-95 transition-all group ${getCatBanner(item.category)}`}
                        title={`Klik untuk menutup / minimize kategori ${item.category}`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center">
                            <span className="p-1 rounded-md bg-white/40 text-slate-900 shadow-2xs group-hover:bg-white/70">
                              <ChevronDown className="w-4 h-4 font-black" />
                            </span>
                          </div>
                        </td>
                        <td colSpan="2" className="py-2.5 px-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-black uppercase tracking-wide">
                              KATEGORI: {item.category}
                            </span>
                            <InfoTooltip type="category" id={item.category} align="left" iconSize="w-3.5 h-3.5" />
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-slate-700 border border-slate-200/80">
                              Nilai Max: {catSum.maxScore} Poin
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-white">
                              {catMetricsCount} Metrik
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-xs font-bold">
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
                          {catSum.actualScore?.toFixed(2).replace('.', ',')}{' '}
                          <span className="text-[11px] font-normal opacity-75">/ {catSum.maxScore}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] font-semibold opacity-85">
                          <div className="flex items-center justify-between">
                            <span className="underline decoration-slate-400">▼ Minimize Kategori</span>
                            <span className="text-[10px] opacity-75">{catSum.actualScore?.toFixed(2).replace('.', ',')} / {catSum.maxScore} pt</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* LEVEL 2: SUB-GROUP HEADER ROW */}
                    {isNewSubGroupSection && (
                      <tr
                        id={`subgroup-section-${item.category}-${item.metric}`}
                        onClick={() => toggleSubGroup(item.category, item.metric)}
                        className="bg-slate-100/95 hover:bg-blue-50/80 transition-colors border-y border-slate-200/90 cursor-pointer select-none group"
                        title={isSGClosed ? `Klik untuk membuka ${sgSummary.totalItems} sub-metrik ${item.metric}` : `Klik untuk menutup / minimize sub-metrik ${item.metric}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center">
                            {isSGClosed ? (
                              <span className="p-0.5 rounded bg-white text-[#003D79] border border-slate-300 shadow-2xs group-hover:border-[#003D79]">
                                <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="p-0.5 rounded bg-[#003D79] text-white shadow-2xs">
                                <ChevronDown className="w-3.5 h-3.5 text-[#FFB81C]" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                            SUB-GROUP
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs sm:text-sm text-[#003D79] uppercase tracking-wide">
                              {item.metric}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#003D79] border border-blue-200/80">
                              {sgSummary.totalItems} Sub-Metrik
                            </span>
                            {!sgSummary.hasBobot && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                Bobot 0%
                              </span>
                            )}
                            {isSGClosed && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                                (Diminimize — Klik Buka)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-xs text-slate-700">
                          {(sgSummary.totalBobot * 100).toFixed(1).replace('.0', '')}%
                        </td>
                        <td className="py-2 px-3 text-right text-[11px] font-semibold text-slate-600">
                          {sgSummary.hasBobot ? (
                            <span className={sgSummary.achievedCount === sgSummary.usedItems ? 'text-emerald-700 font-bold' : 'text-slate-700 font-bold'}>
                              {sgSummary.achievedCount}/{sgSummary.usedItems} Capai Target
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">Hanya Monitoring</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-[11px] bg-blue-50/20">
                          {sgSummary.hasBobot && sgSummary.totalGap > 0 ? (
                            <span className="text-rose-700 font-bold">
                              {sgSummary.usedItems - sgSummary.achievedCount} Sub-Metrik Perlu Dikejar
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold">
                              {sgSummary.hasBobot ? '✓ Semua Target Tercapai' : '–'}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                            <span>{sgSummary.achievedCount}/{sgSummary.totalItems} Tercapai</span>
                            {sgSummary.hasBobot && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {sgSummary.usedItems > 0 ? `${((sgSummary.achievedCount / sgSummary.usedItems) * 100).toFixed(0)}%` : '0%'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono bg-amber-50/20">
                          {sgSummary.hasBobot ? (
                            <div>
                              <p className="font-bold text-xs text-slate-900">
                                {sgSummary.totalScore.toFixed(2).replace('.', ',')}{' '}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  / {sgSummary.totalMaxScore.toFixed(2).replace('.', ',')}
                                </span>
                              </p>
                              {sgSummary.totalGap > 0.0005 && (
                                <span className="text-[9px] font-bold text-[#996000] bg-[#FFB81C]/20 px-1 py-0.2 rounded inline-block mt-0.5">
                                  +{sgSummary.totalGap.toFixed(2).replace('.', ',')} pt
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-normal">–</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#003D79] group-hover:underline">
                              {isSGClosed ? `▶ Buka ${sgSummary.totalItems} Sub-Metrik` : '▼ Minimize Sub-Metrik'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {isSGClosed ? 'Tertutup' : 'Terbuka'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* LEVEL 3: METRIC ROW */}
                    {!skipMetricRow && (
                      <tr
                        id={`metric-row-${item.row}`}
                        className={`hover:bg-slate-50/90 transition-colors group ${isEditingRow || activeSubPanel ? 'bg-blue-50/30 border-l-4 border-l-[#003D79]' : ''
                          } ${!item.used ? 'bg-slate-50/40 text-slate-500' : item.scoreGap >= 1.0 ? 'bg-amber-50/15' : ''}`}
                      >
                        {/* 1. Sequential Number (No. 1 to 74) */}
                        <td className="py-3 px-3 text-center font-mono font-extrabold text-[#003D79] text-xs">
                          {displayNumber}
                        </td>

                        {/* 2. Category Badge */}
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] border inline-block ${getCatBadge(item.category)
                              }`}
                          >
                            {item.category}
                          </span>
                        </td>

                        {/* 3. Metrik & Sub-Metrik (Indented for Level 3) */}
                        <td className="py-3 px-3">
                          {isSubGroupCat ? (
                            <div className="min-w-0 pl-3 sm:pl-5 border-l-2 border-[#003D79]/25 ml-1">
                              <div className="flex items-center gap-1.5">
                                <p className={`font-bold leading-snug ${item.used ? 'text-slate-900' : 'text-slate-600'}`}>
                                  {item.subMetric || item.name}
                                </p>
                                {item.isQuality && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200">
                                    Kualitas (↓)
                                  </span>
                                )}
                                <InfoTooltip type="metric" item={item} align="left" iconSize="w-3.5 h-3.5" />
                              </div>

                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Sub-Metrik dari <strong className="text-slate-600 font-semibold">{item.metric}</strong> • Ref Row #{item.row}
                                {unit && <span> • Satuan: {unit}</span>}
                              </p>
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className={`font-bold leading-snug ${item.used ? 'text-slate-900' : 'text-slate-600'}`}>
                                  {item.metric || item.name}
                                </p>
                                {item.isQuality && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200">
                                    Kualitas (↓)
                                  </span>
                                )}
                                <InfoTooltip type="metric" item={item} align="left" iconSize="w-3.5 h-3.5" />
                              </div>

                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Nilai Max Kat: <strong>{CATEGORY_MULTIPLIERS[item.category]}</strong>
                                {unit && <span> • Satuan: {unit}</span>}
                              </p>
                            </div>
                          )}
                        </td>

                      {/* 4. Bobot */}
                      <td className="py-3 px-2.5 text-right font-mono">
                        <span className={`font-bold ${item.used ? 'text-slate-800' : 'text-slate-400'}`}>
                          {(item.bobot * 100).toFixed(1).replace('.0', '')}%
                        </span>
                        {!item.used && (
                          <span className="block text-[9px] text-amber-700 font-sans font-bold" title="Bobot 0%: hanya monitoring, tidak mempengaruhi total skor">
                            Info (tdk dihitung skor)
                          </span>
                        )}
                      </td>

                      {/* 5. Realisasi & Total Kekurangan ke Target */}
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.isRealModified && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-sans font-bold text-[9px]">
                              Sim
                            </span>
                          )}
                          <p className={`font-bold text-xs sm:text-sm ${item.used ? 'text-slate-900' : 'text-slate-500'}`}>
                            {formatBankingNumber(item.real, unit, item.isPct)}
                          </p>
                        </div>
                        {item.used && item.target > 0 && (
                          isAchieved ? (
                            <p className="text-[10px] text-emerald-700 font-sans font-bold mt-0.5">
                              ✓ Tercapai
                            </p>
                          ) : (
                            <p className="text-[10px] text-rose-600 font-sans font-bold mt-0.5">
                              {actionNeededText}
                            </p>
                          )
                        )}
                      </td>

                      {/* 6. Target + Kejaran Harian + Jadwal HK */}
                      <td className="py-3 px-3 text-right font-mono bg-blue-50/20">
                        <div className="space-y-1">
                          {/* Total Target Aktif */}
                          <div className="flex items-center justify-end gap-1.5">
                            {isViewerSimMode && item.isTargetModified ? (
                              <span
                                className="px-1.5 py-0.2 rounded font-sans font-bold text-[9px] border bg-amber-100 text-amber-900 border-amber-300"
                                title="Target Simulasi Viewer (Draft Lokal — Master tidak berubah)"
                              >
                                Sim
                              </span>
                            ) : isMasterTargetEdited ? (
                              <span
                                className="px-1.5 py-0.2 rounded font-sans font-bold text-[9px] border bg-blue-100 text-[#003D79] border-blue-300"
                                title="Target Master diubah dari Excel asli (lihat perbandingan di Panel Editor)"
                              >
                                Master
                              </span>
                            ) : null}
                            <span className={`font-extrabold text-xs sm:text-sm ${item.used ? 'text-slate-900' : 'text-slate-500'}`}>
                              {item.target ? formatBankingNumber(item.target, unit, item.isPct) : '–'}
                            </span>
                          </div>

                          {/* KEJARAN PER HARI S.D. TARGET (1 badge ringkas) */}
                          {item.target > 0 && effectiveWorkdays > 0 && (
                            <>
                              {!isAchieved ? (
                                <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-md px-2 py-0.5 text-[10px] font-sans font-extrabold text-rose-700">
                                  <Target className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>
                                    {item.isQuality ? 'Turunkan ' : 'Kejar +'}
                                    {formatBankingNumber(chaseInfo.dailyChase, unit, item.isPct)}/HK
                                  </span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5 text-[10px] font-sans font-bold text-emerald-700">
                                  <span>✓ Tercapai</span>
                                </div>
                              )}

                              {/* Button to open Per-Metric Timestand Daily Schedule directly under this metric! */}
                              <div className="pt-0.5 flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => toggleSubPanel(e, item.row, 'timestand')}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-bold border transition-colors cursor-pointer ${activeSubPanel === 'timestand'
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
                              className={`font-black font-mono ${!item.used
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
                              className={`h-full rounded-full transition-all duration-500 ${!item.used
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
                                  className={`inline-flex items-center gap-1 font-mono font-black text-[10px] px-1.5 py-0.2 rounded ${item.scoreDelta > 0
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                  title={`Skor Master: ${item.masterScore?.toFixed(2)} → Simulasi: ${item.score?.toFixed(2)} (${item.scoreDelta > 0 ? '+' : ''}${item.scoreDelta?.toFixed(2)} pt)`}
                                >
                                  <span>Δ {item.scoreDelta > 0 ? '+' : ''}{item.scoreDelta.toFixed(2).replace('.', ',')} pt</span>
                                </span>
                              </div>
                            ) : (
                              <div>
                                {item.scoreGap > 0.0005 ? (
                                  <span
                                    className="mt-1 inline-block font-bold text-[#996000] text-[10px] bg-[#FFB81C]/25 border border-[#FFB81C]/50 px-1.5 py-0.2 rounded"
                                    title="Potensi poin tambahan jika metrik ini mencapai target 100%"
                                  >
                                    Potensi +{item.scoreGap.toFixed(2).replace('.', ',')} pt
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
                          <span className="text-slate-400 text-[10px] font-sans font-semibold" title="Bobot 0%: tidak mempengaruhi total skor">
                            Tidak dihitung
                          </span>
                        )}
                      </td>

                      {/* 9. Strategi & Full-Width Editor Trigger */}
                      <td className="py-3 px-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => toggleStrategyRow(e, item.row)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${stratOpen
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
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${isEditingRow
                                  ? 'bg-[#FFB81C] text-[#00254D] border-[#FFB81C]'
                                  : !item.used
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                    : 'bg-white hover:bg-[#003D79] text-[#003D79] hover:text-white border-slate-300'
                                  }`}
                                title={!item.used ? 'Metrik ini berbobot 0% (hanya monitoring)' : 'Buka Panel Editor (Realisasi/Target, Rumus & Strategi)'}
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>
                                  {!item.used
                                    ? (isEditingRow ? 'Tutup Info' : 'Info (Bobot 0%)')
                                    : (isViewerSimMode ? (isEditingRow ? 'Tutup Panel' : 'Simulasi Capaian') : (isEditingRow ? 'Tutup Panel' : 'Edit Target / Strategi'))}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleOpenFullEditor(e, item)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${!item.used
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                  : 'bg-amber-50 hover:bg-amber-100 text-[#00254D] border border-[#FFB81C] shadow-2xs'
                                  }`}
                                title={!item.used ? 'Metrik ini berbobot 0% (tidak mempengaruhi skor)' : 'Klik untuk membuka panel Simulasi Realisasi'}
                              >
                                <Edit3 className="w-3 h-3 text-[#FFB81C]" />
                                <span>{!item.used ? 'Info (Bobot 0%)' : 'Simulasi Capaian'}</span>
                              </button>
                            )}
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
                    )}

                    {/* FULL-WIDTH EDITOR PANEL (Target, Formula Preview & Wide Strategy Textarea) */}
                    {!skipMetricRow && isEditingRow && (
                      <tr className="bg-blue-50/50 border-b-2 border-[#003D79]">
                        <td colSpan="9" className="p-4">
                          {renderFullWidthEditorPanel(item, displayNumber, unit, resolvedStrategy)}
                        </td>
                      </tr>
                    )}

                    {/* PER-METRIC TIMESTAND DAILY SCHEDULE ROW (Directly below this metric!) */}
                    {!skipMetricRow && activeSubPanel === 'timestand' && (
                      <tr className="bg-amber-50/30 border-b-2 border-[#003D79]">
                        <td colSpan="9" className="p-4">
                          {renderPerMetricTimestandSchedule(item, displayNumber, unit, chaseInfo)}
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
            Penomoran berurutan <strong>No. 1 s.d. {filteredMetrics.length}</strong>. Klik <strong>Jadwal {effectiveWorkdays} HK</strong> untuk rincian harian, atau <strong>Edit Target / Strategi</strong> / <strong>Simulasi Capaian</strong> untuk membuka panel editor lengkap.
          </span>
        </div>
        <div className="font-mono text-slate-600">
          Menampilkan {filteredMetrics.length} dari {metrics.length} metrik
        </div>
      </div>

    </div>
  );
}
