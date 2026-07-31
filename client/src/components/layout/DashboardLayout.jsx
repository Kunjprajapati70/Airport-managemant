/**
 * DashboardLayout
 * Shell for all authenticated dashboard pages.
 *
 * Layout:
 *   ┌──────────┬──────────────────────────────┐
 *   │          │  TopBar (h-16)               │
 *   │ Sidebar  ├──────────────────────────────┤
 *   │ (w-64)   │  <Outlet /> (scrollable)     │
 *   │          │                              │
 *   └──────────┴──────────────────────────────┘
 *
 * On mobile: sidebar is hidden by default, toggled by TopBar hamburger.
 * On desktop (lg+): sidebar is always visible.
 */

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import TopBar  from './TopBar';

const SIDEBAR_WIDTH = 256; // px — matches w-64

export default function DashboardLayout({ role }) {
  const { user } = useSelector((s) => s.auth);

  // Desktop: open by default. Mobile: closed by default.
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  // Sync on resize
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        role={role}
        userRole={user?.role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area — offset by sidebar width on desktop */}
      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{ marginLeft: sidebarOpen && window.innerWidth >= 1024 ? SIDEBAR_WIDTH : 0 }}
      >
        <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
