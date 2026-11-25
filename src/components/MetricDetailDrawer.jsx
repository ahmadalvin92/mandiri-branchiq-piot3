import React from 'react';
import { 
  X, 
  Lightbulb, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Calculator, 
  Sparkles, 
  Building2, 
  Sliders, 
  Briefcase,
  ChevronRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { formatBankingNumber, getMetricKnowledge } from '../utils/knowledgeBase';
import { CATEGORY_MULTIPLIERS } from '../utils/excelParser';

export function MetricDetailDrawer({
  metric,
  branchInfo = { code: '10125', name: 'Jakarta Pondok Indah Office 3', head: 'MICHAEL DANNIEL', grade: 'B.3' },
  onClose,
  onOpenSimulatorForMetric,
  masterStrategies = {},
  viewerSimStrategies = {},
  isViewerSimMode = false
}) {
  if (!metric) return null;

  const info = getMetricKnowledge(metric);
  const unit = info.unit || '';
  const isAchieved = metric.acv >= 1.0;
  const isUnder = metric.scoreGap > 0;
  const branchCode = String(branchInfo?.code || '10125');
  const branchName = branchInfo?.name || 'Jakarta Pondok Indah Office 3';

  // Resolve active strategy (Viewer Sim -> Master Branch -> Master Global -> Default Knowledge Base)
  const resolvedActions = (() => {
    if (isViewerSimMode && viewerSimStrategies[metric.row]) {
      return String(viewerSimStrategies[metric.row]).split('\n').filter(Boolean);
    }
    const bKey = `b${branchCode}~${metric.row}`;
    const gKey = `g~${metric.row}`;
    if (masterStrategies[bKey]?.text) {
      return String(masterStrategies[bKey].text).split('\n').filter(Boolean);
    }
    if (masterStrategies[gKey]?.text) {
      return String(masterStrategies[gKey].text).split('\n').filter(Boolean);
    }
    return info.tacticalAction || [
      'Lakukan pemetaan (mapping) terhadap 10 tenant terbesar di Pondok Indah Office Tower 3 untuk program cross-selling intensif.',
      'Adakan roadshow edukasi produk di lobby gedung pada jam makan siang dengan gimmick voucher merchant Pondok Indah Mall.',
      'Susun daily tracking bersama Kepala Unit (MICHAEL DANNIEL) pada morning briefing untuk memonitor pipeline harian.'
    ];
  })();

  // Formulate dynamic impact sentence
  let dynamicSentence = '';
  if (isAchieved) {
    dynamicSentence = `Target telah tercapai sempurna dengan pencapaian ${(metric.acv * 100).toFixed(0)}%! KC Jakarta Pondok Indah Office 3 telah mengamankan seluruh ${metric.score.toFixed(2).replace('.', ',')} poin dari bobot sub-metrik ini.`;
  } else if (metric.isQuality) {
    dynamicSentence = `Jika Cabang ${branchCode} berhasil menekan ${metric.name} dari posisi saat ini ${metric.real}% hingga di bawah target ${metric.target}%, skor cabang otomatis bertambah +${metric.scoreGap.toFixed(2).replace('.', ',')} poin menjadi ${metric.maxScore.toFixed(2).replace('.', ',')} poin penuh.`;
  } else {
    const diffAbs = Math.abs(metric.target - metric.real);
    const diffFormatted = formatBankingNumber(diffAbs, unit);
    const tgtFormatted = formatBankingNumber(metric.target, unit);
    dynamicSentence = `Jika Cabang ${branchCode} berhasil menambah +${diffFormatted} ${unit} pada ${metric.name} hingga mencapai target ${tgtFormatted} ${unit}, skor cabang otomatis naik +${metric.scoreGap.toFixed(2).replace('.', ',')} poin (menjadi ${metric.maxScore.toFixed(2).replace('.', ',')} poin maksimal).`;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      
      {/* Background dismiss */}
      <div className="fixed inset-0" onClick={onClose}></div>

      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden border border-slate-200 my-auto max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#00254D] via-[#003D79] to-[#004B94] text-white p-5 shrink-0 flex items-start justify-between border-b border-slate-700">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFB81C] text-[#00254D]">
                {metric.category}
              </span>
              <span className="text-xs text-slate-300">
                Bobot Sub-Metrik: <strong className="text-[#FFB81C]">{(metric.bobot * 100).toFixed(1)}%</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {metric.name}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {branchName} (Kode Cabang: {branchCode})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-slate-700 text-xs">
          
          {/* Quick Score Card */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#F4F7FA] border border-slate-200">
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Realisasi</p>
              <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                {formatBankingNumber(metric.real, unit)} {unit && <span className="text-[10px] text-slate-500 font-normal">{unit}</span>}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Target</p>
              <p className="text-base font-black text-slate-700 font-mono mt-0.5">
                {formatBankingNumber(metric.target, unit)} {unit && <span className="text-[10px] text-slate-500 font-normal">{unit}</span>}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Pencapaian (Acv)</p>
              <p className={`text-base font-black font-mono mt-0.5 ${
                isAchieved ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {(metric.acv * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Impact Statement Box (Requirement #2) */}
          <div className={`p-4 rounded-xl border ${
            isAchieved 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-start gap-3">
              <Sparkles className={`w-5 h-5 shrink-0 mt-0.5 ${
                isAchieved ? 'text-emerald-600' : 'text-[#FFB81C]'
              }`} />
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider mb-1">
                  Analisis Dampak Skor Otomatis
                </h4>
                <p className="text-xs leading-relaxed font-medium">
                  {dynamicSentence}
                </p>
                {metric.scoreGap > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] bg-white px-2.5 py-1 rounded-md border border-amber-300 text-amber-800 shadow-2xs">
                      Potensi Kenaikan: +{metric.scoreGap.toFixed(2).replace('.', ',')} poin
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenSimulatorForMetric(metric);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#003D79] text-white text-[11px] font-bold hover:bg-[#00254D] transition-colors cursor-pointer"
                    >
                      <Sliders className="w-3 h-3 text-[#FFB81C]" />
                      <span>Uji di Simulator</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 1. Definisi & Cara Hitung (Requirement #1) */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#003D79]">
              <Calculator className="w-4 h-4 text-[#003D79]" />
              <h3>Definisi & Rumus Perhitungan Excel</h3>
            </div>
            
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <p className="font-bold text-slate-800 text-xs">Apa maksud metrik ini?</p>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  {info.definition || `Metrik kinerja ${metric.name} pada kategori ${metric.category} untuk mengukur volume bisnis dan efektivitas perbankan cabang.`}
                </p>
              </div>

              {info.importance && (
                <div className="pt-2.5 border-t border-slate-200">
                  <p className="font-bold text-slate-800 text-xs">Signifikansi Perbankan:</p>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    {info.importance}
                  </p>
                </div>
              )}

              <div className="pt-2.5 border-t border-slate-200">
                <p className="font-bold text-slate-800 text-xs">Rumus Exact Excel:</p>
                <div className="mt-1.5 bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
                  <p><strong className="text-slate-900">Pencapaian (Acv):</strong> {metric.isQuality ? '1 - (Realisasi - Target) / Target' : 'Realisasi / Target'}</p>
                  <p><strong className="text-slate-900">Maksimum Acv:</strong> Math.min(100%, Acv)</p>
                  <p><strong className="text-slate-900">Skor Kinerja:</strong> Max Acv × Bobot ({(metric.bobot * 100).toFixed(1)}%) × Nilai Max ({CATEGORY_MULTIPLIERS[metric.category]} poin) = <strong className="text-[#003D79]">{metric.score.toFixed(2).replace('.', ',')} poin</strong></p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Action Plan Konkret untuk KC Pondok Indah Office 3 (Requirement #3) */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#003D79]">
              <Briefcase className="w-4 h-4 text-[#FFB81C]" />
              <h3>Action Plan Konkret — KC Jakarta Pondok Indah Office 3</h3>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/80 to-slate-50 border border-blue-200 space-y-3">
              <div className="flex items-center gap-2 text-[#003D79] font-bold text-xs pb-2 border-b border-blue-100">
                <Building2 className="w-4 h-4 text-[#003D79]" />
                <span>Karakteristik Wilayah: Pondok Indah Office Tower & PIM Complex</span>
              </div>

              <div className="space-y-2.5">
                {resolvedActions.map((action, aIdx) => (
                  <div key={aIdx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#003D79] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {aIdx + 1}
                    </span>
                    <p className="text-slate-700 leading-relaxed font-medium">
                      {action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>

          {metric.scoreGap > 0 && (
            <button
              onClick={() => {
                onClose();
                onOpenSimulatorForMetric(metric);
              }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#003D79] hover:bg-[#002D59] text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#FFB81C]" />
              <span>Simulasikan di What-If Simulator</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
