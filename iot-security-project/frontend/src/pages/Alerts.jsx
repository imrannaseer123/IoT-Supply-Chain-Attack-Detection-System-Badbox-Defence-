/**
 * ============================================================
 *  Alerts Page — BadBox Defense
 * ============================================================
 *  Displays real-time anomaly alerts with:
 *    - Severity color coding
 *    - Attack type classification
 *    - IP blocking action
 *    - Auto-refresh polling
 * ============================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAlerts, blockIP } from '../services/api';
import {
  HiOutlineExclamationCircle,
  HiOutlineBan,
  HiOutlineRefresh,
  HiOutlineBell,
} from 'react-icons/hi';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockedIPs, setBlockedIPs] = useState(new Set());
  const [blockingIP, setBlockingIP] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchAlerts(50);
      setAlerts(res.data || []);
    } catch (err) {
      console.error('Alerts fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const handleBlock = async (ip) => {
    setBlockingIP(ip);
    try {
      await blockIP(ip);
      setBlockedIPs((prev) => new Set([...prev, ip]));
    } catch (err) {
      console.error('Block IP error:', err);
    } finally {
      setBlockingIP(null);
    }
  };

  const getSeverityColor = (score) => {
    if (score >= 70) return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#ef4444', label: 'Critical' };
    if (score >= 50) return { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', text: '#f97316', label: 'High' };
    return { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', text: '#eab308', label: 'Medium' };
  };

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
            Security Alerts
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {alerts.length} active alert{alerts.length !== 1 && 's'} detected
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

      {loading && alerts.length === 0 ? (
        // Skeleton Loaders
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 glass-card bg-gray-800/50 animate-pulse" />
          ))}
        </div>
      ) : (
        /* Alert Cards */
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          <AnimatePresence>
            {alerts.map((alert, i) => {
              const sev = getSeverityColor(alert.threat_score || 50);
              const isBlocked = blockedIPs.has(alert.src_ip);

              return (
                <motion.div
                  key={`${alert.src_ip}-${alert.timestamp}-${i}`}
                  variants={itemVariants}
                  layout
                  whileHover={{ scale: 1.01, x: 5 }}
                  className="glass-card flex items-start gap-4 relative overflow-hidden"
                  style={{ borderLeft: `3px solid ${sev.text}` }}
                >
                  {/* Subtle background glow based on severity */}
                  <div 
                    className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 pointer-events-none rounded-full"
                    style={{ background: sev.text }}
                  />
                  
                  {/* Severity Icon */}
                  <div
                    className="flex items-center justify-center rounded-xl shrink-0 mt-0.5 z-10"
                    style={{
                      width: 42,
                      height: 42,
                      background: sev.bg,
                      color: sev.text,
                    }}
                  >
                    <HiOutlineExclamationCircle size={22} />
                  </div>

                  {/* Alert Details */}
                  <div className="flex-1 min-w-0 z-10">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="badge text-xs"
                        style={{
                          background: sev.bg,
                          color: sev.text,
                          border: `1px solid ${sev.border}`,
                        }}
                      >
                        {sev.label}
                      </span>
                      <span className="badge badge-malicious text-xs shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                        {alert.threat_label || 'Anomaly'}
                      </span>
                      {alert.attack_type && alert.attack_type !== 'unknown' && (
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            background: 'rgba(139,92,246,0.12)',
                            color: '#8b5cf6',
                          }}
                        >
                          {alert.attack_type.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-mono">
                        <strong style={{ color: 'var(--text-primary)' }}>SRC:</strong>{' '}
                        {alert.src_ip || 'N/A'}
                      </span>
                      <span>→</span>
                      <span className="font-mono">
                        <strong style={{ color: 'var(--text-primary)' }}>DST:</strong>{' '}
                        {alert.dst_ip || 'N/A'}
                      </span>
                      <span>|</span>
                      <span>{alert.protocol || 'TCP'}</span>
                      <span>|</span>
                      <span>{alert.packet_size || 0}B</span>
                      <span>|</span>
                      <span>Score: {alert.threat_score?.toFixed(1)}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>{alert.device_name || 'Unknown Device'}</span>
                      <span>•</span>
                      <span>{alert.timestamp ? new Date(alert.timestamp).toLocaleString() : '—'}</span>
                    </div>
                  </div>

                  {/* Block Button */}
                  <motion.button
                    whileHover={!isBlocked ? { scale: 1.05 } : {}}
                    whileTap={!isBlocked ? { scale: 0.95 } : {}}
                    onClick={() => handleBlock(alert.src_ip)}
                    disabled={isBlocked || blockingIP === alert.src_ip}
                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 z-10"
                    style={{
                      background: isBlocked ? 'rgba(239,68,68,0.2)' : 'var(--bg-card)',
                      color: isBlocked ? '#ef4444' : 'var(--text-secondary)',
                      border: `1px solid ${isBlocked ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                      cursor: isBlocked ? 'not-allowed' : 'pointer',
                      opacity: isBlocked ? 0.7 : 1,
                    }}
                  >
                    <HiOutlineBan size={14} />
                    {isBlocked ? 'Blocked' : blockingIP === alert.src_ip ? 'Blocking…' : 'Block IP'}
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {alerts.length === 0 && !loading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card flex flex-col items-center justify-center py-16 gap-3"
            >
              <HiOutlineBell size={48} style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>No alerts detected — system is secure</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
