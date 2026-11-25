/**
 * Database & RBAC Service for BranchIQ Mandiri
 * Synchronizes state with Supabase Cloud Database (PostgreSQL + Realtime),
 * Backend API fallback (/api/db), and localStorage cache.
 */

import { supabase } from './supabaseClient.js';

export const DEFAULT_PASSWORD = 'mandiri123';
export const STORAGE_KEY_DB = 'branchiq_master_db_v2';

// Reserved system keys stored inside master_strategies (scope: 'system')
export const SYS_KEY_TIMESTAND = '__sys_timestand_config__';
export const SYS_KEY_SIMULATIONS = '__sys_viewer_simulations__';
export const SYS_KEY_ACTIVE_SNAPSHOT = '__sys_active_snapshot__';
export const SYS_KEY_MASTER_REALS = '__sys_master_reals__';

export const INITIAL_USERS = [
  // Superadmin Accounts
  {
    username: 'superadmin',
    displayName: 'Super Administrator',
    password: DEFAULT_PASSWORD,
    role: 'superadmin',
    jabatan: 'System Superadmin & IT',
    createdAt: '2026-11-16T08:00:00Z',
    updatedAt: '2026-11-16T08:00:00Z'
  },
  {
    username: 'alvin.superadmin',
    displayName: 'Alvin (Superadmin)',
    password: DEFAULT_PASSWORD,
    role: 'superadmin',
    jabatan: 'Superadmin & System Architect',
    createdAt: '2026-11-17T08:00:00Z',
    updatedAt: '2026-11-17T08:00:00Z'
  },
  {
    username: 'michael.superadmin',
    displayName: 'Michael Danniel (Superadmin)',
    password: DEFAULT_PASSWORD,
    role: 'superadmin',
    jabatan: 'Kepala Cabang & Superadmin',
    createdAt: '2026-11-17T08:00:00Z',
    updatedAt: '2026-11-17T08:00:00Z'
  },
  {
    username: 'amalia.superadmin',
    displayName: 'Amalia (Superadmin)',
    password: DEFAULT_PASSWORD,
    role: 'superadmin',
    jabatan: 'Superadmin Cabang',
    createdAt: '2026-11-17T08:00:00Z',
    updatedAt: '2026-11-17T08:00:00Z'
  },

  // Admin / Konseptor Accounts
  {
    username: 'michael',
    displayName: 'Michael Danniel',
    password: DEFAULT_PASSWORD,
    role: 'admin',
    jabatan: 'Kepala Cabang / Konseptor Utama',
    createdAt: '2026-11-16T08:00:00Z',
    updatedAt: '2026-11-16T08:00:00Z'
  },
  {
    username: 'alvin.admin',
    displayName: 'Alvin (Admin)',
    password: DEFAULT_PASSWORD,
    role: 'admin',
    jabatan: 'Admin / Konseptor Cabang',
    createdAt: '2026-11-17T08:00:00Z',
    updatedAt: '2026-11-17T08:00:00Z'
  },
  {
    username: 'amal.admin',
    displayName: 'Amal (Admin)',
    password: DEFAULT_PASSWORD,
    role: 'admin',
    jabatan: 'Admin / Konseptor Cabang',
    createdAt: '2026-11-17T08:00:00Z',
    updatedAt: '2026-11-17T08:00:00Z'
  },

  // Viewer Accounts
  { username: 'rian', displayName: 'Rian', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'dina', displayName: 'Dina', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'disa', displayName: 'Disa', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'fia', displayName: 'Fia', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'wardah', displayName: 'Wardah', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'embun', displayName: 'Embun', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'febri', displayName: 'Febri', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'arga', displayName: 'Arga', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'arsya', displayName: 'Arsya', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'akbar', displayName: 'Akbar', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'dimas', displayName: 'Dimas', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'rafli', displayName: 'Rafli', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'alvin', displayName: 'Alvin', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'amalia', displayName: 'Amalia', password: DEFAULT_PASSWORD, role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' }
];

export const DEFAULT_TIMESTAND_CONFIG = {
  startDate: '2026-11-16',
  endDate: '2026-11-30',
  calendarId: 'id.indonesian#holiday@group.v.calendar.google.com',
  googleApiKey: '',
  customHolidays: [],
  updatedBy: 'michael',
  updatedAt: '2026-11-16T08:00:00Z'
};

function safeReadLocalDb() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DB);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function safeWriteLocalDb(data) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

