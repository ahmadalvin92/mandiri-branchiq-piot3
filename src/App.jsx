import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { CategoryCharts } from './components/CategoryCharts';
import { MetricsTable } from './components/MetricsTable';
import { MetricDetailDrawer } from './components/MetricDetailDrawer';
import { FileUploadModal } from './components/FileUploadModal';
import { PrintReport } from './components/PrintReport';
import { BranchComparisonModal } from './components/BranchComparisonModal';
import { LoginPage } from './components/LoginPage';
import { UserManagementCMS } from './components/UserManagementCMS';
import { TimestandControl } from './components/TimestandControl';
import { SimulationManagerBar } from './components/SimulationManagerBar';

// Pre-calculated default dataset for KC Jakarta Pondok Indah Office 3 (Branch 10125)
import default10125Data from './data/default10125.json';
import defaultBranches from './data/branches.json';
import defaultMetricDefs from './data/metricDefinitions.json';
import allRankingsData from './data/allRankings.json';
import dbRowsData from './data/dbRows.json';

import {
  parseBranchIQWorkbook,
  calculateBranchScore,
  recalculateBranchWithOverrides
} from './utils/excelParser';

import {
  getInitialDbState,
  fetchServerDb,
  persistDbState,
  persistOfficialActiveSnapshot,
  subscribeToCloudDbChanges,
  isSuperadmin,
  isKonseptorOrAdmin
} from './utils/dbService';

import {
  FALLBACK_INDONESIAN_HOLIDAYS,
  fetchIndonesianHolidays,
  calculateTimestandWorkdays
} from './utils/googleCalendar';

import {
  DEFAULT_SNAPSHOT_META,
  getExcelHistoryMetaList,
  getLatestUploadedSnapshotId,
  syncCloudExcelHistory,
  saveExcelSnapshotToHistory,
  loadExcelSnapshotPayload,
  deleteExcelSnapshotFromHistory,
  pruneOldSnapshotsKeepLatest
} from './utils/excelHistoryService';

