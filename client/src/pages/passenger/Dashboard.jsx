/**
 * Dashboard.jsx
 * Passenger home dashboard — upcoming flights, quick actions, baggage status.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatCard from '../../components/common/StatCard';
import { formatDateTime, formatTime, formatCurrency, getFlightDuration } from '../../utils/helpers';
import {
  FiSend, FiPackage, FiCheckSquare, FiArrowRight,
  FiCalendar, FiClock, FiActivity, FiUser,
} from 'react-icons/fi';

export default function PassengerDashboard() {
  const { user } = useSelector((s) => s.auth);
  const [bookings, setBookings] = useState([]);
  const [baggage,  setBaggage]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/bookings/my?limit=5'),
      api.get('/baggage/my'),
    ])
      .then(([b, bag]) => {
        setBookings(b.data.bookings || []);
        setBaggage((bag.data.baggage || []).slice(0, 4));
      })
      .finally(() => setLoading(false));
  }, []);

  const upcoming  = bookings.filter((b) => b.status === 'confirmed' && new Date(b.flight?.scheduledDeparture) > new Date());
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
  const total     = bookings.length;

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="card bg-gradient-to-r from-primary-950/70 to-dark-800 border-primary-700/30">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-dark-100">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-dark-400 text-sm mt-1">
              {upcoming.length > 0
                ? `You have ${upcoming.length} upcoming flight${upcoming.length > 1 ? 's' : ''}.`
                : 'No upcoming flights. Ready to book your next trip?'}
            </p>
          </div>
          <Link to="/flights/search" className="btn-primary flex-shrink-0">
            <FiSend size={15} /> Search Flights
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Bookings"    value={total}     icon={FiCalendar}  color="blue" />
        <StatCard title="Confirmed"         value={confirmed} icon={FiActivity}  color="green" />
        <StatCard title="Upcoming Flights"  value={upcoming.length} icon={FiSend} color="purple" />
        <StatCard title="Baggage Items"     value={baggage.length}  icon={FiPackage} color="orange" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/flights/search',       icon: FiSend,        label: 'Search Flights',   color: 'blue' },
          { to: '/passenger/bookings',   icon: FiCalendar,    label: 'My Bookings',      color: 'purple' },
          { to: '/passenger/checkin',    icon: FiCheckSquare, label: 'Online Check-in',  color: 'green' },
          { to: '/passenger/baggage',    icon: FiPackage,     label: 'Track Baggage',    color: 'orange' },
        ].map(({ to, icon: Icon, label, color }) => {
          const colorMap = {
            blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
            purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20',
            green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
            orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20',
          };
          return (
            <Link
              key={to}
              to={to}
              className={`card border text-center transition-all hover:scale-[1.02] ${colorMap[color]}`}
            >
              <Icon size={22} className="mx-auto mb-2" />
              <p className="text-xs font-medium">{label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming flights */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark-100">Upcoming Flights</h3>
            <Link to="/passenger/bookings" className="text-primary-400 text-xs flex items-center gap-1 hover:text-primary-300">
              View all <FiArrowRight size={12} />
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="text-center py-8">
              <FiSend size={28} className="text-dark-600 mx-auto mb-2" />
              <p className="text-dark-400 text-sm">No upcoming flights</p>
              <Link to="/flights/search" className="btn-primary btn-sm mt-3">Book a Flight</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 3).map((b) => (
                <Link
                  key={b._id}
                  to={`/passenger/bookings/${b._id}`}
                  className="block bg-dark-700/40 rounded-xl p-4 border border-dark-600 hover:border-dark-500 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">
                      {b.pnr}
                    </span>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-dark-100">{b.flight?.departureAirport?.code}</p>
                      <p className="text-2xs text-dark-500">{b.flight?.departureAirport?.city}</p>
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 h-px bg-dark-600" />
                      <FiSend size={10} className="text-primary-400" />
                      <div className="flex-1 h-px bg-dark-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-dark-100">{b.flight?.arrivalAirport?.code}</p>
                      <p className="text-2xs text-dark-500">{b.flight?.arrivalAirport?.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-2xs text-dark-500">
                    <span className="flex items-center gap-1">
                      <FiClock size={10} />
                      {formatDateTime(b.flight?.scheduledDeparture)}
                    </span>
                    <span>{b.flight?.flightNumber} · {b.seatClass}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Baggage status */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark-100">Baggage Status</h3>
            <Link to="/passenger/baggage" className="text-primary-400 text-xs flex items-center gap-1 hover:text-primary-300">
              View all <FiArrowRight size={12} />
            </Link>
          </div>

          {baggage.length === 0 ? (
            <div className="text-center py-8">
              <FiPackage size={28} className="text-dark-600 mx-auto mb-2" />
              <p className="text-dark-400 text-sm">No baggage records</p>
              <p className="text-dark-600 text-xs mt-1">Baggage appears after check-in</p>
            </div>
          ) : (
            <div className="space-y-2">
              {baggage.map((b) => (
                <div key={b._id} className="flex items-center justify-between bg-dark-700/40 rounded-xl p-3 border border-dark-600">
                  <div>
                    <p className="text-sm font-mono font-medium text-dark-100">{b.tagNumber}</p>
                    <p className="text-2xs text-dark-500 mt-0.5">
                      {b.flight?.flightNumber} · {b.weight}kg · {b.type}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent bookings */}
      {bookings.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark-100">Recent Bookings</h3>
            <Link to="/passenger/bookings" className="text-primary-400 text-xs flex items-center gap-1 hover:text-primary-300">
              View all <FiArrowRight size={12} />
            </Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>PNR</th><th>Route</th><th>Date</th><th>Amount</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 5).map((b) => (
                  <tr key={b._id}>
                    <td>
                      <Link to={`/passenger/bookings/${b._id}`} className="font-mono text-primary-400 hover:text-primary-300">
                        {b.pnr}
                      </Link>
                    </td>
                    <td className="text-dark-200">
                      {b.flight?.departureAirport?.code} → {b.flight?.arrivalAirport?.code}
                    </td>
                    <td className="text-dark-400 text-xs">{formatDateTime(b.flight?.scheduledDeparture)}</td>
                    <td className="text-dark-200">{formatCurrency(b.totalAmount)}</td>
                    <td><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
