/**
 * ============================================================
 *  Main App Component — BadBox Defense Dashboard
 * ============================================================
 *  Integrates the sidebar layout with React Router pages.
 * ============================================================
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TrafficMonitor from './pages/TrafficMonitor';
import Alerts from './pages/Alerts';
import Devices from './pages/Devices';
import Logs from './pages/Logs';
import Wireshark from './pages/Wireshark';

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen">
        {/* Fixed Sidebar */}
        <Sidebar />

        {/* Main content area — offset by sidebar width */}
        <main
          className="flex-1 p-6 lg:p-8"
          style={{
            marginLeft: 260,
            minHeight: '100vh',
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/traffic" element={<TrafficMonitor />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/wireshark" element={<Wireshark />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
