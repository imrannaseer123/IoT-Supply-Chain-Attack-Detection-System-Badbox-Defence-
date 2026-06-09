"""
=============================================================================
 Network Monitor — BadBox Defense System
=============================================================================
 Captures and analyzes network packets using Scapy and Wireshark/TShark.

 Capture Modes:
   1. TShark/PyShark  — Uses Wireshark's engine for deep packet inspection
   2. Scapy           — Lightweight Python-native packet capture
   3. Simulation      — Always-available demo traffic (no privileges needed)

 Wireshark Integration:
   - Live capture via TShark (Wireshark CLI)
   - PCAP file export for opening in Wireshark GUI
   - Interface enumeration
   - Deep protocol dissection

 Extracted features per packet:
   - Source IP & Destination IP
   - Source Port & Destination Port
   - Protocol (TCP / UDP / ICMP / Other)
   - Packet Size
   - Timestamp
=============================================================================
"""

import random
import time
import os
import subprocess
import shutil
from datetime import datetime

# ---------------------------------------------------------------------------
# Try importing Scapy — not all environments support raw packet capture
# ---------------------------------------------------------------------------
try:
    from scapy.all import sniff, IP, TCP, UDP, ICMP, wrpcap, Ether, Raw
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False

# ---------------------------------------------------------------------------
# Try importing PyShark (Wireshark/TShark Python wrapper)
# ---------------------------------------------------------------------------
try:
    import pyshark
    PYSHARK_AVAILABLE = True
except ImportError:
    PYSHARK_AVAILABLE = False

from utils.logger import setup_logger, log_event

logger = setup_logger("NetworkMonitor")

# ---------------------------------------------------------------------------
# TShark Detection — find the Wireshark CLI tool
# ---------------------------------------------------------------------------
TSHARK_PATH = None

# Common Wireshark install locations on Windows
_TSHARK_CANDIDATES = [
    shutil.which("tshark"),
    r"C:\Program Files\Wireshark\tshark.exe",
    r"C:\Program Files (x86)\Wireshark\tshark.exe",
]

for candidate in _TSHARK_CANDIDATES:
    if candidate and os.path.isfile(candidate):
        TSHARK_PATH = candidate
        break

TSHARK_AVAILABLE = TSHARK_PATH is not None

if TSHARK_AVAILABLE:
    log_event(logger, "info", f"TShark found at: {TSHARK_PATH}")
else:
    log_event(logger, "warning", "TShark not found — Wireshark features disabled")

# ---------------------------------------------------------------------------
# PCAP storage directory
# ---------------------------------------------------------------------------
PCAP_DIR = os.path.join(os.path.dirname(__file__), '..', 'captures')
os.makedirs(PCAP_DIR, exist_ok=True)


# ===========================================================================
# Protocol Mapping
# ===========================================================================
PROTOCOL_MAP = {
    6: "TCP",
    17: "UDP",
    1: "ICMP",
}


# ===========================================================================
# Real Packet Capture (requires admin / root)
# ===========================================================================

def capture_packets(interface: str = None, count: int = 10) -> list[dict]:
    """
    Capture live network packets using Scapy.

    Args:
        interface: Network interface name (None = default)
        count:     Number of packets to capture

    Returns:
        List of dicts with extracted packet features
    """
    if not SCAPY_AVAILABLE:
        log_event(logger, "warning",
                  "Scapy not available — falling back to simulation")
        return simulate_traffic(count)

    packets = []

    def process_packet(pkt):
        """Callback executed for every captured packet."""
        if IP in pkt:
            proto_num = pkt[IP].proto
            src_port = dst_port = 0

            if TCP in pkt:
                src_port = pkt[TCP].sport
                dst_port = pkt[TCP].dport
            elif UDP in pkt:
                src_port = pkt[UDP].sport
                dst_port = pkt[UDP].dport

            packet_info = {
                "src_ip": pkt[IP].src,
                "dst_ip": pkt[IP].dst,
                "src_port": src_port,
                "dst_port": dst_port,
                "protocol": PROTOCOL_MAP.get(proto_num, f"OTHER({proto_num})"),
                "protocol_code": proto_num,
                "packet_size": len(pkt),
                "timestamp": datetime.utcnow().isoformat(),
            }
            packets.append(packet_info)

    try:
        log_event(logger, "info",
                  f"Starting packet capture (count={count}, iface={interface})")
        sniff(iface=interface, prn=process_packet, count=count,
              store=False, timeout=30)
    except PermissionError:
        log_event(logger, "error",
                  "Permission denied — run as administrator for live capture")
        return simulate_traffic(count)
    except Exception as e:
        log_event(logger, "error", f"Capture failed: {e}")
        return simulate_traffic(count)

    log_event(logger, "info", f"Captured {len(packets)} packets")
    return packets