/**
 * Normalize masterTargets map so every entry is a finite plain Number
 */
export function normalizeMasterTargets(rawTargets = {}) {
  const out = {};
  if (!rawTargets || typeof rawTargets !== 'object') return out;
  Object.entries(rawTargets).forEach(([key, val]) => {
    if (!key || val === null || val === undefined) return;
    const rawNum = typeof val === 'object' ? val.target : val;
    if (rawNum === null || rawNum === undefined || rawNum === '') return;
    const num = Number(rawNum);
    if (Number.isFinite(num) && num >= 0) {
      out[key] = num;
    }
  });
  return out;
}

/**
 * Normalize masterReals map so every entry is a finite plain Number
 */
export function normalizeMasterReals(rawReals = {}) {
  const out = {};
  if (!rawReals || typeof rawReals !== 'object') return out;
  Object.entries(rawReals).forEach(([key, val]) => {
    if (!key || val === null || val === undefined) return;
    const rawNum = typeof val === 'object' ? val.real : val;
    if (rawNum === null || rawNum === undefined || rawNum === '') return;
    const num = Number(rawNum);
    if (Number.isFinite(num) && num >= 0) {
      out[key] = num;
    }
  });
  return out;
}

/**
 * Normalize masterStrategies map so every non-system entry uses `{ text, scope, branchCode, rowId, updatedBy, updatedAt }`
 */
export function normalizeMasterStrategies(rawStrategies = {}) {
  const out = {};
  if (!rawStrategies || typeof rawStrategies !== 'object') return out;
  Object.entries(rawStrategies).forEach(([key, val]) => {
    if (!key || key.startsWith('__sys_') || !val) return;
    const textVal = typeof val === 'string'
      ? val
      : (val.text !== undefined ? val.text : val.strategyText);
    const cleanText = String(textVal || '').trim();
    if (!cleanText) return;

    const isGlobal = key.startsWith('g~');
    const inferredBranch = isGlobal ? 'all' : (key.startsWith('b') ? key.split('~')[0].slice(1) : '10125');
    const inferredRowId = Number(key.split('~')[1]) || Number(val.rowId) || 0;

    out[key] = {
      text: cleanText,
      scope: val.scope === 'all' || isGlobal ? 'all' : 'branch',
      branchCode: val.branchCode || inferredBranch,
      rowId: inferredRowId,
      tacticalActions: Array.isArray(val.tacticalActions) ? val.tacticalActions : cleanText.split('\n').filter(Boolean),
      updatedBy: val.updatedBy || 'michael',
      updatedAt: val.updatedAt || new Date().toISOString()
    };
  });
  return out;
}

/**
 * Ensure all baseline INITIAL_USERS exist in any loaded users array
 */
export function ensureRequiredUsers(existingUsers = []) {
  const map = new Map();
  if (Array.isArray(existingUsers)) {
    existingUsers.forEach(u => {
      if (u && u.username) {
        map.set(u.username.toLowerCase(), u);
      }
    });
  }
  INITIAL_USERS.forEach(initUser => {
    const key = initUser.username.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { ...initUser });
    }
  });
  return Array.from(map.values());
}

export function getInitialDbState() {
  const parsed = safeReadLocalDb();
  if (parsed) {
    const users = ensureRequiredUsers(parsed.users);
    return {
      users,
      masterTargets: normalizeMasterTargets(parsed.masterTargets || {}),
      masterReals: normalizeMasterReals(parsed.masterReals || {}),
      masterStrategies: normalizeMasterStrategies(parsed.masterStrategies || {}),
      viewerSimulations: Array.isArray(parsed.viewerSimulations) ? parsed.viewerSimulations : [],
      timestandConfig: { ...DEFAULT_TIMESTAND_CONFIG, ...(parsed.timestandConfig || {}) },
      officialActiveSnapshotId: parsed.officialActiveSnapshotId || null
    };
  }
  return {
    users: [...INITIAL_USERS],
    masterTargets: {},
    masterReals: {},
    masterStrategies: {},
    viewerSimulations: [],
    timestandConfig: { ...DEFAULT_TIMESTAND_CONFIG },
    officialActiveSnapshotId: null
  };
}

