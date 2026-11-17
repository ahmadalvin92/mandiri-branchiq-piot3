import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  X, 
  Loader2, 
  History,
  Trash2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  HardDrive,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import {
  DEFAULT_SNAPSHOT_META,
  getStorageQuotaStats,
  formatBytesToMB
} from '../utils/excelHistoryService';

export function FileUploadModal({
  isOpen,
  onClose,
  onFileUpload,
  excelHistoryList = [DEFAULT_SNAPSHOT_META],
  activeSnapshotId = DEFAULT_SNAPSHOT_META.id,
  onSelectHistorySnapshot,
  onDeleteHistorySnapshot,
  onPruneOldSnapshots
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [customDateLabel, setCustomDateLabel] = useState('');
  const fileInputRef = useRef(null);

  const quotaStats = useMemo(() => getStorageQuotaStats(excelHistoryList), [excelHistoryList]);

  if (!isOpen) return null;

  const handleFileProcess = async (file) => {
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|xlsm)$/i)) {
      setErrorMessage('Format file harus berupa file Excel (.xlsx, .xls, .xlsm)');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await onFileUpload(file, customDateLabel.trim());
      setCustomDateLabel('');
      setIsLoading(false);
      onClose();
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setErrorMessage(err.message || 'Gagal memproses file Excel. Pastikan file memiliki sheet Jarcab, Database, dan Matriks Bobot_2.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose}></div>

      {/* Modal Box */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#00254D] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB81C]/20 border border-[#FFB81C]/40 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-[#FFB81C]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                Upload Update Excel Harian & Riwayat Posisi Data
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300">
                100% Client-Side Processing • Auto-Replace Otomatis pada Batas 80% Memori (400 MB)
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto">
          
          {/* Storage Quota & 80% Auto-Replace Status Bar */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-extrabold text-[#003D79]">
                <HardDrive className="w-4 h-4 text-[#003D79]" />
                <span>Kapasitas Memori Riwayat: {quotaStats.usedMBText} / {quotaStats.maxMBText} ({quotaStats.usedPctOfMax}%)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px] inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Auto-Replace Aktif di ≥ 80% (400 MB)</span>
              </span>
            </div>

            {/* Visual Memory Bar with 80% Threshold Marker */}
            <div className="relative h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  quotaStats.isNearLimit ? 'bg-amber-500' : 'bg-[#003D79]'
                }`}
                style={{ width: `${Math.max(2, quotaStats.usedPctOfMax)}%` }}
              />
              {/* 80% Marker Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-600"
                style={{ left: '80%' }}
                title="Batas Auto-Replace 80% (400 MB)"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>
                Jika memori mencapai <strong>80% (400 MB)</strong> atau tanggal posisi sama, sistem otomatis me-<em>replace</em> data paling lama agar tidak pernah penuh.
              </span>
              {excelHistoryList.filter(x => !x.isDefault).length > 1 && onPruneOldSnapshots && (
                <button
                  type="button"
                  onClick={onPruneOldSnapshots}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sisakan Terbaru Saja</span>
                </button>
              )}
            </div>
          </div>

          {/* Optional Custom Date / Label Input before Upload */}
          <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <label className="block font-bold text-slate-700 text-xs">
              Label Posisi Tanggal / Catatan Update (Opsional — Jika tanggal sama, otomatis me-replace data tanggal tersebut)
            </label>
            <input
              type="text"
              value={customDateLabel}
              onChange={(e) => setCustomDateLabel(e.target.value)}
              placeholder="Contoh: 17 November 2026 (Kosongkan agar otomatis membaca tanggal dari sheet Excel)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79]"
            />
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging 
                ? 'border-[#003D79] bg-blue-50/50 scale-[1.01]' 
                : 'border-slate-300 hover:border-[#003D79] bg-slate-50/60 hover:bg-blue-50/30'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileInputChange} 
              accept=".xlsx,.xls,.xlsm"
              className="hidden" 
            />

            {isLoading ? (
              <div className="py-3 space-y-2 flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-[#003D79] animate-spin" />
                <p className="font-bold text-slate-700 text-sm">Memproses file Excel & mengecek kuota memori 80%...</p>
                <p className="text-slate-400 text-xs">Menyimpan snapshot posisi terbaru secara aman</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-11 h-11 rounded-full bg-blue-100/70 text-[#003D79] flex items-center justify-center mx-auto shadow-2xs">
                  <Upload className="w-5 h-5 text-[#003D79]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Upload File Excel Update Harian Baru (.xlsx)
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    Tarik & lepaskan file ke sini atau <span className="text-[#003D79] font-bold underline">klik untuk memilih file</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-snug">{errorMessage}</p>
            </div>
          )}

          {/* RIWAYAT POSISI DATA EXCEL SEBELUMNYA (HISTORY SNAPSHOTS) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-extrabold text-[#003D79] text-xs sm:text-sm">
                <History className="w-4 h-4 text-[#FFB81C]" />
                <span>Riwayat Posisi Data Harian ({excelHistoryList.length} Versi Tersimpan)</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Klik untuk membuka kembali data sebelumnya
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {excelHistoryList.map((item, idx) => {
                const isSelected = item.id === activeSnapshotId;
                const prevSnapshot = idx < excelHistoryList.length - 1 ? excelHistoryList[idx + 1] : null;
                const scoreDelta = prevSnapshot && item.score10125 && prevSnapshot.score10125
                  ? Number((item.score10125 - prevSnapshot.score10125).toFixed(2))
                  : null;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-blue-50/70 border-[#003D79] ring-2 ring-[#003D79]/15'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#003D79] text-white font-bold text-[10px]">
                          <Calendar className="w-3 h-3 text-[#FFB81C]" />
                          <span>Posisi: {item.realizationDate}</span>
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                            ✓ Sedang Dibuka
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono text-[10px]">
                          {formatBytesToMB(item.sizeBytes || 1250000)}
                        </span>
                      </div>

                      <p className="font-bold text-slate-900 truncate text-xs pt-0.5">
                        {item.label || item.fileName}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>
                          Skor KC 10125: <strong className="font-mono text-[#003D79]">{Number(item.score10125 || 85.53).toFixed(2).replace('.', ',')}</strong> (Rank #{item.rank10125 || 43})
                        </span>
                        {scoreDelta !== null && scoreDelta !== 0 && (
                          <span
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.1 rounded font-mono font-bold text-[10px] ${
                              scoreDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {scoreDelta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(2).replace('.', ',')} vs sebelumnya</span>
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(item.uploadedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          if (onSelectHistorySnapshot) {
                            await onSelectHistorySnapshot(item);
                            onClose();
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#003D79] hover:bg-[#00254D] text-white'
                        }`}
                      >
                        {isSelected ? 'Sedang Aktif' : 'Buka Data Ini'}
                      </button>

                      {!item.isDefault && onDeleteHistorySnapshot && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHistorySnapshot(item.id);
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                          title="Hapus dari riwayat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
