import os
import sys
import copy
import json
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# ---------------------------------------------------------------------------
# Ensure backend directory is on the Python path
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(__file__))

from detector import predict, train_model, analyze_batch, load_model
from network_monitor import (
    simulate_traffic, capture_packets, get_device_status,
    get_wireshark_status, capture_with_tshark, export_to_pcap,
    list_pcap_files, open_in_wireshark, parse_pcap_file,
    TSHARK_AVAILABLE, PCAP_DIR
)
from utils.logger import setup_logger, log_event

# ---------------------------------------------------------------------------
# App & Logger Setup
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from React dev server


# ---------------------------------------------------------------------------
# Custom JSON encoder — handles MongoDB ObjectId gracefully
# ---------------------------------------------------------------------------
class SafeJSONEncoder(json.JSONEncoder):
    def default(self, o):
        # Convert MongoDB ObjectId to string
        if hasattr(o, '__str__') and type(o).__name__ == 'ObjectId':
            return str(o)
        return super().default(o)


app.json_encoder = SafeJSONEncoder  # type: ignore
app.json.ensure_ascii = False

logger = setup_logger("FlaskApp")

# ---------------------------------------------------------------------------
# MongoDB Connection (optional — falls back to in-memory storage)
# ---------------------------------------------------------------------------
try:
    from pymongo import MongoClient
    mongo_client = MongoClient("mongodb://localhost:27017/",
                               serverSelectionTimeoutMS=3000)
    mongo_client.server_info()  # Force connection check
    db = mongo_client["badbox_defense"]
    traffic_col = db["traffic_logs"]
    alerts_col  = db["alerts"]
    MONGO_AVAILABLE = True
    log_event(logger, "info", "Connected to MongoDB")
except Exception as e:
    MONGO_AVAILABLE = False
    log_event(logger, "warning",
              f"MongoDB unavailable ({e}). Using in-memory storage.")

# In-memory fallback stores
_memory_traffic: list[dict] = []
_memory_alerts:  list[dict] = []
_blocked_ips:    set[str]   = set()


# ===========================================================================
# Helper: Store and Retrieve
# ===========================================================================

def _store_traffic(records: list[dict]):
    """Persist traffic records to MongoDB or in-memory list."""
    if MONGO_AVAILABLE:
        # Deep-copy so insert_many's _id injection doesn't mutate originals
        traffic_col.insert_many(copy.deepcopy(records))
    else:
        _memory_traffic.extend(records)
        # Keep only last 2000 records in memory
        if len(_memory_traffic) > 2000:
            del _memory_traffic[:len(_memory_traffic) - 2000]


def _store_alert(alert: dict):
    """Persist a single alert."""
    if MONGO_AVAILABLE:
        # Deep-copy so insert_one's _id injection doesn't mutate the original
        alerts_col.insert_one(copy.deepcopy(alert))
    else:
        _memory_alerts.append(alert)
        if len(_memory_alerts) > 500:
            del _memory_alerts[:len(_memory_alerts) - 500]


def _get_traffic(limit: int = 100) -> list[dict]:
    if MONGO_AVAILABLE:
        cursor = traffic_col.find({}, {"_id": 0}).sort(
            "timestamp", -1).limit(limit)
        return list(cursor)
    return list(reversed(_memory_traffic[-limit:]))


def _get_alerts(limit: int = 50) -> list[dict]:
    if MONGO_AVAILABLE:
        cursor = alerts_col.find({}, {"_id": 0}).sort(
            "timestamp", -1).limit(limit)
        return list(cursor)
    return list(reversed(_memory_alerts[-limit:]))


# ===========================================================================
# API Routes
# ===========================================================================

@app.route("/api/traffic", methods=["GET"])
def get_traffic():
    """
    Generate new simulated traffic, run detection, store results,
    and return the enriched packet list.
    """
    count = int(request.args.get("count", 20))
    packets = simulate_traffic(count)

    # Run each packet through the detector
    enriched = []
    for pkt in packets:
        features = [
            pkt["packet_size"],
            pkt["protocol_code"],
            pkt["src_port"],
            pkt["dst_port"],
            0.5,   # simulated flow_duration
            pkt["packet_size"] / 50,  # rough packets_per_second estimate
        ]
        result = predict(features)
        pkt["prediction"]   = result["prediction"]
        pkt["threat_score"]  = result["threat_score"]
        pkt["threat_label"]  = result["label"]

        # If it's an anomaly, create an alert
        if result["prediction"] == -1:
            alert = {
                "timestamp": pkt["timestamp"],
                "src_ip": pkt["src_ip"],
                "dst_ip": pkt["dst_ip"],
                "threat_score": result["threat_score"],
                "threat_label": result["label"],
                "attack_type": pkt.get("attack_type", "unknown"),
                "device_name": pkt.get("device_name", "Unknown"),
                "packet_size": pkt["packet_size"],
                "protocol": pkt["protocol"],
                "status": "active",
            }
            _store_alert(alert)

        enriched.append(pkt)

    _store_traffic(enriched)

    log_event(logger, "info", f"Processed {len(enriched)} traffic samples")
    return jsonify({
        "status": "success",
        "count": len(enriched),
        "data": enriched,
    })


