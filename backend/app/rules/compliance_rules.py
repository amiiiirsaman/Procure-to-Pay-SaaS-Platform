"""
Compliance rules for P2P Platform.
"""

from dataclasses import dataclass
from typing import Any, Optional

from ..config import settings
from ..models.enums import UserRole, DocumentStatus, MatchStatus


@dataclass
class ComplianceViolation:
    """Represents a compliance violation."""

    rule_id: str
    rule_name: str
    severity: str  # warning, error, critical
    description: str
    remediation: str


class ComplianceRules:
    """
    Compliance rules based on US best practices.

    Categories:
    - Segregation of Duties (SOD)
    - Documentation Requirements
    - Three-Way Match Tolerances
    - Audit Trail Requirements
    """

    # Segregation of Duties Matrix
    # Maps action -> allowed roles and conflicting actions
    SOD_MATRIX = {
        "create_requisition": {
            "allowed_roles": [UserRole.REQUESTOR, UserRole.BUYER],
            "conflicting_actions": ["approve_requisition"],
        },
        "approve_requisition": {
            "allowed_roles": [UserRole.PROCUREMENT_MANAGER, UserRole.DIRECTOR, UserRole.VP],
            "conflicting_actions": ["create_requisition"],
        },
        "create_po": {
            "allowed_roles": [UserRole.BUYER, UserRole.PROCUREMENT_MANAGER],
            "conflicting_actions": ["approve_po", "receive_goods"],
        },
        "receive_goods": {
            "allowed_roles": [UserRole.WAREHOUSE],
            "conflicting_actions": ["create_po", "process_invoice"],
        },
        "process_invoice": {
            "allowed_roles": [UserRole.AP_CLERK, UserRole.AP_MANAGER],
            "conflicting_actions": ["approve_invoice", "receive_goods"],
        },
        "approve_payment": {
            "allowed_roles": [UserRole.AP_MANAGER, UserRole.TREASURY, UserRole.FINANCE_CONTROLLER],
            "conflicting_actions": ["process_invoice", "create_po"],
        },
    }

    # Conflicting action pairs (no single person should do both)
    CONFLICT_PAIRS = [
        ("create_requisition", "approve_requisition"),
        ("create_po", "approve_po"),
        ("create_po", "receive_goods"),
        ("receive_goods", "process_invoice"),
        ("process_invoice", "approve_invoice"),
        ("approve_invoice", "release_payment"),
        ("create_vendor", "approve_first_transaction"),
    ]

    # Documentation requirements by tier
    DOCUMENTATION_TIERS = {
        "minimal": {
            "tier": "minimal",
            "min_amount": 0,
            "max_amount": 999.99,
            "required": ["invoice", "requestor_approval"],
            "retention_years": 3,
        },
        "standard": {
            "tier": "standard",
            "min_amount": 1000,
            "max_amount": 24999.99,
            "required": [
                "invoice",
                "purchase_order",
                "manager_approval",
                "goods_receipt",
                "quote",
            ],
            "retention_years": 5,
        },
        "extensive": {
            "tier": "extensive",
            "min_amount": 25000,
            "max_amount": 99999.99,
            "required": [
                "invoice",
                "purchase_order",
                "goods_receipt",
                "competitive_bids",
                "director_approval",
                "budget_confirmation",
            ],
            "retention_years": 7,
        },
        "full_audit": {
            "tier": "full_audit",
            "min_amount": 100000,
            "max_amount": float("inf"),
            "required": [
                "invoice",
                "purchase_order",
                "goods_receipt",
                "formal_rfp",
                "evaluation_committee_scorecard",
                "cfo_approval",
                "legal_review",
                "executed_contract",
                "insurance_certificates",
                "performance_guarantees",
                "board_approval",
            ],
            "retention_years": 10,
        },
    }

    @classmethod
    def get_tier_for_amount(cls, amount: float) -> str:
        """Get documentation tier for amount."""
        for tier_name, tier_info in cls.DOCUMENTATION_TIERS.items():
            min_amt = tier_info["min_amount"]
            max_amt = tier_info["max_amount"]
            if min_amt <= amount <= max_amt:
                return tier_name
        return "full_audit"


# ==============================================================================
# Standalone functions for test compatibility
# ==============================================================================


def validate_separation_of_duties(
    requestor_id: str,
    approver_id: str,
    action: str,
) -> bool:
    """
    Validate separation of duties between requestor and approver.

    Args:
        requestor_id: ID of the user who created/requested
        approver_id: ID of the user attempting to approve
        action: The action being performed (e.g., "approve_requisition")

    Returns:
        True if valid (different users), False if SOD violation
    """
    # Same person cannot create and approve
    return requestor_id != approver_id


