/**
 * Home.jsx
 * Public landing page with hero section, quick flight search,
 * stats, feature cards, and CTA.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiSend, FiSearch, FiShield, FiBarChart2, FiUsers, FiArrowRight, FiMapPin, FiCalendar, FiActivity } from 'react-icons/fi';

const FEATURES = [
  { icon: FiSend,      title: 'Flight Management',   desc: 'Real-time scheduling, status updates, and conflict detection across all routes.',  color: 'blue' },
  { icon: FiUsers,     title: 'Role-Based Access',    desc: '9 distinct user roles with granular permissions for every airport operation.',      color: 'purple' },
  { icon: FiShield,    title: 'Security Clearance',   desc: 'Integrated security verification with watchlist checking and incident logging.',    color: 'green' },
  { icon: FiBarChart2, title: 'Analytics & Reports',  desc: 'Comprehensive dashboards with revenue, passenger, and operational metrics.',        color: 'orange' },
  { icon: FiActivity,  title: 'Real-time Updates',    desc: 'Live flight status, gate changes, and boarding alerts via Socket.IO.',              color: 'cyan' },
  { icon: FiMapPin,    title: 'Infrastructure',       desc: 'Manage terminals, gates, runways, and parking bays with occupancy tracking.',       color: 'amber' },
];

const STATS = [
  { label: 'Airports Supported', value: '50+' },
  { label: 'Daily Flights',      value: '2,400+' },
  { label: 'Passengers Served',  value: '180K+' },
  { label: 'System Uptime',      value: '99.9%' },
];

const COLOR_MAP = {
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  cyan:   'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  amber:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function Home() {
  const navigate = useNavigate();
  const [airports, setAirports] = useState([]);
  const [form, setForm] = useState({
    from: '',
    to:   '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    api.get('/airports').then((r) => setAirports(r.data.airports || []));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!form.from || !form.to) return;
    navigate(`/flights/search?from=${form.from}&to=${form.to}&date=${form.date}`);
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="bg-dark-950">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-dark-950 to-dark-950" />
        <div className="absolute inset-0 bg-dot-pattern bg-dot opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
              Enterprise Airport Management Platform
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-6">
              Manage Every<br />
              <span className="text-primary-400">Airport Operation</span><br />
              From One Place
            </h1>

            <p className="text-dark-300 text-xl mb-10 leading-relaxed max-w-2xl">
              AeroManage covers flights, bookings, check-in, boarding, baggage, security, and more — all in real time with role-based access for every stakeholder.
            </p>

            {/* Quick search */}
            <form onSubmit={handleSearch} className="bg-dark-800/80 backdrop-blur border border-dark-700 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-2xs text-dark-500 uppercase tracking-wider mb-1 block">From</label>
                  <select value={form.from} onChange={set('from')} className="input">
                    <option value="">Departure airport</option>
                    {airports.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.city}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-2xs text-dark-500 uppercase tracking-wider mb-1 block">To</label>
                  <select value={form.to} onChange={set('to')} className="input">
                    <option value="">Arrival airport</option>
                    {airports.filter((a) => a._id !== form.from).map((a) => (
                      <option key={a._id} value={a._id}>{a.code} — {a.city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-2xs text-dark-500 uppercase tracking-wider mb-1 block">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={set('date')}
                    className="input"
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="btn-primary py-2.5 px-6 whitespace-nowrap w-full sm:w-auto">
                    <FiSearch size={16} /> Search
                  </button>
                </div>
              </div>
            </form>

            <div className="flex flex-wrap gap-4 mt-8">
              <Link to="/register" className="btn-primary btn-lg">
                Get Started Free <FiArrowRight size={16} />
              </Link>
              <Link to="/flights/status" className="btn-secondary btn-lg">
                Live Flight Status
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="bg-dark-900 border-y border-dark-700/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-bold text-primary-400">{value}</p>
                <p className="text-dark-400 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark-100 mb-3">Everything You Need</h2>
            <p className="text-dark-400 max-w-xl mx-auto">
              A complete suite of tools for every airport stakeholder, from passengers to administrators.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card-hover group">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border ${COLOR_MAP[color]}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-dark-100 mb-2">{title}</h3>
                <p className="text-dark-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-primary-900 to-primary-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to streamline your airport?</h2>
          <p className="text-primary-200 mb-8 text-lg">
            Join thousands of airport professionals using AeroManage every day.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/register" className="bg-white text-primary-900 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors">
              Start for Free
            </Link>
            <Link to="/login" className="border border-white/30 text-white px-8 py-3 rounded-lg hover:bg-white/10 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
