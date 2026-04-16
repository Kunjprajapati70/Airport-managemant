import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ManageAircraft() {
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [airlines, setAirlines] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/aircraft', { params: { page, limit: 15 } });
      setAircraft(data.aircraft); setPages(data.pages);
    } catch { toast.error('Failed to load aircraft'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [page]);
  useEffect(() => { api.get('/airlines').then(r => setAirlines(r.data.airlines)); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/aircraft/${editing._id}`, form); toast.success('Aircraft updated'); }
      else { await api.post('/aircraft', form); toast.success('Aircraft registered'); }
      setShowModal(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark-100">Manage Aircraft</h1>
        <button onClick={() => { setEditing(null); setForm({}); setShowModal(true); }} className="btn-primary">
          <FiPlus size={16} /> Register Aircraft
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div> : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Registration</th><th>Model</th><th>Airline</th><th>Seats</th><th>Status</th><th>Next Maintenance</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {aircraft.map(a => (
                  <tr key={a._id}>
                    <td className="font-medium text-dark-100">{a.registrationNumber}</td>
                    <td>
                      <p className="text-dark-200">{a.model}</p>
                      <p className="text-xs text-dark-400">{a.manufacturer}</p>
                    </td>
                    <td className="text-dark-300">{a.airline?.name}</td>
                    <td>
                      <p className="text-dark-200 text-sm">{a.totalSeats} total</p>
                      <p className="text-xs text-dark-400">{a.economySeats}E / {a.businessSeats}B / {a.firstClassSeats}F</p>
                    </td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-dark-300 text-sm">{a.nextMaintenanceDue ? new Date(a.nextMaintenanceDue).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(a); setForm({...a, airline: a.airline?._id}); setShowModal(true); }} className="p-1.5 rounded hover:bg-primary-500/10 text-primary-400"><FiEdit2 size={13} /></button>
                        <button onClick={async () => { if(confirm('Deactivate?')) { await api.delete(`/aircraft/${a._id}`); fetch(); }}} className="p-1.5 rounded hover:bg-red-500/10 text-red-400"><FiTrash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Aircraft' : 'Register Aircraft'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Registration No.</label>
              <input value={form.registrationNumber || ''} onChange={e => setForm({...form, registrationNumber: e.target.value.toUpperCase()})} className="input" placeholder="N101AA" required />
            </div>
            <div>
              <label className="label">Model</label>
              <input value={form.model || ''} onChange={e => setForm({...form, model: e.target.value})} className="input" placeholder="Boeing 737-800" required />
            </div>
            <div>
              <label className="label">Manufacturer</label>
              <input value={form.manufacturer || ''} onChange={e => setForm({...form, manufacturer: e.target.value})} className="input" placeholder="Boeing" />
            </div>
            <div>
              <label className="label">Airline</label>
              <select value={form.airline || ''} onChange={e => setForm({...form, airline: e.target.value})} className="input" required>
                <option value="">Select airline</option>
                {airlines.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Economy Seats</label>
              <input type="number" value={form.economySeats || ''} onChange={e => setForm({...form, economySeats: +e.target.value, totalSeats: (+e.target.value) + (+form.businessSeats||0) + (+form.firstClassSeats||0)})} className="input" />
            </div>
            <div>
              <label className="label">Business Seats</label>
              <input type="number" value={form.businessSeats || ''} onChange={e => setForm({...form, businessSeats: +e.target.value, totalSeats: (+form.economySeats||0) + (+e.target.value) + (+form.firstClassSeats||0)})} className="input" />
            </div>
            <div>
              <label className="label">First Class Seats</label>
              <input type="number" value={form.firstClassSeats || ''} onChange={e => setForm({...form, firstClassSeats: +e.target.value, totalSeats: (+form.economySeats||0) + (+form.businessSeats||0) + (+e.target.value)})} className="input" />
            </div>
            <div>
              <label className="label">Total Seats</label>
              <input type="number" value={form.totalSeats || ''} onChange={e => setForm({...form, totalSeats: e.target.value})} className="input" required />
            </div>
            <div>
              <label className="label">Year Manufactured</label>
              <input type="number" value={form.yearManufactured || ''} onChange={e => setForm({...form, yearManufactured: e.target.value})} className="input" />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status || 'available'} onChange={e => setForm({...form, status: e.target.value})} className="input">
                {['available','assigned','maintenance','grounded','retired'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1 justify-center">{editing ? 'Update' : 'Register'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