def check_segregation_of_duties(
    user_role: UserRole,
    action: str,
    previous_actions: Optional[list[dict[str, Any]]] = None,
) -> tuple[bool, Optional[ComplianceViolation]]:
    """
    Check if action violates segregation of duties.

    Args:
        user_role: Role of user attempting action
        action: Action being attempted
        previous_actions: Previous actions on this transaction

    Returns:
        Tuple of (is_allowed, violation_if_any)
    """
    # Get action config
    action_config = ComplianceRules.SOD_MATRIX.get(action)
    if action_config:
        allowed_roles = action_config.get("allowed_roles", [])
        if user_role not in allowed_roles:
            return False, ComplianceViolation(
                rule_id="SOD-001",
                rule_name="Role Restriction",
                severity="error",
                description=f"Role {user_role.value} cannot perform action: {action}",
                remediation="This action must be performed by a user with appropriate permissions",
            )

    # Check conflict pairs with previous actions
    if previous_actions:
        for prev in previous_actions:
            prev_action = prev.get("action")
            for action1, action2 in ComplianceRules.CONFLICT_PAIRS:
                if (action == action1 and prev_action == action2) or (
                    action == action2 and prev_action == action1
                ):
                    return False, ComplianceViolation(
                        rule_id="SOD-002",
                        rule_name="Conflicting Actions",
                        severity="critical",
                        description=(
                            f"User cannot perform both '{action}' and '{prev_action}' "
                            f"on the same transaction"
                        ),
                        remediation="A different user must complete one of these actions",
                    )

    return True, None


def get_documentation_requirements(amount: float) -> dict[str, Any]:
    """
    Get documentation requirements for a transaction amount.

    Args:
        amount: Transaction amount

    Returns:
        Dict with tier, required documents, and retention period
    """
    for tier_name, tier_info in ComplianceRules.DOCUMENTATION_TIERS.items():
        min_amt = tier_info["min_amount"]
        max_amt = tier_info["max_amount"]
        if min_amt <= amount <= max_amt:
            return {
                "tier": tier_info["tier"],
                "required": tier_info["required"],
                "retention_years": tier_info["retention_years"],
            }
    # Default to full_audit
    full_audit = ComplianceRules.DOCUMENTATION_TIERS["full_audit"]
    return {
        "tier": full_audit["tier"],
        "required": full_audit["required"],
        "retention_years": full_audit["retention_years"],
    }


def get_required_documentation(amount: float) -> dict[str, Any]:
    """
    Get required documentation for a transaction amount.

    Args:
        amount: Transaction amount

    Returns:
        Documentation requirements including list and retention period
    """
    tier_name = ComplianceRules.get_tier_for_amount(amount)
    tier_info = ComplianceRules.DOCUMENTATION_TIERS.get(tier_name, {})

    return {
        "tier": tier_name,
        "required_documents": tier_info.get("required", []),
        "retention_years": tier_info.get("retention_years", 7),
    }


def validate_three_way_match(
    po_data: dict[str, Any],
    gr_data: dict[str, Any],
    invoice_data: dict[str, Any],
) -> dict[str, Any]:
    """
    Validate three-way match between PO, GR, and Invoice.

    Args:
        po_data: Purchase Order data with line_items and total_amount
        gr_data: Goods Receipt data with line_items containing quantity_received
        invoice_data: Invoice data with line_items and total_amount

    Returns:
        Dict with is_matched, quantity_variance, price_variance, violations
    """
    violations = []
    total_qty_variance = 0
    total_price_variance = 0.0

    po_lines = po_data.get("line_items", [])
    gr_lines = gr_data.get("line_items", [])
    invoice_lines = invoice_data.get("line_items", [])

    # Match line by line
    for i, po_line in enumerate(po_lines):
        po_qty = po_line.get("quantity", 0)
        po_price = po_line.get("unit_price", 0)

        gr_qty = 0
        if i < len(gr_lines):
            gr_qty = gr_lines[i].get("quantity_received", 0)

        inv_qty = 0
        inv_price = 0
        if i < len(invoice_lines):
            inv_qty = invoice_lines[i].get("quantity", 0)
            inv_price = invoice_lines[i].get("unit_price", 0)

        # Calculate variances
        qty_diff = abs(inv_qty - gr_qty)
        total_qty_variance += qty_diff

        price_diff = abs(inv_price - po_price)
        total_price_variance += price_diff

        # Check tolerances
        qty_tolerance = settings.quantity_tolerance_percent
        price_tolerance_pct = settings.price_tolerance_percent
        price_tolerance_abs = settings.price_tolerance_absolute

        if gr_qty > 0:
            qty_variance_pct = qty_diff / gr_qty
            if qty_variance_pct > qty_tolerance:
                violations.append({
                    "type": "quantity_mismatch",
                    "line": i + 1,
                    "po_qty": po_qty,
                    "gr_qty": gr_qty,
                    "inv_qty": inv_qty,
                    "variance_pct": qty_variance_pct,
                })

        if po_price > 0:
            price_variance_pct = price_diff / po_price
            if price_variance_pct > price_tolerance_pct and price_diff > price_tolerance_abs:
                violations.append({
                    "type": "price_mismatch",
                    "line": i + 1,
                    "po_price": po_price,
                    "inv_price": inv_price,
                    "variance_pct": price_variance_pct,
                })

    is_matched = len(violations) == 0

    return {
        "is_matched": is_matched,
        "quantity_variance": total_qty_variance,
        "price_variance": total_price_variance,
        "violations": violations,
    }


