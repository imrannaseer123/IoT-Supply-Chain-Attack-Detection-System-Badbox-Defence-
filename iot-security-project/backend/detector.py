"""
=============================================================================
 AI Threat Detector — BadBox Defense System
=============================================================================
 Uses an Isolation Forest model (unsupervised anomaly detection) to classify
 network traffic as NORMAL (1) or ANOMALOUS (-1).

 Features used for detection:
   1. packet_size        — size of the captured packet in bytes
   2. protocol_code      — numeric encoding of protocol (TCP=6, UDP=17, …)
   3. src_port           — source port number
   4. dst_port           — destination port number
   5. flow_duration      — duration of flow in seconds (simulated)
   6. packets_per_second — packet rate (simulated)

 The model is trained on a mix of normal IoT traffic and simulated BadBox-
 style malicious traffic (C2 beaconing, large exfiltrations, port scans).
=============================================================================
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import os
from datetime import datetime

# Local imports
from utils.logger import setup_logger, log_event

logger = setup_logger("Detector")

# ---------------------------------------------------------------------------
# Path for the persisted model
# ---------------------------------------------------------------------------
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")


# ===========================================================================
# Data Simulation
# ===========================================================================

def generate_normal_traffic(n: int = 800) -> np.ndarray:
    """
    Simulate normal IoT device traffic.
    Characteristics:
      - Small packets (64-512 bytes)
      - Common IoT ports (80, 443, 8883-MQTT, 5683-CoAP)
      - Low packet rate
    """
    rng = np.random.RandomState(42)
    data = np.column_stack([
        rng.randint(64, 512, size=n),           # packet_size
        rng.choice([6, 17], size=n),             # protocol (TCP / UDP)
        rng.randint(1024, 65535, size=n),         # src_port (ephemeral)
        rng.choice([80, 443, 8883, 5683], size=n),# dst_port (IoT services)
        rng.uniform(0.1, 5.0, size=n),            # flow_duration (seconds)
        rng.uniform(1, 20, size=n),               # packets_per_second
    ])
    return data.astype(float)


def generate_malicious_traffic(n: int = 200) -> np.ndarray:
    """
    Simulate BadBox 2.0-style malicious traffic.
    Characteristics:
      - Large packets (C2 exfiltration: 1000-9000 bytes)
      - Unusual ports (4444, 6667, 31337 — common in malware)
      - High packet rate (beaconing / DDoS)
    """
    rng = np.random.RandomState(99)
    data = np.column_stack([
        rng.randint(1000, 9000, size=n),          # packet_size (large)
        rng.choice([6, 17, 1], size=n),            # protocol (incl. ICMP=1)
        rng.randint(1024, 65535, size=n),           # src_port
        rng.choice([4444, 6667, 31337, 9999], size=n),  # dst_port (malware)
        rng.uniform(0.001, 0.5, size=n),           # flow_duration (fast bursts)
        rng.uniform(50, 500, size=n),              # packets_per_second (high)
    ])
    return data.astype(float)


# ===========================================================================
# Training
# ===========================================================================

def train_model(contamination: float = 0.2) -> tuple:
    """
    Train an Isolation Forest on the combined dataset.

    Args:
        contamination: expected proportion of anomalies (default 20%)

    Returns:
        (model, scaler) — fitted Isolation Forest and StandardScaler
    """
    log_event(logger, "info", "Generating training data...")

    normal = generate_normal_traffic(800)
    malicious = generate_malicious_traffic(200)
    X = np.vstack([normal, malicious])

    log_event(logger, "info",
              f"Training samples: {len(normal)} normal + {len(malicious)} malicious = {len(X)} total")

    # Scale features for better model performance
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train the Isolation Forest
    model = IsolationForest(
        n_estimators=150,          # number of trees
        contamination=contamination,
        max_samples='auto',
        random_state=42,
        n_jobs=-1                  # use all CPU cores
    )
    model.fit(X_scaled)

    # Persist model and scaler to disk
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)

    log_event(logger, "info", f"Model saved to {MODEL_PATH}")
    return model, scaler


# ===========================================================================
# Prediction
# ===========================================================================

def load_model() -> tuple:
    """
    Load a previously trained model and scaler from disk.
    If no model exists, train a new one.

    Returns:
        (model, scaler)
    """
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        log_event(logger, "info", "Model loaded from disk")
    else:
        log_event(logger, "warning", "No saved model found — training new model")
        model, scaler = train_model()
    return model, scaler


def predict(features: list | np.ndarray) -> dict:
    """
    Predict whether a traffic sample is normal or anomalous.

    Args:
        features: list/array of 6 numeric features
                  [packet_size, protocol_code, src_port, dst_port,
                   flow_duration, packets_per_second]

    Returns:
        dict with keys:
          prediction  — 1 (normal) or -1 (anomaly)
          threat_score — float between 0 and 100
          label       — "Normal" / "Suspicious" / "Malicious"
          timestamp   — ISO 8601 string
    """
    model, scaler = load_model()

    sample = np.array(features).reshape(1, -1)
    sample_scaled = scaler.transform(sample)

    # Raw prediction: 1 = normal, -1 = anomaly
    prediction = int(model.predict(sample_scaled)[0])

    # Anomaly score (lower = more anomalous; range roughly -0.5 to 0.5)
    raw_score = model.decision_function(sample_scaled)[0]

    # Map to 0-100 threat score (higher = more dangerous)
    # decision_function returns negative for anomalies, positive for normal
    threat_score = round(max(0, min(100, (0.5 - raw_score) * 100)), 2)

    # Classify by threat level
    if prediction == 1 and threat_score < 30:
        label = "Normal"
    elif prediction == 1 and threat_score < 60:
        label = "Suspicious"
    else:
        label = "Malicious"

    result = {
        "prediction": prediction,
        "threat_score": threat_score,
        "label": label,
        "timestamp": datetime.utcnow().isoformat(),
        "features": {
            "packet_size": features[0],
            "protocol_code": features[1],
            "src_port": features[2],
            "dst_port": features[3],
            "flow_duration": features[4],
            "packets_per_second": features[5],
        }
    }

    log_event(logger, "info" if label == "Normal" else "warning",
              f"Prediction: {label} (score={threat_score})")

    return result


# ===========================================================================
# Bulk Analysis (used by the dashboard for batch scoring)
# ===========================================================================

def analyze_batch(samples: list[list]) -> list[dict]:
    """
    Run prediction on multiple samples at once.

    Args:
        samples: list of feature lists, each with 6 values

    Returns:
        list of prediction dicts
    """
    return [predict(s) for s in samples]


# ===========================================================================
# Quick Self-Test
# ===========================================================================
if __name__ == "__main__":
    print("=== BadBox Defense — Detector Self-Test ===\n")
    train_model()

    # Test with a normal sample
    normal_sample = [128, 6, 50000, 443, 2.5, 10]
    print("\nNormal sample:", predict(normal_sample))

    # Test with a suspicious sample
    suspicious_sample = [5000, 6, 60000, 4444, 0.05, 200]
    print("Malicious sample:", predict(suspicious_sample))
