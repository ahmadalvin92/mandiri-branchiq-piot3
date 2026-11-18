import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sliders, 
  RotateCcw, 
  Sparkles, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  Target,
  Zap,
  Copy,
  Check,
  Percent
} from 'lucide-react';
import { formatBankingNumber, metricKnowledge } from '../utils/knowledgeBase';
import { CATEGORY_MULTIPLIERS, calcAcv, calcMetricScore, xround } from '../utils/excelParser';

const CAT_COLORS = {
  DPK: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: '#003D79' },
  Kredit: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: '#059669' },
  Livin: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-300', accent: '#D97706' },
  Kopra: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accent: '#4F46E5' },
  Acquiring: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', accent: '#9333EA' },
  GMM: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', accent: '#E11D48' },
  Ekosistem: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', accent: '#0D9488' }
};

const CATEGORY_ORDER = ['DPK', 'Kredit', 'Livin', 'Kopra', 'Acquiring', 'GMM', 'Ekosistem'];

function calcSimAcv(simReal, target, isQuality) {
  if (isQuality) {
    if (target === simReal) return 1.0;
    if (target === 0) return 0.0;
    return Math.max(0, Math.round((1 - (simReal - target) / target) * 100) / 100);
  } else {
    if (target === 0) return simReal === 0 ? 0.0 : 1.0;
    return Math.round((simReal / target) * 100) / 100;
  }
}

