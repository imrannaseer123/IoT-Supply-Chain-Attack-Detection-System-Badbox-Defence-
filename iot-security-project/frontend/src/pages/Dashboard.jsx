/**
 * ============================================================
 *  Dashboard Page — BadBox Defense
 * ============================================================
 *  Overview page with:
 *    - Key metric cards (packets, anomalies, devices, alerts)
 *    - Threat score distribution chart
 *    - Protocol breakdown donut chart
 *    - Attack type bar chart
 *    - Device health ring
 * ============================================================
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';
import {
  HiOutlineGlobe,
  HiOutlineExclamation,
  HiOutlineChip,
  HiOutlineBell,
  HiOutlineBan,
} from 'react-icons/hi';
import StatCard from '../components/StatCard';
import { fetchStats, fetchTraffic } from '../services/api';

const PIE_COLORS = ['#06d6a0', '#3b82f6', '#8b5cf6', '#f97316', '#ef4444'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data on mount and poll every 8 seconds
  useEffect(() => {
    const load = async () => {
      try {
        // Generate traffic first so there is data to display
        await fetchTraffic(25);
        const res = await fetchStats();
        setStats(res.data);
        setHistory(prev => {
          const point = {
            time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            anomalies: res.data.anomalies_detected,
            total: res.data.total_packets,
          };
          return [...prev.slice(-19), point];
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 glass-card bg-gray-800/50 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-80 glass-card bg-gray-800/50 animate-pulse lg:col-span-2" />
          <div className="h-80 glass-card bg-gray-800/50 animate-pulse" />
        </div>
      </div>
    );
  }

  // Prepare chart data
  const threatData = Object.entries(stats.threat_distribution).map(
    ([range, count]) => ({ range, count })
  );
  const attackData = Object.entries(stats.attack_distribution).map(
    ([name, count]) => ({ name, count })
  );
  const deviceDonut = [
    { name: 'Safe', value: stats.device_breakdown.safe, color: '#06d6a0' },
    { name: 'Suspicious', value: stats.device_breakdown.suspicious, color: '#f97316' },
    { name: 'Compromised', value: stats.device_breakdown.compromised, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ---- Header ---- */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Security Overview
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Real-time IoT supply chain threat monitoring
          </p>
        </div>
        <span
          className="badge badge-safe text-xs shadow-[0_0_15px_rgba(6,214,160,0.2)]"
        >
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="inline-block rounded-full"
            style={{
              width: 6, height: 6,
              background: 'var(--accent-cyan)',
              boxShadow: '0 0 8px var(--accent-cyan)',
            }}
          />
          Live System
        </span>
      </motion.div>

      {/* ---- Stat Cards ---- */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div variants={itemVariants}>
          <StatCard
            icon={HiOutlineGlobe}
            label="Total Packets"
            value={stats.total_packets}
            color="var(--accent-blue)"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            icon={HiOutlineExclamation}
            label="Anomalies"
            value={stats.anomalies_detected}
            color="var(--accent-red)"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            icon={HiOutlineBell}
            label="Active Alerts"
            value={stats.active_alerts}
            color="var(--accent-orange)"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            icon={HiOutlineChip}
            label="Devices"
            value={stats.devices_monitored}
            color="var(--accent-purple)"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            icon={HiOutlineBan}
            label="Blocked IPs"
            value={stats.blocked_ips}
            color="var(--accent-yellow)"
          />
        </motion.div>
      </motion.div>

      {/* ---- Charts Row 1 ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Threat Score Distribution */}
        <motion.div variants={itemVariants} className="glass-card lg:col-span-2 hover:border-[rgba(6,214,160,0.3)] transition-colors">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Threat Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={threatData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{
                  background: 'rgba(26, 31, 53, 0.9)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(148,163,184,0.12)',
                  borderRadius: 12,
                  color: '#f1f5f9',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {threatData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Device Health */}
        <motion.div variants={itemVariants} className="glass-card flex flex-col items-center justify-center hover:border-[rgba(6,214,160,0.3)] transition-colors relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[rgba(6,214,160,0.05)] blur-3xl rounded-full" />
          <h3 className="text-sm font-semibold mb-4 self-start" style={{ color: 'var(--text-secondary)' }}>
            Device Health
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={deviceDonut}
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                strokeWidth={0}
              >
                {deviceDonut.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(26, 31, 53, 0.9)',
                  border: '1px solid rgba(148,163,184,0.12)',
                  borderRadius: 12,
                  color: '#f1f5f9',
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ---- Charts Row 2 ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Anomaly Trend */}
        <motion.div variants={itemVariants} className="glass-card hover:border-[rgba(239,68,68,0.3)] transition-colors">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Anomaly Trend (Live)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="gAnomaly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(26, 31, 53, 0.9)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 12,
                  color: '#f1f5f9',
                }}
              />
              <Area
                type="monotone"
                dataKey="anomalies"
                stroke="#ef4444"
                fill="url(#gAnomaly)"
                strokeWidth={3}
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Attack Breakdown */}
        <motion.div variants={itemVariants} className="glass-card hover:border-[rgba(139,92,246,0.3)] transition-colors">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Attack Type Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attackData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{
                  background: 'rgba(26, 31, 53, 0.9)',
                  border: '1px solid rgba(148,163,184,0.12)',
                  borderRadius: 12,
                  color: '#f1f5f9',
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {attackData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </motion.div>
  );
}
