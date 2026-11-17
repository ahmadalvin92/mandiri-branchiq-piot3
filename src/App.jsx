import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { CategoryCharts } from './components/CategoryCharts';
import { MetricsTable } from './components/MetricsTable';
import { MetricDetailDrawer } from './components/MetricDetailDrawer';
import { WhatIfSimulator } from './components/WhatIfSimulator';
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
  const [activeSnapshotId, setActiveSnapshotId] = useState(DEFAULT_SNAPSHOT_META.id);

  // Filters & Search — default filterUnderTarget = false so ALL Excel rows (DPK..GMM..Ekosistem) appear in exact order
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterUnderTarget, setFilterUnderTarget] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawers and Modals
  const [selectedMetricForDetail, setSelectedMetricForDetail] = useState(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  // Load Server DB and Google Calendar Holidays on mount
  useEffect(() => {
    fetchServerDb().then((loaded) => {
      if (loaded) setDbState(loaded);
    });

    handleSyncGoogleCalendar();
  }, []);

  // Automatically fetch sample excel on mount to cache dbData for seamless branch switching
  useEffect(() => {
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

  const updateAndPersistDb = (updater) => {
    setDbState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persistDbState(next);
      return next;
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
    setIsViewerSimMode(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('branchiq_auth_user');
    sessionStorage.removeItem('branchiq_auth_user');
    setCurrentUser(null);
    setActivePage('dashboard');
    setIsViewerSimMode(false);
  };

  // RBAC Role Checks
  const isSuperadminUser = isSuperadmin(currentUser);
  const isKonseptor = isKonseptorOrAdmin(currentUser);

  // Master Branch Data (incorporating permanent Master Target overrides saved by Michael/Superadmin)
  const masterBranchData = useMemo(() => {
    return recalculateBranchWithOverrides(rawBranchData, dbState.masterTargets || {}, {});
  }, [rawBranchData, dbState.masterTargets]);

  // Active Displayed Branch Data (either Master Data or Viewer Simulation Data)
  const currentBranchData = useMemo(() => {
    if (!isViewerSimMode) return masterBranchData;
    return recalculateBranchWithOverrides(masterBranchData, viewerSimTargets, viewerSimReals);
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
    }));
  };

  const handleUpdateUser = (username, updates) => {
    updateAndPersistDb((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.username === username ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u
      )
    }));
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
    }));
  };

  const handleDeleteUser = (username) => {
    updateAndPersistDb((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.username !== username)
    }));
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
    }));
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
    });
  };

  const handleSaveMasterStrategy = (branchCode, rowId, strategyPayload) => {
    if (!isKonseptor) return;
    const scope = strategyPayload.scope === 'all' ? 'all' : 'branch';
    const key = scope === 'all' ? `g~${rowId}` : `b${branchCode}~${rowId}`;
    updateAndPersistDb((prev) => {
      const nextStrategies = { ...(prev.masterStrategies || {}) };
      if (!strategyPayload.text) {
        delete nextStrategies[key];
      } else {
        nextStrategies[key] = {
          text: strategyPayload.text,
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
    });
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
    });
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
    });
  };

  // ---------------- VIEWER SIMULATION HANDLERS ----------------
  const handleUpdateViewerSimTarget = (rowId, val) => {
    setViewerSimTargets((prev) => {
      const next = { ...prev };
      if (val === undefined || val === null) delete next[rowId];
      else next[rowId] = Number(val);
      return next;
    });
  };

  const handleUpdateViewerSimStrategy = (rowId, text) => {
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
    });
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
    }));
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
        if (text) {
          nextStrategies[`b${code}~${rowId}`] = {
            text,
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
    });
    setIsViewerSimMode(false);
    setActiveSimulationId(null);
  };

  // ---------------- TIMESTAND HANDLER ----------------
  const handleSaveTimestandConfig = (newConfig) => {
    if (!isKonseptor) return;
    updateAndPersistDb((prev) => ({
      ...prev,
      timestandConfig: newConfig
    }));
    if (newConfig.googleApiKey && newConfig.googleApiKey !== dbState.timestandConfig?.googleApiKey) {
      handleSyncGoogleCalendar(newConfig.googleApiKey);
    }
  };

  // Handle switching branch from dropdown or leaderboard
  const handleSelectBranch = (branchCode) => {
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
          onToggleSimulator={() => setIsSimulatorOpen(!isSimulatorOpen)}
          isSimulatorActive={isSimulatorOpen}
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
                  onOpenSimulator={() => setIsSimulatorOpen(true)}
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
                  onToggleViewerSimMode={() => setIsViewerSimMode(prev => !prev)}
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
                  filterCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  filterUnderTarget={filterUnderTarget}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  branchInfo={currentBranchData.branchInfo}
                  onSelectMetricForDetail={setSelectedMetricForDetail}
                  onOpenSimulatorForMetric={() => setIsSimulatorOpen(true)}
                  canEditMaster={isKonseptor}
                  isViewerSimMode={isViewerSimMode}
                  masterStrategies={dbState.masterStrategies || {}}
                  viewerSimStrategies={viewerSimStrategies}
                  onSaveMasterTarget={handleSaveMasterTarget}
                  onResetMasterTarget={handleResetMasterTarget}
                  onSaveMasterStrategy={handleSaveMasterStrategy}
                  onResetMasterStrategy={handleResetMasterStrategy}
                  onUpdateViewerSimTarget={handleUpdateViewerSimTarget}
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

        {/* Modern Footer */}
        <footer className="mt-auto border-t border-slate-200/90 bg-white py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#003D79]">PT Bank Mandiri (Persero) Tbk.</span>
              <span>— Region V / Jakarta 3</span>
            </div>
            <p className="text-slate-400">
              BranchIQ Performance & Actionable Analytics Dashboard • {currentBranchData.branchInfo.name} (Kode: {currentBranchData.branchInfo.code})
            </p>
          </div>
        </footer>

      </div>

      {/* Educational & Strategy Drawer */}
      <MetricDetailDrawer 
        metric={selectedMetricForDetail}
        branchInfo={currentBranchData.branchInfo}
        onClose={() => setSelectedMetricForDetail(null)}
        onOpenSimulatorForMetric={() => setIsSimulatorOpen(true)}
      />

      {/* What-If Simulator Modal */}
      <WhatIfSimulator 
        metrics={currentBranchData.calculatedMetrics}
        baselineTotalScore={currentBranchData.totalScore}
        branchInfo={currentBranchData.branchInfo}
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onApplyToViewerSim={(newRealsMap) => {
          setViewerSimReals(newRealsMap);
          setIsViewerSimMode(true);
        }}
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
      />

      {/* Sticky Floating Simulation Bar (Always visible on screen while in Simulation Mode) */}
      {(isViewerSimMode || Object.keys(viewerSimTargets).length > 0 || Object.keys(viewerSimReals).length > 0) && (
        <aside
          aria-label="Status Simulasi Berjalan"
          className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#00254D] text-white px-3.5 sm:px-5 py-2.5 rounded-2xl shadow-2xl border-2 border-[#FFB81C] flex items-center gap-2.5 sm:gap-4 max-w-[95vw] sm:max-w-xl animate-in slide-in-from-bottom duration-200"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFB81C] animate-ping shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-[#FFE5A3] font-bold uppercase tracking-wider block">
                Total Skor Simulasi:
              </span>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-base sm:text-xl font-black text-white">
                  {currentBranchData.totalScore.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-slate-400 text-xs">/100</span>
                <span
                  className={`text-[10px] sm:text-xs font-black px-1.5 py-0.2 rounded ${
                    currentBranchData.totalScore >= masterBranchData.totalScore
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {currentBranchData.totalScore >= masterBranchData.totalScore ? '+' : ''}
                  {(currentBranchData.totalScore - masterBranchData.totalScore).toFixed(2).replace('.', ',')} pt
                </span>
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-white/20 shrink-0 hidden sm:block" />

          <div className="hidden sm:block text-[11px] text-slate-300 shrink-0">
            <span>Awal (Konseptor): </span>
            <strong className="text-white font-mono">{masterBranchData.totalScore.toFixed(2).replace('.', ',')} pt</strong>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => {
                const bar = document.getElementById('simulation-manager-section');
                if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setIsViewerSimMode(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#FFB81C] hover:bg-[#f3aa0d] text-[#00254D] font-black text-xs cursor-pointer shadow-xs transition-colors"
              title="Buka panel untuk menyimpan skenario simulasi"
            >
              Simpan Simulasi
            </button>
            <button
              type="button"
              onClick={handleResetViewerSimDraft}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer text-xs font-bold"
              title="Reset simulasi ke awal"
            >
              ✕
            </button>
          </div>
        </aside>
      )}

    </div>
  );
}

export default App;