# ===========================================================================
# Simulated Traffic (always works — great for demos & testing)
# ===========================================================================

# Pools of realistic IPs
NORMAL_IPS = [
    "192.168.1.10", "192.168.1.20", "192.168.1.30", "192.168.1.40",
    "192.168.1.50", "10.0.0.5", "10.0.0.15", "10.0.0.25",
]
MALICIOUS_IPS = [
    "45.33.32.156", "185.220.101.1", "103.253.41.98",
    "91.219.236.222", "198.51.100.77",
]
IOT_DEVICES = [
    {"name": "Smart Camera",     "ip": "192.168.1.10", "type": "camera"},
    {"name": "Smart Thermostat", "ip": "192.168.1.20", "type": "thermostat"},
    {"name": "Smart Speaker",    "ip": "192.168.1.30", "type": "speaker"},
    {"name": "Smart Lock",       "ip": "192.168.1.40", "type": "lock"},
    {"name": "Smart TV",         "ip": "192.168.1.50", "type": "tv"},
    {"name": "IoT Gateway",      "ip": "10.0.0.5",     "type": "gateway"},
    {"name": "Sensor Hub",       "ip": "10.0.0.15",    "type": "sensor"},
    {"name": "Baby Monitor",     "ip": "10.0.0.25",    "type": "monitor"},
]

# Common destinations for normal traffic
NORMAL_DESTINATIONS = [
    "8.8.8.8", "1.1.1.1", "13.107.42.14",     # DNS / Microsoft
    "142.250.80.46", "104.26.10.78",            # Google / Cloudflare
]


def simulate_traffic(count: int = 20) -> list[dict]:
    """
    Generate a mix of realistic normal and suspicious IoT traffic.
    ~70% normal, ~30% suspicious / malicious.
    """
    packets = []

    for _ in range(count):
        is_malicious = random.random() < 0.3  # 30% chance of malicious

        if is_malicious:
            pkt = _generate_malicious_packet()
        else:
            pkt = _generate_normal_packet()

        packets.append(pkt)
        time.sleep(0.02)  # small delay for realism

    log_event(logger, "info", f"Simulated {count} packets")
    return packets


def _generate_normal_packet() -> dict:
    """Create a single normal IoT traffic packet."""
    device = random.choice(IOT_DEVICES)
    protocols = ["TCP", "UDP"]
    proto = random.choice(protocols)

    return {
        "src_ip": device["ip"],
        "dst_ip": random.choice(NORMAL_DESTINATIONS),
        "src_port": random.randint(1024, 65535),
        "dst_port": random.choice([80, 443, 8883, 5683, 53]),
        "protocol": proto,
        "protocol_code": 6 if proto == "TCP" else 17,
        "packet_size": random.randint(64, 512),
        "timestamp": datetime.utcnow().isoformat(),
        "device_name": device["name"],
        "device_type": device["type"],
        "traffic_type": "normal",
    }


