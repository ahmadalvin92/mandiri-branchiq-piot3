import React from 'react';
import { 
  Trophy, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  ArrowRight
} from 'lucide-react';

export function ExecutiveSummary({
  totalScore,
  categorySummary,
  underTargetCount,
  totalMetricsCount,
  rankingInfo,
  onShowUnderTargetOnly,
  isUnderTargetOnly,
  onOpenComparison,
  isViewerSimMode = false,
  masterTotalScore = null
}) {
  const categoriesList = Object.values(categorySummary || {});
  const isSimulated = isViewerSimMode || (masterTotalScore !== null && Math.abs(totalScore - masterTotalScore) > 0.005);
  const scoreDelta = masterTotalScore !== null ? Number((totalScore - masterTotalScore).toFixed(2)) : 0;
  
  const strongestCategory = [...categoriesList]
    .filter(c => c.actualScore > 0)
    .sort((a, b) => b.achievementPct - a.achievementPct || b.actualScore - a.actualScore)[0] || {
      category: 'GMM Referral',
      actualScore: 5.0,
      maxScore: 5.0,
      achievementPct: 100
    };

  const biggestGapCategory = [...categoriesList]
    .sort((a, b) => b.gapScore - a.gapScore)[0] || {
      category: 'Livin',
      actualScore: 11.07,
      maxScore: 15.0,
      gapScore: 3.93
    };

  const totalRank = rankingInfo?.totalRank || 43;
  const totalBranches = rankingInfo?.totalBranches || 164;
  const areaRank = rankingInfo?.areaRank;
  const totalInArea = rankingInfo?.totalInArea;
  const gradeRank = rankingInfo?.gradeRank;
  const totalInGrade = rankingInfo?.totalInGrade;
  const percentile = Math.round(((totalBranches - totalRank + 1) / totalBranches) * 100);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      
      {/* 1. Total Skor BranchIQ with Radial Gauge & Regional Rank */}
      <div className={`rounded-xl border p-3 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group ${
        isSimulated
          ? 'bg-linear-to-br from-amber-50/90 via-white to-blue-50/40 border-[#FFB81C] ring-2 ring-[#FFB81C]/30'
          : 'bg-white border-slate-200/90'
      }`}>
        <div className="absolute top-0 right-0 w-20 sm:w-28 h-20 sm:h-28 bg-[#FFB81C]/10 rounded-bl-full pointer-events-none"></div>
        
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFB81C] shrink-0" />
              <span className="truncate">{isSimulated ? 'Total Skor Simulasi' : 'Total Skor'}</span>
              {isSimulated && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#FFB81C] text-[#00254D] font-black text-[9px] uppercase tracking-normal">
                  Simulasi
                </span>
              )}
            </div>
            <div className="mt-1.5 sm:mt-2.5 flex items-baseline gap-1">
              <span className="text-2xl sm:text-4xl font-extrabold text-[#003D79] tracking-tight">
                {totalScore.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-[11px] sm:text-sm font-semibold text-slate-400">/100</span>
              {isSimulated && scoreDelta !== 0 && (
                <span className={`ml-1 text-[11px] sm:text-xs font-black font-mono px-1.5 py-0.5 rounded ${
                  scoreDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>
            {isSimulated && masterTotalScore !== null && (
              <div className="mt-1 text-[10px] text-slate-500 font-sans">
                Awal Konseptor: <strong className="font-mono text-slate-800">{masterTotalScore.toFixed(2).replace('.', ',')} pt</strong>
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <button
                onClick={onOpenComparison}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black px-1.5 sm:px-2 py-0.5 rounded-md bg-[#FFB81C] text-[#00254D] hover:bg-[#ffc547] transition-colors cursor-pointer"
                title="Buka Leaderboard 164 Cabang"
              >
                <span>Rank #{totalRank}</span>
                <span className="font-normal text-[#00254D]/80">/{totalBranches}</span>
              </button>
              <span className="hidden sm:inline text-[10px] text-slate-500 font-semibold">
                (Top {100 - percentile + 1}%)
              </span>
            </div>
          </div>

          {/* Radial SVG Gauge (Hidden on tiny screens to save space, shown on sm+) */}
          <div className="hidden sm:flex relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="#E2E8F0"
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="url(#totalScoreGrad)"
                strokeWidth="5"
                strokeDasharray={2 * Math.PI * 26}
                strokeDashoffset={2 * Math.PI * 26 - (totalScore / 100) * (2 * Math.PI * 26)}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="totalScoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#003D79" />
                  <stop offset="60%" stopColor="#004B94" />
                  <stop offset="100%" stopColor="#FFB81C" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-[#003D79]">
              {Math.round(totalScore)}%
            </div>
          </div>
        </div>

        {/* Bottom Tag & Position link */}
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 truncate">
            {areaRank && (
              <span>Area <strong className="text-slate-800 font-bold">#{areaRank}</strong>/{totalInArea}</span>
            )}
            {gradeRank && (
              <>
                <span>•</span>
                <span>Kls <strong className="text-slate-800 font-bold">#{gradeRank}</strong>/{totalInGrade}</span>
              </>
            )}
          </div>
          <button
            onClick={onOpenComparison}
            className="hidden sm:inline-flex items-center gap-0.5 font-bold text-[#003D79] hover:text-[#FFB81C] transition-colors cursor-pointer text-xs shrink-0"
          >
            <span>Bandingkan</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. Kategori Terkuat */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-20 sm:w-24 h-20 sm:h-24 bg-emerald-500/10 rounded-bl-full pointer-events-none"></div>
        
        <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
          <span className="truncate">Kategori Terkuat</span>
        </div>

        <div className="mt-1.5 sm:mt-2.5">
          <div className="flex items-center justify-between gap-1">
            <h3 className="text-sm sm:text-xl font-black text-slate-900 tracking-tight truncate">
              {strongestCategory.category}
            </h3>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-black shrink-0">
              {strongestCategory.achievementPct}%
            </span>
          </div>

          <div className="mt-1 sm:mt-2 flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-extrabold text-emerald-600">
              {strongestCategory.actualScore.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400">
              / {strongestCategory.maxScore} pt
            </span>
          </div>
        </div>

        <div className="mt-2 sm:mt-3.5 pt-2 sm:pt-3 border-t border-slate-100">
          <div className="w-full bg-slate-100 h-1.5 sm:h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, strongestCategory.achievementPct)}%` }}
            ></div>
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500 flex items-center justify-between">
            <span className="truncate">Pencapaian</span>
            <span className="font-semibold text-emerald-700 shrink-0">Penuh ✓</span>
          </p>
        </div>
      </div>

      {/* 3. Kategori Butuh Perhatian (Biggest Score Gap) */}
      <div className="bg-white rounded-xl border border-amber-200/90 p-3 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group bg-linear-to-br from-white to-amber-50/40">
        <div className="absolute top-0 right-0 w-20 sm:w-24 h-20 sm:h-24 bg-amber-500/10 rounded-bl-full pointer-events-none"></div>

        <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider">
          <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
          <span className="truncate">Gap Terbesar</span>
        </div>

        <div className="mt-1.5 sm:mt-2.5">
          <div className="flex items-center justify-between gap-1">
            <h3 className="text-sm sm:text-xl font-black text-[#003D79] tracking-tight truncate">
              {biggestGapCategory.category}
            </h3>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] sm:text-xs font-black shrink-0">
              -{biggestGapCategory.gapScore.toFixed(2).replace('.', ',')}
            </span>
          </div>

          <div className="mt-1 sm:mt-2 flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-extrabold text-slate-800">
              {biggestGapCategory.actualScore.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400">
              / {biggestGapCategory.maxScore} pt ({biggestGapCategory.achievementPct}%)
            </span>
          </div>
        </div>

        <div className="mt-2 sm:mt-3.5 pt-2 sm:pt-3 border-t border-amber-100">
          <div className="w-full bg-slate-200 h-1.5 sm:h-2 rounded-full overflow-hidden flex">
            <div 
              className="bg-[#003D79] h-full transition-all duration-700"
              style={{ width: `${biggestGapCategory.achievementPct}%` }}
            ></div>
            <div 
              className="bg-amber-500 h-full transition-all duration-700"
              style={{ width: `${100 - biggestGapCategory.achievementPct}%` }}
            ></div>
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-amber-800 font-medium truncate">
            Potensi naik terbesar
          </p>
        </div>
      </div>

      {/* 4. Jumlah Metrik Under-Target */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-20 sm:w-24 h-20 sm:h-24 bg-rose-500/10 rounded-bl-full pointer-events-none"></div>

        <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0" />
          <span className="truncate">Metrik &lt; 100%</span>
        </div>

        <div className="mt-1.5 sm:mt-2.5 flex items-baseline justify-between gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-4xl font-extrabold text-rose-600 tracking-tight">
              {underTargetCount}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400">
              / {totalMetricsCount} metrik
            </span>
          </div>
          <span className="hidden sm:inline text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
            Acv &lt; 100%
          </span>
        </div>

        <div className="mt-2 sm:mt-3.5 pt-2 sm:pt-3 border-t border-slate-100">
          <button
            onClick={onShowUnderTargetOnly}
            className={`w-full py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              isUnderTargetOnly
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span className="truncate">{isUnderTargetOnly ? '✓ Filter: Kurang' : 'Filter yang Kurang'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
