import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiMap } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ManageAirports() {
  const [airports, setAirports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const fetch = async () => {
    setLoading(true);
    try { const { data } = await api.get('/airports'); setAirports(data.airports); }
    catch { toast.error('Failed to load airports'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); setForm({}); setShowModal(true); };
  const openEdit = (a) => { setEditing(a); setForm({...a}); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/airports/${editing._id}`, form); toast.success('Airport updated'); }
      else { await api.post('/airports', form); toast.success('Airport created'); }
      setShowModal(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this airport?')) return;
    try { await api.delete(`/airports/${id}`); toast.success('Airport deactivated'); fetch(); }
    catch { toast.error('Delete failed'); }
  };

  const filtered = airports.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.code.toLowerCase().includes(search.toLowerCase()) ||
    a.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Manage Airports</h1>
          <p className="text-dark-400 text-sm mt-1">{airports.length} airports</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><FiPlus size={16} /> Add Airport</button>
      </div>

      <div className="relative w-64">
        <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-8" placeholder="Search airports..." />
      </div>

      {loading ? <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div> : filtered.length === 0 ? (
        <EmptyState title="No airports found" icon={FiMap} action={<button onClick={openCreate} className="btn-primary">Add Airport</button>} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div key={a._id} className="card hover:border-dark-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                    <span className="text-primary-400 font-bold text-sm">{a.code}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-dark-100 text-sm">{a.name}</p>
                    <p className="text-dark-400 text-xs">{a.city}, {a.country}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-primary-500/10 text-primary-400"><FiEdit2 size={13} /></button>
                  <button onClick={() => handleDelete(a._id)} className="p-1.5 rounded hover:bg-red-500/10 text-red-400"><FiTrash2 size={13} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-dark-500">ICAO:</span> <span className="text-dark-300">{a.icaoCode || '—'}</span></div>
                <div><span className="text-dark-500">Timezone:</span> <span className="text-dark-300">{a.timezone}</span></div>
              </div>
              <div className={`mt-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs ${a.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {a.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Airport' : 'Add Airport'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Airport Name</label>
              <input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="input" placeholder="John F. Kennedy International" required />
            </div>
            <div>
              <label className="label">IATA Code</label>
              <input value={form.code || ''} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} className="input" placeholder="JFK" maxLength={3} required />
            </div>
            <div>
              <label className="label">ICAO Code</label>
              <input value={form.icaoCode || ''} onChange={e => setForm({...form, icaoCode: e.target.value.toUpperCase()})} className="input" placeholder="KJFK" maxLength={4} />
            </div>
            <div>
              <label className="label">City</label>
              <input value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})} className="input" placeholder="New York" required />
            </div>
            <div>
              <label className="label">Country</label>
              <input value={form.country || ''} onChange={e => setForm({...form, country: e.target.value})} className="input" placeholder="USA" required />
            </div>
            <div>
              <label className="label">Timezone</label>
              <input value={form.timezone || ''} onChange={e => setForm({...form, timezone: e.target.value})} className="input" placeholder="America/New_York" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} className="input" placeholder="+1 718 244 4444" />
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
