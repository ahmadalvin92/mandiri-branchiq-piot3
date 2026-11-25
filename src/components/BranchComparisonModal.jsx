import React, { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  X,
  Search,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  TrendingUp,
  TrendingDown,
  Award,
  Building2,
  User,
  SlidersHorizontal,
  Download,
  Sparkles,
  Check,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Scale,
  Minus
} from 'lucide-react';

export function BranchComparisonModal({
  isOpen,
  onClose,
  allRankings = [],
  activeBranchCode,
  onSelectBranch,
  allDbRows = {},
  metricDefs = [],
  realizationDate
}) {
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' or 'comparison'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedTier, setSelectedTier] = useState('all');
  const [sortBy, setSortBy] = useState('totalRank'); // 'totalRank', 'totalScore', 'DPK', 'Kredit', 'Livin', 'Acquiring', 'Kopra', 'GMM'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  const [selectedForComparison, setSelectedForComparison] = useState(() => {
    const topCode = allRankings[0]?.code || '13325';
    const actCode = activeBranchCode || '10125';
    return topCode && topCode !== actCode ? [actCode, topCode] : [actCode];
  });

  // Sync default comparison branches when active branch or top1 branch changes
  useEffect(() => {
    const topCode = allRankings[0]?.code || '13325';
    setSelectedForComparison(prev => {
      const hasValidActive = prev.some(c => c === activeBranchCode);
      const cleaned = prev.filter(c => allRankings.some(r => r.code === c));
      if (hasValidActive && cleaned.length >= 1) return cleaned;
      const next = [activeBranchCode || '10125'];
      if (topCode && topCode !== activeBranchCode) next.push(topCode);
      return next;
    });
  }, [activeBranchCode, allRankings]);

  // Active branch ranking item
  const activeBranch = useMemo(() => {
    return allRankings.find(r => r.code === activeBranchCode) || allRankings[0] || {};
  }, [allRankings, activeBranchCode]);

  // #1 Rank branch
  const top1Branch = useMemo(() => {
    return allRankings[0] || {};
  }, [allRankings]);

  // Top 1 in same area
  const topInSameArea = useMemo(() => {
    if (!activeBranch.areaCode) return null;
    return allRankings.find(r => r.areaCode === activeBranch.areaCode) || null;
  }, [allRankings, activeBranch]);

  // Top 1 in same grade
  const topInSameGrade = useMemo(() => {
    if (!activeBranch.grade) return null;
    return allRankings.find(r => r.grade === activeBranch.grade) || null;
  }, [allRankings, activeBranch]);

  // List of distinct areas
  const areaOptions = useMemo(() => {
    const map = new Map();
    allRankings.forEach(r => {
      if (r.areaCode && !map.has(r.areaCode)) {
        map.set(r.areaCode, r.areaName || `Area ${r.areaCode}`);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [allRankings]);

  // List of distinct grades
  const gradeOptions = useMemo(() => {
    const set = new Set();
    allRankings.forEach(r => {
      if (r.grade) set.add(r.grade);
    });
    return Array.from(set).sort();
  }, [allRankings]);

  // Count branches per grade
  const gradeCounts = useMemo(() => {
    const map = {};
    allRankings.forEach(r => {
      if (r.grade) {
        map[r.grade] = (map[r.grade] || 0) + 1;
      }
    });
    return map;
  }, [allRankings]);

  // Filtered & Sorted Rankings for Tab 1
  const filteredRankings = useMemo(() => {
    return allRankings
      .filter(r => {
        // Search query
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchCode = r.code.toLowerCase().includes(q);
          const matchName = r.name.toLowerCase().includes(q);
          const matchHead = (r.head || '').toLowerCase().includes(q);
          const matchArea = (r.areaName || '').toLowerCase().includes(q);
          if (!matchCode && !matchName && !matchHead && !matchArea) return false;
        }

        // Area filter
        if (selectedArea !== 'all' && r.areaCode !== selectedArea) {
          return false;
        }

        // Grade filter
        if (selectedGrade !== 'all' && r.grade !== selectedGrade) {
          return false;
        }

        // Tier filter
        if (selectedTier === 'top10' && r.totalRank > 10) return false;
        if (selectedTier === 'tierA' && r.totalScore < 75) return false;
        if (selectedTier === 'tierB' && (r.totalScore < 70 || r.totalScore >= 75)) return false;
        if (selectedTier === 'tierC' && r.totalScore >= 70) return false;

        return true;
      })
      .sort((a, b) => {
        let valA, valB;
        if (sortBy === 'totalRank') {
          if (selectedGrade !== 'all') {
            valA = a.gradeRank || a.totalRank;
            valB = b.gradeRank || b.totalRank;
          } else {
            valA = a.totalRank;
            valB = b.totalRank;
          }
        } else if (sortBy === 'gradeRank') {
          valA = a.gradeRank || a.totalRank;
          valB = b.gradeRank || b.totalRank;
        } else if (sortBy === 'totalScore') {
          valA = a.totalScore;
          valB = b.totalScore;
        } else if (['DPK', 'Kredit', 'Livin', 'Acquiring', 'Kopra', 'GMM', 'Ekosistem'].includes(sortBy)) {
          valA = a.categoryScores?.[sortBy]?.score || 0;
          valB = b.categoryScores?.[sortBy]?.score || 0;
        } else {
          valA = a.totalRank;
          valB = b.totalRank;
        }

        if (sortOrder === 'asc') {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
  }, [allRankings, searchQuery, selectedArea, selectedGrade, selectedTier, sortBy, sortOrder]);

  // Toggle selection for comparison
  const toggleComparisonSelection = (code) => {
    setSelectedForComparison(prev => {
      if (prev.includes(code)) {
        if (prev.length <= 1) return prev; // keep at least 1
        return prev.filter(c => c !== code);
      } else {
        if (prev.length >= 4) {
          // Replace the last one if reached max 4
          return [...prev.slice(0, 3), code];
        }
        return [...prev, code];
      }
    });
  };

  // Switch active branch
  const handleSelectActiveBranch = (code) => {
    onSelectBranch(code);
    onClose();
  };

  // Compare branches details
  const comparedBranchesData = useMemo(() => {
    return selectedForComparison.map(code => {
      return allRankings.find(r => r.code === code) || { code, name: 'Cabang ' + code, totalScore: 0, totalRank: 999 };
    });
  }, [selectedForComparison, allRankings]);

  // Categories list
  const categoryKeys = ['DPK', 'Kredit', 'Livin', 'Acquiring', 'Kopra', 'GMM', 'Ekosistem'];
  const categoryMaxScores = { DPK: 30, Kredit: 20, Livin: 15, Acquiring: 15, Kopra: 10, GMM: 5, Ekosistem: 5 };

  // Export comparison table to CSV
  const handleExportCSV = () => {
    const headers = ['Kode Cabang', 'Nama Cabang', 'Kepala Cabang', 'Kelas Unit', 'Area', 'Rank', 'Total Skor', ...categoryKeys.map(c => `${c} Skor`), ...categoryKeys.map(c => `${c} Rank`)];
    const rows = comparedBranchesData.map(b => [
      b.code,
      `"${b.name}"`,
      `"${b.head || ''}"`,
      b.grade || '',
      `"${b.areaName || ''}"`,
      b.totalRank,
      b.totalScore,
      ...categoryKeys.map(c => b.categoryScores?.[c]?.score || 0),
      ...categoryKeys.map(c => b.categoryScores?.[c]?.rank || 0)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Perbandingan_Cabang_Mandiri_Region_V_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Top Header */}
        <div className="bg-linear-to-r from-[#00254D] via-[#003D79] to-[#004B94] text-white px-5 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFB81C]/20 border border-[#FFB81C]/40 flex items-center justify-center text-[#FFB81C]">
                <Trophy className="w-5 h-5 fill-[#FFB81C]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    Peringkat & Matriks Perbandingan Cabang
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                    {allRankings.length || 164} Cabang
                  </span>
                </div>
                <p className="text-xs text-white/70 mt-0.5">
                  Region V / Jakarta 3 • Score Board Mandiri Melesat (Posisi {realizationDate || '16 November 2026'})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Branch Summary Bar */}
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-white/60">Cabang Aktif Anda:</span>
              <span className="font-extrabold text-[#FFE5A3] bg-white/10 px-2.5 py-1 rounded-md border border-white/15">
                {activeBranch.code} — {activeBranch.name}
              </span>
              <span className="bg-[#FFB81C] text-[#00254D] font-black px-2 py-0.5 rounded-md text-[11px]">
                Rank #{activeBranch.totalRank} ({activeBranch.totalScore?.toFixed(2).replace('.', ',')} Poin)
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-white/75">
              <span>Posisi di Area: <strong className="text-white font-bold">#{activeBranch.areaRank || '-'}</strong>/{activeBranch.totalInArea || '-'}</span>
              <span>•</span>
              <button
                onClick={() => {
                  setActiveTab('leaderboard');
                  if (activeBranch.grade) {
                    setSelectedGrade(activeBranch.grade);
                  }
                }}
                className="hover:underline text-left cursor-pointer transition-colors hover:text-[#FFE5A3] inline-flex items-center gap-1.5 group"
                title={`Klik untuk memfilter peringkat sesama Kelas ${activeBranch.grade}`}
              >
                <span>Posisi di Kelas {activeBranch.grade}: <strong className="text-white font-bold group-hover:text-[#FFE5A3]">#{activeBranch.gradeRank || '-'}</strong>/{activeBranch.totalInGrade || '-'}</span>
                <span className="bg-[#FFB81C] text-[#00254D] text-[9px] font-black px-1.5 py-0.2 rounded group-hover:bg-white transition-colors">
                  Filter Kelas
                </span>
              </button>
              <span>•</span>
              <span>Juara 1 Region: <strong className="text-[#FFE5A3]">{top1Branch.name} ({top1Branch.totalScore})</strong></span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 pt-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer border-t border-x ${activeTab === 'leaderboard'
                ? 'bg-white text-[#003D79] border-slate-200 -mb-px shadow-2xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800 border-transparent'
                }`}
            >
              <Trophy className={`w-4 h-4 ${activeTab === 'leaderboard' ? 'text-[#FFB81C] fill-[#FFB81C]' : ''}`} />
              <span>Leaderboard Ranking {selectedGrade !== 'all' ? `Kelas ${selectedGrade}` : '164 Cabang'}</span>
              <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedGrade !== 'all' ? 'bg-[#003D79] text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                {filteredRankings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('comparison')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer border-t border-x ${activeTab === 'comparison'
                ? 'bg-white text-[#003D79] border-slate-200 -mb-px shadow-2xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800 border-transparent'
                }`}
            >
              <Scale className={`w-4 h-4 ${activeTab === 'comparison' ? 'text-[#003D79]' : ''}`} />
              <span>Matriks Komparasi Head-to-Head</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#003D79] text-white text-[10px]">
                {selectedForComparison.length} Cabang
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            {activeTab === 'comparison' && (
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="Download CSV Komparasi untuk Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'leaderboard' ? (
            /* TAB 1: LEADERBOARD 164 CABANG */
            <div className="space-y-3.5">

              {/* Quick Filter Sesuai Kelas Ranking Buttons */}
              <div className="bg-linear-to-r from-slate-50 via-blue-50/30 to-slate-50 p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                    <Award className="w-4 h-4 text-[#003D79]" />
                    <span>Filter Sesuai Kelas Ranking:</span>
                  </div>
                  {selectedGrade !== 'all' && (
                    <button
                      onClick={() => setSelectedGrade('all')}
                      className="text-xs text-[#003D79] hover:underline font-bold self-start sm:self-auto cursor-pointer"
                    >
                      ← Tampilkan Semua Kelas ({allRankings.length})
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setSelectedGrade('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${selectedGrade === 'all'
                      ? 'bg-[#003D79] text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                  >
                    <span>Semua Kelas</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedGrade === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {allRankings.length}
                    </span>
                  </button>

                  {/* Active branch's class shortcut button */}
                  {activeBranch.grade && (
                    <button
                      onClick={() => setSelectedGrade(activeBranch.grade)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${selectedGrade === activeBranch.grade
                        ? 'bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-300 font-black'
                        : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                        }`}
                      title={`Tampilkan hanya sesama Kelas ${activeBranch.grade} (Kelas Cabang Aktif)`}
                    >
                      <span>⭐ Kelas Cabang Anda ({activeBranch.grade})</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200/90 text-amber-950 font-black">
                        {gradeCounts[activeBranch.grade] || 0}
                      </span>
                    </button>
                  )}

                  {/* Distinct Grade Buttons */}
                  {gradeOptions.map(g => {
                    if (g === activeBranch.grade) return null; // already shown in prominent shortcut
                    const isSelected = selectedGrade === g;
                    return (
                      <button
                        key={g}
                        onClick={() => setSelectedGrade(g)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${isSelected
                          ? 'bg-[#003D79] text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                      >
                        <span>Kelas {g}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                          {gradeCounts[g] || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Grade Filter Info Banner */}
              {selectedGrade !== 'all' && (
                <div className="bg-amber-50/90 border border-amber-300 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Menampilkan <strong>Ranking Khusus Kelas {selectedGrade}</strong> (Total <strong>{filteredRankings.length}</strong> Cabang).
                      {activeBranch.grade === selectedGrade ? (
                        <span className="ml-1.5 font-medium">
                          Cabang Anda (<strong>{activeBranch.name}</strong>) berada di peringkat <strong className="text-[#00254D] bg-amber-200/80 px-1.5 py-0.5 rounded font-black">#{activeBranch.gradeRank}</strong> dari {activeBranch.totalInGrade} cabang se-kelas.
                        </span>
                      ) : (
                        <span className="ml-1.5 text-amber-800">
                          (Cabang aktif Anda adalah Kelas <strong>{activeBranch.grade}</strong>)
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedGrade('all')}
                    className="text-[#003D79] hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    Reset ke Semua Kelas
                  </button>
                </div>
              )}

              {/* Search & Filters Toolbar */}
              <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search box */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari kode cabang (mis: 10125), nama cabang, atau nama kepala unit..."
                    className="w-full bg-white text-xs pl-9 pr-8 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79] transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Area Filter */}
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="bg-white text-xs text-slate-700 font-semibold px-2.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#003D79]/20 cursor-pointer"
                  >
                    <option value="all">Semua Area (8 Area)</option>
                    {areaOptions.map(a => (
                      <option key={a.code} value={a.code}>
                        {a.name}
                      </option>
                    ))}
                  </select>

                  {/* Grade Filter */}
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className={`text-xs font-semibold px-2.5 py-2 rounded-lg border focus:outline-hidden focus:ring-2 focus:ring-[#003D79]/20 cursor-pointer ${selectedGrade !== 'all'
                      ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                      : 'bg-white text-slate-700 border-slate-300'
                      }`}
                  >
                    <option value="all">Semua Kelas Unit ({allRankings.length})</option>
                    {gradeOptions.map(g => (
                      <option key={g} value={g}>
                        Kelas {g} ({gradeCounts[g] || 0} cabang)
                      </option>
                    ))}
                  </select>

                  {/* Tier Filter */}
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="bg-white text-xs text-slate-700 font-semibold px-2.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#003D79]/20 cursor-pointer"
                  >
                    <option value="all">Semua Tier Skor</option>
                    <option value="top10">Top 10 Teratas</option>
                    <option value="tierA">Tier A (Skor ≥ 75)</option>
                    <option value="tierB">Tier B (Skor 70 - 75)</option>
                    <option value="tierC">Tier C (Skor &lt; 70)</option>
                  </select>

                  {/* Reset Filters */}
                  {(searchQuery || selectedArea !== 'all' || selectedGrade !== 'all' || selectedTier !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedArea('all');
                        setSelectedGrade('all');
                        setSelectedTier('all');
                      }}
                      className="text-xs text-[#003D79] hover:underline font-bold px-2 py-1"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-compare floating toolbar */}
              <div className="bg-[#EBF2FA] border border-[#003D79]/20 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#003D79]">
                    {selectedForComparison.length} cabang dipilih untuk komparasi:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {comparedBranchesData.map(b => (
                      <span
                        key={b.code}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${b.code === activeBranchCode
                          ? 'bg-[#003D79] text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
                          }`}
                      >
                        <span>#{b.totalRank} {b.name.split(' ')[0]}</span>
                        <button
                          onClick={() => toggleComparisonSelection(b.code)}
                          className="hover:opacity-75 cursor-pointer ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('comparison')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003D79] hover:bg-[#002D59] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Buka Matriks Komparasi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Table of branches */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 shadow-xs">
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 select-none">
                        <th className="py-2.5 px-3 w-10 text-center">Bandingkan</th>
                        <th
                          onClick={() => {
                            if (sortBy === 'totalRank') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                            else { setSortBy('totalRank'); setSortOrder('asc'); }
                          }}
                          className="py-2.5 px-3 w-20 text-center cursor-pointer hover:bg-slate-200/70 transition-colors"
                          title={selectedGrade !== 'all' ? `Urutkan Peringkat Kelas ${selectedGrade}` : 'Urutkan Peringkat Region'}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{selectedGrade !== 'all' ? `Rank Kls ${selectedGrade}` : 'Rank'}</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-2.5 px-3 min-w-[200px]">Cabang & Pimpinan</th>
                        <th className="py-2.5 px-3 w-28">Area</th>
                        <th className="py-2.5 px-3 w-20 text-center" title="Kelas Unit & Peringkat se-Kelas">Kelas</th>
                        <th
                          onClick={() => {
                            if (sortBy === 'totalScore') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                            else { setSortBy('totalScore'); setSortOrder('desc'); }
                          }}
                          className="py-2.5 px-3 w-24 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Total Skor</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-2.5 px-2 text-right w-16" title="DPK (Maks 30)">DPK</th>
                        <th className="py-2.5 px-2 text-right w-16" title="Kredit (Maks 20)">Kredit</th>
                        <th className="py-2.5 px-2 text-right w-16" title="Livin (Maks 15)">Livin</th>
                        <th className="py-2.5 px-2 text-right w-16" title="Acquiring (Maks 15)">Acq</th>
                        <th className="py-2.5 px-2 text-right w-16" title="Kopra (Maks 10)">Kopra</th>
                        <th className="py-2.5 px-2 text-right w-20" title="GMM Referral (Maks 5)">GMM Referral</th>
                        <th className="py-2.5 px-3 w-28 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRankings.length === 0 ? (
                        <tr>
                          <td colSpan="13" className="py-8 text-center text-slate-400">
                            Tidak ada cabang yang cocok dengan filter pencarian "{searchQuery}"
                          </td>
                        </tr>
                      ) : (
                        filteredRankings.map((branch) => {
                          const isActive = branch.code === activeBranchCode;
                          const isChecked = selectedForComparison.includes(branch.code);
                          const isGradeFiltered = selectedGrade !== 'all';
                          const displayRank = isGradeFiltered ? (branch.gradeRank || branch.totalRank) : branch.totalRank;

                          // Rank badge color
                          let rankBadge;
                          if (displayRank === 1) {
                            rankBadge = (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 font-black shadow-2xs text-xs">
                                👑 #1
                              </span>
                            );
                          } else if (displayRank === 2) {
                            rankBadge = (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-extrabold text-xs">
                                🥈 #2
                              </span>
                            );
                          } else if (displayRank === 3) {
                            rankBadge = (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-900 font-extrabold text-xs">
                                🥉 #3
                              </span>
                            );
                          } else if (displayRank <= 10) {
                            rankBadge = (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#003D79]/10 text-[#003D79] font-black text-xs">
                                #{displayRank}
                              </span>
                            );
                          } else {
                            rankBadge = (
                              <span className="font-extrabold text-slate-600 text-xs">
                                #{displayRank}
                              </span>
                            );
                          }

                          return (
                            <tr
                              key={branch.code}
                              className={`transition-colors ${isActive
                                ? 'bg-amber-50/70 hover:bg-amber-100/50 font-medium'
                                : isChecked
                                  ? 'bg-blue-50/50 hover:bg-blue-50'
                                  : 'hover:bg-slate-50'
                                }`}
                            >
                              {/* Checkbox */}
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => toggleComparisonSelection(branch.code)}
                                  className="text-slate-400 hover:text-[#003D79] cursor-pointer"
                                  title="Pilih untuk bandingkan head-to-head"
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-[#003D79]" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-300" />
                                  )}
                                </button>
                              </td>

                              {/* Rank */}
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex flex-col items-center">
                                  {rankBadge}
                                  {isGradeFiltered ? (
                                    <span className="text-[10px] text-slate-400 font-semibold mt-0.5" title={`Peringkat #${branch.totalRank} dari 164 cabang se-Region`}>
                                      Reg #{branch.totalRank}
                                    </span>
                                  ) : (
                                    branch.gradeRank && (
                                      <span className="text-[9px] text-slate-400 font-medium mt-0.2" title={`Peringkat #${branch.gradeRank} dari ${branch.totalInGrade} cabang di Kelas ${branch.grade}`}>
                                        Kls #{branch.gradeRank}
                                      </span>
                                    )
                                  )}
                                </div>
                              </td>

                              {/* Branch Name & Code & Head */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-slate-400 font-semibold text-[11px]">
                                    {branch.code}
                                  </span>
                                  <span className="font-bold text-slate-800">
                                    {branch.name}
                                  </span>
                                  {isActive && (
                                    <span className="px-1.5 py-0.2 rounded-md bg-[#003D79] text-white text-[9px] font-black uppercase tracking-wider">
                                      Aktif
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span>{branch.head || '-'}</span>
                                </div>
                              </td>

                              {/* Area */}
                              <td className="py-2.5 px-3 text-slate-600">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium truncate max-w-[120px]">
                                  {branch.areaName.replace('Area ', '')}
                                </span>
                              </td>

                              {/* Grade */}
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => setSelectedGrade(branch.grade)}
                                  className="inline-flex flex-col items-center px-1.5 py-0.5 rounded hover:bg-slate-200/70 cursor-pointer transition-colors group"
                                  title={`Klik untuk filter ranking hanya Kelas ${branch.grade}`}
                                >
                                  <span className="font-bold text-[#003D79] text-[11px] group-hover:underline">
                                    {branch.grade}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-semibold mt-0.2">
                                    #{branch.gradeRank}/{branch.totalInGrade}
                                  </span>
                                </button>
                              </td>

                              {/* Total Score */}
                              <td className="py-2.5 px-3 text-right">
                                <span className={`text-sm font-black ${branch.totalScore >= 75 ? 'text-emerald-700' :
                                  branch.totalScore >= 70 ? 'text-[#003D79]' : 'text-slate-700'
                                  }`}>
                                  {branch.totalScore.toFixed(2).replace('.', ',')}
                                </span>
                              </td>

                              {/* Categories breakdown */}
                              <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                                {branch.categoryScores?.DPK?.score?.toFixed(1) || '0.0'}
                              </td>
                              <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                                {branch.categoryScores?.Kredit?.score?.toFixed(1) || '0.0'}
                              </td>
                              <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                                {branch.categoryScores?.Livin?.score?.toFixed(1) || '0.0'}
                              </td>
                              <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                                {branch.categoryScores?.Acquiring?.score?.toFixed(1) || '0.0'}
                              </td>
                              <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                                {branch.categoryScores?.Kopra?.score?.toFixed(1) || '0.0'}
                              </td>
                              <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                                {branch.categoryScores?.['GMM Referral']?.score?.toFixed(1) || branch.categoryScores?.GMM?.score?.toFixed(1) || '0.0'}
                              </td>

                              {/* Actions */}
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {!isActive && (
                                    <button
                                      onClick={() => handleSelectActiveBranch(branch.code)}
                                      className="px-2 py-1 rounded-md bg-[#003D79] hover:bg-[#002D59] text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                                      title="Pilih cabang ini sebagai dashboard aktif"
                                    >
                                      Pilih
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (!selectedForComparison.includes(branch.code)) {
                                        toggleComparisonSelection(branch.code);
                                      }
                                      setActiveTab('comparison');
                                    }}
                                    className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold transition-colors cursor-pointer"
                                    title="Bandingkan langsung cabang ini"
                                  >
                                    <Scale className="w-3.5 h-3.5 text-[#003D79]" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            /* TAB 2: MATRIKS KOMPARASI HEAD-TO-HEAD */
            <div className="space-y-6">

              {/* Quick Preset Buttons */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#FFB81C]" />
                  <span>Preset Cepat Perbandingan:</span>
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Top 1 Region */}
                  {top1Branch && (
                    <button
                      onClick={() => {
                        setSelectedForComparison([activeBranch.code, top1Branch.code]);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold transition-colors cursor-pointer"
                    >
                      👑 Bandingkan vs Juara 1 ({top1Branch.name})
                    </button>
                  )}

                  {/* Top 1 in same area */}
                  {topInSameArea && topInSameArea.code !== activeBranch.code && (
                    <button
                      onClick={() => {
                        setSelectedForComparison([activeBranch.code, topInSameArea.code]);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#003D79] border border-blue-200 font-bold transition-colors cursor-pointer"
                    >
                      📍 Bandingkan vs Top 1 {activeBranch.areaName} ({topInSameArea.name})
                    </button>
                  )}

                  {/* Top 1 in same grade */}
                  {topInSameGrade && topInSameGrade.code !== activeBranch.code && (
                    <button
                      onClick={() => {
                        setSelectedForComparison([activeBranch.code, topInSameGrade.code]);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold transition-colors cursor-pointer"
                    >
                      🏷️ Bandingkan vs Top 1 Kelas {activeBranch.grade} ({topInSameGrade.name})
                    </button>
                  )}
                </div>
              </div>

              {/* Side-by-Side Comparison Cards */}
              <div className={`grid grid-cols-1 md:grid-cols-${Math.min(4, comparedBranchesData.length)} gap-4`}>
                {comparedBranchesData.map((b) => {
                  const isActive = b.code === activeBranch.code;
                  const scoreDiff = Number((b.totalScore - activeBranch.totalScore).toFixed(2));

                  return (
                    <div
                      key={b.code}
                      className={`rounded-2xl border p-4.5 relative overflow-hidden transition-all shadow-xs ${isActive
                        ? 'bg-linear-to-b from-[#003D79]/5 via-white to-white border-[#003D79]/40 ring-2 ring-[#003D79]/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      {isActive && (
                        <div className="absolute top-0 right-0 bg-[#003D79] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-bl-lg">
                          Cabang Aktif Anda
                        </div>
                      )}

                      <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                        <span>Kode: <strong>{b.code}</strong></span>
                        <span className="font-bold text-[#003D79]">Kelas {b.grade}</span>
                      </div>

                      <h3 className="text-base font-black text-slate-900 mt-1 line-clamp-1" title={b.name}>
                        {b.name}
                      </h3>

                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Pimpinan: {b.head || '-'}
                      </p>

                      {/* Rank & Score Box */}
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Peringkat Region</div>
                          <div className="text-xl font-black text-[#003D79] mt-0.5">
                            #{b.totalRank} <span className="text-xs text-slate-400 font-medium">/ 164</span>
                          </div>
                          <div className="text-[11px] font-bold text-amber-800 mt-1">
                            Kelas {b.grade}: <strong className="font-black text-slate-800">#{b.gradeRank || '-'}</strong> <span className="text-slate-400 font-normal">/ {b.totalInGrade || '-'}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Total Skor</div>
                          <div className="text-2xl font-black text-[#003D79] mt-0.5">
                            {b.totalScore?.toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                      </div>

                      {/* Delta vs Active */}
                      {!isActive && (
                        <div className="mt-2.5 flex items-center justify-between text-xs font-bold px-2 py-1 rounded-lg bg-slate-100">
                          <span className="text-slate-600">Selisih Skor:</span>
                          <span className={scoreDiff > 0 ? 'text-red-600' : scoreDiff < 0 ? 'text-emerald-600' : 'text-slate-600'}>
                            {scoreDiff > 0 ? `+${scoreDiff} (Anda tertinggal)` : scoreDiff < 0 ? `${scoreDiff} (Anda unggul)` : 'Sama persis'}
                          </span>
                        </div>
                      )}

                      {/* Switch Button */}
                      {!isActive && (
                        <button
                          onClick={() => handleSelectActiveBranch(b.code)}
                          className="w-full mt-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#003D79] text-slate-700 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Ganti Dashboard ke Cabang Ini
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Category Breakdown Comparison Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#003D79]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Perbandingan Rincian Skor per Kategori
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Nilai maksimal sesuai CFO Mandiri Melesat
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-2.5 px-4 w-40">Kategori</th>
                        <th className="py-2.5 px-3 w-20 text-center">Maks</th>
                        {comparedBranchesData.map(b => (
                          <th key={b.code} className="py-2.5 px-4 text-center">
                            <span className={b.code === activeBranch.code ? 'text-[#003D79] font-black' : 'text-slate-700'}>
                              {b.name.split(' ')[0]} (#{b.totalRank})
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categoryKeys.map((catKey) => {
                        const maxScore = categoryMaxScores[catKey] || 15;
                        const activeCatData = activeBranch.categoryScores?.[catKey] || (catKey === 'GMM Referral' ? activeBranch.categoryScores?.GMM : null);
                        const activeCatScore = activeCatData?.score || 0;

                        return (
                          <tr key={catKey} className="hover:bg-slate-50 transition-colors">
                            {/* Category name */}
                            <td className="py-3 px-4 font-black text-slate-800">
                              {catKey}
                            </td>

                            {/* Max score */}
                            <td className="py-3 px-3 text-center text-slate-400 font-semibold">
                              {maxScore}
                            </td>

                            {/* Scores for each branch */}
                            {comparedBranchesData.map(b => {
                              const catData = b.categoryScores?.[catKey] || (catKey === 'GMM Referral' ? b.categoryScores?.GMM : null) || { score: 0, rank: 999 };
                              const isActive = b.code === activeBranch.code;
                              const diff = Number((catData.score - activeCatScore).toFixed(2));
                              const pct = Number(((catData.score / maxScore) * 100).toFixed(0));

                              return (
                                <td key={b.code} className={`py-3 px-4 text-center ${isActive ? 'bg-[#003D79]/5' : ''}`}>
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-sm font-extrabold text-slate-900">
                                      {catData.score.toFixed(2).replace('.', ',')}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.2 rounded-md">
                                      Rank #{catData.rank}
                                    </span>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="w-24 mx-auto bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${pct >= 90 ? 'bg-emerald-500' :
                                        pct >= 70 ? 'bg-[#003D79]' : 'bg-amber-500'
                                        }`}
                                      style={{ width: `${Math.min(100, pct)}%` }}
                                    ></div>
                                  </div>

                                  {/* Diff vs active */}
                                  {!isActive && (
                                    <div className="text-[10px] mt-1 font-bold">
                                      {diff > 0 ? (
                                        <span className="text-red-600">Tertinggal -{diff}</span>
                                      ) : diff < 0 ? (
                                        <span className="text-emerald-600">Unggul +{Math.abs(diff)}</span>
                                      ) : (
                                        <span className="text-slate-400">Seimbang</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Total row */}
                      <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-300">
                        <td className="py-3 px-4 font-black text-base text-[#003D79]">
                          TOTAL SKOR
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400 font-bold">
                          100
                        </td>
                        {comparedBranchesData.map(b => (
                          <td key={b.code} className={`py-3 px-4 text-center ${b.code === activeBranch.code ? 'bg-[#003D79]/10' : ''}`}>
                            <div className="text-lg font-black text-[#003D79]">
                              {b.totalScore?.toFixed(2).replace('.', ',')}
                            </div>
                            <div className="text-[11px] text-slate-500 font-bold">
                              Peringkat #{b.totalRank} se-Region
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actionable Insights: Where to catch up */}
              {comparedBranchesData.length >= 2 && (
                <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Insight Strategis Komparasi vs {comparedBranchesData[1]?.name} (Juara/Benchmark)
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Untuk menyalip atau mengejar ketertinggalan poin dari <strong>{comparedBranchesData[1]?.name}</strong> (Skor: {comparedBranchesData[1]?.totalScore}),
                        cabang Anda perlu memprioritaskan kategori berikut:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
                        {categoryKeys.map(cat => {
                          const s1 = activeBranch.categoryScores?.[cat]?.score ?? (cat === 'GMM Referral' ? activeBranch.categoryScores?.GMM?.score : 0) ?? 0;
                          const s2 = comparedBranchesData[1]?.categoryScores?.[cat]?.score ?? (cat === 'GMM Referral' ? comparedBranchesData[1]?.categoryScores?.GMM?.score : 0) ?? 0;
                          const gap = Number((s2 - s1).toFixed(2));
                          if (gap <= 0) return null;

                          return (
                            <div key={cat} className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                              <div className="font-bold text-[#003D79] flex items-center justify-between">
                                <span>Kategori {cat}</span>
                                <span className="text-red-600 font-black">Gap -{gap} poin</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Anda: {s1} • Benchmark: {s2}
                              </p>
                            </div>
                          );
                        }).filter(Boolean)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-500 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>
              {selectedGrade !== 'all'
                ? `Menampilkan ${filteredRankings.length} cabang Kelas ${selectedGrade} (dari total ${allRankings.length || 164} Kantor Cabang se-Region V Jakarta 3)`
                : `Total ${allRankings.length || 164} Kantor Cabang Pembantu (KCP) / Kantor Cabang (KC) se-Region V Jakarta 3`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
export default BranchComparisonModal;
