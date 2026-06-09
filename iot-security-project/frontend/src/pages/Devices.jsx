/**
 * ============================================================
 *  Devices Page — BadBox Defense
 * ============================================================
 *  Shows all monitored IoT devices with their security status:
 *    - Safe (green) / Suspicious (orange) / Compromised (red)
 *    - Threat ratio indicator
 *    - Device type icons
 *    - Auto-refresh
 * ============================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchDevices, fetchTraffic } from '../services/api';
import {
  HiOutlineChip,
  HiOutlineCamera,
  HiOutlineDesktopComputer,
  HiOutlineMicrophone,
  HiOutlineLockClosed,
  HiOutlineStatusOnline,
  HiOutlineRefresh,
} from 'react-icons/hi';

const deviceIcons = {
  camera: HiOutlineCamera,
  thermostat: HiOutlineStatusOnline,
  speaker: HiOutlineMicrophone,
  lock: HiOutlineLockClosed,
  tv: HiOutlineDesktopComputer,
  gateway: HiOutlineChip,
  sensor: HiOutlineStatusOnline,
  monitor: HiOutlineCamera,
};

const statusStyles = {
  Safe: {
    bg: 'rgba(6,214,160,0.1)',
    border: 'rgba(6,214,160,0.3)',
    color: '#06d6a0',
    glow: '0 0 15px rgba(6,214,160,0.2)',
  },
  Suspicious: {
    bg: 'rgba(249,115,22,0.1)',
    border: 'rgba(249,115,22,0.3)',
    color: '#f97316',
    glow: '0 0 15px rgba(249,115,22,0.2)',
  },
  Compromised: {
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
    color: '#ef4444',
    glow: '0 0 15px rgba(239,68,68,0.25)',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      await fetchTraffic(15);
      const res = await fetchDevices();
      setDevices(res.data || []);
    } catch (err) {
      console.error('Devices fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            IoT Device Status
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {devices.length} device{devices.length !== 1 && 's'} monitored
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={load}
          className="p-2.5 rounded-xl transition-colors"
          style={{
            background: 'var(--bg-card)',
            color: 'var(--accent-cyan)',
            border: '1px solid var(--border)',
          }}
        >
          <HiOutlineRefresh size={20} className={loading ? 'animate-spin' : ''} />
        </motion.button>
      </div>

      {loading && devices.length === 0 ? (
        // Skeleton grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
             <div key={i} className="h-48 glass-card bg-gray-800/50 animate-pulse" />
          ))}
        </div>
      ) : (
        /* Device Cards Grid */
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence>
            {devices.map((dev, i) => {
              const style = statusStyles[dev.status] || statusStyles.Safe;
              const Icon = deviceIcons[dev.type] || HiOutlineChip;
              const threatRatio =
                dev.total_packets > 0
                  ? ((dev.threat_count / dev.total_packets) * 100).toFixed(0)
                  : 0;

              return (
                <motion.div
                  key={`${dev.ip}-${i}`}
                  variants={itemVariants}
                  layout
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="glass-card flex flex-col gap-4 relative overflow-hidden"
                  style={{
                    borderTop: `3px solid ${style.color}`,
                    boxShadow: dev.status === 'Compromised' ? style.glow : 'none'
                  }}
                >
                  <div 
                    className="absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-10 rounded-full"
                    style={{ background: style.color }}
                  />

                  {/* Icon & Name */}
                  <div className="flex items-center gap-3 z-10">
                    <motion.div
                      whileHover={{ rotate: 15 }}
                      className="flex items-center justify-center rounded-xl"
                      style={{
                        width: 44,
                        height: 44,
                        background: style.bg,
                        color: style.color,
                        boxShadow: style.glow,
                      }}
                    >
                      <Icon size={22} />
                    </motion.div>
                    <div>
                      <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {dev.name}
                      </h4>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {dev.ip}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between z-10">
                    <span
                      className="badge text-xs"
                      style={{
                        background: style.bg,
                        color: style.color,
                        border: `1px solid ${style.border}`,
                      }}
                    >
                      <motion.span
                        animate={dev.status === 'Compromised' ? { opacity: [1, 0, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="inline-block rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          background: style.color,
                          boxShadow: `0 0 6px ${style.color}`,
                        }}
                      />
                      {dev.status}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {dev.type}
                    </span>
                  </div>

                  {/* Threat Bar */}
                  <div className="z-10">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>Threat Ratio</span>
                      <span style={{ color: style.color }}>{threatRatio}%</span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: 'var(--bg-primary)' }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(threatRatio, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${style.color}, ${style.color}88)`,
                          boxShadow: style.glow,
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex justify-between text-xs z-10" style={{ color: 'var(--text-muted)' }}>
                    <span>Packets: {dev.total_packets}</span>
                    <span>Threats: {dev.threat_count}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {devices.length === 0 && !loading && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card flex flex-col items-center justify-center py-16 gap-3"
        >
          <HiOutlineChip size={48} style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No devices detected yet — monitoring will begin shortly</p>
        </motion.div>
      )}
    </motion.div>
  );
}
