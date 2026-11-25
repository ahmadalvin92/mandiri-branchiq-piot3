import React from 'react';
import { MandiriOfficialLogo, PondokIndahEmblem } from './BrandingLogos';
import { formatBankingNumber, metricKnowledge } from '../utils/knowledgeBase';

export function PrintReport({
  branchInfo,
  realizationDate,
  totalScore,
  totalGap,
  categorySummary,
  metrics = [],
  rankingInfo,
  masterStrategies = {}
}) {
  const categories = Object.values(categorySummary || {});
  const branchCode = String(branchInfo?.code || '10125');
  
  // Top under target metrics needing attention for morning briefing
  const topGaps = metrics
    .filter(m => m.bobot > 0 && m.scoreGap > 0)
    .sort((a, b) => b.scoreGap - a.scoreGap)
    .slice(0, 8);

  const totalRank = rankingInfo?.totalRank || 51;
  const totalBranches = rankingInfo?.totalBranches || 164;

  return (
    <div className="hidden print:block p-8 bg-white text-slate-900 text-xs font-sans">
      
      {/* Official Kop Surat Bank Mandiri */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-[#003D79]">
        <div className="flex items-center gap-4">
          <MandiriOfficialLogo className="h-10 w-auto" />
          <div className="border-l-2 border-slate-300 pl-4">
            <h2 className="text-base font-black text-[#003D79] tracking-tight">
              PT BANK MANDIRI (PERSERO) TBK.
            </h2>
            <p className="text-xs font-bold text-slate-700">
              {branchInfo.name} (Kode Cabang: {branchInfo.code})
            </p>
            <p className="text-[10px] text-slate-500">
              {branchInfo.areaName || 'Region V / Jakarta 3'} • Peringkat #{totalRank} dari {totalBranches} Cabang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-right">
          <div className="text-right">
            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold border border-slate-200">
              LEMBAR BRIEFING HARIAN
            </span>
            <p className="text-[11px] font-bold text-slate-800 mt-1">
              Posisi Data: {realizationDate}
            </p>
            <p className="text-[10px] text-slate-500">
              Kepala Unit: <strong>{branchInfo.head}</strong> | Kelas: <strong>{branchInfo.grade}</strong>
            </p>
          </div>
          <PondokIndahEmblem className="h-12 w-12" />
        </div>
      </div>

      {/* Title */}
      <div className="mt-4 mb-3 text-center">
        <h1 className="text-base font-black text-[#003D79] uppercase tracking-wide">
          BranchIQ Performance & Actionable Morning Briefing Report
        </h1>
        <p className="text-[11px] text-slate-500">
          Target Regional Mandiri Melesat: Total Skor &gt; 90,00 | Posisi Cabang: Peringkat #{totalRank} dari {totalBranches} Cabang
        </p>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 mb-4">
        <div className="text-center border-r border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Peringkat & Skor</p>
          <p className="text-2xl font-black text-[#003D79] mt-0.5 font-mono">
            #{totalRank} <span className="text-sm font-bold text-slate-500">({totalScore.toFixed(2).replace('.', ',')})</span>
          </p>
          <p className="text-[10px] text-slate-500">dari {totalBranches} Cabang</p>
        </div>

        <div className="text-center border-r border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Sisa Potensi Poin</p>
          <p className="text-2xl font-black text-amber-600 mt-0.5 font-mono">
            +{totalGap.toFixed(2).replace('.', ',')}
          </p>
          <p className="text-[10px] text-slate-500">Poin Belum Tercapai</p>
        </div>

        <div className="text-center border-r border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Status Kinerja</p>
          <p className="text-base font-black text-emerald-700 mt-1">
            Tier A (Sehat)
          </p>
          <p className="text-[10px] text-slate-500">Kandidat Melesat</p>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Sub-Metrik Under-Target</p>
          <p className="text-2xl font-black text-rose-600 mt-0.5 font-mono">
            {topGaps.length}
          </p>
          <p className="text-[10px] text-slate-500">Prioritas Perhatian</p>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="mb-4">
        <h3 className="font-bold text-xs text-[#003D79] uppercase mb-1.5 flex items-center justify-between">
          <span>1. Rekapitulasi Skor per 7 Kategori Bisnis</span>
          <span className="text-[10px] text-slate-500 font-normal">Bobot Max = 100 Poin</span>
        </h3>
        <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
          <thead className="bg-slate-100 font-bold text-slate-700">
            <tr>
              <th className="border border-slate-300 p-1.5">Kategori</th>
              <th className="border border-slate-300 p-1.5 text-right">Bobot Max</th>
              <th className="border border-slate-300 p-1.5 text-right">Skor Aktual</th>
              <th className="border border-slate-300 p-1.5 text-right">Poin Bocor (Gap)</th>
              <th className="border border-slate-300 p-1.5 text-right">Pencapaian %</th>
              <th className="border border-slate-300 p-1.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.category} className="border-b border-slate-200">
                <td className="border border-slate-300 p-1.5 font-bold text-[#003D79]">{c.category}</td>
                <td className="border border-slate-300 p-1.5 text-right font-mono">{c.maxScore.toFixed(2).replace('.', ',')}</td>
                <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{c.actualScore.toFixed(2).replace('.', ',')}</td>
                <td className="border border-slate-300 p-1.5 text-right font-mono text-amber-700 font-bold">
                  {c.gapScore > 0 ? `-${c.gapScore.toFixed(2).replace('.', ',')}` : '0,00'}
                </td>
                <td className="border border-slate-300 p-1.5 text-right font-mono">{c.achievementPct}%</td>
                <td className="border border-slate-300 p-1.5 text-center font-bold">
                  {c.gapScore === 0 ? (
                    <span className="text-emerald-700">TERCAPAI 100%</span>
                  ) : c.achievementPct >= 80 ? (
                    <span className="text-blue-700">OPTIMAL</span>
                  ) : (
                    <span className="text-amber-700">PERLU AKSI</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Gap Priority Action Table */}
      <div className="mb-5">
        <h3 className="font-bold text-xs text-[#003D79] uppercase mb-1.5 flex items-center justify-between">
          <span>2. Action Plan Prioritas Tim Cabang (Top Gap Skor Terbesar)</span>
          <span className="text-[10px] text-rose-600 font-bold">Wajib Ditindaklanjuti Hari Ini</span>
        </h3>
        <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
          <thead className="bg-slate-100 font-bold text-slate-700">
            <tr>
              <th className="border border-slate-300 p-1.5 w-8 text-center">No</th>
              <th className="border border-slate-300 p-1.5 w-44">Sub-Metrik</th>
              <th className="border border-slate-300 p-1.5 text-right w-24">Realisasi vs Target</th>
              <th className="border border-slate-300 p-1.5 text-right w-20">Kekurangan</th>
              <th className="border border-slate-300 p-1.5 text-right w-20">Potensi Skor</th>
              <th className="border border-slate-300 p-1.5">Action Plan Khusus KC Pondok Indah Office 3</th>
            </tr>
          </thead>
          <tbody>
            {topGaps.map((item, idx) => {
              const info = metricKnowledge[item.metric] || metricKnowledge[item.name] || {};
              const unit = info.unit || '';
              const bKey = `b${branchCode}~${item.row}`;
              const gKey = `g~${item.row}`;
              const customStrat = masterStrategies[bKey]?.text || masterStrategies[gKey]?.text || '';
              const firstAction = customStrat
                ? customStrat.split('\n').filter(Boolean)[0]
                : (info.tacticalAction ? info.tacticalAction[0] : 'Tingkatkan penagihan & pipeline harian.');

              return (
                <tr key={item.row} className="border-b border-slate-200">
                  <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                  <td className="border border-slate-300 p-1.5">
                    <span className="font-bold text-slate-900 block">{item.name}</span>
                    <span className="text-[9px] text-slate-500 font-semibold">{item.category} (Bobot {(item.bobot * 100).toFixed(1)}%)</span>
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">
                    <span className="font-bold block">{formatBankingNumber(item.real, unit)}</span>
                    <span className="text-[9px] text-slate-500">Tgt: {formatBankingNumber(item.target, unit)}</span>
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-rose-600">
                    {formatBankingNumber(item.nominalGap, unit)}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-[#003D79] bg-amber-50">
                    +{item.scoreGap.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-slate-700 leading-snug">
                    {firstAction}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="pt-4 border-t border-slate-300 flex justify-between items-end text-center">
        <div className="w-48">
          <p className="text-[10px] text-slate-500">Mengetahui,</p>
          <p className="font-bold text-slate-800 text-xs">Supervisi Operasional / CS</p>
          <div className="h-16"></div>
          <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
            ( _____________________ )
          </p>
        </div>

        <div className="w-56 text-center">
          <p className="text-[10px] text-slate-500">Jakarta, {realizationDate}</p>
          <p className="font-bold text-[#003D79] text-xs">Kepala Cabang KC Jakarta PIO 3</p>
          <div className="h-16"></div>
          <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
            {branchInfo.head}
          </p>
          <p className="text-[9px] text-slate-500">NIP. KC10125-BM</p>
        </div>
      </div>

    </div>
  );
}
