/**
 * ============================================================
 *  System Logs Page — BadBox Defense
 * ============================================================
 *  Terminal-style log viewer with:
 *    - Auto-scrolling
 *    - Color-coded log levels
 *    - Monospace font
 *    - Auto-refresh
 * ============================================================
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { fetchLogs } from '../services/api';
import { HiOutlineRefresh, HiOutlineDocumentText } from 'react-icons/hi';

function colorForLevel(line) {
  if (line.includes('ERROR') || line.includes('CRITICAL'))
    return '#ef4444';
  if (line.includes('WARNING'))
    return '#f97316';
  if (line.includes('INFO'))
    return '#06d6a0';
  if (line.includes('DEBUG'))
    return '#8b5cf6';
  return 'var(--text-secondary)';
}

export default function Logs() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchLogs(150);
      setLines(res.data || []);
    } catch (err) {
      console.error('Logs fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

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
            System Logs
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Live application log stream
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
          <HiOutlineRefresh size={20} className={loading && !lines.length ? 'animate-spin' : ''} />
        </motion.button>
      </div>

      {loading && lines.length === 0 ? (
        // Skeleton
        <div className="glass-card overflow-hidden h-[70vh]">
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border)' }}>
             <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
             <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
             <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <div className="p-4 space-y-2">
            {[1,2,3,4,5,6,7,8,9,10].map(i => <div key={i} className="h-4 w-2/3 bg-gray-800/50 rounded animate-pulse" />)}
          </div>
        </div>
      ) : (
        /* Terminal */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="glass-card overflow-hidden"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          }}
        >
          {/* Terminal header bar */}
          <div
            className="flex items-center gap-2 px-4 py-2"
            style={{
              background: 'rgba(0,0,0,0.3)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: '#ef4444' }} />
            <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: '#eab308' }} />
            <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: '#06d6a0' }} />
            <span className="ml-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              badbox_defense.log — {lines.length} lines
            </span>
          </div>

          {/* Log lines */}
          <div
            className="p-4 overflow-y-auto"
            style={{ maxHeight: '65vh', lineHeight: 1.75 }}
          >
            {lines.length > 0 ? (
              lines.map((line, i) => (
                <div
                  key={i}
                  className="hover:bg-[rgba(255,255,255,0.03)] px-2 py-0.5 rounded transition-colors"
                  style={{ color: colorForLevel(line) }}
                >
                  <span style={{ color: 'var(--text-muted)', marginRight: 12 }}>
                    {String(i + 1).padStart(4, '0')}
                  </span>
                  {line}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <HiOutlineDocumentText size={48} style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>No log entries yet</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
