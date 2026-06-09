"""
=============================================================================
 Logger Module — BadBox Defense System
=============================================================================
 Provides structured logging for the entire application.
 - Logs to both console and rotating file
 - Color-coded severity levels
 - Timestamps on every entry
=============================================================================
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'logs')
LOG_FILE = os.path.join(LOG_DIR, 'badbox_defense.log')
MAX_BYTES = 5 * 1024 * 1024   # 5 MB per log file
BACKUP_COUNT = 5               # keep 5 rotated copies


def setup_logger(name: str = "BadBoxDefense") -> logging.Logger:
    """
    Create and return a configured logger instance.

    Args:
        name: Logger name (default: "BadBoxDefense")

    Returns:
        logging.Logger — ready-to-use logger
    """
    # Create the logs directory if it doesn't exist
    os.makedirs(LOG_DIR, exist_ok=True)

    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    # Prevent duplicate handlers when called multiple times
    if logger.handlers:
        return logger

    # ----- Formatter -----
    fmt = logging.Formatter(
        "[%(asctime)s] %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # ----- Console Handler (INFO and above) -----
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    console.setFormatter(fmt)
    logger.addHandler(console)

    # ----- File Handler (DEBUG and above, rotating) -----
    file_handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding="utf-8"
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)

    logger.info("Logger initialized — writing to %s", LOG_FILE)
    return logger


def log_event(logger: logging.Logger, level: str, message: str,
              extra: dict | None = None) -> dict:
    """
    Log an event and return a structured dict (useful for storing in MongoDB).

    Args:
        logger:  Logger instance
        level:   "info" | "warning" | "error" | "critical"
        message: Human-readable description
        extra:   Optional metadata dict

    Returns:
        dict with timestamp, level, message, and extra fields
    """
    log_fn = getattr(logger, level.lower(), logger.info)
    log_fn(message)

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "level": level.upper(),
        "message": message,
        "extra": extra or {}
    }
