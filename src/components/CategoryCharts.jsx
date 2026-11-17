import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  LabelList
} from 'recharts';
import {
  BarChart3,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

import { CAT_ORDER } from '../utils/excelParser';

export function CategoryCharts({
  categorySummary,
  metrics = [],
  totalScore = 85.53,
  selectedCategory,
  onSelectCategory,
  filterUnderTarget,
  onToggleFilterUnderTarget,
  searchQuery,
  onSearchChange,
  totalGap,
  rankingInfo
}) {
  const categories = CAT_ORDER.map(catName => categorySummary?.[catName]).filter(Boolean);

  // Compute summary metrics
  const usedMetrics = metrics.filter(m => m.used);
  const achievedMetricsCount = usedMetrics.filter(m => m.maxAcv >= 1).length;
  const underTargetMetricsCount = usedMetrics.filter(m => m.maxAcv < 1).length;
  const chasableGainTotal = usedMetrics.reduce((s, m) => s + (m.scoreGap || 0), 0);
  const unreachableGap = Math.max(0, 100 - totalScore - chasableGainTotal);

  // Sorted by lost points descending for "Poin hilang per kategori"
  const sortedByLost = [...categories].sort((a, b) => (b.gapScore || 0) - (a.gapScore || 0));
  const maxLost = Math.max(...categories.map(c => c.gapScore || 0), 0.01);

  // Chart data formatted for horizontal bar chart with direct visible label text
  // Ensure gapScore has a tiny epsilon (0.0001) for full categories so Recharts renders the right-side LabelList cleanly!
  const chartData = categories.map(c => ({
    name: c.category,
    actualScore: c.actualScore,
    gapScore: c.gapScore > 0.005 ? c.gapScore : 0.0001,
    rawGapScore: c.gapScore,
    maxScore: c.maxScore,
    achievementPct: c.achievementPct,
    rank: rankingInfo?.categoryScores?.[c.category]?.rank,
    directLabel:
      c.gapScore > 0.005
        ? `${c.actualScore.toFixed(2).replace('.', ',')}/${c.maxScore} (-${c.gapScore.toFixed(2).replace('.', ',')})`
        : `${c.actualScore.toFixed(2).replace('.', ',')}/${c.maxScore} (Penuh)`
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#00254D] text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs">
          <div className="flex items-center justify-between gap-4 mb-1">
            <p className="font-bold text-sm text-[#FFB81C]">{data.name}</p>
            {data.rank && (
              <span className="px-1.5 py-0.2 bg-[#FFB81C]/20 text-[#FFE5A3] rounded text-[10px] font-bold border border-[#FFB81C]/30">
                Rank #{data.rank} / 164
              </span>
            )}
          </div>
          <div className="space-y-1">
            <p className="flex justify-between gap-4">
              <span className="text-slate-300">Skor Aktual:</span>
              <strong className="text-white font-mono">{data.actualScore.toFixed(2).replace('.', ',')} poin</strong>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-slate-300">Bobot Maksimal:</span>
              <strong className="text-slate-200 font-mono">{data.maxScore.toFixed(2).replace('.', ',')} poin</strong>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-slate-300">Pencapaian:</span>
              <strong className={`${data.achievementPct >= 95 ? 'text-emerald-400' : 'text-amber-400'} font-mono`}>
                {data.achievementPct}%
              </strong>
            </p>
            {data.rawGapScore > 0.005 ? (
              <p className="flex justify-between gap-4 pt-1 border-t border-slate-600 text-amber-300 font-semibold">
                <span>Poin Bocor (Gap):</span>
                <span className="font-mono">-{data.rawGapScore.toFixed(2).replace('.', ',')} poin</span>
              </p>
            ) : (
              <p className="pt-1 border-t border-slate-600 text-emerald-400 font-semibold">
                ✓ Maksimal (0 Poin Bocor)
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Accurate direct scroll to the category section in MetricsTable after React state update
  const scrollToCategoryInTable = (catName) => {
    setTimeout(() => {
      const desktopTarget = document.getElementById(`cat-section-${catName}`);
      const mobileTarget = document.getElementById(`cat-section-mob-${catName}`);
      const fallbackTable = document.getElementById('scorecard-table-section');

      const targetEl =
        (desktopTarget && desktopTarget.offsetParent !== null ? desktopTarget : null) ||
        (mobileTarget && mobileTarget.offsetParent !== null ? mobileTarget : null) ||
        desktopTarget ||
        mobileTarget ||
        fallbackTable;

      if (targetEl) {
        const y = targetEl.getBoundingClientRect().top + window.scrollY - 24;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }, 90);
  };

  const handleCategoryCardClick = (catName) => {
    onSelectCategory(catName);
    scrollToCategoryInTable(catName);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs space-y-4 sm:space-y-5">
      
      {/* Top Header of Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[#003D79] shrink-0" />
            <h2 className="text-sm sm:text-lg font-black text-[#003D79] tracking-tight">
              Skor per Kategori & Rincian Poin Hilang
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Semua angka skor aktual & poin hilang langsung terlihat (Total potensi bocor: <strong className="text-rose-600">-{totalGap.toFixed(2).replace('.', ',')} poin</strong>)
          </p>
        </div>

        {/* Quick Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari sub-metrik..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full sm:w-44 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79]"
            />
          </div>

          <button
            type="button"
            onClick={onToggleFilterUnderTarget}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all border cursor-pointer shrink-0 ${
              filterUnderTarget
                ? 'bg-[#003D79] text-white border-[#003D79] shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Filter className={`w-3.5 h-3.5 ${filterUnderTarget ? 'text-[#FFB81C]' : 'text-slate-500'}`} />
            <span>{filterUnderTarget ? 'Hanya yang Kurang (<100%)' : 'Semua Sub-Metrik'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout: On mobile, Skor per Kategori comes FIRST (order-1 lg:order-2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        
        {/* RIGHT COLUMN on Desktop / FIRST on Mobile (7 cols): "Skor per kategori" 7 Cards + 3 Summary Boxes */}
        <div className="lg:col-span-7 order-1 lg:order-2 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#003D79] flex items-center gap-2">
              <span>Skor per Kategori</span>
              <span className="text-[11px] font-normal text-slate-500">
                (klik kartu untuk langsung menuju kategori di tabel)
              </span>
            </h3>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#003D79] border border-blue-200 text-xs font-extrabold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Tampilkan Semua Kategori</span>
              </button>
            )}
          </div>

          {/* 7 Category Score Cards Grid (2 columns on mobile & desktop!) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {categories.map((c) => {
              const isFull = (c.gapScore || 0) < 0.005;
              const pct = c.maxScore ? Math.min(100, (c.actualScore / c.maxScore) * 100) : 0;
              const rank = rankingInfo?.categoryScores?.[c.category]?.rank;
              const isSelected = selectedCategory === c.category;

              return (
                <div
                  key={c.category}
                  onClick={() => handleCategoryCardClick(c.category)}
                  className={`rounded-xl border p-2.5 sm:p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 border-[#003D79] ring-2 ring-[#003D79]/20 shadow-xs'
                      : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-[#003D79]/50 shadow-2xs'
                  }`}
                >
                  {/* Top Row: Category Name + Rank Badge on Left, Actual / Max Score on Right */}
                  <div className="flex items-baseline justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                        {c.category}
                      </span>
                      {rank && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.1 rounded bg-slate-100 text-[#003D79] border border-slate-200 shrink-0">
                          #{rank}
                        </span>
                      )}
                    </div>
                    <div className="font-mono font-black text-xs sm:text-base text-slate-900 shrink-0">
                      {c.actualScore.toFixed(2).replace('.', ',')}{' '}
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-400">
                        / {c.maxScore}
                      </span>
                    </div>
                  </div>

                  {/* Progress Track */}
                  <div className="h-2 sm:h-2.5 bg-slate-200/80 rounded-full overflow-hidden my-1.5 sm:my-2.5 flex">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isFull ? 'bg-emerald-600' : 'bg-[#1F4E79]'
                      }`}
                      style={{ width: `${pct.toFixed(1)}%` }}
                    />
                    {!isFull && (
                      <div
                        className="h-full bg-amber-400/80"
                        style={{ width: `${Math.max(0, 100 - pct).toFixed(1)}%` }}
                      />
                    )}
                  </div>

                  {/* Bottom Row: Lost Points + Achievement % */}
                  <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs">
                    {isFull ? (
                      <span className="font-bold text-emerald-700 inline-flex items-center gap-0.5 truncate">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Penuh</span>
                      </span>
                    ) : (
                      <span className="font-bold text-rose-700 inline-flex items-center gap-0.5 truncate">
                        <AlertCircle className="w-3 h-3 text-rose-600 shrink-0 hidden sm:inline" />
                        <span>Hilang {c.gapScore.toFixed(2).replace('.', ',')} poin</span>
                      </span>
                    )}

                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 font-mono shrink-0">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3 Summary Stat Boxes Below Category Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
            <div
              onClick={() => {
                if (!filterUnderTarget) onToggleFilterUnderTarget();
                scrollToCategoryInTable(selectedCategory === 'all' ? 'DPK' : selectedCategory);
              }}
              className="bg-[#F8FAFC] hover:bg-rose-50/50 border border-slate-200 hover:border-rose-300 rounded-xl p-2.5 sm:p-3.5 cursor-pointer transition-colors"
            >
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 leading-tight">
                Poin hilang (bisa dikejar) ↓
              </p>
              <p className="text-lg sm:text-2xl font-black text-rose-700 font-mono mt-1">
                {chasableGainTotal.toFixed(2).replace('.', ',')}
              </p>
              <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5">
                {unreachableGap > 0.005
                  ? `+ ${unreachableGap.toFixed(2).replace('.', ',')} poin tidak bisa dikejar (total bobot < 100%)`
                  : 'Seluruh poin hilang dapat dikejar'}
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 sm:p-3.5">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 leading-tight">
                Metrik sudah 100%
              </p>
              <p className="text-lg sm:text-2xl font-black text-emerald-700 font-mono mt-1">
                {achievedMetricsCount} / {usedMetrics.length}
              </p>
              <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5">
                Sub-metrik telah capai target
              </p>
            </div>

            <div
              onClick={() => {
                onToggleFilterUnderTarget();
                scrollToCategoryInTable(selectedCategory === 'all' ? 'DPK' : selectedCategory);
              }}
              className="bg-[#F8FAFC] hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-xl p-2.5 sm:p-3.5 cursor-pointer transition-colors"
            >
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 leading-tight">
                Belum capai target
              </p>
              <p className="text-lg sm:text-2xl font-black text-[#003D79] font-mono mt-1">
                {underTargetMetricsCount}
              </p>
              <p className="hidden sm:block text-[11px] text-[#003D79] font-semibold mt-0.5">
                {filterUnderTarget ? '✓ Sedang difilter' : 'Klik untuk fokus'}
              </p>
            </div>
          </div>

        </div>

        {/* LEFT COLUMN on Desktop / SECOND on Mobile (5 cols): Poin Hilang per Kategori + Labeled Bar Chart */}
        <div className="lg:col-span-5 order-2 lg:order-1 space-y-3 sm:space-y-4">
          
          {/* Card 1: Poin Hilang per Kategori */}
          <div className="bg-[#F8FAFC] rounded-xl border border-slate-200/90 p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs sm:text-sm font-extrabold text-[#003D79] uppercase tracking-wider">
                Poin Hilang per Kategori
              </h3>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
                Klik untuk lompat ke tabel
              </span>
            </div>

            <div className="space-y-2">
              {sortedByLost.map((c) => {
                const isFull = (c.gapScore || 0) < 0.005;
                const barWidthPct = isFull ? 0 : Math.min(100, ((c.gapScore || 0) / maxLost) * 100);
                const isSelected = selectedCategory === c.category;

                return (
                  <div
                    key={c.category}
                    onClick={() => handleCategoryCardClick(c.category)}
                    className={`grid grid-cols-12 items-center gap-2 py-1 px-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-100/80 ring-1 ring-[#003D79]' : 'hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="col-span-3 font-bold text-xs text-slate-800 truncate">
                      {c.category}
                    </div>
                    <div className="col-span-6">
                      <div className="h-2.5 bg-slate-200/90 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFull ? 'bg-emerald-500' : 'bg-rose-600'
                          }`}
                          style={{ width: `${barWidthPct.toFixed(1)}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-3 text-right font-mono text-xs font-extrabold">
                      {isFull ? (
                        <span className="text-emerald-700">Penuh</span>
                      ) : (
                        <span className="text-rose-700">
                          −{c.gapScore.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Horizontal Bar Chart with Direct Text Labels (Full Height so all 7 categories fit cleanly) */}
          <div className="bg-[#F8FAFC] rounded-xl border border-slate-200/90 p-3.5">
            <p className="text-xs font-extrabold text-[#003D79] mb-1 px-1">
              Grafik Skor Aktual vs Poin Bocor
            </p>
            <div className="h-68 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 6, right: 112, left: 4, bottom: 8 }}
                  barGap={2}
                >
                  <XAxis
                    type="number"
                    domain={[0, 32]}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#00254D', fontWeight: 700 }}
                    width={68}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="left"
                    wrapperStyle={{ paddingBottom: '8px', fontSize: '10px' }}
                    formatter={(value) => (
                      <span className="font-semibold text-slate-700">
                        {value === 'actualScore' ? 'Skor Aktual' : 'Poin Bocor (Gap)'}
                      </span>
                    )}
                  />
                  <Bar
                    dataKey="actualScore"
                    name="actualScore"
                    stackId="score"
                    fill="#003D79"
                    radius={[0, 0, 0, 0]}
                    barSize={16}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.achievementPct >= 100 ? '#059669' : '#003D79'}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="gapScore"
                    name="gapScore"
                    stackId="score"
                    fill="#FFB81C"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                    opacity={0.9}
                  >
                    <LabelList
                      dataKey="directLabel"
                      position="right"
                      style={{ fontSize: '10px', fontWeight: 800, fill: '#0F172A', fontFamily: 'monospace' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

      {/* Category Pills Navigation / Filter */}
      <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[11px] font-semibold text-slate-400 mr-1 shrink-0">Filter:</span>
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-[#003D79] text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          Semua (7)
        </button>

        {categories.map((c) => {
          const isSelected = selectedCategory === c.category;
          const isFull = c.gapScore === 0;
          const rank = rankingInfo?.categoryScores?.[c.category]?.rank;

          return (
            <button
              type="button"
              key={c.category}
              onClick={() => handleCategoryCardClick(c.category)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-[#003D79] text-white border-[#003D79] shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <span>{c.category}</span>
              <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-[#FFE5A3]' : 'text-slate-600'}`}>
                {c.actualScore.toFixed(2).replace('.', ',')}/{c.maxScore}
              </span>
              {rank && (
                <span className={`hidden sm:inline text-[10px] font-bold px-1 py-0.1 rounded ${
                  isSelected ? 'bg-white/20 text-[#FFE5A3]' : 'bg-slate-100 text-[#003D79]'
                }`}>
                  #{rank}
                </span>
              )}
              <span className={`text-[10px] font-mono px-1.5 py-0.1 rounded-full ${
                isSelected
                  ? 'bg-white/20 text-white'
                  : isFull 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-rose-100 text-rose-800 font-bold'
              }`}>
                {isFull ? '✓' : `-${c.gapScore.toFixed(2).replace('.', ',')}`}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
