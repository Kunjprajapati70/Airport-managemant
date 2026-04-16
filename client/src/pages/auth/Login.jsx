/**
 * Login page
 * Split layout: feature panel (desktop left) + form (right).
 * Includes demo account quick-fill buttons for all 9 roles.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../../store/slices/authSlice';
import { getDashboardPath } from '../../utils/helpers';
import { FiSend, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin',       email: 'superadmin@ams.com',     role: 'super_admin' },
  { label: 'Airport Admin',     email: 'airportadmin@ams.com',   role: 'airport_admin' },
  { label: 'Airline Manager',   email: 'airlinemanager@ams.com', role: 'airline_manager' },
  { label: 'Passenger',         email: 'passenger@ams.com',      role: 'passenger' },
  { label: 'Check-in Staff',    email: 'checkin@ams.com',        role: 'checkin_staff' },
  { label: 'Boarding Staff',    email: 'boarding@ams.com',       role: 'boarding_staff' },
  { label: 'Baggage Staff',     email: 'baggage@ams.com',        role: 'baggage_staff' },
  { label: 'Security Officer',  email: 'security@ams.com',       role: 'security_officer' },
  { label: 'Maintenance Staff', email: 'maintenance@ams.com',    role: 'maintenance_staff' },
];

const FEATURES = [
  ['9 User Roles',      'Complete RBAC system'],
  ['Real-time Updates', 'Socket.IO live data'],
  ['QR Boarding Pass',  'PDF generation'],
  ['Full Analytics',    'Reports & audit logs'],
];

export default function Login() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { loading, error } = useSelector((s) => s.auth);

  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  // Clear stale errors when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) {
      toast.success(`Welcome back, ${result.payload.user.firstName}!`);
      // Redirect to intended page or role dashboard
      const from = location.state?.from?.pathname;
      navigate(from || getDashboardPath(result.payload.user.role), { replace: true });
    }
  };

  const fillDemo = (email) => {
    setForm({ email, password: 'Admin@123' });
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left feature panel (desktop only) ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-gradient-to-br from-primary-950 via-primary-900 to-dark-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Dot pattern overlay */}
        <div className="absolute inset-0 bg-dot-pattern bg-dot opacity-40" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
            <FiSend size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">AeroManage</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
            Airport Management<br />
            <span className="text-primary-300">Made Simple</span>
          </h1>
          <p className="text-primary-200/80 text-lg leading-relaxed mb-10">
            Enterprise-grade platform managing every aspect of airport operations from one centralized dashboard.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(([title, sub]) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-white font-semibold text-sm">{title}</p>
                <p className="text-primary-300/70 text-xs mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-primary-400/60 text-xs">
          © {new Date().getFullYear()} AeroManage. Enterprise Airport Management System.
        </p>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-dark-950 overflow-y-auto">
        <div className="w-full max-w-md py-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <FiSend size={14} className="text-white" />
            </div>
            <span className="font-bold text-dark-100 text-lg">AeroManage</span>
          </div>

          <h2 className="text-2xl font-bold text-dark-100 mb-1">Sign in</h2>
          <p className="text-dark-500 text-sm mb-7">
            Enter your credentials to access your dashboard
          </p>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-5 animate-fade-in">
              <FiAlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <div className="relative">
                <FiMail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input pl-9"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <FiLock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input pl-9 pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-dark-500 text-sm mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Create one
            </Link>
          </p>

          {/* Demo accounts */}
          <div className="mt-7 p-4 bg-dark-800/60 border border-dark-700 rounded-xl">
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">
              Demo accounts — password: <span className="text-dark-300 font-mono">Admin@123</span>
            </p>
            <div className="grid grid-cols-1 gap-1">
              {DEMO_ACCOUNTS.map(({ label, email }) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => fillDemo(email)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg
                             bg-dark-700/50 hover:bg-dark-700 transition-colors text-left group"
                >
                  <span className="text-xs font-medium text-dark-300 group-hover:text-dark-100 transition-colors">
                    {label}
                  </span>
                  <span className="text-2xs text-dark-600 group-hover:text-dark-500 font-mono transition-colors">
                    {email}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
