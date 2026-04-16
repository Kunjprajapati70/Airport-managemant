import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDateTime, ROLE_LABELS } from '../../utils/helpers';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ALL_ROLES = ['super_admin', 'airport_admin', 'airline_manager', 'passenger', 'checkin_staff', 'boarding_staff', 'baggage_staff', 'security_officer', 'maintenance_staff'];

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get('/users', { params });
      setUsers(data.users); setPages(data.pages); setTotal(data.total);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, roleFilter]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchUsers(); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/users/${editing._id}`, form); toast.success('User updated'); }
      else { await api.post('/users', form); toast.success('User created'); }
      setShowModal(false); fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this user?')) return;
    try { await api.delete(`/users/${id}`); toast.success('User deactivated'); fetchUsers(); }
    catch { toast.error('Failed'); }
  };

  const roleColors = {
    super_admin: 'bg-red-500/10 text-red-400',
    airport_admin: 'bg-orange-500/10 text-orange-400',
    airline_manager: 'bg-purple-500/10 text-purple-400',
    passenger: 'bg-blue-500/10 text-blue-400',
    checkin_staff: 'bg-cyan-500/10 text-cyan-400',
    boarding_staff: 'bg-emerald-500/10 text-emerald-400',
    baggage_staff: 'bg-amber-500/10 text-amber-400',
    security_officer: 'bg-rose-500/10 text-rose-400',
    maintenance_staff: 'bg-indigo-500/10 text-indigo-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Manage Users</h1>
          <p className="text-dark-400 text-sm mt-1">{total} total users</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({}); setShowModal(true); }} className="btn-primary">
          <FiPlus size={16} /> Add User
        </button>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
        <div className="relative">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-8 w-56" placeholder="Search by name or email..." />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="input w-44">
          <option value="">All roles</option>
          {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Phone</th><th>Last Login</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-dark-100 text-sm">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-dark-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge text-xs ${roleColors[u.role] || 'bg-dark-700 text-dark-300'}`}>{ROLE_LABELS[u.role]}</span></td>
                    <td className="text-dark-300 text-sm">{u.phone || '—'}</td>
                    <td className="text-dark-400 text-xs">{u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}</td>
                    <td>
                      <span className={`badge text-xs ${u.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(u); setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, role: u.role, isActive: u.isActive }); setShowModal(true); }}
                          className="p-1.5 rounded hover:bg-primary-500/10 text-primary-400"><FiEdit2 size={13} /></button>
                        <button onClick={() => handleDeactivate(u._id)} className="p-1.5 rounded hover:bg-red-500/10 text-red-400"><FiTrash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-dark-400">No users found</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit User' : 'Create User'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First Name</label><input value={form.firstName || ''} onChange={e => setForm({ ...form, firstName: e.target.value })} className="input" required /></div>
            <div><label className="label">Last Name</label><input value={form.lastName || ''} onChange={e => setForm({ ...form, lastName: e.target.value })} className="input" required /></div>
          </div>
          <div><label className="label">Email</label><input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="input" required /></div>
          {!editing && <div><label className="label">Password</label><input type="password" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} className="input" required minLength={6} /></div>}
          <div><label className="label">Phone</label><input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" /></div>
          <div>
            <label className="label">Role</label>
            <select value={form.role || 'passenger'} onChange={e => setForm({ ...form, role: e.target.value })} className="input">
              {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          {editing && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={form.isActive !== false} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-primary-500" />
              <label htmlFor="isActive" className="text-sm text-dark-300">Account Active</label>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1 justify-center">{editing ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