def _generate_malicious_packet() -> dict:
    """
    Create a single malicious packet mimicking BadBox 2.0 behavior:
      - C2 beaconing (small packets to suspicious IPs)
      - Data exfiltration (large packets outbound)
      - Port scanning (connections to unusual ports)
    """
    device = random.choice(IOT_DEVICES)
    attack_type = random.choice(["c2_beacon", "exfiltration", "port_scan", "ddos"])

    base = {
        "src_ip": device["ip"],
        "timestamp": datetime.utcnow().isoformat(),
        "device_name": device["name"],
        "device_type": device["type"],
        "traffic_type": "malicious",
        "attack_type": attack_type,
    }

    if attack_type == "c2_beacon":
        base.update({
            "dst_ip": random.choice(MALICIOUS_IPS),
            "src_port": random.randint(1024, 65535),
            "dst_port": random.choice([4444, 6667, 8080, 9999]),
            "protocol": "TCP",
            "protocol_code": 6,
            "packet_size": random.randint(40, 120),  # small beacons
        })
    elif attack_type == "exfiltration":
        base.update({
            "dst_ip": random.choice(MALICIOUS_IPS),
            "src_port": random.randint(1024, 65535),
            "dst_port": random.choice([443, 8443, 31337]),
            "protocol": "TCP",
            "protocol_code": 6,
            "packet_size": random.randint(2000, 9000),  # large payloads
        })
    elif attack_type == "port_scan":
        base.update({
            "dst_ip": f"192.168.1.{random.randint(1, 254)}",
            "src_port": random.randint(1024, 65535),
            "dst_port": random.choice([22, 23, 445, 3389, 5900]),
            "protocol": "TCP",
            "protocol_code": 6,
            "packet_size": random.randint(40, 80),  # SYN probes
        })
    else:  # ddos
        base.update({
            "dst_ip": random.choice(NORMAL_DESTINATIONS),
            "src_port": random.randint(1024, 65535),
            "dst_port": 80,
            "protocol": "UDP",
            "protocol_code": 17,
            "packet_size": random.randint(500, 1500),
        })

    return base


# ===========================================================================
# Device Status Helper
# ===========================================================================

def get_device_status(traffic_history: list[dict]) -> list[dict]:
    """
    Analyze recent traffic per device and assign a security status.

    Returns list of dicts:
      { name, ip, type, status, threat_count, total_packets }
    """
    device_map = {}

    for pkt in traffic_history:
        ip = pkt.get("src_ip", "unknown")
        name = pkt.get("device_name", ip)
        dtype = pkt.get("device_type", "unknown")

        if ip not in device_map:
            device_map[ip] = {
                "name": name,
                "ip": ip,
                "type": dtype,
                "total_packets": 0,
                "threat_count": 0,
            }

        device_map[ip]["total_packets"] += 1
        if pkt.get("traffic_type") == "malicious":
            device_map[ip]["threat_count"] += 1

    # Assign status based on threat ratio
    statuses = []
    for dev in device_map.values():
        ratio = dev["threat_count"] / max(dev["total_packets"], 1)
        if ratio == 0:
            dev["status"] = "Safe"
        elif ratio < 0.3:
            dev["status"] = "Suspicious"
        else:
            dev["status"] = "Compromised"
        statuses.append(dev)

    return statuses


# ===========================================================================
# Wireshark / TShark Integration
# ===========================================================================

def get_wireshark_status() -> dict:
    """
    Check whether Wireshark/TShark is available and return system info.
    Used by the frontend to show connection status.
    """
    status = {
        "tshark_available": TSHARK_AVAILABLE,
        "tshark_path": TSHARK_PATH,
        "pyshark_available": PYSHARK_AVAILABLE,
        "scapy_available": SCAPY_AVAILABLE,
        "tshark_version": None,
        "interfaces": [],
        "pcap_dir": os.path.abspath(PCAP_DIR),
    }

    # Get TShark version
    if TSHARK_AVAILABLE:
        try:
            result = subprocess.run(
                [TSHARK_PATH, "--version"],
                capture_output=True, text=True, timeout=5
            )
            # First line is like "TShark (Wireshark) 4.2.0 (...)"
            version_line = result.stdout.strip().split("\n")[0]
            status["tshark_version"] = version_line
        except Exception as e:
            log_event(logger, "warning", f"Could not get TShark version: {e}")

    # Get available network interfaces
    status["interfaces"] = list_interfaces()

    return status


def list_interfaces() -> list[dict]:
    """
    List available network interfaces using TShark.
    Returns list of { id, name, description }.
    """
    if not TSHARK_AVAILABLE:
        return []

    try:
        result = subprocess.run(
            [TSHARK_PATH, "-D"],
            capture_output=True, text=True, timeout=10
        )
        interfaces = []
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            # Format: "1. \Device\... (Description)"
            parts = line.strip().split(" ", 1)
            iface_id = parts[0].rstrip(".")
            rest = parts[1] if len(parts) > 1 else ""

            # Extract description from parentheses if present
            desc = rest
            name = rest
            if "(" in rest and ")" in rest:
                name = rest[:rest.index("(")].strip()
                desc = rest[rest.index("(") + 1:rest.index(")")].strip()

            interfaces.append({
                "id": iface_id,
                "name": name,
                "description": desc,
            })
        return interfaces
    except Exception as e:
        log_event(logger, "error", f"Failed to list interfaces: {e}")
        return []


