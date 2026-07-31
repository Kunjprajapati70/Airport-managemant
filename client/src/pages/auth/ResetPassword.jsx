import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';

export default function ResetPassword() {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const [password, setPassword]   = useState('');
  const [confirm,  setConfirm]    = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (!/\d/.test(password)) { setError('Password must contain at least one number.'); return; }
    if (password !== confirm)  { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-dark-950">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-dark-100 mb-1">Reset password</h2>
        <p className="text-dark-500 text-sm mb-7">Enter and confirm your new password.</p>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-5">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="new-password" className="label">New password</label>
            <div className="relative">
              <FiLock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
              <input
                id="new-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-8 pr-10"
                placeholder="Min. 6 characters with a number"
                autoComplete="new-password"
                required
              />
              <button type="button" onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors">
                {showPass ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="label">Confirm password</label>
            <div className="relative">
              <FiLock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
              <input
                id="confirm-password"
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`input pl-8 ${confirm && confirm !== password ? 'input-error' : ''}`}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
              />
              {confirm && confirm === password && (
                <FiCheckCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Resetting…
              </>
            ) : 'Reset password'}
          </button>
        </form>

        <p className="text-center text-dark-500 text-sm mt-5">
          <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
