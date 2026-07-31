/**
 * Register page
 * Passenger self-registration only.
 * Staff/admin accounts are created by admins via the Users management page.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../../store/slices/authSlice';
import { FiSend, FiMail, FiLock, FiUser, FiPhone, FiEye, FiEyeOff, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Register() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);

  const [form, setForm]         = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [showPass, setShowPass] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim())  errs.lastName  = 'Last name is required';
    if (!form.email.trim())     errs.email     = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password)         errs.password  = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Minimum 6 characters';
    else if (!/\d/.test(form.password)) errs.password = 'Must contain at least one number';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});

    const result = await dispatch(register(form));
    if (register.fulfilled.match(result)) {
      toast.success('Account created! Welcome to AeroManage.');
      navigate('/passenger/dashboard');
    } else {
      toast.error(result.payload || 'Registration failed');
    }
  };

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((fe) => ({ ...fe, [field]: '' }));
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6) return { label: 'Too short', color: 'bg-red-500', width: '25%' };
    if (p.length < 8 || !/\d/.test(p)) return { label: 'Weak', color: 'bg-orange-500', width: '50%' };
    if (p.length < 12) return { label: 'Good', color: 'bg-yellow-500', width: '75%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };
  const strength = passwordStrength();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-dark-950">
      <div className="w-full max-w-md py-8">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <FiSend size={14} className="text-white" />
          </div>
          <span className="font-bold text-dark-100 text-lg">AeroManage</span>
        </div>

        <h2 className="text-2xl font-bold text-dark-100 mb-1">Create account</h2>
        <p className="text-dark-500 text-sm mb-7">
          Register as a passenger to search and book flights
        </p>

        {/* API error */}
        {error && (
          <div className="flex items-center gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-5">
            <FiAlertCircle size={15} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="label">First name</label>
              <div className="relative">
                <FiUser size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                <input
                  id="firstName"
                  value={form.firstName}
                  onChange={set('firstName')}
                  className={`input pl-8 ${fieldErrors.firstName ? 'input-error' : ''}`}
                  placeholder="John"
                  autoComplete="given-name"
                />
              </div>
              {fieldErrors.firstName && <p className="field-error">{fieldErrors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="label">Last name</label>
              <input
                id="lastName"
                value={form.lastName}
                onChange={set('lastName')}
                className={`input ${fieldErrors.lastName ? 'input-error' : ''}`}
                placeholder="Doe"
                autoComplete="family-name"
              />
              {fieldErrors.lastName && <p className="field-error">{fieldErrors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="reg-email" className="label">Email address</label>
            <div className="relative">
              <FiMail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={set('email')}
                className={`input pl-8 ${fieldErrors.email ? 'input-error' : ''}`}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="label">
              Phone <span className="text-dark-600 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <FiPhone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                className="input pl-8"
                placeholder="+1 234 567 8900"
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="reg-password" className="label">Password</label>
            <div className="relative">
              <FiLock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
              <input
                id="reg-password"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                className={`input pl-8 pr-10 ${fieldErrors.password ? 'input-error' : ''}`}
                placeholder="Min. 6 characters with a number"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
              >
                {showPass ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
            {/* Strength bar */}
            {strength && (
              <div className="mt-2">
                <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <p className="text-2xs text-dark-500 mt-1">{strength.label}</p>
              </div>
            )}
            {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-2.5 mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account…
              </>
            ) : 'Create account'}
          </button>
        </form>

        <p className="text-center text-dark-500 text-sm mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
