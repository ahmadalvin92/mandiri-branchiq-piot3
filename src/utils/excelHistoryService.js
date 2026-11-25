/**
 * Excel Daily History Snapshot Service (Supabase Cloud + IndexedDB Local Cache + localStorage Meta)
 * Mendukung sinkronisasi multi-device: ketika Superadmin mengunggah Excel, data langsung tersimpan
 * di Supabase Cloud dan otomatis muncul di seluruh laptop pengguna lain secara real-time.
 */

import { parseBranchIQWorkbook } from './excelParser.js';
import { supabase } from './supabaseClient.js';

const META_STORAGE_KEY = 'branchiq_excel_history_meta_v2';
const IDB_NAME = 'BranchIQExcelHistoryDB';
const IDB_STORE = 'snapshots';

export const MAX_STORAGE_BYTES = 500 * 1024 * 1024; // 500 MB
export const AUTO_REPLACE_THRESHOLD_RATIO = 0.80; // 80%
export const AUTO_REPLACE_THRESHOLD_BYTES = Math.floor(MAX_STORAGE_BYTES * AUTO_REPLACE_THRESHOLD_RATIO); // 400 MB
export const MAX_HISTORY_SNAPSHOTS = 30;

export const DEFAULT_SNAPSHOT_META = {
  id: 'default_r05_16nov2026',
  fileName: 'BranchIQ Score R05 16 November 2026 update 18.11.26 Kirim.xlsx',
  realizationDate: '16 November 2026',
  label: 'Posisi 16 November 2026 (Baseline R05 Terkini)',
  uploadedAt: '2026-11-18T08:00:00.000Z',
  uploadedBy: 'michael',
  score10125: 85.65,
  rank10125: 41,
  totalBranches: 164,
  sizeBytes: 1350000,
  isDefault: true
};

export const BASELINE_13NOV_META = {
  id: 'default_r05_13nov2026',
  fileName: 'BranchIQ_Score_R05_13_November_2026_update_16.11.26_Kirim.xlsx',
  realizationDate: '13 November 2026',
  label: 'Posisi 13 November 2026 (Baseline R05 Sebelumnya)',
  uploadedAt: '2026-11-16T08:00:00.000Z',
  uploadedBy: 'michael',
  score10125: 85.53,
  rank10125: 43,
  totalBranches: 163,
  sizeBytes: 1250000,
  isDefault: false
};

function safeReadMetaStorage() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Gagal membaca metadata riwayat Excel:', e);
    return null;
  }
}

function safeWriteMetaStorage(list) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Gagal menyimpan metadata riwayat Excel:', e);
  }
}

function sortAndDedupeHistoryList(uploadedItems = []) {
  const seenIds = new Set([DEFAULT_SNAPSHOT_META.id, BASELINE_13NOV_META.id, 'default_baseline_16nov_r05']);
  const seenDates = new Set([
    DEFAULT_SNAPSHOT_META.realizationDate.toLowerCase(),
    BASELINE_13NOV_META.realizationDate.toLowerCase()
  ]);

  const sortedUploaded = [...(uploadedItems || [])]
    .filter(item => item && item.id && !seenIds.has(item.id))
    .sort((a, b) => {
      const ta = new Date(a.uploadedAt || 0).getTime() || 0;
      const tb = new Date(b.uploadedAt || 0).getTime() || 0;
      return tb - ta;
    })
    .filter(item => {
      const dateKey = String(item.realizationDate || '').trim().toLowerCase();
      if (seenIds.has(item.id)) return false;
      if (dateKey && seenDates.has(dateKey)) return false;
      seenIds.add(item.id);
      if (dateKey) seenDates.add(dateKey);
      return true;
    });

  return [...sortedUploaded, DEFAULT_SNAPSHOT_META, BASELINE_13NOV_META];
}

function openHistoryIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromIdb(id) {
  try {
    const db = await openHistoryIdb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Gagal menghapus item dari IndexedDB:', e);
  }
}

export function formatBytesToMB(bytes = 0) {
  const mb = (Number(bytes) || 0) / (1024 * 1024);
  if (mb < 0.1 && mb > 0) return '0,10 MB';
  return `${mb.toFixed(2).replace('.', ',')} MB`;
}