def capture_with_tshark(interface: str = None, count: int = 20,
                        duration: int = 10, save_pcap: bool = True) -> dict:
    """
    Capture live network packets using TShark (Wireshark CLI).

    Args:
        interface: Interface ID/name (None = first available)
        count:     Max packets to capture
        duration:  Max capture duration in seconds
        save_pcap: Whether to save a .pcap file

    Returns:
        dict with:
          packets    — list of parsed packet dicts
          pcap_file  — path to saved PCAP file (if save_pcap=True)
          capture_info — metadata about the capture
    """
    if not TSHARK_AVAILABLE:
        log_event(logger, "warning", "TShark not available — using simulation")
        return {
            "packets": simulate_traffic(count),
            "pcap_file": None,
            "capture_info": {
                "method": "simulation",
                "reason": "TShark not installed",
            }
        }

    # Generate PCAP filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pcap_filename = f"capture_{timestamp}.pcap"
    pcap_path = os.path.join(PCAP_DIR, pcap_filename)

    # Build TShark command
    cmd = [TSHARK_PATH, "-c", str(count), "-a", f"duration:{duration}"]

    if interface:
        cmd.extend(["-i", str(interface)])

    if save_pcap:
        cmd.extend(["-w", pcap_path])

    log_event(logger, "info",
              f"Starting TShark capture: iface={interface}, count={count}, "
              f"duration={duration}s")

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=duration + 15
        )

        if result.returncode != 0 and "Capturing on" not in result.stderr:
            log_event(logger, "error",
                      f"TShark capture failed: {result.stderr.strip()}")
            return {
                "packets": simulate_traffic(count),
                "pcap_file": None,
                "capture_info": {
                    "method": "simulation",
                    "reason": f"TShark error: {result.stderr.strip()[:200]}",
                }
            }

        log_event(logger, "info", f"TShark capture complete: {pcap_path}")

    except subprocess.TimeoutExpired:
        log_event(logger, "warning", "TShark capture timed out")
    except PermissionError:
        log_event(logger, "error",
                  "Permission denied — run as Administrator for live capture")
        return {
            "packets": simulate_traffic(count),
            "pcap_file": None,
            "capture_info": {
                "method": "simulation",
                "reason": "Permission denied — need Administrator",
            }
        }

    # Parse the saved PCAP if PyShark is available
    packets = []
    if save_pcap and os.path.exists(pcap_path) and PYSHARK_AVAILABLE:
        packets = parse_pcap_file(pcap_path)
    elif save_pcap and os.path.exists(pcap_path) and SCAPY_AVAILABLE:
        packets = parse_pcap_with_scapy(pcap_path)

    return {
        "packets": packets,
        "pcap_file": pcap_path if save_pcap and os.path.exists(pcap_path) else None,
        "capture_info": {
            "method": "tshark",
            "interface": interface,
            "packet_count": len(packets),
            "pcap_filename": pcap_filename if save_pcap else None,
            "tshark_path": TSHARK_PATH,
        }
    }


def parse_pcap_file(pcap_path: str, max_packets: int = 200) -> list[dict]:
    """
    Parse a PCAP file using PyShark and extract packet features.

    Args:
        pcap_path: Path to the .pcap file
        max_packets: Maximum number of packets to parse

    Returns:
        List of packet dicts with extracted features
    """
    if not PYSHARK_AVAILABLE:
        log_event(logger, "warning", "PyShark not available — cannot parse PCAP")
        return []

    packets = []
    try:
        cap = pyshark.FileCapture(
            pcap_path,
            tshark_path=TSHARK_PATH,
            keep_packets=False,
        )

        count = 0
        for pkt in cap:
            if count >= max_packets:
                break

            packet_info = _extract_pyshark_packet(pkt)
            if packet_info:
                packets.append(packet_info)
                count += 1

        cap.close()
        log_event(logger, "info",
                  f"Parsed {len(packets)} packets from {pcap_path}")

    except Exception as e:
        log_event(logger, "error", f"Failed to parse PCAP: {e}")

    return packets