export function WhatIfSimulator({
  metrics = [],
  baselineTotalScore = 85.53,
  branchInfo,
  isOpen,
  onClose,
  onApplyToViewerSim
}) {
  // All weighted metrics grouped by category
  const weightedMetrics = useMemo(() => {
    return metrics.filter(m => m.bobot > 0);
  }, [metrics]);

  const categorizedMetrics = useMemo(() => {
    const groups = {};
    for (const m of weightedMetrics) {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    }
    return groups;
  }, [weightedMetrics]);

  // Simulation adjustments: { [rowId]: simulatedRealValue }
  const [adjustments, setAdjustments] = useState({});
  const [hasCelebrated90, setHasCelebrated90] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});
  const [copied, setCopied] = useState(false);

  // Initialize adjustments and expanded categories
  useEffect(() => {
    const initial = {};
    const expanded = {};
    weightedMetrics.forEach(m => {
      initial[m.row] = m.real;
    });
    // Expand categories that have score gaps
    CATEGORY_ORDER.forEach(cat => {
      const catMetrics = categorizedMetrics[cat] || [];
      const hasGap = catMetrics.some(m => m.scoreGap > 0);
      expanded[cat] = hasGap;
    });
    setAdjustments(initial);
    setExpandedCats(expanded);
    setHasCelebrated90(false);
  }, [weightedMetrics, categorizedMetrics]);

  // Calculate simulated scores for ALL metrics
  const simulationResult = useMemo(() => {
    let simulatedTotalScore = 0;
    const simulatedCategoryScores = {};
    const baselineCategoryScores = {};
    const simulatedMetricsList = [];

    weightedMetrics.forEach(m => {
      const simReal = adjustments[m.row] !== undefined ? adjustments[m.row] : m.real;
      const scoreObj = calcMetricScore(
        simReal,
        m.target,
        m.bobot,
        m.category,
        m.isQuality,
        m.rndAcv !== false,
        m.scored !== false
      );
      const simScore = scoreObj.score;
      const simAcv = scoreObj.acv;
      const simMaxAcv = scoreObj.maxAcv;

      simulatedTotalScore += simScore;
      if (!simulatedCategoryScores[m.category]) simulatedCategoryScores[m.category] = 0;
      simulatedCategoryScores[m.category] += simScore;

      if (!baselineCategoryScores[m.category]) baselineCategoryScores[m.category] = 0;
      baselineCategoryScores[m.category] += m.score;

      simulatedMetricsList.push({
        ...m,
        simReal,
        simAcv,
        simMaxAcv,
        simScore,
        scoreDelta: Number((simScore - m.score).toFixed(4))
      });
    });

    // Round category scores
    for (const cat of Object.keys(simulatedCategoryScores)) {
      simulatedCategoryScores[cat] = Number(simulatedCategoryScores[cat].toFixed(2));
      baselineCategoryScores[cat] = Number(baselineCategoryScores[cat].toFixed(2));
    }

    const finalTotal = Number(simulatedTotalScore.toFixed(2));
    const totalDelta = Number((finalTotal - baselineTotalScore).toFixed(2));

    return {
      finalTotal,
      totalDelta,
      simulatedCategoryScores,
      baselineCategoryScores,
      simulatedMetricsList
    };
  }, [weightedMetrics, adjustments, baselineTotalScore]);

  // Confetti trigger if score crosses 90
  useEffect(() => {
    if (simulationResult.finalTotal >= 90.0 && !hasCelebrated90) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#003D79', '#FFB81C', '#059669', '#38BDF8']
      });
      setHasCelebrated90(true);
    }
  }, [simulationResult.finalTotal, hasCelebrated90]);

  const handleSliderChange = useCallback((rowId, newVal) => {
    setAdjustments(prev => ({ ...prev, [rowId]: newVal }));
  }, []);

  const handleInputChange = useCallback((rowId, inputVal) => {
    const val = parseFloat(inputVal);
    if (!isNaN(val)) {
      setAdjustments(prev => ({ ...prev, [rowId]: val }));
    }
  }, []);

  const handleSetAllToTarget = () => {
    const newAdj = {};
    weightedMetrics.forEach(m => {
      if (m.isQuality) {
        // For quality metrics, target value is the goal (lower is better, so set to target)
        newAdj[m.row] = m.target;
      } else {
        newAdj[m.row] = m.target;
      }
    });
    setAdjustments(newAdj);
  };

  const handleSetRealistic = () => {
    const newAdj = {};
    weightedMetrics.forEach(m => {
      if (m.acv >= 1.0) {
        newAdj[m.row] = m.real; // Already achieved, keep
      } else if (m.isQuality) {
        // Quality: move 30% towards target (lower is better)
        const gap = m.real - m.target;
        newAdj[m.row] = Math.max(0, m.real - gap * 0.3);
      } else {
        // Normal: increase by 30% of gap
        const gap = m.target - m.real;
        newAdj[m.row] = m.real + gap * 0.3;
      }
    });
    setAdjustments(newAdj);
  };

  const handleReset = () => {
    const initial = {};
    weightedMetrics.forEach(m => { initial[m.row] = m.real; });
    setAdjustments(initial);
    setHasCelebrated90(false);
  };

  const toggleCategory = (cat) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const expandAll = () => {
    const all = {};
    CATEGORY_ORDER.forEach(c => { all[c] = true; });
    setExpandedCats(all);
  };

  const collapseAll = () => {
    const all = {};
    CATEGORY_ORDER.forEach(c => { all[c] = false; });
    setExpandedCats(all);
  };

  const handleCopySummary = () => {
    const lines = [`📊 Simulasi BranchIQ — ${branchInfo.name} (${branchInfo.code})`];
    lines.push(`Skor Aktual: ${baselineTotalScore.toFixed(2)} → Simulasi: ${simulationResult.finalTotal.toFixed(2)} (+${simulationResult.totalDelta.toFixed(2)} poin)`);
    lines.push('');
    CATEGORY_ORDER.forEach(cat => {
      const base = simulationResult.baselineCategoryScores[cat] || 0;
      const sim = simulationResult.simulatedCategoryScores[cat] || 0;
      const delta = Number((sim - base).toFixed(2));
      const maxS = CATEGORY_MULTIPLIERS[cat] || 0;
      if (delta !== 0) {
        lines.push(`  ${cat}: ${base}/${maxS} → ${sim}/${maxS} (${delta > 0 ? '+' : ''}${delta})`);
      } else {
        lines.push(`  ${cat}: ${base}/${maxS} (tidak berubah)`);
      }
    });

    // List changed metrics
    const changed = simulationResult.simulatedMetricsList.filter(m => Math.abs(m.scoreDelta) > 0.001);
    if (changed.length > 0) {
      lines.push('');
      lines.push('Metrik yang disimulasikan:');
      changed.forEach(m => {
        lines.push(`  • ${m.name}: ${m.score.toFixed(2)} → ${m.simScore.toFixed(2)} (+${m.scoreDelta.toFixed(2)})`);
      });
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5">
      
      {/* Modal Dialog */}
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-linear-to-r from-[#00254D] via-[#003D79] to-[#004B94] text-white p-4 sm:p-5 shrink-0 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB81C]/20 border border-[#FFB81C]/40 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5 text-[#FFB81C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFB81C] text-[#00254D]">
                  Full Simulator
                </span>
                <span className="text-xs text-white/70">What-If — Semua Sub-Metrik</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                Simulasi Kenaikan Skor — {branchInfo.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Score Comparison Banner */}
        <div className="bg-[#F8FAFC] border-b border-slate-200 px-4 sm:px-5 py-3 sm:py-4 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Baseline vs Simulated Score */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Skor Aktual</p>
                <p className="text-xl sm:text-2xl font-black text-slate-600 font-mono">
                  {baselineTotalScore.toFixed(2).replace('.', ',')}
                </p>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-400" />

              <div>
                <p className="text-[10px] font-bold text-[#003D79] uppercase tracking-wider">Skor Simulasi</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                    simulationResult.finalTotal >= 90.0 ? 'text-emerald-600' : 'text-[#003D79]'
                  }`}>
                    {simulationResult.finalTotal.toFixed(2).replace('.', ',')}
                  </span>
                  {simulationResult.totalDelta > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      +{simulationResult.totalDelta.toFixed(2).replace('.', ',')} poin
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {simulationResult.finalTotal >= 90.0 ? (
                <div className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-1.5 rounded-xl shadow-xs animate-bounce">
                  <Award className="w-4 h-4 text-[#FFB81C] fill-[#FFB81C]" />
                  <div className="text-left leading-tight">
                    <p className="text-[9px] uppercase font-bold text-emerald-100">Champion</p>
                    <p className="text-xs font-black">&gt; 90,00!</p>
                  </div>
                </div>
              ) : (
                <div className="text-right text-xs text-slate-500 hidden sm:block">
                  <p className="font-semibold">Target: <strong>&gt; 90,00</strong></p>
                  <p className="text-[11px] text-amber-600">Kurang {(90 - simulationResult.finalTotal).toFixed(2).replace('.', ',')} poin</p>
                </div>
              )}

              <button onClick={handleSetAllToTarget} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-colors cursor-pointer" title="Set semua metrik ke target 100%">
                <Target className="w-3 h-3" /> 100%
              </button>
              <button onClick={handleSetRealistic} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition-colors cursor-pointer" title="Naikkan realistis +30% dari gap">
                <Zap className="w-3 h-3" /> +30%
              </button>
              <button onClick={handleReset} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 text-[11px] font-bold transition-colors cursor-pointer" title="Reset ke nilai aktual">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          {/* Category Summary Bar */}
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {CATEGORY_ORDER.map(cat => {
              const base = simulationResult.baselineCategoryScores[cat] || 0;
              const sim = simulationResult.simulatedCategoryScores[cat] || 0;
              const maxS = CATEGORY_MULTIPLIERS[cat] || 0;
              const delta = Number((sim - base).toFixed(2));
              const colors = CAT_COLORS[cat] || {};
              return (
                <div key={cat} className={`text-center px-1.5 py-1.5 rounded-lg ${colors.bg} ${colors.border} border text-[10px]`}>
                  <p className={`font-black ${colors.text} text-[10px]`}>{cat}</p>
                  <p className="font-mono font-bold text-slate-800 text-xs">{sim.toFixed(1)}<span className="text-slate-400">/{maxS}</span></p>
                  {delta > 0 && <p className="text-emerald-600 font-bold">+{delta.toFixed(1)}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Expand/Collapse controls */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs bg-white">
          <p className="text-slate-500">
            Simulasikan <strong>{weightedMetrics.length}</strong> sub-metrik di bawah. Geser slider atau ketik nilai langsung.
          </p>
          <div className="flex items-center gap-2">
            <button onClick={expandAll} className="text-[11px] text-blue-600 hover:underline cursor-pointer font-semibold">Buka Semua</button>
            <span className="text-slate-300">|</span>
            <button onClick={collapseAll} className="text-[11px] text-blue-600 hover:underline cursor-pointer font-semibold">Tutup Semua</button>
          </div>
        </div>

        {/* Scrollable Simulator Body */}
        <div className="flex-1 overflow-y-auto">
          {CATEGORY_ORDER.map(cat => {
            const catMetrics = categorizedMetrics[cat];
            if (!catMetrics || catMetrics.length === 0) return null;

            const isExpanded = expandedCats[cat];
            const colors = CAT_COLORS[cat] || {};
            const maxS = CATEGORY_MULTIPLIERS[cat] || 0;
            const baseCatScore = simulationResult.baselineCategoryScores[cat] || 0;
            const simCatScore = simulationResult.simulatedCategoryScores[cat] || 0;
            const catDelta = Number((simCatScore - baseCatScore).toFixed(2));
            const underCount = catMetrics.filter(m => m.scoreGap > 0).length;

            return (
              <div key={cat} className="border-b border-slate-100">
                {/* Category Header — Click to expand/collapse */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className={`w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? colors.bg : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-black ${colors.bg} ${colors.text} ${colors.border} border`}>
                      {cat}
                    </span>
                    <div className="text-left">
                      <span className="text-sm font-bold text-slate-800">
                        {simCatScore.toFixed(2).replace('.', ',')} / {maxS}
                      </span>
                      {catDelta > 0 && (
                        <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          +{catDelta.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                    {underCount > 0 && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        {underCount} di bawah target
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{catMetrics.length} metrik</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* Category Metrics — Expanded */}
                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2.5">
                    {catMetrics.map((m) => {
                      const currentSimVal = adjustments[m.row] !== undefined ? adjustments[m.row] : m.real;
                      const info = metricKnowledge[m.metric] || metricKnowledge[m.name] || {};
                      const unit = info.unit || '';
                      
                      // Slider range
                      const sliderMax = m.isQuality 
                        ? Math.max(m.real * 2, m.target * 2, 0.1) 
                        : Math.max(m.target * 1.25, currentSimVal * 1.15, m.real * 1.5, 10);
                      const sliderMin = 0;
                      const step = sliderMax > 1000 ? 10 : sliderMax > 100 ? 1 : sliderMax > 1 ? 0.01 : 0.0001;

                      // Calculate individual simulated score
                      const itemScoreObj = calcMetricScore(
                        currentSimVal,
                        m.target,
                        m.bobot,
                        m.category,
                        m.isQuality,
                        m.rndAcv !== false,
                        m.scored !== false
                      );
                      const itemSimAcv = itemScoreObj.acv;
                      const itemSimMaxAcv = itemScoreObj.maxAcv;
                      const itemSimScore = itemScoreObj.score;
                      const itemDelta = Number((itemSimScore - m.score).toFixed(2));
                      const isChanged = Math.abs(currentSimVal - m.real) > 0.0001;
                      const isMaxed = itemSimMaxAcv >= 1.0;

                      return (
                        <div 
                          key={m.row}
                          className={`p-3 rounded-xl border transition-all ${
                            isChanged ? 'border-blue-300 bg-blue-50/30 shadow-xs' : 
                            isMaxed ? 'border-emerald-200 bg-emerald-50/20' : 
                            'border-slate-200 bg-white'
                          }`}
                        >
                          {/* Metric Info Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-slate-900 truncate">{m.name}</span>
                                <span className="text-[10px] text-slate-400">
                                  (Bobot {(m.bobot * 100).toFixed(1)}%)
                                </span>
                                {m.isQuality && (
                                  <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                                    ↓ Makin rendah makin bagus
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Aktual: <strong className="text-slate-700">{formatBankingNumber(m.real, unit, m.isPct)}</strong>
                                {' '}vs Target: <strong className="text-slate-700">{formatBankingNumber(m.target, unit, m.isPct)}</strong>
                                {unit && <span className="text-slate-400"> {unit}</span>}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Target Awal (Konseptor): <strong className="text-[#003D79] font-mono">{formatBankingNumber(m.konseptorTarget !== undefined ? m.konseptorTarget : (m.originalTarget !== undefined ? m.originalTarget : m.target), unit, m.isPct)}</strong>
                              </p>
                            </div>

                            {/* Score Impact */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <span className="text-xs font-mono font-bold text-slate-800">
                                  {itemSimScore.toFixed(2).replace('.', ',')} / {m.maxScore.toFixed(2).replace('.', ',')}
                                </span>
                                {itemDelta > 0 && (
                                  <p className="text-[10px] font-bold text-emerald-600">
                                    +{itemDelta.toFixed(2).replace('.', ',')} poin
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleSliderChange(m.row, m.target)}
                                className="px-2 py-1 text-[10px] font-bold text-[#003D79] bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                                title="Set langsung ke target"
                              >
                                <Target className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Slider + Input Row */}
                          <div className="flex items-center gap-2">
                            <input 
                              type="range"
                              min={sliderMin}
                              max={sliderMax}
                              step={step}
                              value={currentSimVal}
                              onChange={(e) => handleSliderChange(m.row, parseFloat(e.target.value))}
                              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#003D79]"
                              style={m.isQuality ? { direction: 'rtl' } : {}}
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={Number(currentSimVal.toFixed(4))}
                                onChange={(e) => handleInputChange(m.row, e.target.value)}
                                step={step}
                                className="w-20 sm:w-24 text-xs font-mono font-bold text-[#003D79] bg-blue-50/80 border border-blue-200 rounded-md px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-[#003D79]"
                              />
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                itemSimMaxAcv >= 1.0 ? 'text-emerald-700 bg-emerald-100' :
                                itemSimAcv >= 0.7 ? 'text-amber-700 bg-amber-100' :
                                'text-rose-700 bg-rose-100'
                              }`}>
                                {(itemSimAcv * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Copy Ringkasan'}</span>
            </button>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Simulasi tidak mengubah file asli.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {onApplyToViewerSim && (
              <button
                onClick={() => {
                  const changedOnly = {};
                  Object.entries(adjustments).forEach(([row, val]) => {
                    const m = weightedMetrics.find(x => String(x.row) === String(row));
                    if (m && Math.abs(val - m.real) > 1e-6) {
                      changedOnly[row] = val;
                    }
                  });
                  onApplyToViewerSim(changedOnly, simulationResult.finalTotal);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg bg-[#FFB81C] hover:bg-[#f3aa0d] text-[#00254D] text-xs font-extrabold transition-all shadow-xs cursor-pointer"
              >
                Simpan ke Mode Simulasi & Tabel
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-[#003D79] hover:bg-[#002D59] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Selesai & Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
