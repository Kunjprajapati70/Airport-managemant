import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiMail, FiArrowLeft, FiSend, FiCheckCircle } from 'react-icons/fi';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-dark-950">
      <div className="w-full max-w-md">

        <Link to="/login" className="inline-flex items-center gap-2 text-dark-500 hover:text-dark-300 text-sm mb-8 transition-colors">
          <FiArrowLeft size={15} /> Back to sign in
        </Link>

        {sent ? (
          /* Success state */
          <div className="card text-center animate-fade-in">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle size={26} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-dark-100 mb-2">Check your inbox</h2>
            <p className="text-dark-400 text-sm leading-relaxed">
              If an account exists for <span className="text-dark-200 font-medium">{email}</span>,
              we've sent a password reset link. It expires in 30 minutes.
            </p>
            <Link to="/login" className="btn-primary w-full justify-center mt-6">
              Back to sign in
            </Link>
          </div>
        ) : (
          /* Form state */
          <>
            <h2 className="text-2xl font-bold text-dark-100 mb-1">Forgot password?</h2>
            <p className="text-dark-500 text-sm mb-7">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="fp-email" className="label">Email address</label>
                <div className="relative">
                  <FiMail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                  <input
                    id="fp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-9"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  <><FiSend size={14} /> Send reset link</>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