@app.route("/api/detect", methods=["POST"])
def detect():
    """
    Accept raw features and return the threat prediction.

    Expected JSON body:
    {
      "features": [packet_size, protocol_code, src_port, dst_port,
                   flow_duration, packets_per_second]
    }
    """
    body = request.get_json(force=True)
    features = body.get("features")

    if not features or len(features) != 6:
        return jsonify({"error": "Provide exactly 6 numeric features"}), 400

    result = predict(features)

    # Automatically alert on anomalies
    if result["prediction"] == -1:
        alert = {
            "timestamp": result["timestamp"],
            "threat_score": result["threat_score"],
            "threat_label": result["label"],
            "features": result["features"],
            "status": "active",
        }
        _store_alert(alert)

    return jsonify({"status": "success", "result": result})


@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    """Return recent alerts sorted by timestamp (newest first)."""
    limit = int(request.args.get("limit", 50))
    alerts = _get_alerts(limit)
    return jsonify({
        "status": "success",
        "count": len(alerts),
        "data": alerts,
    })


@app.route("/api/logs", methods=["GET"])
def get_logs():
    """
    Read and return the last N lines from the log file.
    """
    n = int(request.args.get("lines", 100))
    log_path = os.path.join(os.path.dirname(__file__), '..', 'logs',
                            'badbox_defense.log')
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            lines = f.readlines()[-n:]
        return jsonify({
            "status": "success",
            "count": len(lines),
            "data": [line.strip() for line in lines],
        })
    except FileNotFoundError:
        return jsonify({"status": "success", "count": 0, "data": []})


@app.route("/api/devices", methods=["GET"])
def get_devices():
    """Return security status of all known IoT devices."""
    traffic = _get_traffic(200)
    devices = get_device_status(traffic)
    return jsonify({
        "status": "success",
        "count": len(devices),
        "data": devices,
    })


@app.route("/api/block-ip", methods=["POST"])
def block_ip():
    """
    Simulate blocking a suspicious IP address.
    In a real system this would update firewall rules.
    """
    body = request.get_json(force=True)
    ip = body.get("ip")

    if not ip:
        return jsonify({"error": "IP address required"}), 400

    _blocked_ips.add(ip)
    log_event(logger, "warning", f"IP blocked (simulation): {ip}")

    return jsonify({
        "status": "success",
        "message": f"IP {ip} has been blocked",
        "blocked_ips": list(_blocked_ips),
    })


@app.route("/api/blocked-ips", methods=["GET"])
def get_blocked_ips():
    """Return all currently blocked IPs."""
    return jsonify({
        "status": "success",
        "data": list(_blocked_ips),
    })


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """
    Dashboard summary:
      - Total packets analyzed
      - Anomalies detected
      - Active alerts
      - Devices monitored
      - Blocked IPs
    """
    traffic = _get_traffic(500)
    alerts  = _get_alerts(500)
    devices = get_device_status(traffic)

    total     = len(traffic)
    anomalies = sum(1 for t in traffic if t.get("prediction") == -1)
    safe      = sum(1 for d in devices if d["status"] == "Safe")
    suspicious = sum(1 for d in devices if d["status"] == "Suspicious")
    compromised = sum(1 for d in devices if d["status"] == "Compromised")

    # Threat score distribution for chart
    score_buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for t in traffic:
        score = t.get("threat_score", 0)
        if score <= 20:
            score_buckets["0-20"] += 1
        elif score <= 40:
            score_buckets["21-40"] += 1
        elif score <= 60:
            score_buckets["41-60"] += 1
        elif score <= 80:
            score_buckets["61-80"] += 1
        else:
            score_buckets["81-100"] += 1

    # Protocol distribution
    proto_counts = {}
    for t in traffic:
        p = t.get("protocol", "Unknown")
        proto_counts[p] = proto_counts.get(p, 0) + 1

    # Attack type distribution
    attack_counts = {}
    for t in traffic:
        atype = t.get("attack_type", "normal")
        attack_counts[atype] = attack_counts.get(atype, 0) + 1

    return jsonify({
        "status": "success",
        "data": {
            "total_packets": total,
            "anomalies_detected": anomalies,
            "active_alerts": len(alerts),
            "devices_monitored": len(devices),
            "blocked_ips": len(_blocked_ips),
            "device_breakdown": {
                "safe": safe,
                "suspicious": suspicious,
                "compromised": compromised,
            },
            "threat_distribution": score_buckets,
            "protocol_distribution": proto_counts,
            "attack_distribution": attack_counts,
        }
    })


