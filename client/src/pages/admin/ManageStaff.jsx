import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiSearch, FiUsers } from 'react-icons/fi';
import { ROLE_LABELS } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [airports, setAirports] = useState([]);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/staff', { params: { page, limit: 15 } });
      setStaff(data.staff); setPages(data.pages);
    } catch { toast.error('Failed to load staff'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [page]);
  useEffect(() => { api.get('/airports').then(r => setAirports(r.data.airports)); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', { ...form, role: form.role || 'checkin_staff' });
      toast.success('Staff member created');
      setShowModal(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const staffRoles = ['checkin_staff','boarding_staff','baggage_staff','security_officer','maintenance_staff','airline_manager','airport_admin'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark-100">Manage Staff</h1>
        <button onClick={() => { setEditing(null); setForm({}); setShowModal(true); }} className="btn-primary">
          <FiPlus size={16} /> Add Staff
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div> : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Employee</th><th>Role</th><th>Department</th><th>Airport</th><th>Shift</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-semibold">
                          {s.user?.firstName?.[0]}{s.user?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-dark-100 text-sm">{s.user?.firstName} {s.user?.lastName}</p>
                          <p className="text-xs text-dark-400">{s.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge bg-primary-500/10 text-primary-400">{ROLE_LABELS[s.user?.role] || s.user?.role}</span></td>
                    <td className="text-dark-300 text-sm">{s.department}</td>
                    <td className="text-dark-300 text-sm">{s.airport?.code || '—'}</td>
                    <td className="text-dark-300 text-sm capitalize">{s.shift}</td>
                    <td>
                      <span className={`badge ${s.isOnLeave ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {s.isOnLeave ? 'On Leave' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => { setEditing(s); setForm({...s}); setShowModal(true); }} className="p-1.5 rounded hover:bg-primary-500/10 text-primary-400">
                        <FiEdit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Staff' : 'Add Staff Member'}>
        <form onSubmit={editing ? async (e) => { e.preventDefault(); await api.put(`/staff/${editing._id}`, form); toast.success('Updated'); setShowModal(false); fetch(); } : handleCreate} className="space-y-4">
          {!editing && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First Name</label>
                  <input value={form.firstName || ''} onChange={e => setForm({...form, firstName: e.target.value})} className="input" required />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input value={form.lastName || ''} onChange={e => setForm({...form, lastName: e.target.value})} className="input" required />
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} className="input" required />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" value={form.password || ''} onChange={e => setForm({...form, password: e.target.value})} className="input" required minLength={6} />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <select value={form.role || ''} onChange={e => setForm({...form, role: e.target.value})} className="input" required={!editing}>
                <option value="">Select role</option>
                {staffRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Airport</label>
              <select value={form.airport || ''} onChange={e => setForm({...form, airport: e.target.value})} className="input">
                <option value="">Select airport</option>
                {airports.map(a => <option key={a._id} value={a._id}>{a.code} — {a.city}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <input value={form.department || ''} onChange={e => setForm({...form, department: e.target.value})} className="input" />
            </div>
            <div>
              <label className="label">Shift</label>
              <select value={form.shift || 'morning'} onChange={e => setForm({...form, shift: e.target.value})} className="input">
                {['morning','afternoon','night','rotating'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1 justify-center">{editing ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