export function getExcelHistoryMetaList() {
  const parsed = safeReadMetaStorage();
  if (Array.isArray(parsed) && parsed.length > 0) {
    const uploadedOnly = parsed.filter(item => {
      if (!item || !item.id) return false;
      if (item.id === 'default_baseline_16nov_r05' || item.id === DEFAULT_SNAPSHOT_META.id) return false;
      if (item.id === BASELINE_13NOV_META.id) return false;
      if (String(item.realizationDate || '').trim() === DEFAULT_SNAPSHOT_META.realizationDate) return false;
      if (String(item.realizationDate || '').trim() === BASELINE_13NOV_META.realizationDate) return false;
      return true;
    });
    return sortAndDedupeHistoryList(uploadedOnly);
  }
  return [DEFAULT_SNAPSHOT_META, BASELINE_13NOV_META];
}

export function saveExcelHistoryMetaList(list) {
  safeWriteMetaStorage(list);
}

/**
 * Ambil ID snapshot upload terbaru (non-default) jika tersedia di riwayat
 */
export function getLatestUploadedSnapshotId(list = null) {
  const items = Array.isArray(list) ? list : getExcelHistoryMetaList();
  const uploaded = items.find(
    x => x && !x.isDefault && x.id !== DEFAULT_SNAPSHOT_META.id && x.id !== BASELINE_13NOV_META.id
  );
  return uploaded?.id || null;
}

/**
 * Sinkronisasi metadata dari Supabase Cloud (agar laptop lain otomatis melihat snapshot baru)
 */
export async function syncCloudExcelHistory() {
  if (!supabase) return getExcelHistoryMetaList();
  try {
    const { data, error } = await supabase
      .from('excel_snapshots')
      .select('id, file_name, realization_date, label, uploaded_by, score_10125, rank_10125, total_branches, size_bytes, is_default, created_at')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const cloudMetas = data.map(row => ({
        id: row.id,
        fileName: row.file_name,
        realizationDate: row.realization_date,
        label: row.label,
        uploadedAt: row.created_at,
        uploadedBy: row.uploaded_by,
        score10125: Number(row.score_10125),
        rank10125: Number(row.rank_10125),
        totalBranches: Number(row.total_branches),
        sizeBytes: Number(row.size_bytes),
        isDefault: Boolean(row.is_default)
      })).filter(m => {
        if (!m.id) return false;
        if (m.id === 'default_baseline_16nov_r05' || m.id === DEFAULT_SNAPSHOT_META.id) return false;
        if (m.id === BASELINE_13NOV_META.id) return false;
        if (m.realizationDate === DEFAULT_SNAPSHOT_META.realizationDate) return false;
        if (m.realizationDate === BASELINE_13NOV_META.realizationDate) return false;
        return true;
      });

      // Cloud is the source of truth for uploaded snapshots (ensures deleted snapshots don't resurrect)
      const merged = sortAndDedupeHistoryList(cloudMetas);
      saveExcelHistoryMetaList(merged);
      return merged;
    }
  } catch (e) {
    console.warn('Supabase cloud history sync info:', e?.message || e);
  }
  return getExcelHistoryMetaList();
}

export function getStorageQuotaStats(list = null) {
  const items = Array.isArray(list) ? list : getExcelHistoryMetaList();
  const usedBytes = items.reduce((sum, item) => sum + (Number(item.sizeBytes) || 1200000), 0);
  const usedPctOfMax = Math.min(100, (usedBytes / MAX_STORAGE_BYTES) * 100);
  const usedPctOfThreshold = Math.min(100, (usedBytes / AUTO_REPLACE_THRESHOLD_BYTES) * 100);

  return {
    usedBytes,
    usedMBText: formatBytesToMB(usedBytes),
    maxBytes: MAX_STORAGE_BYTES,
    maxMBText: '500 MB',
    thresholdBytes: AUTO_REPLACE_THRESHOLD_BYTES,
    thresholdMBText: '400 MB (80%)',
    usedPctOfMax: Number(usedPctOfMax.toFixed(2)),
    usedPctOfThreshold: Number(usedPctOfThreshold.toFixed(2)),
    isNearLimit: usedBytes >= AUTO_REPLACE_THRESHOLD_BYTES * 0.85,
    snapshotsCount: items.length,
    maxSnapshots: MAX_HISTORY_SNAPSHOTS
  };
}