def parse_pcap_with_scapy(pcap_path: str, max_packets: int = 200) -> list[dict]:
    """
    Fallback PCAP parser using Scapy when PyShark isn't available.
    """
    if not SCAPY_AVAILABLE:
        return []

    packets = []
    try:
        from scapy.all import rdpcap
        raw_packets = rdpcap(pcap_path, count=max_packets)

        for pkt in raw_packets:
            if IP in pkt:
                proto_num = pkt[IP].proto
                src_port = dst_port = 0

                if TCP in pkt:
                    src_port = pkt[TCP].sport
                    dst_port = pkt[TCP].dport
                elif UDP in pkt:
                    src_port = pkt[UDP].sport
                    dst_port = pkt[UDP].dport

                packets.append({
                    "src_ip": pkt[IP].src,
                    "dst_ip": pkt[IP].dst,
                    "src_port": src_port,
                    "dst_port": dst_port,
                    "protocol": PROTOCOL_MAP.get(proto_num, f"OTHER({proto_num})"),
                    "protocol_code": proto_num,
                    "packet_size": len(pkt),
                    "timestamp": datetime.utcnow().isoformat(),
                    "traffic_type": "captured",
                })

        log_event(logger, "info",
                  f"Scapy parsed {len(packets)} packets from {pcap_path}")

    except Exception as e:
        log_event(logger, "error", f"Scapy PCAP parse failed: {e}")

    return packets


def _extract_pyshark_packet(pkt) -> dict | None:
    """
    Extract structured features from a PyShark packet object.
    """
    try:
        # Must have an IP layer
        if not hasattr(pkt, 'ip'):
            return None

        src_ip = pkt.ip.src
        dst_ip = pkt.ip.dst
        proto_num = int(pkt.ip.proto)
        packet_size = int(pkt.length)

        src_port = dst_port = 0

        if hasattr(pkt, 'tcp'):
            src_port = int(pkt.tcp.srcport)
            dst_port = int(pkt.tcp.dstport)
        elif hasattr(pkt, 'udp'):
            src_port = int(pkt.udp.srcport)
            dst_port = int(pkt.udp.dstport)

        # Get the highest layer protocol name from Wireshark dissection
        highest_layer = pkt.highest_layer if hasattr(pkt, 'highest_layer') else "Unknown"

        return {
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": src_port,
            "dst_port": dst_port,
            "protocol": PROTOCOL_MAP.get(proto_num, f"OTHER({proto_num})"),
            "protocol_code": proto_num,
            "packet_size": packet_size,
            "timestamp": datetime.utcnow().isoformat(),
            "highest_layer": highest_layer,
            "traffic_type": "captured",
        }

    except Exception:
        return None


def export_to_pcap(packets_data: list[dict], filename: str = None) -> str | None:
    """
    Export simulated/captured traffic data to a PCAP file for Wireshark.

    Takes the packet dicts from our system and converts them back to
    raw Scapy packets, then writes a .pcap file.

    Args:
        packets_data: List of packet dicts from our traffic system
        filename: Optional custom filename

    Returns:
        Path to the created PCAP file, or None on failure
    """
    if not SCAPY_AVAILABLE:
        log_event(logger, "error", "Scapy required for PCAP export")
        return None

    if not packets_data:
        log_event(logger, "warning", "No packets to export")
        return None

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if not filename:
        filename = f"export_{timestamp}.pcap"

    pcap_path = os.path.join(PCAP_DIR, filename)

    try:
        scapy_packets = []
        for pkt_data in packets_data:
            # Build the Scapy packet from our dict representation
            ip_layer = IP(
                src=pkt_data.get("src_ip", "0.0.0.0"),
                dst=pkt_data.get("dst_ip", "0.0.0.0"),
            )

            proto = pkt_data.get("protocol", "TCP")
            src_port = pkt_data.get("src_port", 0)
            dst_port = pkt_data.get("dst_port", 0)
            pkt_size = pkt_data.get("packet_size", 64)

            if proto == "TCP":
                transport = TCP(sport=src_port, dport=dst_port)
            elif proto == "UDP":
                transport = UDP(sport=src_port, dport=dst_port)
            elif proto == "ICMP":
                transport = ICMP()
            else:
                transport = TCP(sport=src_port, dport=dst_port)

            # Add a payload to reach the target packet size
            header_size = len(Ether() / ip_layer / transport)
            payload_size = max(0, pkt_size - header_size)
            payload = Raw(load=b"\x00" * payload_size)

            full_pkt = Ether() / ip_layer / transport / payload
            scapy_packets.append(full_pkt)

        wrpcap(pcap_path, scapy_packets)
        log_event(logger, "info",
                  f"Exported {len(scapy_packets)} packets to {pcap_path}")
        return pcap_path

    except Exception as e:
        log_event(logger, "error", f"PCAP export failed: {e}")
        return None


