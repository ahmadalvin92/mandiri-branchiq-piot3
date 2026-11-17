/**
 * Excel Daily History Snapshot Service (IndexedDB + localStorage Metadata)
 * Dilengkapi Smart Storage Quota & Auto-Replace (FIFO) saat pemakaian mencapai 80% dari 500 MB (400 MB)
 * atau saat meng-upload file dengan Tanggal Posisi yang sama.
 */

const META_STORAGE_KEY = 'branchiq_excel_history_meta_v1';
const IDB_NAME = 'BranchIQExcelHistoryDB';
const IDB_STORE = 'snapshots';

// Batas kapasitas Vercel / Storage: 500 MB, dengan Auto-Replace pada ambang 80% (400 MB)
export const MAX_STORAGE_BYTES = 500 * 1024 * 1024; // 500 MB
export const AUTO_REPLACE_THRESHOLD_RATIO = 0.80; // 80%
export const AUTO_REPLACE_THRESHOLD_BYTES = Math.floor(MAX_STORAGE_BYTES * AUTO_REPLACE_THRESHOLD_RATIO); // 400 MB
export const MAX_HISTORY_SNAPSHOTS = 30; // Maksimal 30 posisi harian terakhir

export const DEFAULT_SNAPSHOT_META = {
  id: 'default_r05_13nov2026',
  fileName: 'BranchIQ_Score_R05_13_November_2026_update_16.11.26_Kirim.xlsx',
  realizationDate: '13 November 2026',
  label: 'Posisi 13 November 2026 (Baseline R05)',
  uploadedAt: '2026-11-16T08:00:00.000Z',
  uploadedBy: 'michael',
  score10125: 85.53,
  rank10125: 43,
  totalBranches: 163,
  sizeBytes: 1250000, // ~1.20 MB baseline dataset
  isDefault: true
};

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
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasDefault = parsed.some(x => x.id === DEFAULT_SNAPSHOT_META.id);
        return hasDefault ? parsed : [...parsed, DEFAULT_SNAPSHOT_META];
      }
    }
  } catch (e) {
    console.warn('Gagal membaca metadata riwayat Excel:', e);
  }
  return [DEFAULT_SNAPSHOT_META];
}

export function saveExcelHistoryMetaList(list) {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Gagal menyimpan metadata riwayat Excel:', e);
  }
}

/**
 * Hitung total pemakaian memori riwayat saat ini terhadap kuota 500 MB (dan ambang 80% = 400 MB)
 */
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

/**
 * Simpan snapshot Excel baru dengan mekanisme Auto-Replace otomatis:
 * 1. Jika ada snapshot lama dengan Tanggal Posisi (realizationDate) yang sama, otomatis di-replace agar tidak duplikat.
 * 2. Jika total ukuran memori + snapshot baru mencapai >= 80% dari 500 MB (400 MB) atau jumlah snapshot > MAX_HISTORY_SNAPSHOTS,
 *    otomatis menghapus (auto-replace) snapshot paling lama (FIFO) sampai memori kembali aman di bawah 80%.
 */
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

  // Hitung ukuran byte payload secara akurat
  let sizeBytes = 1500000;
  try {
    const serialized = JSON.stringify(payloadObj);
    sizeBytes = new Blob([serialized]).size;
  } catch (e) {
    sizeBytes = 1500000;
  }

  let workingList = [...getExcelHistoryMetaList()];
  const replacedItems = [];

  // 1. Auto-Replace jika Tanggal Posisi Realisasi sama persis (kecuali baseline default)
  const cleanDate = String(realizationDate || '').trim().toLowerCase();
  if (cleanDate) {
    const duplicates = workingList.filter(
      x => !x.isDefault && String(x.realizationDate || '').trim().toLowerCase() === cleanDate
    );
    for (const dup of duplicates) {
      await deleteFromIdb(dup.id);
      replacedItems.push(dup.realizationDate);
    }
    workingList = workingList.filter(
      x => x.isDefault || String(x.realizationDate || '').trim().toLowerCase() !== cleanDate
    );
  }

  // 2. Auto-Replace (FIFO: hapus yang paling tua dulu) jika memori mencapai >= 80% (400 MB) atau melebihi batas jumlah snapshot
  const calcTotalBytes = (arr) => arr.reduce((s, item) => s + (Number(item.sizeBytes) || 1200000), 0);

  while (
    workingList.filter(x => !x.isDefault).length > 0 &&
    (calcTotalBytes(workingList) + sizeBytes >= AUTO_REPLACE_THRESHOLD_BYTES ||
      workingList.length >= MAX_HISTORY_SNAPSHOTS)
  ) {
    // Cari snapshot non-default paling tua (di urutan paling bawah sebelum default)
    const nonDefaults = workingList.filter(x => !x.isDefault);
    const oldest = nonDefaults[nonDefaults.length - 1];
    if (!oldest) break;

    await deleteFromIdb(oldest.id);
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
    score10125: rank10125Obj?.totalScore ?? 85.53,
    rank10125: rank10125Obj?.totalRank ?? 43,
    totalBranches: parsedWorkbook?.branches?.length || 163,
    sizeBytes,
    autoReplacedCount: replacedItems.length,
    isDefault: false
  };

  // Simpan payload ke IndexedDB
  try {
    const db = await openHistoryIdb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({
        id,
        meta,
        payload: payloadObj
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Gagal menyimpan payload Excel ke IndexedDB:', e);
  }

  const nextList = [meta, ...workingList.filter(x => x.id !== id)];
  saveExcelHistoryMetaList(nextList);

  return { meta, list: nextList, replacedItems };
}

export async function loadExcelSnapshotPayload(snapshotId) {
  if (!snapshotId || snapshotId === DEFAULT_SNAPSHOT_META.id) {
    return null;
  }
  try {
    const db = await openHistoryIdb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(snapshotId);
      req.onsuccess = () => resolve(req.result?.payload || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Gagal memuat snapshot Excel dari IndexedDB:', e);
    return null;
  }
}

export async function deleteExcelSnapshotFromHistory(snapshotId) {
  if (!snapshotId || snapshotId === DEFAULT_SNAPSHOT_META.id) {
    return getExcelHistoryMetaList();
  }
  await deleteFromIdb(snapshotId);
  const nextList = getExcelHistoryMetaList().filter(x => x.id !== snapshotId);
  saveExcelHistoryMetaList(nextList);
  return nextList;
}

/**
 * Hapus seluruh riwayat lama dan hanya sisakan posisi paling baru + baseline default
 */
export async function pruneOldSnapshotsKeepLatest(activeSnapshotId) {
  const currentList = getExcelHistoryMetaList();
  const nonDefaults = currentList.filter(x => !x.isDefault);
  if (nonDefaults.length <= 1) return currentList;

  const keepId = activeSnapshotId && activeSnapshotId !== DEFAULT_SNAPSHOT_META.id
    ? activeSnapshotId
    : nonDefaults[0].id;

  const toDelete = nonDefaults.filter(x => x.id !== keepId);
  for (const item of toDelete) {
    await deleteFromIdb(item.id);
  }

  const nextList = currentList.filter(x => x.isDefault || x.id === keepId);
  saveExcelHistoryMetaList(nextList);
  return nextList;
}