@app.route("/api/train", methods=["POST"])
def retrain():
    """Retrain the Isolation Forest model."""
    try:
        model, scaler = train_model()
        log_event(logger, "info", "Model retrained successfully")
        return jsonify({"status": "success", "message": "Model retrained"})
    except Exception as e:
        log_event(logger, "error", f"Training failed: {e}")
        return jsonify({"error": str(e)}), 500


# ===========================================================================
# Wireshark Integration Endpoints
# ===========================================================================

@app.route("/api/wireshark/status", methods=["GET"])
def wireshark_status():
    """Return Wireshark/TShark availability and system info."""
    status = get_wireshark_status()
    return jsonify({"status": "success", "data": status})


@app.route("/api/wireshark/capture", methods=["POST"])
def wireshark_capture():
    """
    Start a live packet capture using TShark.
    Requires running as Administrator for live capture.

    JSON body:
      interface  — interface ID (optional)
      count      — max packets (default 30)
      duration   — max seconds (default 10)
    """
    body = request.get_json(force=True) if request.is_json else {}
    interface = body.get("interface")
    count = int(body.get("count", 30))
    duration = int(body.get("duration", 10))

    result = capture_with_tshark(
        interface=interface, count=count,
        duration=duration, save_pcap=True
    )

    # Run captured packets through the ML detector
    enriched = []
    for pkt in result.get("packets", []):
        features = [
            pkt.get("packet_size", 100),
            pkt.get("protocol_code", 6),
            pkt.get("src_port", 0),
            pkt.get("dst_port", 0),
            0.5,
            pkt.get("packet_size", 100) / 50,
        ]
        detection = predict(features)
        pkt["prediction"] = detection["prediction"]
        pkt["threat_score"] = detection["threat_score"]
        pkt["threat_label"] = detection["label"]
        enriched.append(pkt)

    if enriched:
        _store_traffic(enriched)

    log_event(logger, "info",
              f"Wireshark capture: {len(enriched)} packets analyzed")

    return jsonify({
        "status": "success",
        "packet_count": len(enriched),
        "data": enriched,
        "capture_info": result.get("capture_info", {}),
        "pcap_file": result.get("pcap_file"),
    })


@app.route("/api/wireshark/export", methods=["POST"])
def wireshark_export():
    """
    Export current traffic data to a .pcap file that can be opened
    in Wireshark.
    """
    traffic = _get_traffic(200)
    if not traffic:
        return jsonify({"error": "No traffic data to export"}), 400

    pcap_path = export_to_pcap(traffic)
    if not pcap_path:
        return jsonify({"error": "PCAP export failed"}), 500

    filename = os.path.basename(pcap_path)
    size = os.path.getsize(pcap_path)

    log_event(logger, "info", f"Exported {len(traffic)} packets to {filename}")

    return jsonify({
        "status": "success",
        "filename": filename,
        "size_bytes": size,
        "packet_count": len(traffic),
        "message": f"Exported {len(traffic)} packets to {filename}",
    })


@app.route("/api/wireshark/pcap/<filename>", methods=["GET"])
def download_pcap(filename):
    """Download a specific PCAP file."""
    pcap_path = os.path.join(PCAP_DIR, filename)
    if not os.path.exists(pcap_path):
        return jsonify({"error": "File not found"}), 404

    return send_file(
        pcap_path,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.tcpdump.pcap"
    )


@app.route("/api/wireshark/pcap-files", methods=["GET"])
def get_pcap_files():
    """List all saved PCAP files."""
    files = list_pcap_files()
    return jsonify({"status": "success", "data": files})


@app.route("/api/wireshark/open", methods=["POST"])
def open_wireshark():
    """
    Open a PCAP file in the Wireshark GUI application.

    JSON body:
      filename — name of the PCAP file to open
    """
    body = request.get_json(force=True)
    filename = body.get("filename")

    if not filename:
        return jsonify({"error": "Filename required"}), 400

    pcap_path = os.path.join(PCAP_DIR, filename)
    success = open_in_wireshark(pcap_path)

    if success:
        return jsonify({
            "status": "success",
            "message": f"Opened {filename} in Wireshark"
        })
    else:
        return jsonify({
            "error": "Could not open Wireshark. Make sure it's installed."
        }), 500


# ===========================================================================
# Health Check
# ===========================================================================

@app.route("/api/health", methods=["GET"])
def health():
    ws = get_wireshark_status()
    return jsonify({
        "status": "healthy",
        "mongo": MONGO_AVAILABLE,
        "wireshark": ws["tshark_available"],
        "timestamp": datetime.utcnow().isoformat(),
    })


# ===========================================================================
# Entrypoint
# ===========================================================================

if __name__ == "__main__":
    # Pre-train the model on startup so first requests are fast
    log_event(logger, "info", "Pre-training ML model...")
    load_model()
    log_event(logger, "info", "Starting BadBox Defense API on port 5000")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
        use_reloader=False   # avoid double model loading in debug mode
    )