def list_pcap_files() -> list[dict]:
    """
    List all saved PCAP files in the captures directory.

    Returns:
        List of dicts with filename, size, and creation time
    """
    files = []
    try:
        for f in os.listdir(PCAP_DIR):
            if f.endswith('.pcap'):
                path = os.path.join(PCAP_DIR, f)
                stat = os.stat(path)
                files.append({
                    "filename": f,
                    "path": path,
                    "size_bytes": stat.st_size,
                    "size_display": _format_size(stat.st_size),
                    "created": datetime.fromtimestamp(
                        stat.st_ctime).isoformat(),
                })
        files.sort(key=lambda x: x["created"], reverse=True)
    except Exception as e:
        log_event(logger, "error", f"Failed to list PCAP files: {e}")

    return files


def _format_size(size_bytes: int) -> str:
    """Human-readable file size."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def open_in_wireshark(pcap_path: str) -> bool:
    """
    Open a PCAP file in Wireshark GUI (if installed).

    Args:
        pcap_path: Path to the .pcap file

    Returns:
        True if successfully launched, False otherwise
    """
    wireshark_path = None
    candidates = [
        shutil.which("wireshark"),
        r"C:\Program Files\Wireshark\Wireshark.exe",
        r"C:\Program Files (x86)\Wireshark\Wireshark.exe",
    ]

    for c in candidates:
        if c and os.path.isfile(c):
            wireshark_path = c
            break

    if not wireshark_path:
        log_event(logger, "error", "Wireshark GUI not found")
        return False

    if not os.path.exists(pcap_path):
        log_event(logger, "error", f"PCAP file not found: {pcap_path}")
        return False

    try:
        subprocess.Popen([wireshark_path, pcap_path])
        log_event(logger, "info", f"Opened {pcap_path} in Wireshark")
        return True
    except Exception as e:
        log_event(logger, "error", f"Failed to open Wireshark: {e}")
        return False


# ===========================================================================
# Quick Self-Test
# ===========================================================================
if __name__ == "__main__":
    print("=== Network Monitor — Self-Test ===\n")

    # Wireshark status
    ws = get_wireshark_status()
    print(f"  TShark: {'✅ ' + (ws['tshark_version'] or '') if ws['tshark_available'] else '❌ Not found'}")
    print(f"  PyShark: {'✅ Available' if ws['pyshark_available'] else '❌ Not installed'}")
    print(f"  Scapy: {'✅ Available' if ws['scapy_available'] else '❌ Not installed'}")
    if ws["interfaces"]:
        print(f"  Interfaces: {len(ws['interfaces'])} found")
        for iface in ws["interfaces"][:5]:
            print(f"    {iface['id']}: {iface['description']}")

    # Simulate traffic
    print("\n--- Simulated Traffic ---")
    traffic = simulate_traffic(15)
    for pkt in traffic:
        flag = "⚠️" if pkt.get("traffic_type") == "malicious" else "✅"
        print(f"  {flag} {pkt['src_ip']:>15} → {pkt['dst_ip']:<18} "
              f"{pkt['protocol']:<4}  {pkt['packet_size']:>5}B  "
              f"{pkt.get('attack_type', 'normal')}")

    # Export to PCAP
    print("\n--- PCAP Export ---")
    pcap = export_to_pcap(traffic)
    if pcap:
        print(f"  ✅ Exported to: {pcap}")
    else:
        print("  ❌ Export failed")

    # Device statuses
    print("\n--- Device Statuses ---")
    for d in get_device_status(traffic):
        print(f"  {d['name']:<20} {d['status']:<12} "
              f"({d['threat_count']}/{d['total_packets']} threats)")

