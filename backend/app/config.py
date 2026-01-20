"""
Application configuration using dataclass pattern.
Supports environment variables with sensible defaults for development.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

# Load .env file from backend directory - force override existing env vars
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path, override=True)

logger = logging.getLogger(__name__)


@dataclass
class Settings:
    """Application settings with defaults for local development."""

    # Environment
    environment: str = field(
        default_factory=lambda: os.getenv("ENVIRONMENT", "development")
    )

    # Database (SQLite for dev)
    database_url: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL", "sqlite:///./p2p_platform.db"
        )
    )

    # AWS Bedrock
    aws_region: str = field(
        default_factory=lambda: os.getenv("AWS_REGION", "us-east-1")
    )
    bedrock_model_id: str = field(
        default_factory=lambda: os.getenv(
            "BEDROCK_MODEL_ID", "amazon.nova-pro-v1:0"
        )
    )
    
    # Agent configuration - set to True to use mock agents (no AWS calls)
    use_mock_agents: bool = field(
        default_factory=lambda: os.getenv("USE_MOCK_AGENTS", "false").lower() == "true"
    )

    # API Settings
    api_host: str = field(
        default_factory=lambda: os.getenv("API_HOST", "0.0.0.0")
    )
    api_port: int = field(
        default_factory=lambda: int(os.getenv("API_PORT", "8000"))
    )
    api_prefix: str = "/api/v1"

    # CORS
    cors_origins: List[str] = field(
        default_factory=lambda: os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://localhost:5174"
        ).split(",")
    )

    # Debug mode
    debug: bool = field(
        default_factory=lambda: os.getenv("DEBUG", "true").lower() == "true"
    )

    # WebSocket
    websocket_ping_interval: int = 30

    # Business Rules Defaults
    auto_approve_threshold: float = 1000.0  # Auto-approve below $1K
    manager_approval_threshold: float = 5000.0  # Manager up to $5K
    director_approval_threshold: float = 25000.0  # Director up to $25K
    vp_approval_threshold: float = 50000.0  # VP up to $50K
    cfo_approval_threshold: float = 100000.0  # CFO up to $100K

    # Three-way match tolerances
    quantity_tolerance_percent: float = 0.05  # 5%
    price_tolerance_percent: float = 0.02  # 2%
    price_tolerance_absolute: float = 100.0  # $100

    # Fraud detection thresholds
    duplicate_invoice_window_days: int = 30
    round_dollar_flag_percentage: float = 0.40  # 40%+ round amounts
    split_transaction_window_hours: int = 72
    split_transaction_count: int = 3


# Global settings instance
settings = Settings()

# Log the critical settings at startup
logger.info(f"[CONFIG] USE_MOCK_AGENTS = {settings.use_mock_agents}")
logger.info(f"[CONFIG] AWS_REGION = {settings.aws_region}")
logger.info(f"[CONFIG] BEDROCK_MODEL_ID = {settings.bedrock_model_id}")


def get_settings() -> Settings:
    """Get application settings (for dependency injection)."""
    return settings
