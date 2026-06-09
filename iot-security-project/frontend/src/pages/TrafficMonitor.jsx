/**
 * ============================================================
 *  Traffic Monitor Page — BadBox Defense
 * ============================================================
 *  Live traffic view with:
 *    - Auto-refreshing packet table
 *    - Color-coded threat labels
 *    - Protocol & packet size info
 *    - Manual refresh button
 * ============================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchTraffic } from '../services/api';
import { HiOutlineRefresh, HiOutlineGlobe } from 'react-icons/hi';

function ThreatBadge({ label }) {
  const cls =
    label === 'Normal'
      ? 'badge-safe'
      : label === 'Suspicious'
      ? 'badge-suspicious'
      : 'badge-malicious';
  return <span className={`badge ${cls} ${label === 'Malicious' ? 'shadow-[0_0_10px_rgba(239,68,68,0.2)]' : ''}`}>{label}</span>;
}

const tableVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 }
  }
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 }
};

export default function TrafficMonitor() {
  const [packets, setPackets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchTraffic(30);
      setPackets(res.data || []);
    } catch (err) {
      console.error('Traffic fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!autoRefresh) return;
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
  }, [load, autoRefresh]);

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
            Traffic Monitor
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Real-time network packet analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAutoRefresh(prev => !prev)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: autoRefresh ? 'rgba(6,214,160,0.15)' : 'var(--bg-card)',
              color: autoRefresh ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: `1px solid ${autoRefresh ? 'rgba(6,214,160,0.3)' : 'var(--border)'}`,
            }}
          >
            {autoRefresh ? '● Auto-Refresh ON' : '○ Auto-Refresh OFF'}
          </motion.button>
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
            <HiOutlineRefresh size={20} className={loading && !packets.length ? 'animate-spin' : ''} />
          </motion.button>
        </div>
      </div>

      {loading && packets.length === 0 ? (
        <div className="glass-card overflow-hidden">
           <div className="p-4 space-y-3">
             {[1,2,3,4,5,6,7,8,9].map(i => <div key={i} className="h-10 w-full bg-gray-800/50 rounded animate-pulse" />)}
           </div>
        </div>
      ) : (
        /* Packet Table */
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <motion.table 
              variants={tableVariants}
              initial="hidden"
              animate="show"
              className="w-full text-sm"
            >
              <thead>
                <tr style={{ background: 'rgba(6,214,160,0.06)' }}>
                  {['#', 'Source IP', 'Dest IP', 'Protocol', 'Port', 'Size', 'Device', 'Threat Score', 'Status'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <AnimatePresence>
                <motion.tbody>
                  {packets.map((pkt, i) => (
                    <motion.tr
                      key={`${pkt.src_ip}-${pkt.dst_ip}-${pkt.timestamp || i}`}
                      variants={rowVariants}
                      layout
                      className="transition-colors border-b hover:bg-gray-800/40"
                      style={{
                        borderColor: 'var(--border)',
                        background:
                          pkt.threat_label === 'Malicious'
                            ? 'rgba(239,68,68,0.05)'
                            : 'transparent',
                      }}
                    >
                      <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-muted)' }}>
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-primary)' }}>
                        {pkt.src_ip}
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-primary)' }}>
                        {pkt.dst_ip}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-semibold shadow-sm"
                          style={{
                            background:
                              pkt.protocol === 'TCP'
                                ? 'rgba(59,130,246,0.15)'
                                : pkt.protocol === 'UDP'
                                ? 'rgba(139,92,246,0.15)'
                                : 'rgba(249,115,22,0.15)',
                            color:
                              pkt.protocol === 'TCP'
                                ? '#3b82f6'
                                : pkt.protocol === 'UDP'
                                ? '#8b5cf6'
                                : '#f97316',
                          }}
                        >
                          {pkt.protocol}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {pkt.dst_port}
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {pkt.packet_size}B
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {pkt.device_name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: 60,
                              background: 'var(--bg-primary)',
                            }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(pkt.threat_score || 0, 100)}%` }}
                              transition={{ duration: 0.5 }}
                              className="h-full rounded-full"
                              style={{
                                background:
                                  pkt.threat_score < 30
                                    ? '#06d6a0'
                                    : pkt.threat_score < 60
                                    ? '#f97316'
                                    : '#ef4444',
                                boxShadow: pkt.threat_score >= 60 ? `0 0 10px ${pkt.threat_score < 60 ? '#f97316' : '#ef4444'}` : 'none'
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                            {pkt.threat_score?.toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ThreatBadge label={pkt.threat_label || 'Normal'} />
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </AnimatePresence>
            </motion.table>
          </div>

          {packets.length === 0 && !loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-3"
            >
              <HiOutlineGlobe size={48} style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>No traffic data yet</p>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
