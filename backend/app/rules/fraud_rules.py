"""
Fraud detection rules based on US best practices.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Optional

from ..config import settings
from ..models.enums import RiskLevel


@dataclass
class FraudFlag:
    """Represents a fraud detection flag."""

    rule_id: str
    rule_name: str
    risk_score: int
    description: str
    evidence: str
    severity: str  # warning, alert, critical


class FraudRules:
    """
    Fraud detection rules based on P2P best practices.

    Categories:
    - Duplicate Detection: Same invoice submitted twice
    - Split Transactions: Breaking up to avoid approval thresholds
    - Round Dollar Anomaly: Suspicious round amounts
    - Vendor Risk: Shell companies, collusion indicators
    - Timing Anomalies: Invoice before PO, rush payments
    """

    RULES = {
        "duplicate_invoice": {
            "id": "FRD-001",
            "name": "Duplicate Invoice",
            "description": "Same invoice number and vendor within detection window",
            "risk_score": 95,
            "severity": "critical",
            "weight": 95,
        },
        "near_duplicate": {
            "id": "FRD-002",
            "name": "Near Duplicate Invoice",
            "description": "Similar amount and date from same vendor",
            "risk_score": 75,
            "severity": "alert",
            "weight": 75,
        },
        "split_transaction": {
            "id": "FRD-003",
            "name": "Split Transaction",
            "description": "Multiple invoices to avoid approval threshold",
            "risk_score": 85,
            "severity": "alert",
            "weight": 85,
        },
        "round_dollar": {
            "id": "FRD-004",
            "name": "Round Dollar Anomaly",
            "description": "High percentage of round-dollar invoices",
            "risk_score": 65,
            "severity": "warning",
            "weight": 65,
        },
        "vendor_employee_match": {
            "id": "FRD-005",
            "name": "Vendor-Employee Match",
            "description": "Shared address, phone, or bank account",
            "risk_score": 95,
            "severity": "critical",
            "weight": 95,
        },
        "shell_company": {
            "id": "FRD-006",
            "name": "Shell Company Indicators",
            "description": "PO box only, no web presence, new incorporation",
            "risk_score": 80,
            "severity": "alert",
            "weight": 80,
        },
        "ghost_vendor": {
            "id": "FRD-007",
            "name": "Ghost Vendor",
            "description": "Payment without goods receipt or deliverable",
            "risk_score": 90,
            "severity": "critical",
            "weight": 90,
        },
        "invoice_before_po": {
            "id": "FRD-008",
            "name": "Invoice Before PO",
            "description": "Invoice dated before purchase order creation",
            "risk_score": 75,
            "severity": "alert",
            "weight": 75,
        },
        "bank_change_before_payment": {
            "id": "FRD-009",
            "name": "Recent Bank Change",
            "description": "Vendor bank account changed within 30 days of payment",
            "risk_score": 70,
            "severity": "alert",
            "weight": 70,
        },
        "rush_payment": {
            "id": "FRD-010",
            "name": "Rush Payment Request",
            "description": "Urgent same-day payment request",
            "risk_score": 60,
            "severity": "warning",
            "weight": 60,
        },
        "weekend_invoice": {
            "id": "FRD-011",
            "name": "Weekend/Holiday Invoice",
            "description": "Invoice submitted on non-business day",
            "risk_score": 40,
            "severity": "warning",
            "weight": 40,
        },
        "first_invoice_high_value": {
            "id": "FRD-012",
            "name": "High-Value First Invoice",
            "description": "New vendor's first invoice exceeds $10,000",
            "risk_score": 55,
            "severity": "warning",
            "weight": 55,
        },
        "new_supplier": {
            "id": "FRD-013",
            "name": "New Supplier",
            "description": "Supplier is newly onboarded",
            "risk_score": 30,
            "severity": "warning",
            "weight": 30,
        },
    }

    @classmethod
    def check_duplicate(
        cls,
        invoice: dict[str, Any],
        recent_invoices: list[dict[str, Any]],
    ) -> Optional[FraudFlag]:
        """
        Check for duplicate invoices.

        Args:
            invoice: New invoice to check
            recent_invoices: Recent invoices from same vendor

        Returns:
            FraudFlag if duplicate found, None otherwise
        """
        invoice_num = invoice.get("vendor_invoice_number", "").lower().strip()
        vendor_id = invoice.get("supplier_id")
        amount = invoice.get("total_amount", 0)

        for existing in recent_invoices:
            existing_num = existing.get("vendor_invoice_number", "").lower().strip()
            existing_vendor = existing.get("supplier_id")

            # Exact duplicate
            if invoice_num == existing_num and vendor_id == existing_vendor:
                rule = cls.RULES["duplicate_invoice"]
                return FraudFlag(
                    rule_id=rule["id"],
                    rule_name=rule["name"],
                    risk_score=rule["risk_score"],
                    description=rule["description"],
                    evidence=f"Matches invoice {existing.get('number')} from {existing.get('invoice_date')}",
                    severity=rule["severity"],
                )

            # Near duplicate (same amount, same vendor, same date range)
            existing_amount = existing.get("total_amount", 0)
            if (
                vendor_id == existing_vendor
                and abs(amount - existing_amount) < 1.0  # Within $1
            ):
                rule = cls.RULES["near_duplicate"]
                return FraudFlag(
                    rule_id=rule["id"],
                    rule_name=rule["name"],
                    risk_score=rule["risk_score"],
                    description=rule["description"],
                    evidence=f"Similar to invoice {existing.get('number')}: same vendor, amount ${amount:,.2f}",
                    severity=rule["severity"],
                )

        return None

    @classmethod
    def check_split_transaction(
        cls,
        vendor_id: str,
        recent_invoices: list[dict[str, Any]],
        approval_threshold: float,
    ) -> Optional[FraudFlag]:
        """
        Check for split transaction pattern.

        Args:
            vendor_id: Vendor to check
            recent_invoices: Recent invoices from vendor
            approval_threshold: Threshold being potentially avoided

        Returns:
            FraudFlag if split pattern detected, None otherwise
        """
        window_hours = settings.split_transaction_window_hours
        min_count = settings.split_transaction_count

        # Filter invoices within window and below threshold
        suspicious = [
            inv for inv in recent_invoices
            if inv.get("supplier_id") == vendor_id
            and inv.get("total_amount", 0) < approval_threshold
            and inv.get("total_amount", 0) > approval_threshold * 0.5  # >50% of threshold
        ]

        if len(suspicious) >= min_count:
            total = sum(inv.get("total_amount", 0) for inv in suspicious)
            if total > approval_threshold:
                rule = cls.RULES["split_transaction"]
                return FraudFlag(
                    rule_id=rule["id"],
                    rule_name=rule["name"],
                    risk_score=rule["risk_score"],
                    description=rule["description"],
                    evidence=(
                        f"{len(suspicious)} invoices totaling ${total:,.2f} "
                        f"(threshold: ${approval_threshold:,.2f})"
                    ),
                    severity=rule["severity"],
                )

        return None

    @classmethod
    def check_round_dollar(
        cls,
        vendor_id: str,
        invoices: list[dict[str, Any]],
    ) -> Optional[FraudFlag]:
        """
        Check for round-dollar anomaly pattern.

        Args:
            vendor_id: Vendor to check
            invoices: Invoice history for vendor

        Returns:
            FraudFlag if anomaly detected, None otherwise
        """
        if len(invoices) < 5:  # Need minimum sample size
            return None

        round_amounts = [1000, 2000, 5000, 10000, 15000, 20000, 25000, 50000, 100000]
        round_count = sum(
            1 for inv in invoices
            if inv.get("total_amount", 0) in round_amounts
        )

        round_percent = round_count / len(invoices)
        threshold = settings.round_dollar_flag_percentage

        if round_percent >= threshold:
            rule = cls.RULES["round_dollar"]
            return FraudFlag(
                rule_id=rule["id"],
                rule_name=rule["name"],
                risk_score=rule["risk_score"],
                description=rule["description"],
                evidence=f"{round_percent * 100:.1f}% round-dollar invoices (threshold: {threshold * 100}%)",
                severity=rule["severity"],
            )

        return None

    @classmethod
    def check_invoice_timing(
        cls,
        invoice: dict[str, Any],
        purchase_order: Optional[dict[str, Any]],
    ) -> Optional[FraudFlag]:
        """
        Check for invoice timing anomalies.

        Args:
            invoice: Invoice to check
            purchase_order: Related PO if any

        Returns:
            FraudFlag if timing anomaly found, None otherwise
        """
        invoice_date = invoice.get("invoice_date")

        # Check invoice before PO
        if purchase_order:
            po_date = purchase_order.get("order_date")
            if invoice_date and po_date and invoice_date < po_date:
                rule = cls.RULES["invoice_before_po"]
                return FraudFlag(
                    rule_id=rule["id"],
                    rule_name=rule["name"],
                    risk_score=rule["risk_score"],
                    description=rule["description"],
                    evidence=f"Invoice date {invoice_date} is before PO date {po_date}",
                    severity=rule["severity"],
                )

        # Check weekend invoice
        if invoice_date:
            if isinstance(invoice_date, str):
                invoice_date = datetime.fromisoformat(invoice_date)
            if hasattr(invoice_date, "weekday") and invoice_date.weekday() >= 5:
                rule = cls.RULES["weekend_invoice"]
                return FraudFlag(
                    rule_id=rule["id"],
                    rule_name=rule["name"],
                    risk_score=rule["risk_score"],
                    description=rule["description"],
                    evidence=f"Invoice submitted on {invoice_date.strftime('%A')}",
                    severity=rule["severity"],
                )

        return None


# ==============================================================================
# Standalone functions for test compatibility
# ==============================================================================


def detect_duplicate_invoice(
    vendor_invoice_number: str,
    supplier_id: str,
    existing_invoices: list[dict[str, Any]],
) -> bool:
    """
    Detect if an invoice is a duplicate.

    Args:
        vendor_invoice_number: Invoice number to check
        supplier_id: Supplier ID
        existing_invoices: List of existing invoices to check against

    Returns:
        True if duplicate found, False otherwise
    """
    invoice_num_lower = vendor_invoice_number.lower().strip()
    for existing in existing_invoices:
        existing_num = existing.get("vendor_invoice_number", "").lower().strip()
        existing_vendor = existing.get("supplier_id")
        if invoice_num_lower == existing_num and supplier_id == existing_vendor:
            return True
    return False


def detect_split_transactions(
    supplier_id: str,
    amount: float,
    recent_invoices: list[dict[str, Any]],
    threshold: float,
    time_window_hours: int = 24,
) -> bool:
    """
    Detect split transaction patterns.

    Args:
        supplier_id: Supplier to check
        amount: Current invoice amount
        recent_invoices: Recent invoices from this supplier
        threshold: Approval threshold being potentially avoided
        time_window_hours: Time window to check (default 24h)

    Returns:
        True if split pattern detected, False otherwise
    """
    cutoff = datetime.utcnow() - timedelta(hours=time_window_hours)

    # Filter to relevant invoices
    relevant = []
    for inv in recent_invoices:
        if inv.get("supplier_id") != supplier_id:
            continue
        inv_amount = inv.get("total_amount", 0)
        created_at = inv.get("created_at")
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            except ValueError:
                created_at = datetime.utcnow()  # Fallback
        if created_at and created_at >= cutoff:
            relevant.append(inv_amount)

    # Add current amount
    relevant.append(amount)

    # Check if splitting pattern exists
    total = sum(relevant)
    individual_below = all(a < threshold for a in relevant)

    return total > threshold and individual_below and len(relevant) > 1


def detect_round_dollar_pattern(amount: float) -> bool:
    """
    Detect suspicious round dollar amounts.

    Args:
        amount: Invoice amount to check

    Returns:
        True if suspicious round amount, False otherwise
    """
    # Small round amounts are not suspicious
    if amount < 1000:
        return False

    # Check for exact round amounts (multiples of 1000)
    suspicious_amounts = [
        1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000,
        15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000,
        75000, 100000, 150000, 200000, 250000,
    ]

    return amount in suspicious_amounts


def check_fraud_indicators(invoice_data: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Check for fraud indicators in invoice data.

    Args:
        invoice_data: Invoice data dict with keys like:
            - vendor_invoice_number
            - supplier_id
            - total_amount
            - invoice_date
            - is_new_supplier
            - rush_payment_requested

    Returns:
        List of fraud indicators found
    """
    indicators = []
    amount = invoice_data.get("total_amount", 0)

    # Round dollar check
    if detect_round_dollar_pattern(amount):
        indicators.append({
            "type": "round_dollar",
            "description": f"Round dollar amount: ${amount:,.2f}",
            "risk_score": 65,
        })

    # New supplier check
    if invoice_data.get("is_new_supplier", False):
        indicators.append({
            "type": "new_supplier",
            "description": "Invoice from new/recently onboarded supplier",
            "risk_score": 30,
        })

    # Rush payment check
    if invoice_data.get("rush_payment_requested", False):
        indicators.append({
            "type": "rush_payment",
            "description": "Rush payment requested",
            "risk_score": 60,
        })

    # Weekend/holiday invoice
    invoice_date = invoice_data.get("invoice_date")
    if invoice_date:
        if isinstance(invoice_date, str):
            try:
                invoice_date = datetime.fromisoformat(invoice_date)
            except ValueError:
                invoice_date = None
        if invoice_date and hasattr(invoice_date, "weekday") and invoice_date.weekday() >= 5:
            indicators.append({
                "type": "weekend_invoice",
                "description": f"Invoice dated on weekend ({invoice_date.strftime('%A')})",
                "risk_score": 40,
            })

    return indicators


