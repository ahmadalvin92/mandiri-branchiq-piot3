import React, { useState } from 'react';
import {
  Sliders,
  Save,
  Presentation,
  RotateCcw,
  CheckCircle2,
  Eye,
  Edit3,
  Trash2,
  Sparkles,
  FolderOpen,
  ShieldCheck,
  ArrowRight,
  X,
  Check
} from 'lucide-react';

export function SimulationManagerBar({
  currentUser,
  isKonseptor,
  isSuperadminUser,
  isViewerSimMode,
  onToggleViewerSimMode,
  activeSimulationId,
  viewerSimTargets = {},
  viewerSimReals = {},
  viewerSimStrategies = {},
  onResetViewerSimDraft,
  onSaveViewerSimulation,
  onLoadViewerSimulation,
  onDeleteViewerSimulation,
  onAdoptSimulationToMaster,
  viewerSimulations = [],
  branchInfo,
  masterTotalScore = 85.53,
  activeTotalScore = 85.53,
  masterOverridesCount = 0,
  onResetAllMasterOverrides
}) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [simTitle, setSimTitle] = useState('');
  const [simNotes, setSimNotes] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const branchCode = String(branchInfo?.code || '10125');
  const branchSimulations = viewerSimulations.filter(s => String(s.branchCode) === branchCode);
  const activeSimObj = viewerSimulations.find(s => s.id === activeSimulationId) || null;

  const modifiedDraftCount =
    Object.keys(viewerSimTargets).length +
    Object.keys(viewerSimReals).length +
    Object.keys(viewerSimStrategies).length;

  const scoreDelta = Number((activeTotalScore - masterTotalScore).toFixed(2));

  const showTempToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleOpenSaveModal = () => {
    if (activeSimObj && activeSimObj.createdBy === currentUser?.username) {
      setSimTitle(activeSimObj.title);
      setSimNotes(activeSimObj.notes || '');
    } else {
      setSimTitle(`Simulasi Target ${branchInfo?.name || branchCode} — ${currentUser?.displayName || currentUser?.username}`);
      setSimNotes('');
    }
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = (e) => {
    e.preventDefault();
    if (!simTitle.trim()) return;
    onSaveViewerSimulation({
      id: activeSimObj && activeSimObj.createdBy === currentUser?.username ? activeSimObj.id : `sim_${Date.now()}`,
      title: simTitle.trim(),
      notes: simNotes.trim(),
      branchCode,
      branchName: branchInfo?.name || `Cabang ${branchCode}`,
      createdBy: currentUser?.username || 'viewer',
      createdByName: currentUser?.displayName || currentUser?.username || 'Viewer',
      targets: viewerSimTargets,
      reals: viewerSimReals,
      strategies: viewerSimStrategies,
      baselineScore: masterTotalScore,
      simulatedScore: activeTotalScore,
      scoreDelta
    });
    setIsSaveModalOpen(false);
    showTempToast('Simulasi berhasil disimpan! Siap dipresentasikan ke Konseptor (Michael).');
  };

  return (
    <div className="space-y-3">
      {/* Main Role & Mode Control Bar */}
      <div
        className={`rounded-xl border p-4 shadow-xs transition-all ${
          isViewerSimMode
            ? 'bg-linear-to-r from-amber-50 via-white to-blue-50/60 border-[#FFB81C] ring-2 ring-[#FFB81C]/30'
            : isKonseptor
              ? 'bg-linear-to-r from-[#00254D]/5 via-white to-amber-50/30 border-[#003D79]/25'
              : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Left Status Info */}
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isViewerSimMode
                  ? 'bg-[#FFB81C] text-[#00254D]'
                  : isKonseptor
                    ? 'bg-[#003D79] text-[#FFB81C]'
                    : 'bg-slate-100 text-[#003D79]'
              }`}
            >
              {isViewerSimMode ? (
                <Presentation className="w-5 h-5" />
              ) : isKonseptor ? (
                <Edit3 className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                {isKonseptor ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#003D79] text-white text-[10px] font-black uppercase tracking-wider">
                    {isSuperadminUser ? 'Superadmin (Full Access)' : 'Konseptor Utama (Michael)'}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#003D79] text-[10px] font-black uppercase tracking-wider">
                    Viewer ({currentUser?.displayName || currentUser?.username})
                  </span>
                )}

                {isViewerSimMode ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFB81C] text-[#00254D] text-[11px] font-black">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      {activeSimObj
                        ? `Presentasi Simulasi: "${activeSimObj.title}" (oleh ${activeSimObj.createdByName})`
                        : 'MODE SIMULASI VIEWER AKTIF (Data Master Aman)'}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-800">
                    {isKonseptor
                      ? 'Mode Edit Master Aktif — Anda dapat mengubah angka Target & Strategi secara permanen'
                      : 'Mode Read-Only Data Master — Aktifkan Mode Simulasi untuk menguji & menyimpan target/strategi Anda sendiri'}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
                {isViewerSimMode ? (
                  <>
                    <span>
                      Skor Master Konseptor: <strong className="font-mono text-slate-800">{masterTotalScore.toFixed(2).replace('.', ',')}</strong>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 inline" />
                    <span>
                      Skor Simulasi:{' '}
                      <strong className="font-mono text-[#003D79] text-sm">
                        {activeTotalScore.toFixed(2).replace('.', ',')}
                      </strong>
                      {scoreDelta !== 0 && (
                        <span
                          className={`ml-1.5 px-1.5 py-0.2 rounded font-mono font-bold text-[11px] ${
                            scoreDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {scoreDelta > 0 ? '+' : ''}
                          {scoreDelta.toFixed(2).replace('.', ',')} poin
                        </span>
                      )}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>
                      Item Diubah: <strong>{modifiedDraftCount} perubahan</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      Data Master Konseptor: <strong className="text-[#003D79]">{masterOverridesCount} kustomisasi tersimpan di database</strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>
                      Simulasi Viewer Tersimpan: <strong>{branchSimulations.length} skenario</strong>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Toggle Simulation Mode button (Primary for Viewer, also available for Konseptor to test/present) */}
            <button
              type="button"
              onClick={onToggleViewerSimMode}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs ${
                isViewerSimMode
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-[#FFB81C] hover:bg-[#f3aa0d] text-[#00254D]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>
                {isViewerSimMode
                  ? 'Keluar Mode Simulasi (Kembali ke Master)'
                  : 'Mode Simulasi Target & Strategi'}
              </span>
            </button>

            {/* Save Simulation Button when in Simulation Mode */}
            {isViewerSimMode && (
              <>
                <button
                  type="button"
                  onClick={handleOpenSaveModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003D79] hover:bg-[#00254D] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-[#FFB81C]" />
                  <span>Save Simulation</span>
                </button>

                {modifiedDraftCount > 0 && (
                  <button
                    type="button"
                    onClick={onResetViewerSimDraft}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold cursor-pointer"
                    title="Reset angka simulasi ke Data Master"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}

                {isKonseptor && activeSimObj && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Terapkan simulasi "${activeSimObj.title}" milik ${activeSimObj.createdByName} menjadi Data Master utama?`)) {
                        onAdoptSimulationToMaster(activeSimObj);
                        showTempToast(`Simulasi "${activeSimObj.title}" berhasil diterapkan ke Data Master!`);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Terapkan ke Master</span>
                  </button>
                )}
              </>
            )}

            {/* Open Saved Simulations List (for Presentation to Michael) */}
            <button
              type="button"
              onClick={() => setIsListOpen(!isListOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#003D79] border border-slate-300 text-xs font-extrabold cursor-pointer shadow-2xs"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#FFB81C]" />
              <span>Simulasi Tersimpan ({branchSimulations.length})</span>
            </button>

            {isKonseptor && !isViewerSimMode && masterOverridesCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Kembalikan seluruh Target & Strategi cabang ini ke nilai asli template Excel?')) {
                    onResetAllMasterOverrides();
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                title="Reset semua perubahan Master ke awal Excel"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Master</span>
              </button>
            )}
          </div>

        </div>

        {toastMsg && (
          <div className="mt-3 pt-2.5 border-t border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>

      {/* Expandable Saved Simulations Panel (Presentation to Michael) */}
      {isListOpen && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Presentation className="w-4 h-4 text-[#003D79]" />
              <h4 className="font-extrabold text-[#003D79] text-xs uppercase tracking-wider">
                Daftar Skenario Simulasi Viewer — Siap Dipresentasikan ke Konseptor (Michael)
              </h4>
            </div>
            <button onClick={() => setIsListOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {branchSimulations.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Belum ada simulasi yang disimpan untuk cabang ini. Aktifkan <strong>Mode Simulasi</strong>, ubah angka Target/Strategi di tabel, lalu klik <strong>Save Simulation</strong>.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {branchSimulations.map((sim) => {
                const isSelected = activeSimulationId === sim.id && isViewerSimMode;
                const canDelete = isKonseptor || sim.createdBy === currentUser?.username;
                const delta = Number((sim.simulatedScore - sim.baselineScore).toFixed(2));

                return (
                  <div
                    key={sim.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 text-xs ${
                      isSelected
                        ? 'border-[#003D79] bg-blue-50/40 ring-2 ring-[#003D79]/20'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-slate-900 leading-snug">{sim.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] shrink-0 ${
                            delta >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {sim.simulatedScore?.toFixed(2).replace('.', ',')} ({delta >= 0 ? '+' : ''}
                          {delta.toFixed(2).replace('.', ',')})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Oleh: <strong className="text-slate-700 capitalize">{sim.createdByName}</strong> •{' '}
                        {new Date(sim.updatedAt || sim.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {sim.notes && (
                        <p className="text-[11px] text-slate-600 mt-1.5 italic bg-white p-2 rounded border border-slate-200/80">
                          "{sim.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                      <button
                        type="button"
                        onClick={() => onLoadViewerSimulation(sim)}
                        className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#003D79] hover:bg-[#00254D] text-white'
                        }`}
                      >
                        <Presentation className="w-3 h-3 text-[#FFB81C]" />
                        <span>{isSelected ? 'Sedang Ditampilkan' : 'Tampilkan / Presentasikan'}</span>
                      </button>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDeleteViewerSimulation(sim.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                          title="Hapus Simulasi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Save Simulation Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="fixed inset-0" onClick={() => setIsSaveModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-10 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-[#003D79]" />
                <h3 className="text-sm font-extrabold text-[#003D79]">
                  Simpan Draft Simulasi (Save Simulation)
                </h3>
              </div>
              <button onClick={() => setIsSaveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSave} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Skenario Simulasi *</label>
                <input
                  type="text"
                  required
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  placeholder="Contoh: Usulan Target DPK & Livin Akhir Bulan"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003D79]/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Presentasi untuk Michael (Konseptor)</label>
                <textarea
                  rows={3}
                  value={simNotes}
                  onChange={(e) => setSimNotes(e.target.value)}
                  placeholder="Tuliskan ringkasan argumen/usulan strategi untuk dipresentasikan..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003D79]/20"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Proyeksi Skor Simulasi:</span>
                <span className="font-mono font-black text-[#003D79] text-sm">
                  {activeTotalScore.toFixed(2).replace('.', ',')} poin ({scoreDelta >= 0 ? '+' : ''}
                  {scoreDelta.toFixed(2).replace('.', ',')})
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#003D79] hover:bg-[#00254D] text-white font-extrabold shadow-xs cursor-pointer"
                >
                  Simpan Skenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