// Serialized write queue to prevent rapid concurrent Supabase writes from racing out of order
let persistQueue = Promise.resolve();

export async function fetchServerDb() {
  const localFallback = safeReadLocalDb();

  // 1. Ambil dari Supabase Cloud Database terlebih dahulu
  if (supabase) {
    try {
      const [usersRes, targetsRes, stratsRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('master_targets').select('*'),
        supabase.from('master_strategies').select('*')
      ]);

      if (!usersRes.error && !targetsRes.error && !stratsRes.error && Array.isArray(usersRes.data)) {
        let users = usersRes.data.map(u => ({
          username: u.username,
          displayName: u.display_name,
          password: u.password,
          role: u.role,
          jabatan: u.jabatan,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        }));
        users = ensureRequiredUsers(users);

        const masterTargets = {};
        if (Array.isArray(targetsRes.data)) {
          targetsRes.data.forEach(t => {
            const num = Number(t.target_value);
            if (t.key && Number.isFinite(num) && num >= 0) {
              masterTargets[t.key] = num;
            }
          });
        }

        const masterStrategies = {};
        let cloudMasterReals = null;
        let cloudTimestand = null;
        let cloudSimulations = null;
        let officialActiveSnapshotId = null;

        if (Array.isArray(stratsRes.data)) {
          stratsRes.data.forEach(s => {
            if (!s || !s.key) return;
            const parsedActions = typeof s.tactical_actions === 'string'
              ? (() => { try { return JSON.parse(s.tactical_actions || '[]'); } catch { return []; } })()
              : s.tactical_actions;

            if (s.key === SYS_KEY_MASTER_REALS) {
              if (parsedActions && typeof parsedActions === 'object' && !Array.isArray(parsedActions)) {
                cloudMasterReals = normalizeMasterReals(parsedActions);
              }
              return;
            }
            if (s.key === SYS_KEY_TIMESTAND) {
              if (parsedActions && typeof parsedActions === 'object' && !Array.isArray(parsedActions)) {
                cloudTimestand = { ...DEFAULT_TIMESTAND_CONFIG, ...parsedActions };
              }
              return;
            }
            if (s.key === SYS_KEY_SIMULATIONS) {
              if (Array.isArray(parsedActions)) {
                cloudSimulations = parsedActions;
              }
              return;
            }
            if (s.key === SYS_KEY_ACTIVE_SNAPSHOT) {
              const snapId = (parsedActions && typeof parsedActions === 'object' && !Array.isArray(parsedActions))
                ? parsedActions.activeSnapshotId
                : s.strategy_text;
              if (snapId) officialActiveSnapshotId = String(snapId);
              return;
            }

            const cleanText = String(s.strategy_text || '').trim();
            if (!cleanText) return;
            masterStrategies[s.key] = {
              text: cleanText,
              scope: s.scope === 'all' ? 'all' : 'branch',
              branchCode: s.branch_code || (s.scope === 'all' ? 'all' : '10125'),
              rowId: Number(s.row_id) || Number(s.key.split('~')[1]) || 0,
              tacticalActions: Array.isArray(parsedActions) ? parsedActions : cleanText.split('\n').filter(Boolean),
              updatedBy: s.updated_by || 'michael',
              updatedAt: s.updated_at || new Date().toISOString()
            };
          });
        }

        const cloudDb = {
          users,
          masterTargets,
          masterReals: cloudMasterReals !== null
            ? cloudMasterReals
            : normalizeMasterReals(localFallback?.masterReals || {}),
          masterStrategies,
          viewerSimulations: cloudSimulations !== null
            ? cloudSimulations
            : (Array.isArray(localFallback?.viewerSimulations) ? localFallback.viewerSimulations : []),
          timestandConfig: cloudTimestand !== null
            ? cloudTimestand
            : { ...DEFAULT_TIMESTAND_CONFIG, ...(localFallback?.timestandConfig || {}) },
          officialActiveSnapshotId
        };
        safeWriteLocalDb(cloudDb);
        return cloudDb;
      }
    } catch (e) {
      console.warn('Supabase DB fetch info:', e?.message || e);
    }
  }

  // 2. Fallback ke endpoint API dev server lokal
  try {
    const res = await fetch('/api/db', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.users)) {
        const normalized = {
          users: ensureRequiredUsers(data.users),
          masterTargets: normalizeMasterTargets(data.masterTargets || {}),
          masterReals: normalizeMasterReals(data.masterReals || {}),
          masterStrategies: normalizeMasterStrategies(data.masterStrategies || {}),
          viewerSimulations: Array.isArray(data.viewerSimulations) ? data.viewerSimulations : [],
          timestandConfig: { ...DEFAULT_TIMESTAND_CONFIG, ...(data.timestandConfig || {}) },
          officialActiveSnapshotId: data.officialActiveSnapshotId || null
        };
        safeWriteLocalDb(normalized);
        return normalized;
      }
    }
  } catch (e) {
    // Fallback to localStorage if offline/static build
  }
  return getInitialDbState();
}