export function App() {
  // Persistent App Database State (Users, Master Targets/Strategies, Viewer Simulations, Timestand)
  const [dbState, setDbState] = useState(() => getInitialDbState());

  // Authentication & Session state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('branchiq_auth_user') || sessionStorage.getItem('branchiq_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  // Page navigation for Superadmin ('dashboard' | 'cms')
  const [activePage, setActivePage] = useState('dashboard');

  // Viewer Simulation Mode State
  const [isViewerSimMode, setIsViewerSimMode] = useState(false);
  const [activeSimulationId, setActiveSimulationId] = useState(null);
  const [viewerSimTargets, setViewerSimTargets] = useState({});
  const [viewerSimReals, setViewerSimReals] = useState({});
  const [viewerSimStrategies, setViewerSimStrategies] = useState({});

  // Google Calendar Indonesian Holidays State
  const [holidaysList, setHolidaysList] = useState(FALLBACK_INDONESIAN_HOLIDAYS);
  const [holidaySyncSource, setHolidaySyncSource] = useState('id.indonesian#holiday@group.v.calendar.google.com');
  const [isSyncingHolidays, setIsSyncingHolidays] = useState(false);

  // Current active branch and calculation state
  const [rawBranchData, setRawBranchData] = useState(default10125Data);
  const [branchesList, setBranchesList] = useState(defaultBranches);
  const [metricDefs, setMetricDefs] = useState(defaultMetricDefs);
  const [allRankings, setAllRankings] = useState(allRankingsData);
  const [cachedDbData, setCachedDbData] = useState(dbRowsData);

  // File upload & Daily Excel History state
  const [isCustomFileLoaded, setIsCustomFileLoaded] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [excelHistoryList, setExcelHistoryList] = useState(() => getExcelHistoryMetaList());
  const [activeSnapshotId, setActiveSnapshotId] = useState(() => {
    try {
      const stored = localStorage.getItem('branchiq_active_snapshot_id');
      const list = getExcelHistoryMetaList();
      if (stored && list.some(x => x.id === stored)) {
        return stored;
      }
    } catch (e) { }
    return DEFAULT_SNAPSHOT_META.id;
  });

  // Filters & Search — default filterUnderTarget = false so ALL Excel rows (DPK..GMM..Ekosistem) appear in exact order
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterUnderTarget, setFilterUnderTarget] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawers and Modals
  const [selectedMetricForDetail, setSelectedMetricForDetail] = useState(null);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [syncToast, setSyncToast] = useState(null);

  // Refs for race-free async cloud sync & callbacks
  const dbStateRef = useRef(dbState);
  dbStateRef.current = dbState;
  const lastLocalWriteAtRef = useRef(0);
  const activeSnapshotIdRef = useRef(activeSnapshotId);
  activeSnapshotIdRef.current = activeSnapshotId;
  const rawBranchCodeRef = useRef(rawBranchData.branchInfo?.code || '10125');
  rawBranchCodeRef.current = rawBranchData.branchInfo?.code || '10125';
  const toastTimerRef = useRef(null);

  const showSyncToast = useCallback((msg, type = 'success') => {
    setSyncToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSyncToast(null), 3500);
  }, []);

  const handleFetchDefaultExcel = useCallback(() => {
    fetch('/sample_branchiq.xlsx')
      .then(res => res.arrayBuffer())
      .then(buffer => parseBranchIQWorkbook(buffer))
      .then(parsed => {
        setCachedDbData(parsed.dbData);
        setBranchesList(parsed.branches);
        if (parsed.allRankings && parsed.allRankings.length > 50) {
          setAllRankings(parsed.allRankings);
        }
        if (parsed.metricDefs && parsed.metricDefs.length > 20) {
          setMetricDefs(parsed.metricDefs);
        }
      })
      .catch(err => {
        console.warn('Could not pre-fetch sample_branchiq.xlsx, using static default:', err);
      });
  }, []);

  const applySnapshotPayloadToState = useCallback((snapshotId, payload, historyList = []) => {
    if (!payload || !payload.dbData) return false;
    setCachedDbData(payload.dbData);
    setBranchesList(payload.branches || defaultBranches);
    setMetricDefs(payload.metricDefs || defaultMetricDefs);
    if (payload.allRankings && payload.allRankings.length > 0) {
      setAllRankings(payload.allRankings);
    }
    const currentCode = rawBranchCodeRef.current || '10125';
    const targetCode = payload.branches?.some(b => String(b.code) === String(currentCode))
      ? currentCode
      : (payload.branches?.[0]?.code || '10125');
    const meta = historyList.find(x => x.id === snapshotId);
    const calculated = calculateBranchScore(
      targetCode,
      payload.dbData,
      payload.metricDefs || defaultMetricDefs,
      payload.branches || defaultBranches,
      payload.realizationDate || meta?.realizationDate || '16 November 2026',
      payload.allRankings || allRankingsData
    );
    setRawBranchData(calculated);
    setIsCustomFileLoaded(true);
    setCustomFileName(meta?.fileName || '');
    setActiveSnapshotId(snapshotId);
    try {
      localStorage.setItem('branchiq_active_snapshot_id', snapshotId);
    } catch (e) { }
    return true;
  }, []);

  const syncAllFromCloud = useCallback(async ({ isInitial = false } = {}) => {
    try {
      const [loadedDb, cloudList] = await Promise.all([
        fetchServerDb(),
        syncCloudExcelHistory()
      ]);

      // 1. Update Master DB State unless a local edit just happened within the last 3.5 seconds
      const timeSinceWrite = Date.now() - lastLocalWriteAtRef.current;
      if (loadedDb && timeSinceWrite > 3500) {
        const prevStr = JSON.stringify({
          t: dbStateRef.current.masterTargets,
          s: dbStateRef.current.masterStrategies,
          tc: dbStateRef.current.timestandConfig,
          vs: dbStateRef.current.viewerSimulations,
          u: dbStateRef.current.users
        });
        const nextStr = JSON.stringify({
          t: loadedDb.masterTargets,
          s: loadedDb.masterStrategies,
          tc: loadedDb.timestandConfig,
          vs: loadedDb.viewerSimulations,
          u: loadedDb.users
        });
        if (prevStr !== nextStr || isInitial) {
          dbStateRef.current = loadedDb;
          setDbState(loadedDb);
          setCurrentUser(prevUser => {
            if (!prevUser || !Array.isArray(loadedDb.users)) return prevUser;
            const fresh = loadedDb.users.find(u => u.username.toLowerCase() === String(prevUser.username).toLowerCase());
            if (!fresh) return prevUser;
            if (fresh.role === prevUser.role && fresh.displayName === prevUser.displayName && fresh.jabatan === prevUser.jabatan) {
              return prevUser;
            }
            const updatedUser = { ...prevUser, role: fresh.role, displayName: fresh.displayName, jabatan: fresh.jabatan };
            try {
              if (localStorage.getItem('branchiq_auth_user')) localStorage.setItem('branchiq_auth_user', JSON.stringify(updatedUser));
              if (sessionStorage.getItem('branchiq_auth_user')) sessionStorage.setItem('branchiq_auth_user', JSON.stringify(updatedUser));
            } catch (e) {}
            return updatedUser;
          });
        }
      }

      // 2. Sync Excel Snapshot list & auto-select newest Cloud Upload for everyone
      const effectiveList = (cloudList && cloudList.length > 0) ? cloudList : getExcelHistoryMetaList();
      setExcelHistoryList(effectiveList);

      const latestCloudId = (loadedDb?.officialActiveSnapshotId && effectiveList.some(x => x.id === loadedDb.officialActiveSnapshotId))
        ? loadedDb.officialActiveSnapshotId
        : getLatestUploadedSnapshotId(effectiveList);

      let storedActiveId = null;
      let lastSeenCloudId = null;
      try {
        storedActiveId = localStorage.getItem('branchiq_active_snapshot_id');
        lastSeenCloudId = localStorage.getItem('branchiq_last_cloud_snapshot_id');
      } catch (e) {}

      let targetId = activeSnapshotIdRef.current || DEFAULT_SNAPSHOT_META.id;
      const isNewCloudArrival = Boolean(latestCloudId && latestCloudId !== lastSeenCloudId);
      const shouldAdoptCloud = Boolean(
        latestCloudId && (
          isNewCloudArrival ||
          !storedActiveId ||
          !effectiveList.some(x => x.id === storedActiveId) ||
          (storedActiveId === DEFAULT_SNAPSHOT_META.id && !lastSeenCloudId)
        )
      );

      if (shouldAdoptCloud && latestCloudId) {
        targetId = latestCloudId;
        try {
          localStorage.setItem('branchiq_active_snapshot_id', latestCloudId);
          localStorage.setItem('branchiq_last_cloud_snapshot_id', latestCloudId);
        } catch (e) {}
      } else if (isInitial) {
        targetId = (storedActiveId && effectiveList.some(x => x.id === storedActiveId))
          ? storedActiveId
          : (latestCloudId || DEFAULT_SNAPSHOT_META.id);
      }

      if (targetId && targetId !== DEFAULT_SNAPSHOT_META.id && (isInitial || targetId !== activeSnapshotIdRef.current || isNewCloudArrival)) {
        const payload = await loadExcelSnapshotPayload(targetId);
        if (payload && payload.dbData) {
          applySnapshotPayloadToState(targetId, payload, effectiveList);
        } else if (isInitial) {
          handleFetchDefaultExcel();
        }
      } else if (isInitial && targetId === DEFAULT_SNAPSHOT_META.id) {
        handleFetchDefaultExcel();
      }
    } catch (e) {
      console.warn('Cloud sync warning:', e?.message || e);
      if (isInitial) handleFetchDefaultExcel();
    }
  }, [applySnapshotPayloadToState, handleFetchDefaultExcel]);

  // Initial Cloud + Holidays sync, Realtime subscription, Focus & 15s background polling
  useEffect(() => {
    syncAllFromCloud({ isInitial: true });
    handleSyncGoogleCalendar();

    let debounceTimer = null;
    const scheduleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        syncAllFromCloud({ isInitial: false });
      }, 450);
    };

    const unsubscribeRealtime = subscribeToCloudDbChanges(() => {
      scheduleSync();
    });

    const handleWindowFocus = () => syncAllFromCloud({ isInitial: false });
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAllFromCloud({ isInitial: false });
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncAllFromCloud({ isInitial: false });
      }
    }, 15000);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribeRealtime();
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [syncAllFromCloud]);

  const updateAndPersistDb = (updater, options = {}) => {
    const next = typeof updater === 'function' ? updater(dbStateRef.current) : updater;
    dbStateRef.current = next;
    lastLocalWriteAtRef.current = Date.now();
    setDbState(next);

    const { toastMsg, ...persistOpts } = options || {};
    persistDbState(next, {
      ...persistOpts,
      actor: currentUser?.username || persistOpts.actor || 'michael'
    }).then((res) => {
      if (res && res.ok === false) {
        showSyncToast(`Gagal sinkron ke Cloud Supabase: ${res.errors?.[0] || 'Error koneksi'}`, 'error');
      } else if (toastMsg) {
        showSyncToast(toastMsg, 'success');
      }
    });
  };

  // Sync Google Calendar Holidays (id.indonesian#holiday@group.v.calendar.google.com)
  const handleSyncGoogleCalendar = async (customKey = '') => {
    setIsSyncingHolidays(true);
    try {
      const res = await fetchIndonesianHolidays(customKey || dbState.timestandConfig?.googleApiKey || '');
      if (res && Array.isArray(res.holidays)) {
        setHolidaysList(res.holidays);
        setHolidaySyncSource(res.source || 'id.indonesian#holiday@group.v.calendar.google.com');
      }
    } finally {
      setIsSyncingHolidays(false);
    }
  };

  const handleLogin = (userData) => {
    setCurrentUser(userData);
    setActivePage('dashboard');
    handleResetViewerSimDraft();
    syncAllFromCloud({ isInitial: false });
  };

  const handleLogout = () => {
    localStorage.removeItem('branchiq_auth_user');
    sessionStorage.removeItem('branchiq_auth_user');
    setCurrentUser(null);
    setActivePage('dashboard');
    handleResetViewerSimDraft();
  };

  // RBAC Role Checks
  const isSuperadminUser = isSuperadmin(currentUser);
  const isKonseptor = isKonseptorOrAdmin(currentUser);

  // Master Branch Data (incorporating permanent Master Target overrides saved by Michael/Superadmin)
  const masterBranchData = useMemo(() => {
    return recalculateBranchWithOverrides(rawBranchData, dbState.masterTargets || {}, {});
  }, [rawBranchData, dbState.masterTargets]);

  // Active Displayed Branch Data (strictly isolated: Master Mode ALWAYS shows masterBranchData cleanly)
  const currentBranchData = useMemo(() => {
    if (!isViewerSimMode) return masterBranchData;
    return recalculateBranchWithOverrides(masterBranchData, viewerSimTargets, viewerSimReals, { isSimulationLayer: true });
  }, [masterBranchData, isViewerSimMode, viewerSimTargets, viewerSimReals]);

  // Timestand Effective Workdays Calculation
  const timestandSummary = useMemo(() => {
    return calculateTimestandWorkdays(
      dbState.timestandConfig?.startDate || '2026-11-16',
      dbState.timestandConfig?.endDate || '2026-11-30',
      holidaysList,
      dbState.timestandConfig?.customHolidays || []
    );
  }, [dbState.timestandConfig, holidaysList]);

  // Count how many Master Overrides exist for the current branch
  const masterOverridesCount = useMemo(() => {
    const code = String(rawBranchData.branchInfo?.code || '10125');
    const tgtCount = Object.keys(dbState.masterTargets || {}).filter(k => k.startsWith(`${code}_`)).length;
    const strCount = Object.keys(dbState.masterStrategies || {}).filter(k => k.startsWith(`b${code}~`) || k.startsWith('g~')).length;
    return tgtCount + strCount;
  }, [rawBranchData.branchInfo?.code, dbState.masterTargets, dbState.masterStrategies]);

  // ---------------- CMS USER MANAGEMENT HANDLERS (SUPERADMIN) ----------------
  const handleAddUser = (newUserObj) => {
    updateAndPersistDb((prev) => ({
      ...prev,
      users: [
        ...prev.users,
        {
          ...newUserObj,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    }), { changed: ['users'], toastMsg: `User "${newUserObj.username}" disimpan ke Cloud Supabase` });
  };

  const handleUpdateUser = (username, updates) => {
    updateAndPersistDb((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.username === username ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u
      )
    }), { changed: ['users'], toastMsg: `User "${username}" diperbarui di Cloud Supabase` });
    if (currentUser?.username === username) {
      const updatedSelf = { ...currentUser, ...updates };
      setCurrentUser(updatedSelf);
      localStorage.setItem('branchiq_auth_user', JSON.stringify(updatedSelf));
    }
  };

  const handleResetUserPassword = (username, newPassword) => {
    updateAndPersistDb((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.username === username ? { ...u, password: newPassword, updatedAt: new Date().toISOString() } : u
      )
    }), { changed: ['users'], toastMsg: `Password "${username}" diperbarui di Cloud Supabase` });
  };

  const handleDeleteUser = (username) => {
    updateAndPersistDb((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.username !== username)
    }), { changed: ['users'], toastMsg: `User "${username}" dihapus dari Cloud Supabase` });
  };

  // ---------------- MASTER TARGET & STRATEGY HANDLERS (MICHAEL / SUPERADMIN) ----------------
  const handleSaveMasterTarget = (branchCode, rowId, targetValue) => {
    if (!isKonseptor) return;
    const key = `${branchCode}_${rowId}`;
    updateAndPersistDb((prev) => ({
      ...prev,
      masterTargets: {
        ...(prev.masterTargets || {}),
        [key]: Number(targetValue)
      }
    }), { changed: ['masterTargets'], toastMsg: 'Target Master tersimpan ke Supabase & aktif untuk seluruh Viewer' });
  };

  const handleResetMasterTarget = (branchCode, rowId) => {
    if (!isKonseptor) return;
    const key = `${branchCode}_${rowId}`;
    updateAndPersistDb((prev) => {
      const nextTargets = { ...(prev.masterTargets || {}) };
      delete nextTargets[key];
      return {
        ...prev,
        masterTargets: nextTargets
      };
    }, { changed: ['masterTargets'], toastMsg: 'Target Master dikembalikan ke nilai asli Excel' });
  };

  const handleSaveMasterStrategy = (branchCode, rowId, strategyPayload) => {
    if (!isKonseptor) return;
    const scope = strategyPayload.scope === 'all' ? 'all' : 'branch';
    const key = scope === 'all' ? `g~${rowId}` : `b${branchCode}~${rowId}`;
    updateAndPersistDb((prev) => {
      const nextStrategies = { ...(prev.masterStrategies || {}) };
      if (!strategyPayload.text || !strategyPayload.text.trim()) {
        delete nextStrategies[key];
      } else {
        nextStrategies[key] = {
          text: strategyPayload.text.trim(),
          scope,
          branchCode: scope === 'all' ? 'all' : branchCode,
          rowId,
          updatedBy: currentUser?.username || 'michael',
          updatedAt: new Date().toISOString()
        };
      }
      return {
        ...prev,
        masterStrategies: nextStrategies
      };
    }, { changed: ['masterStrategies'], toastMsg: 'Strategi Master tersimpan ke Supabase & aktif untuk seluruh Viewer' });
  };

  const handleResetMasterStrategy = (branchCode, rowId) => {
    if (!isKonseptor) return;
    updateAndPersistDb((prev) => {
      const nextStrategies = { ...(prev.masterStrategies || {}) };
      delete nextStrategies[`b${branchCode}~${rowId}`];
      delete nextStrategies[`g~${rowId}`];
      return {
        ...prev,
        masterStrategies: nextStrategies
      };
    }, { changed: ['masterStrategies'], toastMsg: 'Strategi Master dikembalikan ke bawaan' });
  };

  const handleResetAllMasterOverrides = () => {
    if (!isKonseptor) return;
    const code = String(rawBranchData.branchInfo?.code || '10125');
    updateAndPersistDb((prev) => {
      const nextTargets = { ...(prev.masterTargets || {}) };
      Object.keys(nextTargets).forEach((k) => {
        if (k.startsWith(`${code}_`)) delete nextTargets[k];
      });
      const nextStrategies = { ...(prev.masterStrategies || {}) };
      Object.keys(nextStrategies).forEach((k) => {
        if (k.startsWith(`b${code}~`)) delete nextStrategies[k];
      });
      return {
        ...prev,
        masterTargets: nextTargets,
        masterStrategies: nextStrategies
      };
    }, { changed: ['masterTargets', 'masterStrategies'], toastMsg: 'Seluruh override Master cabang direset ke template Excel' });
  };

  // ---------------- VIEWER SIMULATION HANDLERS ----------------
  const handleUpdateViewerSimTarget = (rowId, val) => {
    setIsViewerSimMode(true);
    setViewerSimTargets((prev) => {
      const next = { ...prev };
      if (val === undefined || val === null) delete next[rowId];
      else next[rowId] = Number(val);
      return next;
    });
  };

  const handleUpdateViewerSimReal = (rowId, val) => {
    setIsViewerSimMode(true);
    setViewerSimReals((prev) => {
      const next = { ...prev };
      if (val === undefined || val === null) delete next[rowId];
      else next[rowId] = Number(val);
      return next;
    });
  };

  const handleUpdateViewerSimStrategy = (rowId, text) => {
    setIsViewerSimMode(true);
    setViewerSimStrategies((prev) => {
      const next = { ...prev };
      if (!text) delete next[rowId];
      else next[rowId] = text;
      return next;
    });
  };

  const handleResetViewerSimDraft = () => {
    setViewerSimTargets({});
    setViewerSimReals({});
    setViewerSimStrategies({});
    setActiveSimulationId(null);
    setIsViewerSimMode(false);
  };

  const handleToggleViewerSimMode = () => {
    if (isViewerSimMode) {
      // Exiting Simulation Mode -> always clear draft simulation edits so Master Mode stays 100% pure
      handleResetViewerSimDraft();
    } else {
      setIsViewerSimMode(true);
    }
  };

  const handleSaveViewerSimulation = (simObj) => {
    updateAndPersistDb((prev) => {
      const list = Array.isArray(prev.viewerSimulations) ? [...prev.viewerSimulations] : [];
      const existingIdx = list.findIndex((s) => s.id === simObj.id);
      const record = {
        ...simObj,
        createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (existingIdx >= 0) {
        list[existingIdx] = record;
      } else {
        list.unshift(record);
      }
      return {
        ...prev,
        viewerSimulations: list
      };
    }, { changed: ['viewerSimulations'] });
    setActiveSimulationId(simObj.id);
  };

  const handleLoadViewerSimulation = (simObj) => {
    if (simObj.branchCode && String(simObj.branchCode) !== String(rawBranchData.branchInfo?.code)) {
      handleSelectBranch(String(simObj.branchCode));
    }
    setViewerSimTargets(simObj.targets || {});
    setViewerSimReals(simObj.reals || {});
    setViewerSimStrategies(simObj.strategies || {});
    setActiveSimulationId(simObj.id);
    setIsViewerSimMode(true);
  };

  const handleDeleteViewerSimulation = (simId) => {
    updateAndPersistDb((prev) => ({
      ...prev,
      viewerSimulations: (prev.viewerSimulations || []).filter((s) => s.id !== simId)
    }), { changed: ['viewerSimulations'] });
    if (activeSimulationId === simId) {
      setActiveSimulationId(null);
    }
  };

  const handleAdoptSimulationToMaster = (simObj) => {
    if (!isKonseptor || !simObj) return;
    const code = String(simObj.branchCode || rawBranchData.branchInfo?.code || '10125');
    updateAndPersistDb((prev) => {
      const nextTargets = { ...(prev.masterTargets || {}) };
      Object.entries(simObj.targets || {}).forEach(([rowId, val]) => {
        nextTargets[`${code}_${rowId}`] = Number(val);
      });
      const nextStrategies = { ...(prev.masterStrategies || {}) };
      Object.entries(simObj.strategies || {}).forEach(([rowId, text]) => {
        if (text && String(text).trim()) {
          nextStrategies[`b${code}~${rowId}`] = {
            text: String(text).trim(),
            scope: 'branch',
            branchCode: code,
            rowId: Number(rowId),
            updatedBy: `${currentUser?.username} (dari simulasi ${simObj.createdByName})`,
            updatedAt: new Date().toISOString()
          };
        }
      });
      return {
        ...prev,
        masterTargets: nextTargets,
        masterStrategies: nextStrategies
      };
    }, { changed: ['masterTargets', 'masterStrategies'], toastMsg: 'Simulasi berhasil diterapkan permanen ke Data Master!' });
    handleResetViewerSimDraft();
  };

  // ---------------- TIMESTAND HANDLER ----------------
  const handleSaveTimestandConfig = (newConfig) => {
    if (!isKonseptor) return;
    updateAndPersistDb((prev) => ({
      ...prev,
      timestandConfig: newConfig
    }), { changed: ['timestandConfig'], toastMsg: `Timestand (${newConfig.effectiveWorkdays || ''} HK) tersimpan ke Supabase` });
    if (newConfig.googleApiKey && newConfig.googleApiKey !== dbState.timestandConfig?.googleApiKey) {
      handleSyncGoogleCalendar(newConfig.googleApiKey);
    }
  };

  // Handle switching branch from dropdown or leaderboard
  const handleSelectBranch = (branchCode) => {
    setSelectedMetricForDetail(null);
    const dataSource = cachedDbData || dbRowsData;
    if (dataSource) {
      try {
        const calculated = calculateBranchScore(
          branchCode,
          dataSource,
          metricDefs,
          branchesList,
          rawBranchData.realizationDate,
          allRankings
        );
        setRawBranchData(calculated);
        handleResetViewerSimDraft();
      } catch (err) {
        console.error('Error switching branch:', err);
        alert(err.message || 'Gagal menghitung skor cabang');
      }
    } else {
      const foundBranch = branchesList.find(b => b.code === branchCode);
      if (foundBranch) {
        setRawBranchData(prev => ({
          ...prev,
          branchInfo: foundBranch
        }));
      }
    }
  };

  // Handle user uploading their own Excel file (saves to Daily History without overwriting previous days!)
  const handleFileUpload = async (file, customLabel = '') => {
    const parsed = await parseBranchIQWorkbook(file);
    const effectiveDate = customLabel || parsed.realizationDate || 'Update Terbaru';
    const parsedWithDate = {
      ...parsed,
      realizationDate: effectiveDate
    };

    const saved = await saveExcelSnapshotToHistory({
      fileName: file.name,
      realizationDate: effectiveDate,
      customLabel: customLabel ? `${customLabel} (${file.name})` : `Posisi ${effectiveDate} — ${file.name}`,
      uploadedBy: currentUser?.username || 'michael',
      parsedWorkbook: parsedWithDate
    });

    setExcelHistoryList(saved.list);
    setActiveSnapshotId(saved.meta.id);
    try {
      localStorage.setItem('branchiq_active_snapshot_id', saved.meta.id);
      localStorage.setItem('branchiq_last_cloud_snapshot_id', saved.meta.id);
    } catch (e) { }
    persistOfficialActiveSnapshot(saved.meta.id, currentUser?.username || 'superadmin');
    showSyncToast(`File Excel "${file.name}" aktif & tersinkronisasi ke Cloud Supabase untuk semua user!`);

    setCachedDbData(parsedWithDate.dbData);
    setBranchesList(parsedWithDate.branches);
    setMetricDefs(parsedWithDate.metricDefs);
    if (parsedWithDate.allRankings && parsedWithDate.allRankings.length > 0) {
      setAllRankings(parsedWithDate.allRankings);
    }
    setIsCustomFileLoaded(true);
    setCustomFileName(file.name);

    const currentCode = rawBranchData.branchInfo?.code || '10125';
    const hasCurrent = parsedWithDate.branches.some(b => String(b.code) === String(currentCode));
    const targetCode = hasCurrent ? currentCode : (parsedWithDate.branches[0]?.code || '10125');

    const calculated = calculateBranchScore(
      targetCode,
      parsedWithDate.dbData,
      parsedWithDate.metricDefs,
      parsedWithDate.branches,
      parsedWithDate.realizationDate,
      parsedWithDate.allRankings || allRankings
    );
    setRawBranchData(calculated);
  };

  // Switch between saved Excel daily history snapshots
  const handleSelectHistorySnapshot = async (snapshotMeta) => {
    if (!snapshotMeta || snapshotMeta.id === DEFAULT_SNAPSHOT_META.id || snapshotMeta.isDefault) {
      handleResetToDefault();
      return;
    }

    const payload = await loadExcelSnapshotPayload(snapshotMeta.id);
    if (!payload || !payload.dbData) {
      alert('Data file ini tidak ditemukan di penyimpanan lokal browser. Silakan upload ulang file Excel tersebut.');
      return;
    }

    setActiveSnapshotId(snapshotMeta.id);
    try {
      localStorage.setItem('branchiq_active_snapshot_id', snapshotMeta.id);
    } catch (e) { }
    setCachedDbData(payload.dbData);
    setBranchesList(payload.branches || defaultBranches);
    setMetricDefs(payload.metricDefs || defaultMetricDefs);
    if (payload.allRankings && payload.allRankings.length > 0) {
      setAllRankings(payload.allRankings);
    }
    setIsCustomFileLoaded(true);
    setCustomFileName(snapshotMeta.fileName || '');

    const currentCode = rawBranchData.branchInfo?.code || '10125';
    const hasCurrent = (payload.branches || []).some(b => String(b.code) === String(currentCode));
    const targetCode = hasCurrent ? currentCode : '10125';

    const calculated = calculateBranchScore(
      targetCode,
      payload.dbData,
      payload.metricDefs || defaultMetricDefs,
      payload.branches || defaultBranches,
      payload.realizationDate || snapshotMeta.realizationDate,
      payload.allRankings || allRankings
    );
    setRawBranchData(calculated);
  };

  const handleDeleteHistorySnapshot = async (snapshotId) => {
    const nextList = await deleteExcelSnapshotFromHistory(snapshotId);
    setExcelHistoryList(nextList);
    if (activeSnapshotId === snapshotId) {
      handleResetToDefault();
    }
  };

  const handlePruneOldSnapshots = async () => {
    const nextList = await pruneOldSnapshotsKeepLatest(activeSnapshotId);
    setExcelHistoryList(nextList);
  };

  // Handle loading sample file
  const handleLoadSampleFile = async () => {
    try {
      const res = await fetch('/sample_branchiq.xlsx');
      const buffer = await res.arrayBuffer();
      const parsed = await parseBranchIQWorkbook(buffer);
      setCachedDbData(parsed.dbData);
      setBranchesList(parsed.branches);
      setMetricDefs(parsed.metricDefs);
      if (parsed.allRankings && parsed.allRankings.length > 0) {
        setAllRankings(parsed.allRankings);
      }
      setIsCustomFileLoaded(false);
      setCustomFileName('');
      setActiveSnapshotId(DEFAULT_SNAPSHOT_META.id);
      try {
        localStorage.setItem('branchiq_active_snapshot_id', DEFAULT_SNAPSHOT_META.id);
      } catch (e) { }

      const calculated = calculateBranchScore(
        '10125',
        parsed.dbData,
        parsed.metricDefs,
        parsed.branches,
        parsed.realizationDate,
        parsed.allRankings || allRankings
      );
      setRawBranchData(calculated);
    } catch (err) {
      console.error(err);
      alert('Gagal memuat file contoh: ' + err.message);
    }
  };

  // Reset to default 10125 data
  const handleResetToDefault = () => {
    setRawBranchData(default10125Data);
    setBranchesList(defaultBranches);
    setMetricDefs(defaultMetricDefs);
    setAllRankings(allRankingsData);
    setCachedDbData(dbRowsData);
    setIsCustomFileLoaded(false);
    setCustomFileName('');
    setActiveSnapshotId(DEFAULT_SNAPSHOT_META.id);
    try {
      localStorage.setItem('branchiq_active_snapshot_id', DEFAULT_SNAPSHOT_META.id);
    } catch (e) { }
  };

  // Print executive summary briefing
  const handlePrint = () => {
    window.print();
  };

  // Route protection: If not logged in, render Login Page
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} users={dbState.users} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FA]">

      {/* Printable Report Component (visible only when printing) */}
      <PrintReport
        branchInfo={currentBranchData.branchInfo}
        realizationDate={currentBranchData.realizationDate}
        totalScore={currentBranchData.totalScore}
        totalGap={currentBranchData.totalGap}
        categorySummary={currentBranchData.categorySummary}
        metrics={currentBranchData.calculatedMetrics}
        rankingInfo={currentBranchData.rankingInfo}
        masterStrategies={dbState.masterStrategies || {}}
      />

      {/* Screen View */}
      <div className="print:hidden flex-1 flex flex-col">

        {/* Navigation & Header */}
        <Header
          branchInfo={currentBranchData.branchInfo}
          realizationDate={currentBranchData.realizationDate}
          branches={branchesList}
          rankingInfo={currentBranchData.rankingInfo}
          allRankings={allRankings}
          onSelectBranch={handleSelectBranch}
          onUploadClick={() => setIsUploadModalOpen(true)}
          onResetToDefault={handleResetToDefault}
          onOpenComparison={() => setIsComparisonModalOpen(true)}
          onPrint={handlePrint}
          isCustomFileLoaded={isCustomFileLoaded}
          customFileName={customFileName}
          currentUser={currentUser}
          onLogout={handleLogout}
          activePage={activePage}
          onToggleCMSPage={() => setActivePage(prev => prev === 'cms' ? 'dashboard' : 'cms')}
          excelHistoryList={excelHistoryList}
          activeSnapshotId={activeSnapshotId}
          onSelectHistorySnapshot={handleSelectHistorySnapshot}
          isViewerSimMode={isViewerSimMode}
          masterTotalScore={masterBranchData.totalScore}
          activeTotalScore={currentBranchData.totalScore}
        />

        {/* Sticky Top Simulation Bar (Strictly only visible while Simulation Mode is active; never overlaps bottom buttons!) */}
        {isViewerSimMode && (
          <aside
            aria-label="Status Simulasi Berjalan"
            className="sticky top-0 z-30 w-full bg-[#00254D]/95 backdrop-blur-sm text-white border-b-2 border-[#FFB81C] shadow-md"
          >
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFB81C] animate-pulse shrink-0" />
                  <span className="text-[10px] sm:text-xs text-[#FFE5A3] font-bold uppercase tracking-wider shrink-0">
                    Total Skor Simulasi:
                  </span>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-sm sm:text-lg font-black text-white">
                      {currentBranchData.totalScore.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-slate-400 text-[11px]">/100</span>
                    <span
                      className={`text-[10px] sm:text-xs font-black px-1.5 py-0.2 rounded ${currentBranchData.totalScore >= masterBranchData.totalScore
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rose-500 text-white'
                        }`}
                    >
                      {currentBranchData.totalScore >= masterBranchData.totalScore ? '+' : ''}
                      {(currentBranchData.totalScore - masterBranchData.totalScore).toFixed(2).replace('.', ',')} pt
                    </span>
                  </div>
                </div>

                <div className="h-5 w-px bg-white/20 shrink-0 hidden sm:block" />

                <div className="hidden sm:block text-[11px] text-slate-300 shrink-0">
                  <span>Awal (Konseptor): </span>
                  <strong className="text-white font-mono">{masterBranchData.totalScore.toFixed(2).replace('.', ',')} pt</strong>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    const bar = document.getElementById('simulation-manager-section');
                    if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setIsViewerSimMode(true);
                  }}
                  className="px-3 py-1 rounded-lg bg-[#FFB81C] hover:bg-[#f3aa0d] text-[#00254D] font-black text-xs cursor-pointer shadow-xs transition-colors"
                  title="Buka panel untuk menyimpan skenario simulasi"
                >
                  Simpan Simulasi
                </button>
                <button
                  type="button"
                  onClick={handleResetViewerSimDraft}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white cursor-pointer text-xs font-bold"
                  title="Reset & keluar dari Mode Simulasi"
                >
                  Reset / Keluar
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Main Body */}
        <main className="max-w-7xl mx-auto px-2.5 sm:px-4 py-3 sm:py-6 w-full space-y-3.5 sm:space-y-6">
          {activePage === 'cms' && isSuperadminUser ? (
            /* SUPERADMIN CMS USER MANAGEMENT PAGE */
            <UserManagementCMS
              users={dbState.users}
              currentUser={currentUser}
              simulationsCount={(dbState.viewerSimulations || []).length}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onResetPassword={handleResetUserPassword}
              onDeleteUser={handleDeleteUser}
              onBackToDashboard={() => setActivePage('dashboard')}
            />
          ) : (
            /* MAIN SCORECARD DASHBOARD */
            <>
              {/* Executive Summary 4 KPI Cards + Rank Badge */}
              <section>
                <ExecutiveSummary
                  totalScore={currentBranchData.totalScore}
                  totalGap={currentBranchData.totalGap}
                  categorySummary={currentBranchData.categorySummary}
                  underTargetCount={currentBranchData.underTargetCount}
                  totalMetricsCount={currentBranchData.calculatedMetrics.filter(m => m.bobot > 0).length}
                  rankingInfo={currentBranchData.rankingInfo}
                  onShowUnderTargetOnly={() => setFilterUnderTarget(!filterUnderTarget)}
                  isUnderTargetOnly={filterUnderTarget}
                  onOpenComparison={() => setIsComparisonModalOpen(true)}
                  isViewerSimMode={isViewerSimMode}
                  masterTotalScore={masterBranchData.totalScore}
                />
              </section>

              {/* Visual Comparison: Category Score Cards & Point Loss (Placed at Top) */}
              <section>
                <CategoryCharts
                  categorySummary={currentBranchData.categorySummary}
                  metrics={currentBranchData.calculatedMetrics}
                  totalScore={currentBranchData.totalScore}
                  branchInfo={currentBranchData.branchInfo}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  filterUnderTarget={filterUnderTarget}
                  onToggleFilterUnderTarget={() => setFilterUnderTarget(!filterUnderTarget)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  totalGap={currentBranchData.totalGap}
                  rankingInfo={currentBranchData.rankingInfo}
                />
              </section>

              {/* Timestand (Target Harian) & Google Calendar API Integration (Placed Below Category Score) */}
              <section>
                <TimestandControl
                  timestandConfig={dbState.timestandConfig}
                  holidaysList={holidaysList}
                  holidaySyncSource={holidaySyncSource}
                  isSyncingHolidays={isSyncingHolidays}
                  onSyncHolidays={handleSyncGoogleCalendar}
                  onSaveTimestandConfig={handleSaveTimestandConfig}
                  canEditTimestand={isKonseptor}
                  currentUser={currentUser}
                  metrics={currentBranchData.calculatedMetrics}
                />
              </section>

              {/* RBAC Role Control & Viewer Simulation / Presentation Bar */}
              <section id="simulation-manager-section" className="scroll-mt-4">
                <SimulationManagerBar
                  currentUser={currentUser}
                  isKonseptor={isKonseptor}
                  isSuperadminUser={isSuperadminUser}
                  isViewerSimMode={isViewerSimMode}
                  onToggleViewerSimMode={handleToggleViewerSimMode}
                  activeSimulationId={activeSimulationId}
                  viewerSimTargets={viewerSimTargets}
                  viewerSimReals={viewerSimReals}
                  viewerSimStrategies={viewerSimStrategies}
                  onResetViewerSimDraft={handleResetViewerSimDraft}
                  onSaveViewerSimulation={handleSaveViewerSimulation}
                  onLoadViewerSimulation={handleLoadViewerSimulation}
                  onDeleteViewerSimulation={handleDeleteViewerSimulation}
                  onAdoptSimulationToMaster={handleAdoptSimulationToMaster}
                  viewerSimulations={dbState.viewerSimulations || []}
                  branchInfo={currentBranchData.branchInfo}
                  masterTotalScore={masterBranchData.totalScore}
                  activeTotalScore={currentBranchData.totalScore}
                  masterOverridesCount={masterOverridesCount}
                  onResetAllMasterOverrides={handleResetAllMasterOverrides}
                />
              </section>

              {/* Detail Excel-Ordered Scorecard Table (DPK..GMM..Ekosistem) */}
              <section>
                <MetricsTable
                  metrics={currentBranchData.calculatedMetrics}
                  categorySummary={currentBranchData.categorySummary}
                  totalScore={currentBranchData.totalScore}
                  masterTotalScore={masterBranchData.totalScore}
                  filterCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  filterUnderTarget={filterUnderTarget}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  branchInfo={currentBranchData.branchInfo}
                  onSelectMetricForDetail={setSelectedMetricForDetail}
                  canEditMaster={isKonseptor}
                  isViewerSimMode={isViewerSimMode}
                  masterStrategies={dbState.masterStrategies || {}}
                  viewerSimStrategies={viewerSimStrategies}
                  viewerSimTargets={viewerSimTargets}
                  viewerSimReals={viewerSimReals}
                  onSaveMasterTarget={handleSaveMasterTarget}
                  onResetMasterTarget={handleResetMasterTarget}
                  onSaveMasterStrategy={handleSaveMasterStrategy}
                  onResetMasterStrategy={handleResetMasterStrategy}
                  onUpdateViewerSimTarget={handleUpdateViewerSimTarget}
                  onUpdateViewerSimReal={handleUpdateViewerSimReal}
                  onUpdateViewerSimStrategy={handleUpdateViewerSimStrategy}
                  onActivateViewerSimMode={() => setIsViewerSimMode(true)}
                  effectiveWorkdays={timestandSummary.effectiveWorkdays}
                  timestandConfig={dbState.timestandConfig}
                  timestandSummary={timestandSummary}
                />
              </section>
            </>
          )}
        </main>

        {/* Modern Clean Footer */}
        <footer className="mt-auto border-t border-slate-200/80 bg-white/95 backdrop-blur-xs py-4 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#003D79]">PT Bank Mandiri (Persero) Tbk.</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-medium">Region V / Jakarta 3</span>
              </div>
              <div className="text-slate-500 text-[11px]">
                <span className="font-semibold text-slate-700">BranchIQ Performance & Actionable Analytics</span>
                <span className="mx-1.5 text-slate-300">•</span>
                <span>{currentBranchData.branchInfo.name} ({currentBranchData.branchInfo.code})</span>
              </div>
            </div>
          </div>
        </footer>

      </div>

      {/* Educational & Strategy Drawer */}
      <MetricDetailDrawer
        metric={selectedMetricForDetail}
        branchInfo={currentBranchData.branchInfo}
        onClose={() => setSelectedMetricForDetail(null)}
        masterStrategies={dbState.masterStrategies || {}}
        viewerSimStrategies={viewerSimStrategies}
        isViewerSimMode={isViewerSimMode}
      />

      {/* Excel File Upload & History Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFileUpload={handleFileUpload}
        onLoadSampleFile={handleLoadSampleFile}
        excelHistoryList={excelHistoryList}
        activeSnapshotId={activeSnapshotId}
        onSelectHistorySnapshot={handleSelectHistorySnapshot}
        onDeleteHistorySnapshot={handleDeleteHistorySnapshot}
        onPruneOldSnapshots={handlePruneOldSnapshots}
        isSuperadmin={isSuperadminUser}
        currentUser={currentUser}
      />

      {/* Leaderboard & Branch Comparison Modal */}
      <BranchComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        allRankings={allRankings}
        activeBranchCode={currentBranchData.branchInfo.code}
        onSelectBranch={handleSelectBranch}
        allDbRows={cachedDbData || dbRowsData}
        metricDefs={metricDefs}
        realizationDate={currentBranchData.realizationDate}
      />

      {/* Global Cloud Sync Feedback Toast */}
      {syncToast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-xl border text-xs font-extrabold flex items-center gap-2 max-w-sm animate-in fade-in duration-150 ${
            syncToast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-emerald-600 text-white border-emerald-700'
          }`}
        >
          <span>{syncToast.msg}</span>
        </div>
      )}

    </div>
  );
}

export default App;