export async function saveExcelSnapshotToHistory({
  fileName,
  realizationDate,
  customLabel,
  uploadedBy = 'michael',
  parsedWorkbook
}) {
  const id = `snap_${Date.now()}`;
  const rank10125Obj = parsedWorkbook?.allRankings?.find(r => String(r.code) === '10125');

  const payloadObj = {
    branches: parsedWorkbook.branches,
    dbData: parsedWorkbook.dbData,
    metricDefs: parsedWorkbook.metricDefs,
    realizationDate: parsedWorkbook.realizationDate,
    allRankings: parsedWorkbook.allRankings
  };

  let sizeBytes = 1500000;
  try {
    const serialized = JSON.stringify(payloadObj);
    sizeBytes = new Blob([serialized]).size;
  } catch (e) {
    sizeBytes = 1500000;
  }

  const currentList = getExcelHistoryMetaList();
  let workingList = currentList.filter(
    x => !x.isDefault && x.id !== DEFAULT_SNAPSHOT_META.id && x.id !== BASELINE_13NOV_META.id
  );
  const replacedItems = [];

  const cleanDate = String(realizationDate || '').trim().toLowerCase();
  if (cleanDate) {
    const duplicateIdx = workingList.findIndex(
      x => String(x.realizationDate || '').trim().toLowerCase() === cleanDate
    );
    if (duplicateIdx !== -1) {
      const dup = workingList[duplicateIdx];
      await deleteFromIdb(dup.id);
      if (supabase) {
        try { await supabase.from('excel_snapshots').delete().eq('id', dup.id); } catch (e) {}
      }
      replacedItems.push(dup.realizationDate);
      workingList = workingList.filter(x => x.id !== dup.id);
    }
  }

  while (
    workingList.length > 0 &&
    (getStorageQuotaStats([...workingList, DEFAULT_SNAPSHOT_META, BASELINE_13NOV_META, { sizeBytes }]).usedBytes >= AUTO_REPLACE_THRESHOLD_BYTES ||
      workingList.length + 2 >= MAX_HISTORY_SNAPSHOTS)
  ) {
    const oldest = workingList[workingList.length - 1];
    if (!oldest) break;

    await deleteFromIdb(oldest.id);
    if (supabase) {
      try { await supabase.from('excel_snapshots').delete().eq('id', oldest.id); } catch (e) {}
    }
    replacedItems.push(oldest.realizationDate || oldest.fileName);
    workingList = workingList.filter(x => x.id !== oldest.id);
  }

  const meta = {
    id,
    fileName: fileName || 'BranchIQ_Update.xlsx',
    realizationDate: realizationDate || 'Posisi Terbaru',
    label: customLabel || `Posisi ${realizationDate || 'Terbaru'} (${fileName})`,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    score10125: rank10125Obj?.totalScore ?? 85.65,
    rank10125: rank10125Obj?.totalRank ?? 41,
    totalBranches: parsedWorkbook?.branches?.length || 164,
    sizeBytes,
    autoReplacedCount: replacedItems.length,
    isDefault: false
  };

  // 1. Simpan ke IndexedDB lokal untuk kecepatan instan
  try {
    const db = await openHistoryIdb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({ id, meta, payload: payloadObj });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Gagal menyimpan payload Excel ke IndexedDB:', e);
  }

  // 2. Simpan ke Supabase Cloud (agar otomatis muncul di laptop semua rekan)
  let cloudSyncError = null;
  if (supabase) {
    try {
      const { error } = await supabase.from('excel_snapshots').upsert({
        id,
        file_name: meta.fileName,
        realization_date: meta.realizationDate,
        label: meta.label,
        uploaded_by: meta.uploadedBy,
        score_10125: meta.score10125,
        rank_10125: meta.rank10125,
        total_branches: meta.totalBranches,
        size_bytes: meta.sizeBytes,
        is_default: false,
        payload_json: payloadObj
      });
      if (error) {
        cloudSyncError = error.message;
        console.warn('Supabase cloud snapshot sync error:', error.message);
      }
    } catch (errCloud) {
      cloudSyncError = errCloud?.message || String(errCloud);
      console.warn('Supabase cloud snapshot sync info:', cloudSyncError);
    }
  }

  const nextList = sortAndDedupeHistoryList([meta, ...workingList.filter(x => x.id !== id)]);
  saveExcelHistoryMetaList(nextList);

  return { meta, list: nextList, replacedItems, cloudSyncError };
}

