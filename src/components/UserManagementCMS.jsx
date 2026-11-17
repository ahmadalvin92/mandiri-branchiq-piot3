import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Trash2,
  Edit3,
  Check,
  X,
  Search,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Lock,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { DEFAULT_PASSWORD, getRoleLabel } from '../utils/dbService';

export function UserManagementCMS({
  users = [],
  currentUser,
  simulationsCount = 0,
  onAddUser,
  onUpdateUser,
  onResetPassword,
  onDeleteUser,
  onBackToDashboard
}) {
  // Add User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newJabatan, setNewJabatan] = useState('Branch Officer (Viewer)');
  const [newRole, setNewRole] = useState('viewer');
  const [newPassword, setNewPassword] = useState(DEFAULT_PASSWORD);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Inline Edit & Password Reset State
  const [editingUsername, setEditingUsername] = useState(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editJabatan, setEditJabatan] = useState('');
  const [editRole, setEditRole] = useState('viewer');

  const [resettingPwUser, setResettingPwUser] = useState(null);
  const [customNewPw, setCustomNewPw] = useState('');

  // Feedback Message
  const [feedback, setFeedback] = useState(null);

  const showToast = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    const cleanU = newUsername.trim().toLowerCase();
    if (!cleanU || cleanU.length < 3 || !/^[a-z0-9._-]+$/.test(cleanU)) {
      showToast('Username wajib 3-40 karakter (huruf/angka/titik/garis).', 'error');
      return;
    }
    if (users.some(u => u.username.toLowerCase() === cleanU)) {
      showToast(`Username "${cleanU}" sudah terdaftar.`, 'error');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      showToast('Password minimal 4 karakter.', 'error');
      return;
    }

    const display = newDisplayName.trim() || (cleanU.charAt(0).toUpperCase() + cleanU.slice(1));
    onAddUser({
      username: cleanU,
      displayName: display,
      jabatan: newJabatan.trim() || (newRole === 'admin' ? 'Konseptor / Admin' : newRole === 'superadmin' ? 'System Superadmin' : 'Branch Officer (Viewer)'),
      role: newRole,
      password: newPassword
    });

    setNewUsername('');
    setNewDisplayName('');
    setNewJabatan('Branch Officer (Viewer)');
    setNewRole('viewer');
    setNewPassword(DEFAULT_PASSWORD);
    showToast(`User "${cleanU}" (${getRoleLabel(newRole)}) berhasil ditambahkan!`);
  };

  const startEdit = (u) => {
    setEditingUsername(u.username);
    setEditDisplayName(u.displayName || u.username);
    setEditJabatan(u.jabatan || '');
    setEditRole(u.role || 'viewer');
  };

  const saveEdit = (username) => {
    if (username === currentUser?.username && editRole !== 'superadmin') {
      showToast('Anda tidak dapat menurunkan role Superadmin akun Anda sendiri.', 'error');
      return;
    }
    onUpdateUser(username, {
      displayName: editDisplayName.trim() || username,
      jabatan: editJabatan.trim(),
      role: editRole
    });
    setEditingUsername(null);
    showToast(`Data & Role user "${username}" berhasil diperbarui menjadi ${getRoleLabel(editRole)}.`);
  };

  const handleSaveCustomPassword = (username) => {
    if (!customNewPw || customNewPw.length < 4) {
      showToast('Password baru minimal 4 karakter.', 'error');
      return;
    }
    onResetPassword(username, customNewPw);
    setResettingPwUser(null);
    setCustomNewPw('');
    showToast(`Password untuk "${username}" berhasil diubah!`);
  };

  const handleQuickResetDefaultPw = (username) => {
    onResetPassword(username, DEFAULT_PASSWORD);
    setResettingPwUser(null);
    setCustomNewPw('');
    showToast(`Password untuk "${username}" berhasil di-reset ke default (${DEFAULT_PASSWORD}).`);
  };

  const handleDelete = (username) => {
    if (username === currentUser?.username || username === 'superadmin') {
      showToast('Akun Superadmin utama tidak dapat dihapus.', 'error');
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus user "${username}"?`)) {
      onDeleteUser(username);
      showToast(`User "${username}" berhasil dihapus.`);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchU = u.username.toLowerCase().includes(q);
        const matchN = (u.displayName || '').toLowerCase().includes(q);
        const matchJ = (u.jabatan || '').toLowerCase().includes(q);
        if (!matchU && !matchN && !matchJ) return false;
      }
      return true;
    });
  }, [users, filterRole, searchQuery]);

  const roleCounts = useMemo(() => {
    return {
      total: users.length,
      superadmin: users.filter(u => u.role === 'superadmin').length,
      admin: users.filter(u => u.role === 'admin').length,
      viewer: users.filter(u => u.role === 'viewer').length
    };
  }, [users]);

  const roleBadgeClass = (role) => {
    if (role === 'superadmin') return 'bg-purple-100 text-purple-800 border-purple-300';
    if (role === 'admin') return 'bg-amber-100 text-amber-900 border-amber-300';
    return 'bg-blue-50 text-[#003D79] border-blue-200';
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="bg-linear-to-r from-[#00254D] via-[#003D79] to-[#004B94] rounded-2xl p-5 sm:p-6 text-white shadow-md border border-slate-200/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFB81C]/20 border border-[#FFB81C]/40 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-[#FFB81C]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFB81C] text-[#00254D] text-[10px] font-black uppercase tracking-wider">
                Superadmin CMS Portal
              </span>
              <span className="text-xs text-[#FFE5A3] font-semibold">
                Role-Based Access Control (RBAC)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight mt-1">
              CMS Manajemen User & Hak Akses BranchIQ
            </h2>
            <p className="text-xs text-slate-200 mt-0.5">
              Kelola akun Superadmin, Admin/Konseptor Utama (<code className="text-[#FFE5A3] font-mono">michael</code>), dan Viewer (Mode Simulasi). Password default awal: <code className="text-[#FFE5A3] font-mono font-bold">{DEFAULT_PASSWORD}</code>
            </p>
          </div>
        </div>

        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#003D79] hover:bg-amber-50 text-xs font-extrabold shadow-sm transition-all cursor-pointer shrink-0 self-start sm:self-center"
        >
          <ArrowLeft className="w-4 h-4 text-[#003D79]" />
          <span>Kembali ke Dashboard Skor</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold shadow-xs animate-in fade-in duration-200 ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Total User Terdaftar</span>
            <Users className="w-4 h-4 text-[#003D79]" />
          </div>
          <p className="text-3xl font-extrabold text-[#003D79] mt-2 font-mono">{roleCounts.total}</p>
          <p className="text-[11px] text-slate-500 mt-1">Seluruh pegawai & admin terdaftar</p>
        </div>

        <div className="bg-white rounded-xl border border-purple-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-purple-700 uppercase">
            <span>Superadmin</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-3xl font-extrabold text-purple-700 mt-2 font-mono">{roleCounts.superadmin}</p>
          <p className="text-[11px] text-slate-500 mt-1">Akses penuh sistem & CMS User</p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase">
            <span>Admin / Konseptor</span>
            <UserCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-extrabold text-amber-700 mt-2 font-mono">{roleCounts.admin}</p>
          <p className="text-[11px] text-slate-500 mt-1">Edit Master Target, Strategi & Timestand</p>
        </div>

        <div className="bg-white rounded-xl border border-blue-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#003D79] uppercase">
            <span>Viewer (Mode Simulasi)</span>
            <Sparkles className="w-4 h-4 text-[#FFB81C]" />
          </div>
          <p className="text-3xl font-extrabold text-[#003D79] mt-2 font-mono">{roleCounts.viewer}</p>
          <p className="text-[11px] text-slate-500 mt-1">Read-Only Master • {simulationsCount} Simulasi Tersimpan</p>
        </div>
      </div>

      {/* Add New User Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#003D79]" />
            <h3 className="text-sm sm:text-base font-extrabold text-[#003D79]">
              Tambah User Baru
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Default password otomatis: <strong className="font-mono text-[#003D79]">{DEFAULT_PASSWORD}</strong>
          </span>
        </div>

        <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Username *</label>
            <input
              type="text"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="mis: budi_santoso"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79] font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="mis: Budi Santoso"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Jabatan / Unit</label>
            <input
              type="text"
              value={newJabatan}
              onChange={(e) => setNewJabatan(e.target.value)}
              placeholder="mis: Branch Officer"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Role Hak Akses *</label>
            <select
              value={newRole}
              onChange={(e) => {
                const r = e.target.value;
                setNewRole(r);
                if (r === 'admin') setNewJabatan('Konseptor / Admin Cabang');
                else if (r === 'superadmin') setNewJabatan('System Superadmin');
                else setNewJabatan('Branch Officer (Viewer)');
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79] font-bold text-[#003D79]"
            >
              <option value="viewer">Viewer (Read-Only + Simulasi)</option>
              <option value="admin">Admin / Konseptor (Edit Master)</option>
              <option value="superadmin">Superadmin (Full Access + CMS)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password Awal *</label>
            <input
              type="text"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79] font-mono font-bold text-[#003D79]"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 rounded-lg bg-[#003D79] hover:bg-[#00254D] text-white font-extrabold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#FFB81C]" />
              <span>Tambah User</span>
            </button>
          </div>
        </form>
      </div>

      {/* User List Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#003D79]"></div>
            <h3 className="text-sm sm:text-base font-extrabold text-[#003D79]">
              Daftar Akun & Manajemen Hak Akses ({filteredUsers.length} User)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari username / nama..."
                className="text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 w-44 focus:outline-none focus:ring-2 focus:ring-[#003D79]/20"
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700"
            >
              <option value="all">Semua Role ({users.length})</option>
              <option value="superadmin">Superadmin ({roleCounts.superadmin})</option>
              <option value="admin">Admin / Konseptor ({roleCounts.admin})</option>
              <option value="viewer">Viewer ({roleCounts.viewer})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Nama Lengkap & Jabatan</th>
                <th className="py-3 px-4">Role / Hak Akses</th>
                <th className="py-3 px-4">Password Aktif</th>
                <th className="py-3 px-4 text-right">Manajemen & Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u, idx) => {
                const isEditing = editingUsername === u.username;
                const isResetting = resettingPwUser === u.username;
                const isSelf = u.username === currentUser?.username;

                return (
                  <tr key={u.username} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>

                    {/* Username */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-extrabold text-[#003D79] text-xs">{u.username}</span>
                        {isSelf && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Anda
                          </span>
                        )}
                        {u.username === 'michael' && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                            Konseptor Utama
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Display Name & Jabatan */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="flex flex-col sm:flex-row gap-1.5">
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            placeholder="Nama Lengkap"
                            className="px-2 py-1 border border-blue-300 rounded text-xs font-bold bg-white"
                          />
                          <input
                            type="text"
                            value={editJabatan}
                            onChange={(e) => setEditJabatan(e.target.value)}
                            placeholder="Jabatan"
                            className="px-2 py-1 border border-blue-300 rounded text-xs bg-white"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-slate-900">{u.displayName}</p>
                          <p className="text-[11px] text-slate-400">{u.jabatan || '-'}</p>
                        </div>
                      )}
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="px-2.5 py-1 border border-blue-300 rounded text-xs font-bold text-[#003D79] bg-white"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="admin">Admin / Konseptor</option>
                          <option value="superadmin">Superadmin</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleBadgeClass(u.role)}`}>
                          <span>{getRoleLabel(u.role)}</span>
                        </span>
                      )}
                    </td>

                    {/* Password Info / Reset */}
                    <td className="py-3 px-4">
                      {isResetting ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={customNewPw}
                            onChange={(e) => setCustomNewPw(e.target.value)}
                            placeholder="Password baru..."
                            className="w-28 px-2 py-1 border border-amber-400 rounded text-xs font-mono bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCustomPassword(u.username)}
                            className="px-2 py-1 rounded bg-[#003D79] text-white font-bold text-[11px] cursor-pointer"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickResetDefaultPw(u.username)}
                            className="px-2 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] cursor-pointer"
                            title={`Reset ke default: ${DEFAULT_PASSWORD}`}
                          >
                            Default
                          </button>
                          <button
                            type="button"
                            onClick={() => setResettingPwUser(null)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-200">
                            {u.password || DEFAULT_PASSWORD}
                          </code>
                          {u.password !== DEFAULT_PASSWORD && (
                            <span className="text-[10px] text-amber-700 font-semibold">(Kustom)</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(u.username)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Simpan</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingUsername(null)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>Batal</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-[#003D79] border border-slate-300 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Edit Nama, Jabatan & Role"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit / Role</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setResettingPwUser(u.username);
                                setCustomNewPw(u.password || DEFAULT_PASSWORD);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Reset atau Ganti Password"
                            >
                              <KeyRound className="w-3 h-3 text-amber-600" />
                              <span>Reset PW</span>
                            </button>

                            {u.username !== 'superadmin' && !isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDelete(u.username)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors cursor-pointer"
                                title="Hapus User"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