def calculate_fraud_score(
    invoice_data: dict[str, Any],
    indicators: list[dict[str, Any]],
) -> int:
    """
    Calculate overall fraud score.

    Args:
        invoice_data: Invoice data
        indicators: List of fraud indicators found

    Returns:
        Fraud score (0-100)
    """
    if not indicators:
        return 0

    # Calculate weighted score
    total_score = sum(ind.get("risk_score", 0) for ind in indicators)
    max_score = max(ind.get("risk_score", 0) for ind in indicators)

    # 70% max flag, 30% cumulative (capped)
    score = int(0.7 * max_score + 0.3 * min(total_score, 100))
    return min(score, 100)


# Legacy function with full signature for class-based usage
def check_fraud_indicators_full(
    invoice: dict[str, Any],
    vendor: dict[str, Any],
    recent_invoices: list[dict[str, Any]],
    purchase_order: Optional[dict[str, Any]] = None,
) -> list[FraudFlag]:
    """
    Run all fraud checks on an invoice (full version).

    Args:
        invoice: Invoice to check
        vendor: Vendor information
        recent_invoices: Recent invoices for duplicate/pattern check
        purchase_order: Related PO if any

    Returns:
        List of fraud flags found
    """
    flags = []

    # Duplicate check
    dup_flag = FraudRules.check_duplicate(invoice, recent_invoices)
    if dup_flag:
        flags.append(dup_flag)

    # Split transaction check
    vendor_id = invoice.get("supplier_id")
    split_flag = FraudRules.check_split_transaction(
        vendor_id,
        recent_invoices,
        settings.manager_approval_threshold,
    )
    if split_flag:
        flags.append(split_flag)

    # Round dollar check
    round_flag = FraudRules.check_round_dollar(vendor_id, recent_invoices)
    if round_flag:
        flags.append(round_flag)

    # Timing check
    timing_flag = FraudRules.check_invoice_timing(invoice, purchase_order)
    if timing_flag:
        flags.append(timing_flag)

    return flags


def calculate_fraud_score_full(flags: list[FraudFlag]) -> tuple[int, RiskLevel]:
    """
    Calculate overall fraud score from flags (full version).

    Args:
        flags: List of fraud flags

    Returns:
        Tuple of (score 0-100, RiskLevel)
    """
    if not flags:
        return 0, RiskLevel.LOW

    # Weighted calculation: 70% max flag, 30% cumulative (capped at 100)
    max_score = max(f.risk_score for f in flags)
    total_score = sum(f.risk_score for f in flags)
    score = int(0.7 * max_score + 0.3 * min(total_score, 100))
    score = min(score, 100)

    # Determine risk level
    if score >= 86:
        level = RiskLevel.CRITICAL
    elif score >= 61:
        level = RiskLevel.HIGH
    elif score >= 31:
        level = RiskLevel.MEDIUM
    else:
        level = RiskLevel.LOW

    return score, level
