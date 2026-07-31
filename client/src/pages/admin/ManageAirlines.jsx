import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiGlobe } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ManageAirlines() {
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const fetch = async () => {
    setLoading(true);
    try { const { data } = await api.get('/airlines'); setAirlines(data.airlines); }
    catch { toast.error('Failed to load airlines'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/airlines/${editing._id}`, form); toast.success('Airline updated'); }
      else { await api.post('/airlines', form); toast.success('Airline created'); }
      setShowModal(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
  };

  const filtered = airlines.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Manage Airlines</h1>
          <p className="text-dark-400 text-sm mt-1">{airlines.length} airlines</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({}); setShowModal(true); }} className="btn-primary">
          <FiPlus size={16} /> Add Airline
        </button>
      </div>

      <div className="relative w-64">
        <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-8" placeholder="Search airlines..." />
      </div>

      {loading ? <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Airline</th><th>Code</th><th>Country</th><th>Founded</th><th>HQ</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a._id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-primary-400 font-bold text-xs">{a.code}</div>
                      <span className="font-medium text-dark-100">{a.name}</span>
                    </div>
                  </td>
                  <td className="text-dark-300">{a.code}</td>
                  <td className="text-dark-300">{a.country}</td>
                  <td className="text-dark-300">{a.foundedYear || '—'}</td>
                  <td className="text-dark-300">{a.headquarters || '—'}</td>
                  <td>
                    <span className={`badge ${a.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {a.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(a); setForm({...a}); setShowModal(true); }} className="p-1.5 rounded hover:bg-primary-500/10 text-primary-400"><FiEdit2 size={13} /></button>
                      <button onClick={async () => { if(confirm('Deactivate?')) { await api.delete(`/airlines/${a._id}`); fetch(); }}} className="p-1.5 rounded hover:bg-red-500/10 text-red-400"><FiTrash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Airline' : 'Add Airline'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Airline Name</label>
              <input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="input" required />
            </div>
            <div>
              <label className="label">IATA Code</label>
              <input value={form.code || ''} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} className="input" maxLength={2} required />
            </div>
            <div>
              <label className="label">Country</label>
              <input value={form.country || ''} onChange={e => setForm({...form, country: e.target.value})} className="input" required />
            </div>
            <div>
              <label className="label">Founded Year</label>
              <input type="number" value={form.foundedYear || ''} onChange={e => setForm({...form, foundedYear: e.target.value})} className="input" />
            </div>
            <div>
              <label className="label">Headquarters</label>
              <input value={form.headquarters || ''} onChange={e => setForm({...form, headquarters: e.target.value})} className="input" />
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
