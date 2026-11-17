-- ============================================================================
-- Skema Database & Migrasi: BranchIQ Score Board Portal (Bank Mandiri Region V)
-- Mencakup: RBAC Users, Master Target & Strategi (Konseptor), Simulasi Viewer,
-- serta Konfigurasi Timestand (Target Harian) & Kalender Libur Nasional
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT 'mandiri123',
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'viewer')),
    jabatan TEXT NOT NULL DEFAULT 'Pegawai Cabang',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS master_targets (
    key TEXT PRIMARY KEY, -- format: "{branch_code}_{row_id}"
    branch_code TEXT NOT NULL,
    row_id INTEGER NOT NULL,
    target_value REAL NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS master_strategies (
    key TEXT PRIMARY KEY, -- format: "b{branch_code}~{row_id}" atau "g~{row_id}"
    branch_code TEXT NOT NULL,
    row_id INTEGER NOT NULL,
    scope TEXT NOT NULL DEFAULT 'branch' CHECK (scope IN ('branch', 'all')),
    strategy_text TEXT NOT NULL,
    tactical_actions TEXT, -- JSON array string
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS viewer_simulations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT DEFAULT '',
    branch_code TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    targets_json TEXT NOT NULL,     -- JSON map { [row_id]: simulatedTarget }
    reals_json TEXT NOT NULL,       -- JSON map { [row_id]: simulatedReal }
    strategies_json TEXT NOT NULL,  -- JSON map { [row_id]: simulatedStrategyText }
    baseline_score REAL NOT NULL,
    simulated_score REAL NOT NULL,
    score_delta REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timestand_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    start_date TEXT NOT NULL DEFAULT '2026-11-16',
    end_date TEXT NOT NULL DEFAULT '2026-11-30',
    calendar_id TEXT NOT NULL DEFAULT 'id.indonesian#holiday@group.v.calendar.google.com',
    google_api_key TEXT DEFAULT '',
    custom_holidays_json TEXT DEFAULT '[]',
    effective_workdays INTEGER NOT NULL DEFAULT 11,
    updated_by TEXT NOT NULL DEFAULT 'michael',
    updated_at TEXT NOT NULL
);

-- Seed Default Users (Password Default: 'mandiri123')
INSERT OR IGNORE INTO users (username, display_name, password, role, jabatan, created_at, updated_at) VALUES
('superadmin', 'Super Administrator', 'mandiri123', 'superadmin', 'System Superadmin & IT', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('michael', 'Michael Danniel', 'mandiri123', 'admin', 'Kepala Cabang / Konseptor Utama', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('rian', 'Rian', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('dina', 'Dina', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('disa', 'Disa', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('fia', 'Fia', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('wardah', 'Wardah', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('embun', 'Embun', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('febri', 'Febri', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('arga', 'Arga', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('arsya', 'Arsya', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('akbar', 'Akbar', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('dimas', 'Dimas', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('rafli', 'Rafli', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('alvin', 'Alvin', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z'),
('amalia', 'Amalia', 'mandiri123', 'viewer', 'Branch Officer (Viewer)', '2026-11-16T08:00:00Z', '2026-11-16T08:00:00Z');
