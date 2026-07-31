/**
 * Profile.jsx
 * Passenger profile settings — identity, emergency contact, preferences, password.
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import { patchUser } from '../../store/slices/authSlice';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';
import { getInitials } from '../../utils/helpers';
import {
  FiUser, FiSave, FiLock, FiPhone, FiMail,
  FiAlertCircle, FiCheckCircle, FiEye, FiEyeOff,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'identity',   label: 'Identity' },
  { key: 'emergency',  label: 'Emergency Contact' },
  { key: 'preferences',label: 'Preferences' },
  { key: 'password',   label: 'Password' },
];

const MEAL_OPTIONS = ['standard','vegetarian','vegan','halal','kosher','gluten_free','diabetic','none'];
const SEAT_OPTIONS = ['window','aisle','middle','no_preference'];
const GENDER_OPTIONS = ['male','female','other','prefer_not_to_say'];

export default function PassengerProfile() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState('identity');
  const [form,     setForm]     = useState({});
  const [pwForm,   setPwForm]   = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showPw,   setShowPw]   = useState({ current: false, new: false, confirm: false });
  const [pwErrors, setPwErrors] = useState({});

  useEffect(() => {
    api.get('/passengers/me')
      .then((r) => {
        const p = r.data.profile;
        setProfile(p);
        setForm({
          passportNumber:           p.passportNumber           || '',
          nationalId:               p.nationalId               || '',
          nationality:              p.nationality              || '',
          dateOfBirth:              p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
          gender:                   p.gender                   || '',
          address:                  p.address                  || '',
          city:                     p.city                     || '',
          country:                  p.country                  || '',
          postalCode:               p.postalCode               || '',
          emergencyContactName:     p.emergencyContactName     || '',
          emergencyContactPhone:    p.emergencyContactPhone    || '',
          emergencyContactRelation: p.emergencyContactRelation || '',
          mealPreference:           p.mealPreference           || 'standard',
          seatPreference:           p.seatPreference           || 'no_preference',
          specialAssistance:        p.specialAssistance        || false,
          specialAssistanceDetails: p.specialAssistanceDetails || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/passengers/me', form);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const validatePassword = () => {
    const errs = {};
    if (!pwForm.currentPassword) errs.currentPassword = 'Required';
    if (!pwForm.newPassword)     errs.newPassword     = 'Required';
    else if (pwForm.newPassword.length < 6) errs.newPassword = 'Min 6 characters';
    else if (!/\d/.test(pwForm.newPassword)) errs.newPassword = 'Must contain a number';
    if (pwForm.newPassword !== pwForm.confirm) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const errs = validatePassword();
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwErrors({});
    setSaving(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Profile Settings" subtitle="Manage your personal information and preferences" />

      {/* Avatar + name */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {getInitials(user?.firstName, user?.lastName)}
        </div>
        <div>
          <p className="font-bold text-dark-100 text-lg">{user?.firstName} {user?.lastName}</p>
          <p className="text-dark-400 text-sm flex items-center gap-1.5 mt-0.5">
            <FiMail size={13} /> {user?.email}
          </p>
          {user?.phone && (
            <p className="text-dark-400 text-sm flex items-center gap-1.5 mt-0.5">
              <FiPhone size={13} /> {user?.phone}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 p-1 rounded-xl border border-dark-700 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 ${
              tab === key ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Identity ──────────────────────────────────────────────────────── */}
      {tab === 'identity' && (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="card">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-4">Identity Documents</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Passport Number</label>
                <input value={form.passportNumber} onChange={set('passportNumber')} className="input font-mono" placeholder="e.g. US123456789" />
              </div>
              <div>
                <label className="label">National ID</label>
                <input value={form.nationalId} onChange={set('nationalId')} className="input font-mono" placeholder="Optional" />
              </div>
              <div>
                <label className="label">Nationality</label>
                <input value={form.nationality} onChange={set('nationality')} className="input" placeholder="e.g. American" />
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} className="input" max={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="label">Gender</label>
                <select value={form.gender} onChange={set('gender')} className="input">
                  <option value="">Select</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-4">Address</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Street Address</label>
                <input value={form.address} onChange={set('address')} className="input" placeholder="123 Main St" />
              </div>
              <div>
                <label className="label">City</label>
                <input value={form.city} onChange={set('city')} className="input" />
              </div>
              <div>
                <label className="label">Country</label>
                <input value={form.country} onChange={set('country')} className="input" />
              </div>
              <div>
                <label className="label">Postal Code</label>
                <input value={form.postalCode} onChange={set('postalCode')} className="input" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-2.5">
            {saving ? <><LoadingSpinner size="sm" /> Saving…</> : <><FiSave size={15} /> Save Changes</>}
          </button>
        </form>
      )}

      {/* ── Emergency Contact ─────────────────────────────────────────────── */}
      {tab === 'emergency' && (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="card">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-4">Emergency Contact</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Full Name</label>
                <input value={form.emergencyContactName} onChange={set('emergencyContactName')} className="input" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input type="tel" value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} className="input" placeholder="+1 555 0100" />
              </div>
              <div>
                <label className="label">Relationship</label>
                <input value={form.emergencyContactRelation} onChange={set('emergencyContactRelation')} className="input" placeholder="e.g. Spouse, Parent" />
              </div>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-2.5">
            {saving ? <><LoadingSpinner size="sm" /> Saving…</> : <><FiSave size={15} /> Save Changes</>}
          </button>
        </form>
      )}

      {/* ── Preferences ───────────────────────────────────────────────────── */}
      {tab === 'preferences' && (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="card">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-4">Travel Preferences</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Meal Preference</label>
                <select value={form.mealPreference} onChange={set('mealPreference')} className="input">
                  {MEAL_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Seat Preference</label>
                <select value={form.seatPreference} onChange={set('seatPreference')} className="input">
                  {SEAT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.specialAssistance}
                  onChange={set('specialAssistance')}
                  className="w-4 h-4 accent-primary-500"
                />
                <span className="text-sm text-dark-300">I require special assistance (wheelchair, mobility aid, etc.)</span>
              </label>
              {form.specialAssistance && (
                <textarea
                  value={form.specialAssistanceDetails}
                  onChange={set('specialAssistanceDetails')}
                  className="input"
                  rows={3}
                  placeholder="Please describe your requirements in detail…"
                />
              )}
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-2.5">
            {saving ? <><LoadingSpinner size="sm" /> Saving…</> : <><FiSave size={15} /> Save Preferences</>}
          </button>
        </form>
      )}

      {/* ── Password ──────────────────────────────────────────────────────── */}
      {tab === 'password' && (
        <form onSubmit={handlePasswordChange} className="card space-y-4" noValidate>
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Change Password</p>

          {[
            { key: 'currentPassword', label: 'Current Password', field: 'current' },
            { key: 'newPassword',     label: 'New Password',     field: 'new' },
            { key: 'confirm',         label: 'Confirm New Password', field: 'confirm' },
          ].map(({ key, label, field }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="relative">
                <FiLock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                <input
                  type={showPw[field] ? 'text' : 'password'}
                  value={pwForm[key]}
                  onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))}
                  className={`input pl-8 pr-10 ${pwErrors[key] ? 'input-error' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => ({ ...p, [field]: !p[field] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  {showPw[field] ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
              {pwErrors[key] && <p className="field-error">{pwErrors[key]}</p>}
            </div>
          ))}

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-2.5">
            {saving ? <><LoadingSpinner size="sm" /> Updating…</> : <><FiLock size={15} /> Update Password</>}
          </button>
        </form>
      )}
    </div>
  );
}
