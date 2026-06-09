/**
 * ============================================================
 *  Wireshark Integration Page — BadBox Defense
 * ============================================================
 *  Full Wireshark/TShark integration panel with:
 *    - Connection status indicator
 *    - Network interface selector
 *    - Live capture via TShark
 *    - PCAP export for Wireshark analysis
 *    - PCAP file manager with download & open-in-Wireshark
 *    - Captured packet table with ML threat analysis
 * ============================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getWiresharkStatus,
  startWiresharkCapture,
  exportToPcap,
  listPcapFiles,
  downloadPcap,
  openInWireshark,
} from '../services/api';
import {
  HiOutlineStatusOnline,
  HiOutlineDownload,
  HiOutlinePlay,
  HiOutlineExternalLink,
  HiOutlineRefresh,
  HiOutlineDocumentText,
  HiOutlineTrash,
  HiOutlineDatabase,
} from 'react-icons/hi';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Wireshark() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [capturedPackets, setCapturedPackets] = useState([]);
  const [captureInfo, setCaptureInfo] = useState(null);
  const [pcapFiles, setPcapFiles] = useState([]);
  const [selectedInterface, setSelectedInterface] = useState('');
  const [packetCount, setPacketCount] = useState(30);
  const [duration, setDuration] = useState(10);
  const [notification, setNotification] = useState(null);

  // Load Wireshark status and PCAP files
  const loadStatus = useCallback(async () => {
    try {
      const [wsStatus, files] = await Promise.all([
        getWiresharkStatus(),
        listPcapFiles(),
      ]);
      setStatus(wsStatus.data);
      setPcapFiles(files.data || []);
    } catch (err) {
      console.error('Wireshark status error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Start a TShark capture
  const handleCapture = async () => {
    setCapturing(true);
    setCapturedPackets([]);
    setCaptureInfo(null);
    try {
      const res = await startWiresharkCapture({
        interface: selectedInterface || undefined,
        count: packetCount,
        duration: duration,
      });
      setCapturedPackets(res.data || []);
      setCaptureInfo(res.capture_info || {});
      showNotification(
        `Captured ${res.packet_count || 0} packets via ${res.capture_info?.method || 'unknown'}`
      );
      loadStatus(); // refresh PCAP files list
    } catch (err) {
      showNotification('Capture failed — run as Administrator', 'error');
      console.error('Capture error:', err);
    } finally {
      setCapturing(false);
    }
  };

  // Export traffic to PCAP
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportToPcap();
      showNotification(`Exported ${res.packet_count} packets → ${res.filename}`);
      loadStatus();
    } catch (err) {
      showNotification('Export failed — generate some traffic first', 'error');
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  // Open PCAP in Wireshark GUI
  const handleOpenWireshark = async (filename) => {
    try {
      await openInWireshark(filename);
      showNotification(`Opened ${filename} in Wireshark`);
    } catch (err) {
      showNotification('Could not open Wireshark', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
         <div className="h-10 w-48 bg-gray-800 rounded animate-pulse" />
         <div className="h-32 glass-card bg-gray-800/50 animate-pulse" />
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-64 glass-card bg-gray-800/50 animate-pulse" />
            <div className="h-64 glass-card bg-gray-800/50 animate-pulse" />
         </div>
      </div>
    );
  }

  const isConnected = status?.tshark_available;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl"
            style={{
              background:
                notification.type === 'error'
                  ? 'rgba(239,68,68,0.95)'
                  : 'rgba(6,214,160,0.95)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
            }}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Wireshark Integration
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Live packet capture & PCAP analysis via TShark
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadStatus}
          className="p-2.5 rounded-xl transition-colors"
          style={{ background: 'var(--bg-card)', color: 'var(--accent-cyan)', border: '1px solid var(--border)' }}
        >
          <HiOutlineRefresh size={20} />
        </motion.button>
      </motion.div>

      {/* Connection Status Card */}
      <motion.div variants={itemVariants} className="glass-card relative overflow-hidden">
        <div 
          className="absolute -top-10 -right-10 w-48 h-48 blur-3xl opacity-10 pointer-events-none rounded-full"
          style={{ background: isConnected ? 'var(--accent-cyan)' : 'var(--accent-red)' }}
        />
        <div className="flex items-center gap-4 flex-wrap z-10">
          <div
            className="flex items-center justify-center rounded-xl z-10"
            style={{
              width: 56,
              height: 56,
              background: isConnected ? 'rgba(6,214,160,0.12)' : 'rgba(239,68,68,0.12)',
              color: isConnected ? 'var(--accent-cyan)' : 'var(--accent-red)',
              boxShadow: isConnected ? 'var(--glow-cyan)' : 'var(--glow-red)',
            }}
          >
            <HiOutlineStatusOnline size={28} />
          </div>

          <div className="flex-1 z-10">
            <div className="flex items-center gap-2 mb-1">
              <motion.span
                animate={isConnected ? { opacity: [1, 0.5, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className="inline-block rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: isConnected ? 'var(--accent-cyan)' : 'var(--accent-red)',
                  boxShadow: `0 0 8px ${isConnected ? 'var(--accent-cyan)' : 'var(--accent-red)'}`,
                }}
              />
              <span className="text-sm font-semibold" style={{ color: isConnected ? 'var(--accent-cyan)' : 'var(--accent-red)' }}>
                {isConnected ? 'Wireshark Connected' : 'Wireshark Not Found'}
              </span>
            </div>
            {status?.tshark_version && (
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {status.tshark_version}
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              TShark: {status?.tshark_path || 'N/A'} &nbsp;|&nbsp;
              PyShark: {status?.pyshark_available ? '✅' : '❌'} &nbsp;|&nbsp;
              Scapy: {status?.scapy_available ? '✅' : '❌'}
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex gap-4 text-center z-10">
            <div className="px-4 py-2 rounded-xl" style={{ background: 'var(--bg-card)' }}>
              <div className="text-lg font-bold" style={{ color: 'var(--accent-blue)' }}>
                {status?.interfaces?.length || 0}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Interfaces</div>
            </div>
            <div className="px-4 py-2 rounded-xl" style={{ background: 'var(--bg-card)' }}>
              <div className="text-lg font-bold" style={{ color: 'var(--accent-purple)' }}>
                {pcapFiles.length}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>PCAP Files</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Capture Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Capture Panel */}
        <motion.div variants={itemVariants} className="glass-card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <HiOutlinePlay size={16} style={{ color: 'var(--accent-cyan)' }} />
            Live TShark Capture
          </h3>

          <div className="space-y-3">
            {/* Interface selector */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                Network Interface
              </label>
              <select
                value={selectedInterface}
                onChange={(e) => setSelectedInterface(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <option value="">Auto-detect</option>
                {status?.interfaces?.map((iface) => (
                  <option key={iface.id} value={iface.id}>
                    {iface.id}: {iface.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Count & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Max Packets
                </label>
                <input
                  type="number"
                  value={packetCount}
                  onChange={(e) => setPacketCount(Number(e.target.value))}
                  min={5}
                  max={200}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors focus:border-[var(--accent-cyan)]"
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Duration (sec)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={3}
                  max={60}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors focus:border-[var(--accent-cyan)]"
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
            </div>

            {/* Capture button */}
            <motion.button
              whileHover={!capturing ? { scale: 1.02 } : {}}
              whileTap={!capturing ? { scale: 0.98 } : {}}
              onClick={handleCapture}
              disabled={capturing}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,214,160,0.2)]"
              style={{
                background: capturing
                  ? 'rgba(6,214,160,0.2)'
                  : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                color: capturing ? 'var(--accent-cyan)' : '#0a0e1a',
                cursor: capturing ? 'wait' : 'pointer',
              }}
            >
              {capturing ? (
                <>
                  <div
                    className="animate-spin rounded-full border-2 border-t-transparent"
                    style={{ width: 16, height: 16, borderColor: 'var(--accent-cyan)', borderTopColor: 'transparent' }}
                  />
                  Capturing...
                </>
              ) : (
                <>
                  <HiOutlinePlay size={16} />
                  Start Capture
                </>
              )}
            </motion.button>

            {!isConnected && (
              <p className="text-xs" style={{ color: 'var(--accent-orange)' }}>
                ⚠️ TShark not found — will use simulated capture data
              </p>
            )}
          </div>
        </motion.div>

        {/* Export Panel */}
        <motion.div variants={itemVariants} className="glass-card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <HiOutlineDownload size={16} style={{ color: 'var(--accent-purple)' }} />
            PCAP Export & Files
          </h3>

          {/* Export button */}
          <motion.button
            whileHover={!exporting ? { scale: 1.02, backgroundColor: 'rgba(139,92,246,0.1)' } : {}}
            whileTap={!exporting ? { scale: 0.98 } : {}}
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-2.5 mb-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--accent-purple)',
              border: '1px solid rgba(139,92,246,0.3)',
            }}
          >
            <HiOutlineDatabase size={16} />
            {exporting ? 'Exporting...' : 'Export Traffic → PCAP'}
          </motion.button>

          {/* PCAP Files list */}
          <div className="space-y-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
            {pcapFiles.length > 0 ? (
              pcapFiles.map((file, i) => (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-gray-800/40"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <HiOutlineDocumentText size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                        {file.filename}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {file.size_display} • {new Date(file.created).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <motion.a
                      whileHover={{ scale: 1.1 }}
                      href={downloadPcap(file.filename)}
                      className="p-1.5 rounded-lg transition-colors bg-gray-800/50 hover:bg-gray-700"
                      style={{ color: 'var(--accent-blue)' }}
                      title="Download PCAP"
                    >
                      <HiOutlineDownload size={14} />
                    </motion.a>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => handleOpenWireshark(file.filename)}
                      className="p-1.5 rounded-lg transition-colors bg-gray-800/50 hover:bg-gray-700"
                      style={{ color: 'var(--accent-cyan)' }}
                      title="Open in Wireshark"
                    >
                      <HiOutlineExternalLink size={14} />
                    </motion.button>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                No PCAP files yet — capture or export traffic first
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Capture Info Banner */}
      <AnimatePresence>
        {captureInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card flex items-center gap-3 flex-wrap"
            style={{ borderLeft: '3px solid var(--accent-cyan)' }}
          >
            <span className="text-xs font-semibold px-2 py-1 rounded shadow-sm" style={{
              background: captureInfo.method === 'tshark'
                ? 'rgba(6,214,160,0.15)'
                : 'rgba(249,115,22,0.15)',
              color: captureInfo.method === 'tshark'
                ? 'var(--accent-cyan)'
                : 'var(--accent-orange)',
            }}>
              {captureInfo.method === 'tshark' ? '🦈 TShark Capture' : '⚡ Simulated'}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {captureInfo.packet_count || capturedPackets.length} packets
              {captureInfo.interface && ` • Interface: ${captureInfo.interface}`}
              {captureInfo.pcap_filename && ` • Saved: ${captureInfo.pcap_filename}`}
              {captureInfo.reason && ` • ${captureInfo.reason}`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Captured Packets Table */}
      <AnimatePresence>
        {capturedPackets.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden"
          >
            <div className="px-5 py-3" style={{ background: 'rgba(6,214,160,0.06)', borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Captured Packets — {capturedPackets.length} total
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(139,92,246,0.06)' }}>
                    {['#', 'Source IP', 'Dest IP', 'Protocol', 'Port', 'Size', 'Threat', 'Status'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {capturedPackets.slice(0, 50).map((pkt, i) => (
                    <motion.tr
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.01 }}
                      key={i}
                      className="transition-colors border-b"
                      style={{
                        borderColor: 'var(--border)',
                        background: pkt.threat_label === 'Malicious' ? 'rgba(239,68,68,0.05)' : 'transparent',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background =
                        pkt.threat_label === 'Malicious' ? 'rgba(239,68,68,0.05)' : 'transparent'
                      }
                    >
                      <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{pkt.src_ip}</td>
                      <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{pkt.dst_ip}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold shadow-sm" style={{
                          background: pkt.protocol === 'TCP' ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)',
                          color: pkt.protocol === 'TCP' ? '#3b82f6' : '#8b5cf6',
                        }}>
                          {pkt.protocol}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{pkt.dst_port}</td>
                      <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{pkt.packet_size}B</td>
                      <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {pkt.threat_score?.toFixed(0)}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`badge ${
                          pkt.threat_label === 'Normal' ? 'badge-safe' :
                          pkt.threat_label === 'Suspicious' ? 'badge-suspicious' : 'badge-malicious shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                        }`}>
                          {pkt.threat_label || 'Unknown'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Network Interfaces */}
      {status?.interfaces?.length > 0 && (
        <motion.div variants={itemVariants} className="glass-card">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
            Available Network Interfaces
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {status.interfaces.map((iface, i) => (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={i}
                className="p-3 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                style={{
                  background: selectedInterface === iface.id ? 'rgba(6,214,160,0.1)' : 'var(--bg-primary)',
                  border: `1px solid ${selectedInterface === iface.id ? 'rgba(6,214,160,0.3)' : 'var(--border)'}`,
                  boxShadow: selectedInterface === iface.id ? '0 0 10px rgba(6,214,160,0.1)' : 'none'
                }}
                onClick={() => setSelectedInterface(iface.id)}
              >
                <HiOutlineStatusOnline
                  size={14}
                  style={{ color: selectedInterface === iface.id ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {iface.description || iface.name}
                  </p>
                  <p className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                    ID: {iface.id}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
