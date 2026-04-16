import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import { patchUser } from '../../store/slices/authSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getInitials, ROLE_LABELS } from '../../utils/helpers';
import { FiMail, FiPhone, FiSave, FiUpload, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Profile() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [avatarFile, setAvatarFile] = useState(null);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const profileSubtitle = useMemo(() => {
    const role = ROLE_LABELS[user?.role] ?? user?.role ?? 'User';
    return `${role} · Update your personal details`;
  }, [user?.role]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('firstName', form.firstName);
      fd.append('lastName', form.lastName);
      fd.append('phone', form.phone);
      if (avatarFile) fd.append('avatar', avatarFile);

      const { data } = await api.put('/auth/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      dispatch(patchUser(data.user));
      toast.success('Profile updated');
      setAvatarFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!pw.currentPassword || !pw.newPassword) {
      toast.error('Please fill current and new password');
      return;
    }
    if (pw.newPassword.length < 6 || !/\d/.test(pw.newPassword)) {
      toast.error('New password must be 6+ characters and contain a number');
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setPwSaving(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      toast.success('Password changed');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="My Profile" subtitle={profileSubtitle} />

      {/* Summary */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden">
          {user?.avatar
            ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            : getInitials(user?.firstName, user?.lastName)
          }
        </div>
        <div className="min-w-0">
          <p className="font-bold text-dark-100 text-lg truncate">{user?.firstName} {user?.lastName}</p>
          <p className="text-dark-400 text-sm flex items-center gap-1.5 mt-0.5 truncate">
            <FiMail size={13} /> {user?.email}
          </p>
          <p className="text-dark-400 text-sm flex items-center gap-1.5 mt-0.5 truncate">
            <FiPhone size={13} /> {user?.phone || '—'}
          </p>
        </div>
      </div>

      {/* Edit profile */}
      <form onSubmit={saveProfile} className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">First name</label>
            <input value={form.firstName} onChange={set('firstName')} className="input" />
          </div>
          <div>
            <label className="label">Last name</label>
            <input value={form.lastName} onChange={set('lastName')} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Phone</label>
            <input value={form.phone} onChange={set('phone')} className="input" placeholder="+1 234 567 8900" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Avatar</label>
            <label className="btn-secondary w-full justify-center cursor-pointer">
              <FiUpload size={16} /> {avatarFile ? avatarFile.name : 'Upload avatar'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
          {saving ? <><LoadingSpinner size="sm" /> Saving…</> : <><FiSave size={16} /> Save Changes</>}
        </button>
      </form>

      {/* Password */}
      <form onSubmit={changePassword} className="card space-y-4">
        <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Security</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Current password</label>
            <div className="relative">
              <input
                type={showPw.current ? 'text' : 'password'}
                value={pw.currentPassword}
                onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-200"
                aria-label={showPw.current ? 'Hide password' : 'Show password'}
              >
                {showPw.current ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">New password</label>
            <div className="relative">
              <input
                type={showPw.next ? 'text' : 'password'}
                value={pw.newPassword}
                onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => ({ ...s, next: !s.next }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-200"
                aria-label={showPw.next ? 'Hide password' : 'Show password'}
              >
                {showPw.next ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
            <p className="text-2xs text-dark-500 mt-1">Minimum 6 characters and at least one number.</p>
          </div>

          <div>
            <label className="label">Confirm new password</label>
            <div className="relative">
              <input
                type={showPw.confirm ? 'text' : 'password'}
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-200"
                aria-label={showPw.confirm ? 'Hide password' : 'Show password'}
              >
                {showPw.confirm ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>
        </div>

        <button type="submit" disabled={pwSaving} className="btn-secondary w-full justify-center">
          {pwSaving ? <><LoadingSpinner size="sm" /> Updating…</> : <><FiLock size={16} /> Change Password</>}
        </button>
      </form>
    </div>
  );
}

