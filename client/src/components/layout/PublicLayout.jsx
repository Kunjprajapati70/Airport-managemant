/**
 * PublicLayout
 * Shell for all public-facing pages (Home, Search, Status, About, Auth).
 * Fixed top navbar + scrollable content + footer.
 */

import React, { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiMenu, FiX, FiUser, FiLogOut, FiSend } from 'react-icons/fi';
import { logout } from '../../store/slices/authSlice';
import { getDashboardPath } from '../../utils/helpers';

const NAV_LINKS = [
  { to: '/',               label: 'Home',          exact: true },
  { to: '/flights/search', label: 'Search Flights' },
  { to: '/flights/status', label: 'Flight Status'  },
  { to: '/about',          label: 'About'          },
];

export default function PublicLayout() {
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  // Add shadow when scrolled
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
    setMobileOpen(false);
  };

  const dashPath = getDashboardPath(user?.role);

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-40 bg-dark-900/90 backdrop-blur-md
                    border-b border-dark-700/60 transition-shadow duration-200
                    ${scrolled ? 'shadow-card-lg' : ''}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-glow-sm">
                <FiSend size={14} className="text-white" />
              </div>
              <span className="font-bold text-dark-100 text-base tracking-tight">
                AeroManage
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-0.5">
              {NAV_LINKS.map(({ to, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm rounded-lg transition-colors duration-150 ${
                      isActive
                        ? 'text-primary-400 bg-primary-500/10'
                        : 'text-dark-400 hover:text-dark-100 hover:bg-dark-700/50'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>

            {/* Desktop auth buttons */}
            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Link to={dashPath} className="btn-secondary btn-sm">
                    <FiUser size={13} /> Dashboard
                  </Link>
                  <button onClick={handleLogout} className="btn-danger btn-sm">
                    <FiLogOut size={13} /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login"    className="btn-secondary btn-sm">Sign In</Link>
                  <Link to="/register" className="btn-primary btn-sm">Get Started</Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden btn-icon btn-ghost text-dark-400"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-dark-700 bg-dark-900 px-4 py-3 space-y-1 animate-slide-down">
            {NAV_LINKS.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    isActive
                      ? 'text-primary-400 bg-primary-500/10'
                      : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700/50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-dark-700 flex gap-2">
              {isAuthenticated ? (
                <>
                  <Link to={dashPath} onClick={() => setMobileOpen(false)} className="btn-secondary btn-sm flex-1 justify-center">
                    Dashboard
                  </Link>
                  <button onClick={handleLogout} className="btn-danger btn-sm flex-1 justify-center">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login"    onClick={() => setMobileOpen(false)} className="btn-secondary btn-sm flex-1 justify-center">Sign In</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary  btn-sm flex-1 justify-center">Register</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-dark-900 border-t border-dark-700/60 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
                <FiSend size={11} className="text-white" />
              </div>
              <span className="font-semibold text-dark-400 text-sm">AeroManage</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-dark-600">
              <Link to="/about" className="hover:text-dark-400 transition-colors">About</Link>
              <Link to="/flights/status" className="hover:text-dark-400 transition-colors">Flight Status</Link>
              <span>© {new Date().getFullYear()} AeroManage. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
