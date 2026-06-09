/**
 * ============================================================
 *  Sidebar Component — BadBox Defense Dashboard
 * ============================================================
 *  Navigation sidebar with animated active state, branding,
 *  and health indicator.
 * ============================================================
 */

import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineViewGrid,
  HiOutlineGlobe,
  HiOutlineBell,
  HiOutlineChip,
  HiOutlineDocumentText,
  HiOutlineShieldCheck,
  HiOutlineSearch,
} from 'react-icons/hi';

const navItems = [
  { to: '/', icon: HiOutlineViewGrid, label: 'Dashboard' },
  { to: '/wireshark', icon: HiOutlineSearch, label: 'Wireshark' },
  { to: '/traffic', icon: HiOutlineGlobe, label: 'Traffic Monitor' },
  { to: '/alerts', icon: HiOutlineBell, label: 'Alerts' },
  { to: '/devices', icon: HiOutlineChip, label: 'Devices' },
  { to: '/logs', icon: HiOutlineDocumentText, label: 'System Logs' },
];

export default function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ ease: "easeOut", duration: 0.5 }}
      className="fixed top-0 left-0 h-screen flex flex-col justify-between py-6 px-4"
      style={{
        width: 260,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        zIndex: 50,
      }}
    >
      {/* ---- Branding ---- */}
      <div>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 px-2 mb-8"
        >
          <div
            className="flex items-center justify-center rounded-xl transition-all duration-300"
            style={{
              width: 42,
              height: 42,
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
              boxShadow: 'var(--glow-cyan)',
            }}
          >
            <HiOutlineShieldCheck size={24} color="#0a0e1a" />
          </div>
          <div>
            <h1
              className="font-bold text-lg leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              BadBox<span style={{ color: 'var(--accent-cyan)' }}> Defense</span>
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              IoT Supply Chain Shield
            </p>
          </div>
        </motion.div>

        {/* ---- Nav Links ---- */}
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, icon: Icon, label }, index) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
            >
               <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden`
                }
                style={({ isActive }) => ({
                  background: isActive ? 'rgba(6, 214, 160, 0.12)' : 'transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                })}
              >
                {({ isActive }) => (
                  <>
                    {/* Active Left Border Glow Component */}
                    {isActive && (
                      <motion.div 
                        layoutId="activeNavIndicator"
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ background: 'var(--accent-cyan)', boxShadow: 'var(--glow-cyan)' }}
                      />
                    )}
                    <Icon size={20} className={`transform transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="z-10">{label}</span>
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>
      </div>

      {/* ---- Footer ---- */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 }}
        className="px-3 py-3 rounded-xl hover:shadow-[0_0_15px_rgba(6,214,160,0.15)] transition-all"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-block rounded-full"
            style={{
              width: 8,
              height: 8,
              background: 'var(--accent-cyan)',
              boxShadow: '0 0 8px var(--accent-cyan)',
            }}
          />
          <span className="text-xs font-semibold" style={{ color: 'var(--accent-cyan)' }}>
            System Active
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          ML Model: Isolation Forest
        </p>
      </motion.div>
    </motion.aside>
  );
}
