/**
 * Reports.jsx
 * Full analytics dashboard with date range filters, airline/airport filters,
 * and all chart types: revenue trend, flight status, route popularity,
 * aircraft utilization, baggage issues, seat class breakdown, delay reasons.
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';
import ChartCard from '../../components/charts/ChartCard';
import { RevenueTooltip, CountTooltip, DefaultTooltip } from '../../components/charts/CustomTooltip';
import { formatCurrency, formatNumber, formatDate } from '../../utils/helpers';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import {
  FiDollarSign, FiSend, FiUsers, FiPackage,
  FiAlertTriangle, FiActivity, FiFilter, FiRefreshCw,
  FiTrendingUp, FiShield, FiBarChart2,
} from 'react-icons/fi';

// ── Color palette ─────────────────────────────────────────────────────────────
const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];

const STATUS_COLORS = {
  scheduled:  '#3b82f6',
  boarding:   '#f59e0b',
  departed:   '#8b5cf6',
  in_flight:  '#06b6d4',
  arrived:    '#22c55e',
  delayed:    '#f97316',
  cancelled:  '#ef4444',
  diverted:   '#ec4899',
};

// ── Date presets ──────────────────────────────────────────────────────────────
const getPreset = (preset) => {
  const now = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  switch (preset) {
    case 'today':
      return { startDate: fmt(now), endDate: fmt(now) };
    case 'week': {
      const s = new Date(now); s.setDate(now.getDate() - 6);
      return { startDate: fmt(s), endDate: fmt(now) };
    }
    case 'month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: fmt(s), endDate: fmt(now) };
    }
    case 'quarter': {
      const s = new Date(now); s.setMonth(now.getMonth() - 3);
      return { startDate: fmt(s), endDate: fmt(now) };
    }
    case 'year': {
      const s = new Date(now.getFullYear(), 0, 1);
      return { startDate: fmt(s), endDate: fmt(now) };
    }
    default:
      return null;
  }
};

const PRESETS = [
  { key: 'today',   label: 'Today' },
  { key: 'week',    label: '7 Days' },
  { key: 'month',   label: 'This Month' },
  { key: 'quarter', label: '3 Months' },
  { key: 'year',    label: 'This Year' },
];

// ── Custom pie label ──────────────────────────────────────────────────────────
const renderPieLabel = ({ name, percent }) =>
  percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : '';

export default function Reports() {
  const now = new Date();
  const [analytics,  setAnalytics]  = useState(null);
  const [airlines,   setAirlines]   = useState([]);
  const [airports,   setAirports]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activePreset, setActivePreset] = useState('month');

  const [filters, setFilters] = useState({
    startDate:   new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    endDate:     now.toISOString().slice(0, 10),
    airlineId:   '',
    airportId:   '',
    granularity: 'day',
  });

  // Load reference data once
  useEffect(() => {
    Promise.all([
      api.get('/airlines'),
      api.get('/airports'),
    ]).then(([al, ap]) => {
      setAirlines(al.data.airlines || []);
      setAirports(ap.data.airports || []);
    });
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports/analytics', { params: filters });
      setAnalytics(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const applyPreset = (key) => {
    const dates = getPreset(key);
    if (!dates) return;
    setActivePreset(key);
    setFilters((f) => ({ ...f, ...dates }));
  };

  const setFilter = (field) => (e) => {
    setActivePreset('');
    setFilters((f) => ({ ...f, [field]: e.target.value }));
  };

  // ── Chart data transforms ──────────────────────────────────────────────────
  const revenueTrend = (analytics?.charts?.revenueTrend || []).map((d) => ({
    name: filters.granularity === 'month'
      ? `${d._id.month}/${String(d._id.year).slice(2)}`
      : `${d._id.day}/${d._id.month}`,
    revenue:  d.revenue,
    bookings: d.count,
  }));

  const statusPie = (analytics?.charts?.statusBreakdown || []).map((d) => ({
    name:  d._id,
    value: d.count,
    color: STATUS_COLORS[d._id] ?? '#64748b',
  }));

  const routeBar = (analytics?.charts?.routePopularity || []).slice(0, 8).map((r) => ({
    route:      `${r.depAirport?.[0]?.code ?? '?'} → ${r.arrAirport?.[0]?.code ?? '?'}`,
    bookings:   r.bookings,
    passengers: r.passengers,
    revenue:    Math.round(r.revenue),
  }));

  const aircraftBar = (analytics?.charts?.aircraftUtilization || []).map((a) => ({
    aircraft:   a.aircraft,
    flights:    a.flightCount,
    loadFactor: a.loadFactor,
  }));

  const classBar = (analytics?.charts?.bookingsByClass || []).map((c) => ({
    class:    c._id,
    bookings: c.count,
    revenue:  Math.round(c.revenue),
  }));

  const delayBar = (analytics?.charts?.delayReasons || []).map((d) => ({
    reason:   d._id?.length > 30 ? d._id.slice(0, 30) + '…' : d._id,
    count:    d.count,
    avgDelay: Math.round(d.avgDelay),
  }));

  const baggageBar = [
    { name: 'Missing', value: analytics?.baggageIssues?.missing || 0, fill: '#f97316' },
    { name: 'Lost',    value: analytics?.baggageIssues?.lost    || 0, fill: '#ef4444' },
    { name: 'Claimed', value: analytics?.baggageIssues?.claimed || 0, fill: '#22c55e' },
  ];

  const s = analytics?.summary ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Operational performance metrics"
        actions={
          <button onClick={fetchAnalytics} className="btn-secondary btn-sm">
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter size={14} className="text-dark-400" />
          <p className="text-sm font-semibold text-dark-200">Filters</p>
        </div>

        {/* Date presets */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activePreset === key ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-400 hover:text-dark-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={filters.startDate} onChange={setFilter('startDate')} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={filters.endDate} onChange={setFilter('endDate')} />
          </div>
          <div>
            <label className="label">Airline</label>
            <select className="input" value={filters.airlineId} onChange={setFilter('airlineId')}>
              <option value="">All airlines</option>
              {airlines.map((a) => <option key={a._id} value={a._id}>{a.name} ({a.code})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Airport</label>
            <select className="input" value={filters.airportId} onChange={setFilter('airportId')}>
              <option value="">All airports</option>
              {airports.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.city}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Granularity</label>
            <select className="input" value={filters.granularity} onChange={setFilter('granularity')}>
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* ── KPI Cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Revenue"          value={formatCurrency(s.revenue || 0)}       icon={FiDollarSign}    color="green" />
            <StatCard title="Total Flights"    value={formatNumber(s.totalFlights || 0)}    icon={FiSend}          color="blue" />
            <StatCard title="Passengers"       value={formatNumber(s.passengers || 0)}      icon={FiUsers}         color="purple" />
            <StatCard title="Bookings"         value={formatNumber(s.bookings || 0)}        icon={FiActivity}      color="cyan" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Flights Today"    value={s.flightsToday || 0}                  icon={FiSend}          color="blue" />
            <StatCard title="Delayed"          value={s.delayedFlights || 0}                icon={FiAlertTriangle} color="orange"
              subtitle={s.avgDelayMinutes > 0 ? `Avg ${s.avgDelayMinutes}min delay` : undefined} />
            <StatCard title="Cancelled"        value={s.cancelledFlights || 0}              icon={FiAlertTriangle} color="red" />
            <StatCard title="Load Factor"      value={`${s.loadFactor || 0}%`}              icon={FiBarChart2}     color="amber"
              subtitle="Seat occupancy rate" />
          </div>

          {/* ── Revenue Trend ─────────────────────────────────────────────── */}
          <ChartCard
            title="Revenue Trend"
            subtitle={`${formatDate(filters.startDate)} — ${formatDate(filters.endDate)}`}
          >
            {revenueTrend.length === 0 ? (
              <p className="text-center text-dark-500 py-10">No revenue data for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <RevenueTooltip />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── Status + Route ────────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Flight status pie */}
            <ChartCard title="Flight Status Distribution">
              {statusPie.length === 0 ? (
                <p className="text-center text-dark-500 py-10">No flight data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      cx="50%" cy="50%"
                      innerRadius={65} outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {statusPie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                      formatter={(v, n) => [formatNumber(v), n]}
                    />
                    <Legend
                      formatter={(v) => <span className="text-dark-300 text-xs capitalize">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Route popularity */}
            <ChartCard title="Top Routes by Bookings">
              {routeBar.length === 0 ? (
                <p className="text-center text-dark-500 py-10">No route data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={routeBar} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="route" stroke="#64748b" tick={{ fontSize: 10 }} width={80} />
                    <CountTooltip />
                    <Bar dataKey="bookings"   name="Bookings"   fill="#3b82f6" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="passengers" name="Passengers" fill="#22c55e" radius={[0, 3, 3, 0]} />
                    <Legend formatter={(v) => <span className="text-dark-300 text-xs">{v}</span>} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* ── Aircraft + Seat Class ─────────────────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Aircraft utilization */}
            <ChartCard title="Aircraft Utilization" subtitle="Flights in period">
              {aircraftBar.length === 0 ? (
                <p className="text-center text-dark-500 py-10">No aircraft data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={aircraftBar}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="aircraft" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <CountTooltip />
                    <Bar dataKey="flights"    name="Flights"     fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="loadFactor" name="Load Factor %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Legend formatter={(v) => <span className="text-dark-300 text-xs">{v}</span>} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Bookings by seat class */}
            <ChartCard title="Bookings by Seat Class">
              {classBar.length === 0 ? (
                <p className="text-center text-dark-500 py-10">No booking data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={classBar}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="class" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                      formatter={(v, n) => [n === 'revenue' ? formatCurrency(v) : formatNumber(v), n]}
                    />
                    <Bar dataKey="bookings" name="Bookings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue"  name="Revenue"  fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Legend formatter={(v) => <span className="text-dark-300 text-xs capitalize">{v}</span>} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* ── Baggage + Delay Reasons ───────────────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Baggage issues */}
            <ChartCard
              title="Baggage Issues"
              subtitle={`Total: ${formatNumber(analytics?.baggageIssues?.total || 0)} bags · Excess fees: ${formatCurrency(analytics?.baggageIssues?.excessFees || 0)}`}
            >
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Missing', value: analytics?.baggageIssues?.missing || 0, color: 'text-orange-400' },
                  { label: 'Lost',    value: analytics?.baggageIssues?.lost    || 0, color: 'text-red-400' },
                  { label: 'Claimed', value: analytics?.baggageIssues?.claimed || 0, color: 'text-emerald-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-3 bg-dark-700/40 rounded-xl border border-dark-600">
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-2xs text-dark-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={baggageBar}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <CountTooltip />
                  {baggageBar.map((entry, i) => (
                    <Bar key={i} dataKey="value" name={entry.name} fill={entry.fill} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Delay reasons */}
            <ChartCard title="Top Delay Reasons" subtitle="Flights with delay reason recorded">
              {delayBar.length === 0 ? (
                <p className="text-center text-dark-500 py-10">No delay data for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={delayBar} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="reason" stroke="#64748b" tick={{ fontSize: 9 }} width={120} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                      formatter={(v, n) => [n === 'avgDelay' ? `${v} min` : v, n === 'avgDelay' ? 'Avg Delay' : 'Count']}
                    />
                    <Bar dataKey="count"    name="Count"     fill="#f97316" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="avgDelay" name="Avg Delay" fill="#ef4444" radius={[0, 3, 3, 0]} />
                    <Legend formatter={(v) => <span className="text-dark-300 text-xs">{v}</span>} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* ── Route table ───────────────────────────────────────────────── */}
          {routeBar.length > 0 && (
            <ChartCard title="Route Performance Table">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Route</th>
                      <th>Bookings</th>
                      <th>Passengers</th>
                      <th>Revenue</th>
                      <th>Avg Rev/Booking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.charts?.routePopularity || []).map((r, i) => (
                      <tr key={i}>
                        <td className="text-dark-500 text-sm">{i + 1}</td>
                        <td>
                          <p className="font-semibold text-dark-100">
                            {r.depAirport?.[0]?.code ?? '?'} → {r.arrAirport?.[0]?.code ?? '?'}
                          </p>
                          <p className="text-2xs text-dark-500">
                            {r.depAirport?.[0]?.city} → {r.arrAirport?.[0]?.city}
                          </p>
                        </td>
                        <td className="text-dark-200">{formatNumber(r.bookings)}</td>
                        <td className="text-dark-200">{formatNumber(r.passengers)}</td>
                        <td className="text-dark-200">{formatCurrency(r.revenue)}</td>
                        <td className="text-dark-200">
                          {r.bookings > 0 ? formatCurrency(r.revenue / r.bookings) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}
