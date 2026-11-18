import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('BranchIQ ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      localStorage.removeItem('branchiq_state_v1');
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-rose-300 max-w-lg w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-[#00254D]">
              Terjadi Kendala Tampilan
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sistem mendeteksi galat saat memuat komponen dashboard. Anda dapat memuat ulang halaman atau mereset data sesi simulasi.
            </p>
            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-left font-mono text-xs text-rose-700 overflow-x-auto max-h-32">
                {String(this.state.error.message || this.state.error)}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#003D79] hover:bg-[#00254D] text-white font-extrabold text-xs shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-[#FFB81C]" />
                <span>Muat Ulang Halaman</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetState}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer border border-slate-300"
              >
                <span>Reset Sesi Simulasi</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
