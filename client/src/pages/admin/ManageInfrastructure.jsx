import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TABS = ['Terminals', 'Gates', 'Runways', 'Parking Bays'];
const ENDPOINTS = ['/infrastructure/terminals', '/infrastructure/gates', '/infrastructure/runways', '/infrastructure/parking-bays'];
const DATA_KEYS = ['terminals', 'gates', 'runways', 'bays'];

export default function ManageInfrastructure() {
  const [activeTab, setActiveTab] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [airports, setAirports] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(ENDPOINTS[activeTab]);
      setItems(data[DATA_KEYS[activeTab]] || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [activeTab]);
  useEffect(() => {
    api.get('/airports').then(r => setAirports(r.data.airports));
    api.get('/infrastructure/terminals').then(r => setTerminals(r.data.terminals));
  }, []);

  const openCreate = () => { setEditing(null); setForm({}); setShowModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item, airport: item.airport?._id || item.airport, terminal: item.terminal?._id || item.terminal }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`${ENDPOINTS[activeTab]}/${editing._id}`, form); toast.success('Updated'); }
      else { await api.post(ENDPOINTS[activeTab], form); toast.success('Created'); }
      setShowModal(false); fetchItems();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this item?')) return;
    try { await api.delete(`${ENDPOINTS[activeTab]}/${id}`); toast.success('Deactivated'); fetchItems(); }
    catch { toast.error('Failed'); }
  };

  const renderTableRows = () => {
    if (activeTab === 0) return items.map(t => (
      <tr key={t._id}>
        <td className="font-medium text-dark-100">{t.name}</td>
        <td className="text-dark-300">{t.code}</td>
        <td className="text-dark-300">{t.airport?.code || '—'}</td>
        <td><span className="badge bg-blue-500/10 text-blue-400 capitalize">{t.type}</span></td>
        <td className="text-dark-300">{t.totalGates}</td>
        <td><Actions item={t} onEdit={openEdit} onDelete={handleDelete} /></td>
      </tr>
    ));
    if (activeTab === 1) return items.map(g => (
      <tr key={g._id}>
        <td className="font-medium text-dark-100">{g.gateNumber}</td>
        <td className="text-dark-300">{g.terminal?.name || '—'}</td>
        <td className="text-dark-300">{g.airport?.code || '—'}</td>
        <td><span className={`badge capitalize ${g.status === 'available' ? 'bg-emerald-500/10 text-emerald-400' : g.status === 'occupied' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{g.status}</span></td>
        <td className="text-dark-300 capitalize">{g.type}</td>
        <td><Actions item={g} onEdit={openEdit} onDelete={handleDelete} /></td>
      </tr>
    ));
    if (activeTab === 2) return items.map(r => (
      <tr key={r._id}>
        <td className="font-medium text-dark-100">{r.runwayId}</td>
        <td className="text-dark-300">{r.airport?.code || '—'}</td>
        <td className="text-dark-300">{r.length ? `${r.length}m` : '—'}</td>
        <td className="text-dark-300 capitalize">{r.surface}</td>
        <td><span className={`badge capitalize ${r.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{r.status}</span></td>
        <td><Actions item={r} onEdit={openEdit} onDelete={handleDelete} /></td>
      </tr>
    ));
    if (activeTab === 3) return items.map(b => (
      <tr key={b._id}>
        <td className="font-medium text-dark-100">{b.bayNumber}</td>
        <td className="text-dark-300">{b.airport?.code || '—'}</td>
        <td className="text-dark-300 capitalize">{b.type}</td>
        <td><span className={`badge capitalize ${b.status === 'available' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{b.status}</span></td>
        <td><Actions item={b} onEdit={openEdit} onDelete={handleDelete} /></td>
      </tr>
    ));
  };

  const renderTableHead = () => {
    const heads = {
      0: ['Name', 'Code', 'Airport', 'Type', 'Gates', 'Actions'],
      1: ['Gate No.', 'Terminal', 'Airport', 'Status', 'Type', 'Actions'],
      2: ['Runway ID', 'Airport', 'Length', 'Surface', 'Status', 'Actions'],
      3: ['Bay No.', 'Airport', 'Type', 'Status', 'Actions'],
    };
    return heads[activeTab].map(h => <th key={h}>{h}</th>);
  };

  const renderForm = () => {
    const airportSelect = (
      <div>
        <label className="label">Airport</label>
        <select value={form.airport || ''} onChange={e => setForm({ ...form, airport: e.target.value })} className="input" required>
          <option value="">Select airport</option>
          {airports.map(a => <option key={a._id} value={a._id}>{a.code} — {a.city}</option>)}
        </select>
      </div>
    );
    if (activeTab === 0) return (
      <div className="space-y-3">
        {airportSelect}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Name</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="Terminal 1" required /></div>
          <div><label className="label">Code</label><input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} className="input" placeholder="T1" required /></div>
        </div>
        <div>
          <label className="label">Type</label>
          <select value={form.type || 'mixed'} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
            {['domestic', 'international', 'mixed'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="label">Total Gates</label><input type="number" value={form.totalGates || ''} onChange={e => setForm({ ...form, totalGates: e.target.value })} className="input" /></div>
      </div>
    );
    if (activeTab === 1) return (
      <div className="space-y-3">
        <div>
          <label className="label">Terminal</label>
          <select value={form.terminal || ''} onChange={e => setForm({ ...form, terminal: e.target.value })} className="input" required>
            <option value="">Select terminal</option>
            {terminals.map(t => <option key={t._id} value={t._id}>{t.name} ({t.airport?.code})</option>)}
          </select>
        </div>
        {airportSelect}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Gate Number</label><input value={form.gateNumber || ''} onChange={e => setForm({ ...form, gateNumber: e.target.value })} className="input" placeholder="A12" required /></div>
          <div>
            <label className="label">Status</label>
            <select value={form.status || 'available'} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
              {['available', 'occupied', 'maintenance', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Type</label>
          <select value={form.type || 'mixed'} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
            {['domestic', 'international', 'mixed'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
    );
    if (activeTab === 2) return (
      <div className="space-y-3">
        {airportSelect}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Runway ID</label><input value={form.runwayId || ''} onChange={e => setForm({ ...form, runwayId: e.target.value })} className="input" placeholder="09L" required /></div>
          <div>
            <label className="label">Status</label>
            <select value={form.status || 'active'} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
              {['active', 'inactive', 'maintenance', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="label">Length (m)</label><input type="number" value={form.length || ''} onChange={e => setForm({ ...form, length: e.target.value })} className="input" /></div>
          <div><label className="label">Width (m)</label><input type="number" value={form.width || ''} onChange={e => setForm({ ...form, width: e.target.value })} className="input" /></div>
        </div>
        <div>
          <label className="label">Surface</label>
          <select value={form.surface || 'asphalt'} onChange={e => setForm({ ...form, surface: e.target.value })} className="input">
            {['asphalt', 'concrete', 'gravel', 'grass'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    );
    if (activeTab === 3) return (
      <div className="space-y-3">
        {airportSelect}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Bay Number</label><input value={form.bayNumber || ''} onChange={e => setForm({ ...form, bayNumber: e.target.value })} className="input" placeholder="P01" required /></div>
          <div>
            <label className="label">Type</label>
            <select value={form.type || 'contact'} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
              {['contact', 'remote', 'cargo', 'maintenance'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status || 'available'} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
              {['available', 'occupied', 'maintenance', 'reserved'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Infrastructure</h1>
          <p className="text-dark-400 text-sm mt-1">Manage terminals, gates, runways, and parking bays</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><FiPlus size={16} /> Add {TABS[activeTab].slice(0, -1)}</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 p-1 rounded-xl w-fit border border-dark-700">
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === i ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-dark-200'}`}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr>{renderTableHead()}</tr></thead>
            <tbody>
              {renderTableRows()}
              {items.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-dark-400">No {TABS[activeTab].toLowerCase()} found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editing ? 'Edit' : 'Add'} ${TABS[activeTab].slice(0, -1)}`}>
        <form onSubmit={handleSave} className="space-y-4">
          {renderForm()}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1 justify-center">{editing ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Actions({ item, onEdit, onDelete }) {
  return (
    <div className="flex gap-1">
      <button onClick={() => onEdit(item)} className="p-1.5 rounded hover:bg-primary-500/10 text-primary-400 transition-colors"><FiEdit2 size={13} /></button>
      <button onClick={() => onDelete(item._id)} className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"><FiTrash2 size={13} /></button>
    </div>
  );
}