def check_pre_payment_compliance(invoice_data: dict[str, Any]) -> dict[str, Any]:
    """
    Check pre-payment compliance requirements.

    Args:
        invoice_data: Invoice data dict with keys:
            - status: DocumentStatus
            - match_status: MatchStatus
            - fraud_score: int
            - on_hold: bool
            - has_all_approvals: bool

    Returns:
        Dict with can_pay (bool) and blockers (list of strings)
    """
    blockers = []

    # Check status
    status = invoice_data.get("status")
    if status != DocumentStatus.APPROVED:
        blockers.append("not_approved")

    # Check match status
    match_status = invoice_data.get("match_status")
    if match_status == MatchStatus.EXCEPTION:
        blockers.append("match_exception")

    # Check fraud score
    fraud_score = invoice_data.get("fraud_score", 0)
    if fraud_score >= 50:
        blockers.append("high_fraud_score")

    # Check on hold
    if invoice_data.get("on_hold", False):
        blockers.append("on_hold")

    # Check approvals
    if not invoice_data.get("has_all_approvals", False):
        blockers.append("missing_approvals")

    return {
        "can_pay": len(blockers) == 0,
        "blockers": blockers,
    }


def check_pre_payment_compliance_full(
    invoice: dict[str, Any],
    vendor: dict[str, Any],
    approvals: list[dict[str, Any]],
    three_way_matched: bool,
) -> tuple[bool, list[ComplianceViolation]]:
    """
    Perform pre-payment compliance checks (full version).

    Args:
        invoice: Invoice to be paid
        vendor: Vendor information
        approvals: List of approvals obtained
        three_way_matched: Whether 3-way match passed

    Returns:
        Tuple of (can_proceed, violations)
    """
    violations = []

    # Check vendor is approved
    if vendor.get("status") != "active":
        violations.append(
            ComplianceViolation(
                rule_id="PPC-001",
                rule_name="Inactive Vendor",
                severity="critical",
                description=f"Vendor status is '{vendor.get('status')}', not 'active'",
                remediation="Vendor must be activated before payment",
            )
        )

    # Check vendor bank is verified
    if not vendor.get("bank_verified", False):
        violations.append(
            ComplianceViolation(
                rule_id="PPC-002",
                rule_name="Unverified Bank Account",
                severity="critical",
                description="Vendor bank account has not been verified",
                remediation="Complete bank verification callback before payment",
            )
        )

    # Check three-way match
    if not three_way_matched:
        violations.append(
            ComplianceViolation(
                rule_id="PPC-003",
                rule_name="Three-Way Match Failed",
                severity="error",
                description="Invoice has not passed three-way match",
                remediation="Resolve match exceptions before payment",
            )
        )

    # Check approvals
    amount = invoice.get("total_amount", 0)
    required_docs = get_required_documentation(amount)
    if "manager_approval" in required_docs["required_documents"]:
        has_approval = any(a.get("status") == "approved" for a in approvals)
        if not has_approval:
            violations.append(
                ComplianceViolation(
                    rule_id="PPC-004",
                    rule_name="Missing Approval",
                    severity="error",
                    description="Required approval not obtained",
                    remediation="Obtain required approvals before payment",
                )
            )

    # Check for hold
    if invoice.get("on_hold", False):
        violations.append(
            ComplianceViolation(
                rule_id="PPC-005",
                rule_name="Invoice On Hold",
                severity="error",
                description=f"Invoice on hold: {invoice.get('hold_reason', 'Unknown')}",
                remediation="Remove hold before processing payment",
            )
        )

    can_proceed = len([v for v in violations if v.severity in ["error", "critical"]]) == 0
    return can_proceed, violations
