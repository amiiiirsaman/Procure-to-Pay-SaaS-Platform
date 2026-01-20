"""
Business rules module for P2P Platform.
"""

from .approval_rules import ApprovalRules, get_approval_chain, check_auto_approve
from .fraud_rules import FraudRules, check_fraud_indicators, calculate_fraud_score
from .compliance_rules import (
    ComplianceRules,
    check_segregation_of_duties,
    get_required_documentation,
    validate_three_way_match,
)

__all__ = [
    "ApprovalRules",
    "get_approval_chain",
    "check_auto_approve",
    "FraudRules",
    "check_fraud_indicators",
    "calculate_fraud_score",
    "ComplianceRules",
    "check_segregation_of_duties",
    "get_required_documentation",
    "validate_three_way_match",
]