export async function persistDbState(newDb, options = {}) {
  const {
    changed = ['users', 'masterTargets', 'masterReals', 'masterStrategies', 'timestandConfig', 'viewerSimulations'],
    actor = 'michael',
    officialActiveSnapshotId
  } = options || {};

  const normalizedDb = {
    users: ensureRequiredUsers(newDb.users || []),
    masterTargets: normalizeMasterTargets(newDb.masterTargets || {}),
    masterReals: normalizeMasterReals(newDb.masterReals || {}),
    masterStrategies: normalizeMasterStrategies(newDb.masterStrategies || {}),
    viewerSimulations: Array.isArray(newDb.viewerSimulations) ? newDb.viewerSimulations : [],
    timestandConfig: { ...DEFAULT_TIMESTAND_CONFIG, ...(newDb.timestandConfig || {}) },
    officialActiveSnapshotId: officialActiveSnapshotId !== undefined
      ? officialActiveSnapshotId
      : (newDb.officialActiveSnapshotId || null)
  };

  // 1. Simpan segera ke localStorage lokal
  safeWriteLocalDb(normalizedDb);

  const runCloudPersist = async () => {
    const errors = [];
    const changedSet = new Set(Array.isArray(changed) ? changed : []);

    // 2. Simpan ke Supabase Cloud (scoped & serialized)
    if (supabase) {
      try {
        if (changedSet.has('users')) {
          const userRows = normalizedDb.users.map(u => ({
            username: u.username,
            display_name: u.displayName || u.username,
            password: u.password || DEFAULT_PASSWORD,
            role: u.role || 'viewer',
            jabatan: u.jabatan || 'Pegawai Cabang',
            updated_at: new Date().toISOString()
          }));
          if (userRows.length > 0) {
            const { error } = await supabase.from('users').upsert(userRows);
            if (error) errors.push(`users upsert: ${error.message}`);
          }
          const { data: existingUsers, error: fetchUErr } = await supabase.from('users').select('username');
          if (!fetchUErr && Array.isArray(existingUsers)) {
            const keepUsernames = new Set(normalizedDb.users.map(u => u.username));
            const toDeleteUsers = existingUsers
              .map(u => u.username)
              .filter(uname => uname !== 'superadmin' && !keepUsernames.has(uname));
            if (toDeleteUsers.length > 0) {
              const { error: delUErr } = await supabase.from('users').delete().in('username', toDeleteUsers);
              if (delUErr) errors.push(`users delete: ${delUErr.message}`);
            }
          }
        }

        if (changedSet.has('masterTargets')) {
          const targetRows = Object.entries(normalizedDb.masterTargets).map(([key, val]) => {
            const parts = key.split('_');
            const numVal = typeof val === 'object' && val !== null ? Number(val.target) : Number(val);
            return {
              key,
              branch_code: parts[0] || '10125',
              row_id: Number(parts[1]) || 0,
              target_value: numVal,
              updated_by: actor || 'michael',
              updated_at: new Date().toISOString()
            };
          }).filter(r => Number.isFinite(r.target_value));

          if (targetRows.length > 0) {
            const { error } = await supabase.from('master_targets').upsert(targetRows);
            if (error) errors.push(`master_targets upsert: ${error.message}`);
          }

          const { data: existingTargets, error: fetchTErr } = await supabase.from('master_targets').select('key');
          if (!fetchTErr && Array.isArray(existingTargets)) {
            const keepKeys = new Set(targetRows.map(r => r.key));
            const toDeleteKeys = existingTargets.map(r => r.key).filter(k => !keepKeys.has(k));
            if (toDeleteKeys.length > 0) {
              const { error: delTErr } = await supabase.from('master_targets').delete().in('key', toDeleteKeys);
              if (delTErr) errors.push(`master_targets delete: ${delTErr.message}`);
            }
          }
        }

        if (changedSet.has('masterStrategies')) {
          const stratRows = Object.entries(normalizedDb.masterStrategies).map(([key, val]) => {
            const cleanText = String(typeof val === 'string' ? val : (val.text ?? val.strategyText ?? '')).trim();
            const isGlobal = key.startsWith('g~');
            const branchCode = val.branchCode || (isGlobal ? 'all' : (key.startsWith('b') ? key.split('~')[0].slice(1) : '10125'));
            const rowId = Number(val.rowId) || Number(key.split('~')[1]) || 0;
            return {
              key,
              branch_code: branchCode,
              row_id: rowId,
              scope: val.scope === 'all' || isGlobal ? 'all' : 'branch',
              strategy_text: cleanText,
              tactical_actions: Array.isArray(val.tacticalActions) ? val.tacticalActions : cleanText.split('\n').filter(Boolean),
              updated_by: val.updatedBy || actor || 'michael',
              updated_at: val.updatedAt || new Date().toISOString()
            };
          }).filter(r => r.strategy_text.length > 0);

          if (stratRows.length > 0) {
            const { error } = await supabase.from('master_strategies').upsert(stratRows);
            if (error) errors.push(`master_strategies upsert: ${error.message}`);
          }

          const { data: existingStrats, error: fetchSErr } = await supabase.from('master_strategies').select('key');
          if (!fetchSErr && Array.isArray(existingStrats)) {
            const keepKeys = new Set(stratRows.map(r => r.key));
            const toDeleteKeys = existingStrats
              .map(r => r.key)
              .filter(k => !k.startsWith('__sys_') && !keepKeys.has(k));
            if (toDeleteKeys.length > 0) {
              const { error: delSErr } = await supabase.from('master_strategies').delete().in('key', toDeleteKeys);
              if (delSErr) errors.push(`master_strategies delete: ${delSErr.message}`);
            }
          }
        }

        if (changedSet.has('masterReals')) {
          const { error } = await supabase.from('master_strategies').upsert({
            key: SYS_KEY_MASTER_REALS,
            branch_code: 'sys',
            row_id: -4,
            scope: 'system',
            strategy_text: 'master_reals',
            tactical_actions: normalizedDb.masterReals,
            updated_by: actor || 'michael',
            updated_at: new Date().toISOString()
          });
          if (error) errors.push(`master_reals upsert: ${error.message}`);
        }

        if (changedSet.has('timestandConfig')) {
          const { error } = await supabase.from('master_strategies').upsert({
            key: SYS_KEY_TIMESTAND,
            branch_code: 'sys',
            row_id: -1,
            scope: 'system',
            strategy_text: 'timestand_config',
            tactical_actions: normalizedDb.timestandConfig,
            updated_by: normalizedDb.timestandConfig?.updatedBy || actor || 'michael',
            updated_at: new Date().toISOString()
          });
          if (error) errors.push(`timestand upsert: ${error.message}`);
        }

        if (changedSet.has('viewerSimulations')) {
          const { error } = await supabase.from('master_strategies').upsert({
            key: SYS_KEY_SIMULATIONS,
            branch_code: 'sys',
            row_id: -2,
            scope: 'system',
            strategy_text: 'viewer_simulations',
            tactical_actions: normalizedDb.viewerSimulations,
            updated_by: actor || 'viewer',
            updated_at: new Date().toISOString()
          });
          if (error) errors.push(`viewer_simulations upsert: ${error.message}`);
        }

        if (officialActiveSnapshotId !== undefined) {
          const { error } = await supabase.from('master_strategies').upsert({
            key: SYS_KEY_ACTIVE_SNAPSHOT,
            branch_code: 'sys',
            row_id: -3,
            scope: 'system',
            strategy_text: String(officialActiveSnapshotId || ''),
            tactical_actions: {
              activeSnapshotId: String(officialActiveSnapshotId || ''),
              updatedBy: actor || 'superadmin',
              updatedAt: new Date().toISOString()
            },
            updated_by: actor || 'superadmin',
            updated_at: new Date().toISOString()
          });
          if (error) errors.push(`official_snapshot upsert: ${error.message}`);
        }
      } catch (e) {
        errors.push(e?.message || String(e));
        console.warn('Supabase cloud persist info:', e?.message || e);
      }
    }

    // 3. Sync ke local dev server (hanya di Vite Dev atau jika Supabase fallback gagal)
    const isViteDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
    if ((isViteDev || !supabase || errors.length > 0) && typeof fetch === 'function') {
      try {
        await fetch('/api/db/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedDb)
        });
      } catch (e) {
        // Ignore network errors on static/Node environments
      }
    }

    if (errors.length > 0) {
      console.warn('Supabase sync reported errors:', errors);
    }

    return { ok: errors.length === 0, errors, db: normalizedDb };
  };

  persistQueue = persistQueue.then(runCloudPersist, runCloudPersist);
  return persistQueue;
}

