/**
 * Sidebar
 * Role-aware navigation sidebar.
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import {
  FiHome, FiSend, FiUsers, FiMap, FiBarChart2, FiSettings,
  FiShield, FiPackage, FiTool, FiLogOut, FiX, FiClipboard,
  FiCheckSquare, FiGlobe, FiList, FiBell, FiUser, FiNavigation,
  FiActivity,
} from 'react-icons/fi';

const NAV = {
  admin: [
    { label: 'Dashboard',      to: '/admin/dashboard',      icon: FiHome },
    { label: 'Flights',        to: '/admin/flights',        icon: FiSend },
    { label: 'Aircraft',       to: '/admin/aircraft',       icon: FiNavigation },
    { label: 'Airlines',       to: '/admin/airlines',       icon: FiGlobe },
    { label: 'Airports',       to: '/admin/airports',       icon: FiMap },
    { label: 'Infrastructure', to: '/admin/infrastructure', icon: FiSettings },
    { label: 'Staff',          to: '/admin/staff',          icon: FiUsers },
    { label: 'Users',          to: '/admin/users',          icon: FiUser },
    { label: 'Reports',        to: '/admin/reports',        icon: FiBarChart2 },
    { label: 'Audit Logs',     to: '/admin/audit',          icon: FiList },
    { label: 'Notifications',  to: '/admin/notifications',  icon: FiBell },
  ],
  passenger: [
    { label: 'Dashboard',       to: '/passenger/dashboard',     icon: FiHome },
    { label: 'Search Flights',  to: '/flights/search',          icon: FiSend },
    { label: 'My Bookings',     to: '/passenger/bookings',      icon: FiClipboard },
    { label: 'Online Check-in', to: '/passenger/checkin',       icon: FiCheckSquare },
    { label: 'Baggage',         to: '/passenger/baggage',       icon: FiPackage },
    { label: 'Travel History',  to: '/passenger/history',       icon: FiActivity },
    { label: 'Notifications',   to: '/passenger/notifications', icon: FiBell },
    { label: 'Profile',         to: '/passenger/profile',       icon: FiUser },
  ],
  staff: [
    { label: 'Check-in Console', to: '/staff/checkin',      icon: FiCheckSquare, roles: ['checkin_staff', 'super_admin', 'airline_manager'] },
    { label: 'Boarding Console', to: '/staff/boarding',     icon: FiSend,        roles: ['boarding_staff', 'super_admin', 'airline_manager'] },
    { label: 'Security Desk',    to: '/staff/security',     icon: FiShield,      roles: ['security_officer', 'super_admin'] },
    { label: 'Baggage Desk',     to: '/staff/baggage',      icon: FiPackage,     roles: ['baggage_staff', 'super_admin'] },
    { label: 'Maintenance',      to: '/staff/maintenance',  icon: FiTool,        roles: ['maintenance_staff', 'super_admin'] },
    { label: 'Notifications',    to: '/staff/notifications', icon: FiBell },
  ],
};

const PORTAL_LABELS = {
  admin:     'Admin Portal',
  passenger: 'Passenger Portal',
  staff:     'Operations Portal',
};

export default function Sidebar({ role, userRole, isOpen, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const links = (NAV[role] ?? []).filter(
    (l) => !l.roles || (userRole && l.roles.includes(userRole))
  );

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-40
          bg-dark-900 border-r border-dark-700/80
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        aria-label="Sidebar navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-dark-700/80 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-glow-sm">
              <FiSend size={14} className="text-white" />
            </div>
            <div className="leading-none">
              <p className="font-bold text-dark-100 text-sm">AeroManage</p>
              <p className="text-dark-500 text-2xs mt-0.5">{PORTAL_LABELS[role]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden btn-icon text-dark-400"
            aria-label="Close sidebar"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Main navigation">
          {links.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => { if (window.innerWidth < 1024) onClose(); }}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={15} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}

          {/* Super admin also sees staff operations */}
          {userRole === 'super_admin' && role === 'admin' && (
            <>
              <div className="pt-4 pb-1.5 px-3">
                <p className="text-2xs font-semibold text-dark-600 uppercase tracking-widest">
                  Operations
                </p>
              </div>
              {NAV.staff.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-dark-700/80 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <FiLogOut size={15} className="flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
