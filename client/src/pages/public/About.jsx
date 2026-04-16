import React from 'react';
import { FiSend, FiShield, FiUsers, FiBarChart2, FiPackage, FiCheckSquare, FiTool, FiActivity } from 'react-icons/fi';

const MODULES = [
  { icon: FiSend,        title: 'Flight Operations',    desc: 'Complete flight lifecycle from scheduling to arrival with conflict detection.' },
  { icon: FiUsers,       title: 'Passenger Management', desc: 'Booking, check-in, boarding pass generation, and travel history.' },
  { icon: FiShield,      title: 'Security Clearance',   desc: 'Document verification, watchlist checking, and incident logging.' },
  { icon: FiPackage,     title: 'Baggage Tracking',     desc: 'End-to-end baggage tracking from check-in to claim with QR tags.' },
  { icon: FiCheckSquare, title: 'Staff Management',     desc: 'Crew assignments, shift scheduling, and attendance tracking.' },
  { icon: FiTool,        title: 'Maintenance',          desc: 'Aircraft maintenance scheduling with assignment restrictions.' },
  { icon: FiBarChart2,   title: 'Analytics',            desc: 'Revenue, passenger, and operational reports with interactive charts.' },
  { icon: FiActivity,    title: 'Real-time Updates',    desc: 'Live flight status, gate changes, and notifications via Socket.IO.' },
];

const STACK = [
  ['Frontend',  'React 18 + Vite + Tailwind CSS'],
  ['State',     'Redux Toolkit'],
  ['Backend',   'Node.js + Express.js'],
  ['Database',  'MongoDB + Mongoose'],
  ['Auth',      'JWT + bcrypt'],
  ['Real-time', 'Socket.IO'],
  ['PDF/QR',    'PDFKit + qrcode'],
  ['Email',     'Nodemailer'],
];

export default function About() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold text-dark-100 mb-4">About AeroManage</h1>
        <p className="text-dark-400 text-lg max-w-2xl mx-auto leading-relaxed">
          AeroManage is an enterprise-grade Airport Management System built to handle every aspect of modern airport operations from a single platform.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
        {MODULES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card">
            <div className="w-10 h-10 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-center mb-3">
              <Icon size={18} className="text-primary-400" />
            </div>
            <h3 className="font-semibold text-dark-100 text-sm mb-1">{title}</h3>
            <p className="text-dark-500 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="card bg-gradient-to-r from-primary-900/40 to-dark-800 border-primary-700/30">
        <h2 className="text-lg font-bold text-dark-100 mb-4">Technology Stack</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STACK.map(([cat, tech]) => (
            <div key={cat}>
              <p className="text-2xs text-dark-500 uppercase tracking-wider">{cat}</p>
              <p className="text-sm font-medium text-dark-200 mt-0.5">{tech}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
