/**
 * ============================================================
 *  API Service — BadBox Defense Frontend
 * ============================================================
 *  Centralized HTTP client for communicating with the Flask API.
 *  All endpoints are prefixed with /api and proxied by Vite in dev.
 * ============================================================
 */

import axios from 'axios';

// In production, swap to the actual backend URL
const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ----- Traffic -----
export const fetchTraffic = (count = 20) =>
  api.get(`/traffic?count=${count}`).then(r => r.data);

// ----- Detection -----
export const detectAnomaly = (features) =>
  api.post('/detect', { features }).then(r => r.data);

// ----- Alerts -----
export const fetchAlerts = (limit = 50) =>
  api.get(`/alerts?limit=${limit}`).then(r => r.data);

// ----- Logs -----
export const fetchLogs = (lines = 100) =>
  api.get(`/logs?lines=${lines}`).then(r => r.data);

// ----- Devices -----
export const fetchDevices = () =>
  api.get('/devices').then(r => r.data);

// ----- Stats (Dashboard) -----
export const fetchStats = () =>
  api.get('/stats').then(r => r.data);

// ----- Block IP -----
export const blockIP = (ip) =>
  api.post('/block-ip', { ip }).then(r => r.data);

// ----- Blocked IPs -----
export const fetchBlockedIPs = () =>
  api.get('/blocked-ips').then(r => r.data);

// ----- Train Model -----
export const trainModel = () =>
  api.post('/train').then(r => r.data);

// ----- Health Check -----
export const healthCheck = () =>
  api.get('/health').then(r => r.data);

// ----- Wireshark Integration -----
export const getWiresharkStatus = () =>
  api.get('/wireshark/status').then(r => r.data);

export const startWiresharkCapture = (options = {}) =>
  api.post('/wireshark/capture', options, { timeout: 30000 }).then(r => r.data);

export const exportToPcap = () =>
  api.post('/wireshark/export').then(r => r.data);

export const downloadPcap = (filename) =>
  `${API_BASE}/wireshark/pcap/${filename}`;

export const listPcapFiles = () =>
  api.get('/wireshark/pcap-files').then(r => r.data);

export const openInWireshark = (filename) =>
  api.post('/wireshark/open', { filename }).then(r => r.data);

export default api;
