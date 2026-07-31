/**
 * Dashboard.jsx
 * Admin master dashboard — KPI cards, revenue chart, flight status,
 * recent flights table, and quick-action links.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import ChartCard from '../../components/charts/ChartCard';
import { RevenueTooltip, CountTooltip } from '../../components/charts/CustomTooltip';
import { formatCurrency, formatTime, formatDate, formatNumber } from '../../utils/helpers';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import {
  FiSend, FiUsers, FiDollarSign, FiAlertTriangle,
  FiPackage, FiActivity, FiArrowRight, FiShield,
  FiTool, FiRefreshCw, FiTrendingUp, FiTrendingDown,
} from 'react-icons/fi';

export default function AdminDashboard() {
  const [stats,         setStats]         = useState(null);
  const [revenueData,   setRevenueData]   = useState([]);
  const [flightStats,   setFlightStats]   = useState([]);
  const [recentFlights, setRecentFlights] = useState([]);
  const [loading,       setLoading]       = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, revRes, flightRes, flightsRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/reports/revenue?period=monthly'),
        api.get('/reports/flights'),
        api.get('/flights?limit=6&sort=scheduledDeparture'),
      ]);
      setStats(statsRes.data.stats);
      setRevenueData(
        revRes.data.data.map((d) => ({
          name:     `${d._id.month}/${String(d._id.year).slice(2)}`,
          revenue:  d.revenue,
          bookings: d.count,
        }))
      );
      setFlightStats(
        flightRes.data.statusBreakdown.map((d) => ({ name: d._id, count: d.count }))
      );
      setRecentFlights(flightsRes.data.flights || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const revenueGrowth = stats?.revenue?.growth;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Dashboard</h1>
          <p className="text-dark-400 text-sm mt-0.5">Airport operations overview</p>
        </div>
        <button onClick={fetchAll} className="btn-secondary btn-sm">
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.revenue.total || 0)}
          subtitle={
            <span className="flex items-center gap-1">
              {formatCurrency(stats?.revenue.thisMonth || 0)} this month
              {revenueGrowth !== null && (
                <span className={`flex items-center gap-0.5 ${revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {revenueGrowth >= 0 ? <FiTrendingUp size={10} /> : <FiTrendingDown size={10} />}
                  {Math.abs(revenueGrowth)}%
                </span>
              )}
            </span>
          }
          icon={FiDollarSign}
          color="green"
        />
        <StatCard
          title="Total Flights"
          value={formatNumber(stats?.flights.total || 0)}
          subtitle={`${stats?.flights.today || 0} today`}
          icon={FiSend}
          color="blue"
        />
        <StatCard
          title="Passengers"
          value={formatNumber(stats?.passengers.total || 0)}
          subtitle="Confirmed bookings"
          icon={FiUsers}
          color="purple"
        />
        <StatCard
          title="Confirmed Bookings"
          value={formatNumber(stats?.bookings.confirmed || 0)}
          subtitle={`${formatNumber(stats?.bookings.total || 0)} total`}
          icon={FiActivity}
          color="cyan"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Delayed Flights"
          value={stats?.flights.delayed || 0}
          icon={FiAlertTriangle}
          color="orange"
        />
        <StatCard
          title="Cancelled Flights"
          value={stats?.flights.cancelled || 0}
          icon={FiAlertTriangle}
          color="red"
        />
        <StatCard
          title="Baggage Issues"
          value={stats?.baggage.missing || 0}
          subtitle={`${stats?.baggage.total || 0} total bags`}
          icon={FiPackage}
          color="amber"
        />
        <StatCard
          title="Security Flags"
          value={stats?.security.flagged || 0}
          subtitle={`${stats?.security.pending || 0} pending`}
          icon={FiShield}
          color="red"
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue area chart */}
        <ChartCard
          title="Monthly Revenue"
          subtitle="Year to date"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
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
        </ChartCard>

        {/* Flight status bar chart */}
        <ChartCard title="Flight Status" subtitle="All time">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={flightStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} width={72} />
              <CountTooltip />
              <Bar dataKey="count" name="Flights" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Aircraft',    value: stats?.aircraft.active || 0,       color: 'text-emerald-400', link: '/admin/aircraft' },
          { label: 'In Maintenance',     value: stats?.aircraft.inMaintenance || 0,color: 'text-amber-400',   link: '/staff/maintenance' },
          { label: 'Open Complaints',    value: stats?.complaints.open || 0,       color: 'text-orange-400',  link: '/admin/reports' },
          { label: 'This Month Revenue', value: formatCurrency(stats?.revenue.thisMonth || 0), color: 'text-primary-400', link: '/admin/reports' },
        ].map(({ label, value, color, link }) => (
          <Link key={label} to={link} className="card-hover text-center py-4">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-2xs text-dark-500 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent flights */}
      <ChartCard
        title="Recent Flights"
        action={
          <Link to="/admin/flights" className="text-primary-400 hover:text-primary-300 text-xs flex items-center gap-1">
            View all <FiArrowRight size={12} />
          </Link>
        }
      >
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Flight</th>
                <th>Route</th>
                <th>Departure</th>
                <th>Aircraft</th>
                <th>Seats</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentFlights.map((f) => (
                <tr key={f._id}>
                  <td>
                    <p className="font-mono font-semibold text-dark-100">{f.flightNumber}</p>
                    <p className="text-2xs text-dark-500">{f.airline?.name}</p>
                  </td>
                  <td>
                    <p className="text-dark-200">{f.departureAirport?.code} → {f.arrivalAirport?.code}</p>
                    <p className="text-2xs text-dark-500">{f.departureAirport?.city} → {f.arrivalAirport?.city}</p>
                  </td>
                  <td>
                    <p className="text-dark-200">{formatTime(f.scheduledDeparture)}</p>
                    <p className="text-2xs text-dark-500">{formatDate(f.scheduledDeparture)}</p>
                  </td>
                  <td className="text-dark-300 text-sm">{f.aircraft?.model}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${f.totalSeats ? (f.bookedSeats / f.totalSeats) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-2xs text-dark-500">{f.bookedSeats}/{f.totalSeats}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={f.status} /></td>
                </tr>
              ))}
              {recentFlights.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-dark-500">No flights found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