export async function loadExcelSnapshotPayload(snapshotId) {
  if (!snapshotId || snapshotId === DEFAULT_SNAPSHOT_META.id) {
    return null;
  }
  if (snapshotId === BASELINE_13NOV_META.id) {
    try {
      const res = await fetch('/sample_branchiq_13nov.xlsx');
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const parsed = await parseBranchIQWorkbook(buffer);
        return {
          branches: parsed.branches,
          dbData: parsed.dbData,
          metricDefs: parsed.metricDefs,
          realizationDate: '13 November 2026',
          allRankings: parsed.allRankings
        };
      }
    } catch (e) {
      console.warn('Failed to load sample_branchiq_13nov.xlsx:', e);
    }
  }

  // 1. Coba baca dari IndexedDB lokal
  try {
    const db = await openHistoryIdb();
    const localResult = await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(snapshotId);
      req.onsuccess = () => resolve(req.result?.payload || null);
      req.onerror = () => resolve(null);
    });
    if (localResult) return localResult;
  } catch (e) {
    console.warn('IndexedDB read error:', e);
  }

  // 2. Jika tidak ada di lokal (misal di laptop lain), ambil dari Supabase Cloud
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('excel_snapshots')
        .select('payload_json')
        .eq('id', snapshotId)
        .single();
      if (!error && data?.payload_json) {
        try {
          const db = await openHistoryIdb();
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put({ id: snapshotId, payload: data.payload_json });
        } catch (eCache) {}
        return data.payload_json;
      }
    } catch (errCloud) {
      console.warn('Supabase read payload info:', errCloud?.message || errCloud);
    }
  }

  return null;
}

export async function deleteExcelSnapshotFromHistory(snapshotId) {
  if (!snapshotId || snapshotId === DEFAULT_SNAPSHOT_META.id || snapshotId === BASELINE_13NOV_META.id) {
    return getExcelHistoryMetaList();
  }
  await deleteFromIdb(snapshotId);
  if (supabase) {
    try {
      await supabase.from('excel_snapshots').delete().eq('id', snapshotId);
    } catch (e) {}
  }
  const nextList = getExcelHistoryMetaList().filter(x => x.id !== snapshotId);
  saveExcelHistoryMetaList(nextList);
  return nextList;
}

export async function pruneOldSnapshotsKeepLatest(activeSnapshotId) {
  const currentList = getExcelHistoryMetaList();
  const uploaded = currentList.filter(
    x => !x.isDefault && x.id !== DEFAULT_SNAPSHOT_META.id && x.id !== BASELINE_13NOV_META.id
  );
  if (uploaded.length <= 1) return currentList;

  const keepId = activeSnapshotId &&
    activeSnapshotId !== DEFAULT_SNAPSHOT_META.id &&
    activeSnapshotId !== BASELINE_13NOV_META.id
    ? activeSnapshotId
    : uploaded[0].id;

  const toDelete = uploaded.filter(x => x.id !== keepId);
  for (const item of toDelete) {
    await deleteFromIdb(item.id);
    if (supabase) {
      try { await supabase.from('excel_snapshots').delete().eq('id', item.id); } catch (e) {}
    }
  }

  const nextList = currentList.filter(
    x => x.isDefault || x.id === BASELINE_13NOV_META.id || x.id === keepId
  );
  saveExcelHistoryMetaList(nextList);
  return nextList;
}
