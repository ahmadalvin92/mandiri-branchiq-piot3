import React from 'react';
import { MandiriOfficialLogo, PondokIndahEmblem } from './BrandingLogos';
import { 
  Upload, 
  Printer, 
  Sliders, 
  RefreshCw, 
  User, 
  Calendar, 
  Award,
  ChevronDown,
  Trophy,
  LogOut,
  Users,
  History
} from 'lucide-react';
import { getRoleLabel, isSuperadmin } from '../utils/dbService';

export function Header({
  branchInfo,
  realizationDate,
  branches,
  rankingInfo,
  allRankings = [],
  onSelectBranch,
  onUploadClick,
  onResetToDefault,
  onToggleSimulator,
  isSimulatorActive,
  onOpenComparison,
  onPrint,
  isCustomFileLoaded,
  customFileName,
  currentUser,
  onLogout,
  activePage = 'dashboard',
  onToggleCMSPage,
  excelHistoryList = [],
  activeSnapshotId = '',
  onSelectHistorySnapshot
}) {
  // Sort branches for the dropdown by rank if available, else by name
  const sortedBranches = React.useMemo(() => {
    return [...branches].sort((a, b) => {
      const rankA = allRankings.find(r => r.code === a.code)?.totalRank || 999;
      const rankB = allRankings.find(r => r.code === b.code)?.totalRank || 999;
      return rankA - rankB;
    });
  }, [branches, allRankings]);

  return (
    <header className="bg-white border-b border-slate-200/80 relative z-20 shadow-xs">
      {/* Top Banner Ribbon — Compact on Mobile */}
      <div className="bg-linear-to-r from-[#00254D] via-[#003D79] to-[#004B94] text-white px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 font-medium tracking-wide truncate">
            <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FFB81C] shrink-0"></span>
            <span className="truncate font-bold sm:font-medium">MANDIRI MELESAT — REGION V / JAKARTA 3</span>
            <span className="hidden md:inline text-white/50">•</span>
            <span className="hidden md:inline text-[#FFE5A3] font-semibold">Score Board BranchIQ 164 Cabang</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-white/90 shrink-0">
            {currentUser && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 text-[10px] sm:text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="hidden sm:inline">Login:</span>
                <strong className="text-[#FFE5A3] capitalize">{currentUser.displayName || currentUser.username}</strong>
                <span className="hidden sm:inline px-1.5 py-0.1 rounded bg-[#FFB81C] text-[#00254D] text-[9px] font-black uppercase">
                  {getRoleLabel(currentUser.role || (currentUser.username === 'superadmin' ? 'superadmin' : currentUser.username === 'michael' ? 'admin' : 'viewer'))}
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={onUploadClick}
              className="flex items-center gap-1 hover:text-[#FFE5A3] transition-colors cursor-pointer"
              title="Klik untuk mengganti / melihat riwayat posisi tanggal Excel"
            >
              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FFB81C] shrink-0" />
              <span className="hidden sm:inline">Posisi Data:</span>
              <strong className="text-white underline decoration-white/40">{realizationDate}</strong>
              {excelHistoryList.length > 1 && (
                <span className="px-1.5 py-0.1 rounded-full bg-[#FFB81C] text-[#00254D] font-black text-[9px]">
                  {excelHistoryList.length} Riwayat
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Row — Compact & Responsive on Mobile */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 sm:gap-4">
          
          {/* Left Side: Brand Logo + Official Branch Identity */}
          <div className="flex items-center justify-between lg:justify-start gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="shrink-0">
                <MandiriOfficialLogo className="h-7 sm:h-9 w-auto" />
              </div>

              <div className="h-8 w-px bg-slate-200 shrink-0 hidden sm:block"></div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                  <span className="hidden sm:inline text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
                    PT Bank Mandiri (Persero) Tbk.
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#003D79]/10 text-[#003D79] text-[10px] sm:text-[11px] font-bold">
                    KC {branchInfo.code}
                  </span>
                  {branchInfo.areaName && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] sm:text-[11px] font-medium truncate max-w-[130px] sm:max-w-none">
                      {branchInfo.areaName}
                    </span>
                  )}
                  {rankingInfo?.totalRank && (
                    <button 
                      onClick={onOpenComparison}
                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[10px] sm:text-[11px] font-extrabold border border-amber-300 hover:bg-amber-100 cursor-pointer transition-colors"
                    >
                      <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600 fill-amber-600" />
                      <span>#{rankingInfo.totalRank}/164</span>
                    </button>
                  )}
                </div>
                <h1 className="text-sm sm:text-lg lg:text-xl font-black text-[#003D79] tracking-tight truncate mt-0.5">
                  {branchInfo.name}
                </h1>
                {/* Mobile-only compact head & grade line */}
                <p className="text-[10px] text-slate-500 sm:hidden truncate">
                  Ka. Unit: <strong className="text-slate-700">{branchInfo.head}</strong> • Kelas <strong className="text-[#003D79]">{branchInfo.grade}</strong> • Area #{rankingInfo?.areaRank || '-'}/{rankingInfo?.totalInArea || '-'}
                </p>
              </div>
            </div>

            {/* Mobile Logout quick button on top-right */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="sm:hidden inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold shrink-0"
                title="Logout"
              >
                <LogOut className="w-3 h-3 text-rose-600" />
                <span>Keluar</span>
              </button>
            )}
          </div>

          {/* Right Side: Desktop Metadata Card + Responsive Action Bar */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 sm:gap-3">
            
            {/* Metadata Card (Hidden on small mobile to save vertical space, visible on sm+) */}
            <div className="hidden sm:flex items-center gap-2.5 bg-[#F4F7FA] border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-2xs">
              <PondokIndahEmblem className="h-9 w-9 shrink-0" />
              <div className="text-xs leading-tight">
                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <User className="w-3.5 h-3.5 text-[#003D79]" />
                  <span>Kepala: <strong className="text-slate-900 font-bold">{branchInfo.head}</strong></span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3 text-[#FFB81C]" />
                    <span>Kelas: <strong className="text-[#003D79] font-bold">{branchInfo.grade}</strong></span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>Rank Area: <strong className="text-slate-800 font-bold">#{rankingInfo?.areaRank || '-'}</strong>/{rankingInfo?.totalInArea || '-'}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons — Responsive row on mobile */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              
              {/* Branch Switcher Select (Full width on tiny mobile or flex-1) */}
              <div className="relative flex-1 sm:flex-none min-w-[145px]">
                <select
                  value={branchInfo.code}
                  onChange={(e) => onSelectBranch(e.target.value)}
                  className="w-full appearance-none bg-white hover:bg-slate-50 text-[11px] sm:text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg pl-2.5 pr-6 py-1.5 sm:py-2 cursor-pointer shadow-2xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79] sm:max-w-[220px] truncate"
                  title="Pilih Cabang Lain dari 164 Cabang Region V"
                >
                  {sortedBranches.map(b => {
                    const rankItem = allRankings.find(r => r.code === b.code);
                    const rankStr = rankItem ? `#${rankItem.totalRank}` : '';
                    const scoreStr = rankItem ? `(${rankItem.totalScore})` : '';
                    return (
                      <option key={b.code} value={b.code}>
                        {rankStr} {b.code} - {b.name} {scoreStr}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Leaderboard Button */}
              <button
                onClick={onOpenComparison}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[11px] sm:text-xs font-black shadow-xs cursor-pointer"
                title="Buka Leaderboard 164 Cabang"
              >
                <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" />
                <span>Rank #{rankingInfo?.totalRank || 43}</span>
              </button>

              {/* What-If Simulator Toggle */}
              <button
                onClick={onToggleSimulator}
                className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all border cursor-pointer ${
                  isSimulatorActive
                    ? 'bg-[#FFB81C] text-[#00254D] border-[#FFB81C] shadow-sm'
                    : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-300'
                }`}
                title="Buka What-If Simulator Skor"
              >
                <Sliders className={`w-3.5 h-3.5 ${isSimulatorActive ? 'text-[#00254D]' : 'text-[#FFB81C]'}`} />
                <span className="hidden xs:inline sm:inline">Simulator</span>
              </button>

              {/* Upload & Daily Excel History Button (Upload only for Superadmin; History for all) */}
              <button
                onClick={onUploadClick}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#003D79] hover:bg-[#002D59] text-white text-[11px] sm:text-xs font-bold shadow-xs cursor-pointer"
                title={
                  isSuperadmin(currentUser)
                    ? 'Upload File Excel Harian Baru (Superadmin) atau Buka Riwayat Posisi Tanggal'
                    : 'Buka Riwayat Posisi Tanggal Excel Sebelumnya'
                }
              >
                {isSuperadmin(currentUser) ? (
                  <Upload className="w-3.5 h-3.5 text-[#FFB81C]" />
                ) : (
                  <History className="w-3.5 h-3.5 text-[#FFB81C]" />
                )}
                <span className="hidden md:inline">
                  {isSuperadmin(currentUser) ? 'Upload / Riwayat Excel' : 'Riwayat Posisi Data'}
                </span>
                {excelHistoryList.length > 1 && (
                  <span className="px-1.5 py-0.1 rounded-full bg-[#FFB81C] text-[#00254D] text-[10px] font-black">
                    {excelHistoryList.length}
                  </span>
                )}
              </button>

              {/* Print Executive Summary */}
              <button
                onClick={onPrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs cursor-pointer"
                title="Cetak Laporan 1 Halaman"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden xl:inline">Print</span>
              </button>

              {isCustomFileLoaded && (
                <button
                  onClick={onResetToDefault}
                  className="p-1.5 sm:p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                  title="Kembalikan ke data bawaan 10125"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Superadmin CMS User Management Button */}
              {isSuperadmin(currentUser) && onToggleCMSPage && (
                <button
                  onClick={onToggleCMSPage}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all border cursor-pointer ${
                    activePage === 'cms'
                      ? 'bg-[#FFB81C] text-[#00254D] border-[#FFB81C]'
                      : 'bg-purple-700 hover:bg-purple-800 text-white border-purple-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-[#FFB81C]" />
                  <span>{activePage === 'cms' ? 'Tutup CMS' : 'CMS'}</span>
                </button>
              )}

              {/* Desktop Logout Button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                  title="Keluar dari akun (Logout)"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Logout</span>
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