/**
 * Persist which Excel Snapshot is the official active version for all Viewers & devices
 */
export async function persistOfficialActiveSnapshot(snapshotId, actor = 'superadmin') {
  const local = getInitialDbState();
  const nextDb = {
    ...local,
    officialActiveSnapshotId: snapshotId || null
  };
  safeWriteLocalDb(nextDb);

  if (!supabase) return { ok: true, officialActiveSnapshotId: snapshotId };

  const run = async () => {
    try {
      const { error } = await supabase.from('master_strategies').upsert({
        key: SYS_KEY_ACTIVE_SNAPSHOT,
        branch_code: 'sys',
        row_id: -3,
        scope: 'system',
        strategy_text: String(snapshotId || ''),
        tactical_actions: {
          activeSnapshotId: String(snapshotId || ''),
          updatedBy: actor || 'superadmin',
          updatedAt: new Date().toISOString()
        },
        updated_by: actor || 'superadmin',
        updated_at: new Date().toISOString()
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, officialActiveSnapshotId: snapshotId };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  };

  persistQueue = persistQueue.then(run, run);
  return persistQueue;
}

/**
 * Subscribe to Supabase Realtime Postgres changes across Master Targets, Strategies, Users, and Snapshots
 */
export function subscribeToCloudDbChanges(onRemoteChange) {
  if (!supabase || typeof onRemoteChange !== 'function') {
    return () => { };
  }
  try {
    const channel = supabase
      .channel(`branchiq-cloud-sync-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'master_targets' }, (payload) => {
        onRemoteChange('master_targets', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'master_strategies' }, (payload) => {
        onRemoteChange('master_strategies', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        onRemoteChange('users', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'excel_snapshots' }, (payload) => {
        onRemoteChange('excel_snapshots', payload);
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // ignore cleanup error
      }
    };
  } catch (e) {
    return () => { };
  }
}

/**
 * Role permission helpers
 */
export function isSuperadmin(user) {
  if (!user) return false;
  const uname = String(user.username || '').toLowerCase();
  return Boolean(
    user.role === 'superadmin' ||
    uname === 'superadmin' ||
    uname.endsWith('.superadmin')
  );
}

export function isKonseptorOrAdmin(user) {
  if (!user) return false;
  const uname = String(user.username || '').toLowerCase();
  return Boolean(
    user.role === 'superadmin' ||
    user.role === 'admin' ||
    uname === 'superadmin' ||
    uname === 'michael' ||
    uname.endsWith('.superadmin') ||
    uname.endsWith('.admin')
  );
}

export function isViewer(user) {
  return Boolean(user && !isKonseptorOrAdmin(user));
}

export function getRoleLabel(role) {
  if (role === 'superadmin') return 'Superadmin';
  if (role === 'admin') return 'Admin / Konseptor';
  return 'Viewer';
}
