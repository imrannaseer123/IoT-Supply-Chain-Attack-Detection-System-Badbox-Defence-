# 🛡️ AI-Based IoT Supply Chain Attack Detection System (BadBox Defense)

> Real-time anomaly detection system that uses Machine Learning to detect and prevent supply chain malware like **BadBox 2.0** through behavioral analysis, network monitoring, and threat scoring.

---

## 📋 Features

- **Real-Time Anomaly Detection** — Isolation Forest ML model analyzes network traffic in real-time
- **Simulated IoT Network** — 8 IoT devices with realistic normal + malicious traffic patterns
- **Threat Scoring** — 0-100 severity scoring with Normal / Suspicious / Malicious classification
- **Attack Detection** — Identifies C2 beaconing, data exfiltration, port scans, and DDoS
- **IP Blocking** — Simulate firewall rules to block suspicious IP addresses
- **Device Status Monitoring** — Safe / Suspicious / Compromised device health tracking
- **Professional Dashboard** — Dark-themed cybersecurity UI with live charts and alerts
- **System Logs** — Terminal-style log viewer with color-coded severity levels

---

## 🏗️ Project Structure

```
iot-security-project/
│
├── backend/
│   ├── app.py                 # Flask API server (main entry point)
│   ├── detector.py            # Isolation Forest ML model (train + predict)
│   ├── network_monitor.py     # Packet capture & traffic simulation (Scapy)
│   ├── requirements.txt       # Python dependencies
│   ├── models/                # Saved ML model files (auto-generated)
│   └── utils/
│       ├── __init__.py
│       └── logger.py          # Structured logging with rotation
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx    # Navigation sidebar
│   │   │   └── StatCard.jsx   # Reusable metric card
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx  # Overview with charts
│   │   │   ├── TrafficMonitor.jsx  # Live packet table
│   │   │   ├── Alerts.jsx     # Security alerts panel
│   │   │   ├── Devices.jsx    # IoT device status grid
│   │   │   └── Logs.jsx       # System log viewer
│   │   ├── services/
│   │   │   └── api.js         # Axios API client
│   │   ├── App.jsx            # Root component with routing
│   │   ├── main.jsx           # Entry point
│   │   └── index.css          # Global styles & design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── logs/                      # Application log files (auto-generated)
└── README.md
```

---

## 🛠️ Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Backend    | Python, Flask, Flask-CORS          |
| ML Model   | Scikit-learn (Isolation Forest)    |
| Network    | Scapy (packet capture/simulation) |
| Database   | MongoDB (optional — works without) |
| Frontend   | React 19, Vite, Tailwind CSS v4   |
| Charts     | Recharts                          |
| HTTP       | Axios                             |
| Routing    | React Router v7                   |
| Icons      | React Icons (Heroicons)           |

---

## 🚀 Installation & Setup

### Prerequisites

- **Python 3.10+** installed
- **Node.js 18+** and **npm** installed
- **MongoDB** (optional — the app falls back to in-memory storage)

### 1. Clone / Open the Project

```bash
cd iot-security-project
```

### 2. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## ▶️ Running the Application

### Start the Backend (Terminal 1)

```bash
cd backend
python app.py
```

The Flask API will start on **http://localhost:5000**

You should see:
```
[INFO] Pre-training ML model...
[INFO] Model saved to models/isolation_forest.pkl
[INFO] Starting BadBox Defense API on port 5000
 * Running on http://0.0.0.0:5000
```

### Start the Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

The React dashboard will start on **http://localhost:5173**

### 3. Open the Dashboard

Navigate to **http://localhost:5173** in your browser.

---

## 📡 API Endpoints

| Method | Endpoint          | Description                          |
|--------|-------------------|--------------------------------------|
| GET    | `/api/traffic`    | Generate & analyze simulated traffic |
| POST   | `/api/detect`     | Run anomaly detection on features    |
| GET    | `/api/alerts`     | Fetch active security alerts         |
| GET    | `/api/logs`       | Read application log entries         |
| GET    | `/api/devices`    | Get IoT device health statuses       |
| GET    | `/api/stats`      | Dashboard summary statistics         |
| POST   | `/api/block-ip`   | Simulate blocking an IP address      |
| GET    | `/api/blocked-ips`| List all blocked IPs                 |
| POST   | `/api/train`      | Retrain the ML model                 |
| GET    | `/api/health`     | System health check                  |

### Example: Manual Detection

```bash
curl -X POST http://localhost:5000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"features": [5000, 6, 60000, 4444, 0.05, 200]}'
```

Response:
```json
{
  "status": "success",
  "result": {
    "prediction": -1,
    "threat_score": 72.5,
    "label": "Malicious",
    "timestamp": "2026-04-06T16:30:00.000000",
    "features": {
      "packet_size": 5000,
      "protocol_code": 6,
      "src_port": 60000,
      "dst_port": 4444,
      "flow_duration": 0.05,
      "packets_per_second": 200
    }
  }
}
```

---

## 🧠 Machine Learning Model

**Algorithm:** Isolation Forest (unsupervised anomaly detection)

**Features (6 dimensions):**
1. `packet_size` — Packet payload size in bytes
2. `protocol_code` — Protocol number (TCP=6, UDP=17, ICMP=1)
3. `src_port` — Source port
4. `dst_port` — Destination port
5. `flow_duration` — Duration of the network flow
6. `packets_per_second` — Packet transmission rate

**Training Data:**
- 800 normal IoT traffic samples (small packets, standard ports)
- 200 malicious samples (BadBox-style C2 beacons, exfiltration, scans)

**Output:**
- `1` → Normal traffic
- `-1` → Anomaly detected
- Threat score: 0–100 (higher = more dangerous)

---

## 🎨 Dashboard Pages

| Page             | Description                                          |
|------------------|------------------------------------------------------|
| **Dashboard**    | KPI cards, threat distribution, device health donut, anomaly trend chart, attack breakdown |
| **Traffic Monitor** | Live packet table with protocol badges, threat scores, auto-refresh |
| **Alerts**       | Severity-coded alert cards with IP blocking actions   |
| **Devices**      | IoT device grid with Safe/Suspicious/Compromised status |
| **System Logs**  | Terminal-style log viewer with color-coded levels     |

---

## 🔐 Simulated Attacks

The system simulates four types of BadBox 2.0 attack patterns:

| Attack Type      | Characteristics                                    |
|------------------|----------------------------------------------------|
| **C2 Beacon**    | Small packets to known-malicious C2 server IPs     |
| **Exfiltration** | Large data payloads (2-9KB) to suspicious endpoints|
| **Port Scan**    | SYN probes to services like SSH, RDP, SMB          |
| **DDoS**         | High-rate UDP flood traffic                        |

---

## 📝 License

This project is built for educational and cybersecurity research purposes.

---

Built with ❤️ for IoT Security by @imrannaseer123
