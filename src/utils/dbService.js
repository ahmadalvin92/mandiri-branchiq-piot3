/**
 * Database & RBAC Service for BranchIQ Mandiri
 * Synchronizes state with Backend API (/api/db & /api/db/sync -> data/branchiq_db.json)
 * and localStorage fallback for instant reactivity.
 */

import { supabase } from './supabaseClient';

export const DEFAULT_PASSWORD = 'mandiri123';
export const STORAGE_KEY_DB = 'branchiq_master_db_v2';

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
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DB);
    if (raw) {
      const parsed = JSON.parse(raw);
      const users = ensureRequiredUsers(parsed.users);
      return {
        users,
        masterTargets: parsed.masterTargets || {},
        masterStrategies: parsed.masterStrategies || {},
        viewerSimulations: Array.isArray(parsed.viewerSimulations) ? parsed.viewerSimulations : [],
        timestandConfig: parsed.timestandConfig || { ...DEFAULT_TIMESTAND_CONFIG }
      };
    }
  } catch (e) {
    console.warn('Failed reading local DB state:', e);
  }
  return {
    users: [...INITIAL_USERS],
    masterTargets: {},
    masterStrategies: {},
    viewerSimulations: [],
    timestandConfig: { ...DEFAULT_TIMESTAND_CONFIG }
  };
}

export async function fetchServerDb() {
  // 1. Coba ambil dari Supabase Cloud Database terlebih dahulu
  if (supabase) {
    try {
      const [usersRes, targetsRes, stratsRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('master_targets').select('*'),
        supabase.from('master_strategies').select('*')
      ]);

      if (!usersRes.error && usersRes.data && usersRes.data.length > 0) {
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
        if (targetsRes.data) {
          targetsRes.data.forEach(t => {
            masterTargets[t.key] = {
              target: Number(t.target_value),
              updatedBy: t.updated_by,
              updatedAt: t.updated_at
            };
          });
        }

        const masterStrategies = {};
        if (stratsRes.data) {
          stratsRes.data.forEach(s => {
            masterStrategies[s.key] = {
              strategyText: s.strategy_text,
              scope: s.scope,
              tacticalActions: typeof s.tactical_actions === 'string' ? JSON.parse(s.tactical_actions || '[]') : (s.tactical_actions || []),
              updatedBy: s.updated_by,
              updatedAt: s.updated_at
            };
          });
        }

        const cloudDb = {
          users,
          masterTargets,
          masterStrategies,
          viewerSimulations: [],
          timestandConfig: { ...DEFAULT_TIMESTAND_CONFIG }
        };
        localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(cloudDb));
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
        data.users = ensureRequiredUsers(data.users);
        localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(data));
        return data;
      }
    }
  } catch (e) {
    // Fallback to localStorage if offline/static build
  }
  return getInitialDbState();
}

export async function persistDbState(newDb) {
  // 1. Simpan ke localStorage lokal
  try {
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(newDb));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }

  // 2. Simpan ke Supabase Cloud
  if (supabase) {
    try {
      if (Array.isArray(newDb.users)) {
        await supabase.from('users').upsert(
          newDb.users.map(u => ({
            username: u.username,
            display_name: u.displayName || u.username,
            password: u.password || DEFAULT_PASSWORD,
            role: u.role || 'viewer',
            jabatan: u.jabatan || 'Pegawai Cabang',
            updated_at: new Date().toISOString()
          }))
        );
      }
      if (newDb.masterTargets) {
        const targetRows = Object.entries(newDb.masterTargets).map(([key, val]) => {
          const parts = key.split('_');
          return {
            key,
            branch_code: parts[0] || '10125',
            row_id: Number(parts[1]) || 0,
            target_value: Number(val.target || 0),
            updated_by: val.updatedBy || 'michael',
            updated_at: val.updatedAt || new Date().toISOString()
          };
        });
        if (targetRows.length > 0) {
          await supabase.from('master_targets').upsert(targetRows);
        }
      }
      if (newDb.masterStrategies) {
        const stratRows = Object.entries(newDb.masterStrategies).map(([key, val]) => {
          const branchCode = key.startsWith('b') ? key.split('~')[0].slice(1) : 'all';
          const rowId = Number(key.split('~')[1]) || 0;
          return {
            key,
            branch_code: branchCode,
            row_id: rowId,
            scope: val.scope || (branchCode === 'all' ? 'all' : 'branch'),
            strategy_text: val.strategyText || '',
            tactical_actions: val.tacticalActions || [],
            updated_by: val.updatedBy || 'michael',
            updated_at: val.updatedAt || new Date().toISOString()
          };
        });
        if (stratRows.length > 0) {
          await supabase.from('master_strategies').upsert(stratRows);
        }
      }
    } catch (e) {
      console.warn('Supabase cloud persist info:', e?.message || e);
    }
  }

  // 3. Sync ke local dev server
  try {
    await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDb)
    });
  } catch (e) {
    // Ignore network errors on static preview
  }
  return newDb;
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
