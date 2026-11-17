import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle,
  Building2,
  Sparkles
} from 'lucide-react';
import { DEFAULT_PASSWORD, getInitialDbState, ensureRequiredUsers } from '../utils/dbService';

export function LoginPage({ onLogin, users = [] }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const activeUsersList = ensureRequiredUsers(users && users.length > 0 ? users : getInitialDbState().users);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const cleanUser = username.trim().toLowerCase();
    
    if (!cleanUser) {
      setError('Silakan masukkan username Anda.');
      return;
    }

    if (!password) {
      setError('Silakan masukkan password Anda.');
      return;
    }

    const foundUser = activeUsersList.find(u => u.username.toLowerCase() === cleanUser);
    const expectedPassword = foundUser?.password || DEFAULT_PASSWORD;

    if (!foundUser || password !== expectedPassword) {
      setError('Username atau password tidak sesuai. Pastikan akun Anda terdaftar.');
      return;
    }
    
    setIsLoading(true);

    setTimeout(() => {
      const userData = {
        username: foundUser.username,
        displayName: foundUser.displayName || (cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1)),
        role: foundUser.role || (cleanUser === 'superadmin' || cleanUser.endsWith('.superadmin') ? 'superadmin' : cleanUser === 'michael' || cleanUser.endsWith('.admin') ? 'admin' : 'viewer'),
        jabatan: foundUser.jabatan || '',
        loginAt: new Date().toISOString(),
        rememberMe
      };

      if (rememberMe) {
        localStorage.setItem('branchiq_auth_user', JSON.stringify(userData));
      } else {
        sessionStorage.setItem('branchiq_auth_user', JSON.stringify(userData));
      }

      setIsLoading(false);
      onLogin(userData);
    }, 300);
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans overflow-hidden">
      
      {/* Full-Screen Outer Background: Cabang Pondok Indah */}
      <div className="fixed inset-0 z-0">
        <picture>
          <source srcSet="/cabang_pondok_indah.jpg" type="image/jpeg" />
          <source srcSet="/cabang_pondok_indah.heic" type="image/heic" />
          <img
            src="/cabang_pondok_indah.jpg"
            alt="Cabang Pondok Indah Background"
            className="w-full h-full object-cover object-center scale-105"
          />
        </picture>
        <div className="absolute inset-0 bg-[#00254D]/55 backdrop-blur-[2px]"></div>
      </div>

      {/* Outer Card with 2-Column Split */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 flex flex-col lg:flex-row min-h-[520px]">
        
        {/* Left Side: Branch Hero Image & Branding */}
        <div className="lg:w-1/2 relative bg-gradient-to-br from-[#00254D] via-[#003D79] to-[#004B94] p-7 sm:p-10 text-white flex flex-col justify-between overflow-hidden">
          
          {/* Background Photo with Gradient Overlay */}
          <div className="absolute inset-0 z-0">
            <picture>
              <source srcSet="/mandiri_kcp_piot.jpg" type="image/jpeg" />
              <source srcSet="/mandiri_kcp_piot.heic" type="image/heic" />
              <img 
                src="/mandiri_kcp_piot.jpg" 
                alt="Mandiri KCP Pondok Indah Office Tower 3" 
                className="w-full h-full object-cover object-center scale-105 filter brightness-90 contrast-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-[#00254D]/90 via-[#003D79]/70 to-[#004B94]/55 mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#00254D]/80 via-[#00254D]/40 to-transparent"></div>
          </div>

          {/* Top Content: Logo and Region Badge */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-md inline-flex items-center">
                <img 
                  src="/mandiri_logo.png" 
                  alt="Bank Mandiri" 
                  className="h-8 w-auto object-contain"
                />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#FFB81C] text-[#00254D] shadow-xs">
                Region V / Jakarta 3
              </span>
            </div>

            <div className="pt-4 sm:pt-6">
              <div className="inline-flex items-center gap-1.5 text-xs text-[#FFE5A3] font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-[#FFB81C]" />
                <span>Mandiri Melesat Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                BranchIQ Score Board Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 mt-2 max-w-md leading-relaxed font-normal">
                Sistem monitoring kinerja, simulasi gap metrik, pembagian target harian (Timestand), dan analisis performa cabang secara presisi.
              </p>
            </div>
          </div>

          {/* Bottom Content: Branch Location Pill */}
          <div className="relative z-10 pt-6 mt-auto">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFB81C]/20 border border-[#FFB81C]/40 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#FFB81C]" />
                </div>
                <div className="text-xs">
                  <p className="text-white/70 font-semibold text-[10px] uppercase tracking-wider">Cabang Utama</p>
                  <p className="font-extrabold text-white text-sm">KC Jakarta Pondok Indah Office 3</p>
                  <p className="text-white/60 text-[11px]">Kode: 10125 • Kelas B.3 • Kepala Unit: MICHAEL DANNIEL</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Clean Standard Login Form */}
        <div className="lg:w-1/2 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          
          <div className="max-w-md w-full mx-auto space-y-5">
            
            {/* Form Title */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#003D79] bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-md inline-block mb-2">
                Login Portal BranchIQ
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Selamat Datang
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Silakan masukkan username dan password Anda untuk melanjutkan.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-snug">{error}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username Anda"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79] transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password Anda"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#003D79] focus:ring-[#003D79] border-slate-300"
                  />
                  <span className="text-xs text-slate-600 font-medium">Ingat Saya di Perangkat Ini</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#003D79] to-[#00254D] hover:from-[#00254D] hover:to-[#001833] text-white text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
              >
                {isLoading ? (
                  <span>Memverifikasi Akun...</span>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="w-4 h-4 text-[#FFB81C]" />
                  </>
                )}
              </button>

            </form>

            {/* Security Badge Footer */}
            <div className="flex items-center justify-center gap-2 text-slate-400 text-[11px] pt-3 border-t border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Sistem Terenkripsi • PT Bank Mandiri (Persero) Tbk.</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default LoginPage;
