-- 1. Tabel Master Riwayat Excel Terpusat
CREATE TABLE IF NOT EXISTS excel_snapshots (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    realization_date TEXT NOT NULL,
    label TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    score_10125 NUMERIC NOT NULL,
    rank_10125 INTEGER NOT NULL,
    total_branches INTEGER NOT NULL,
    size_bytes BIGINT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    payload_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Pengguna & Hak Akses (RBAC)
CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT 'mandiri123',
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'viewer')),
    jabatan TEXT NOT NULL DEFAULT 'Pegawai Cabang',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Master Target & Strategi
CREATE TABLE IF NOT EXISTS master_targets (
    key TEXT PRIMARY KEY,
    branch_code TEXT NOT NULL,
    row_id INTEGER NOT NULL,
    target_value NUMERIC NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_strategies (
    key TEXT PRIMARY KEY,
    branch_code TEXT NOT NULL,
    row_id INTEGER NOT NULL,
    scope TEXT NOT NULL DEFAULT 'branch',
    strategy_text TEXT NOT NULL,
    tactical_actions JSONB,
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Buka Akses Data untuk Aplikasi
ALTER TABLE excel_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Snapshots" ON excel_snapshots FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Users" ON users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE master_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Targets" ON master_targets FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE master_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Strategies" ON master_strategies FOR ALL USING (true) WITH CHECK (true);
