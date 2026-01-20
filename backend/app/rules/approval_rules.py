"""
Approval routing rules based on US best practices (Coupa-style).
"""

from dataclasses import dataclass
from typing import Any, Optional

from ..config import settings
from ..models.enums import UserRole, Department


@dataclass
class ApprovalTier:
    """Represents an approval tier with amount range and approver role."""

    tier: int
    min_amount: float
    max_amount: float
    approver_role: UserRole
    description: str
    sla_hours: int = 24


class ApprovalRules:
    """
    Approval routing rules based on US best practices.

    Tier structure (Coupa-style):
    - auto_approve: <$1K - Auto-approve for approved vendors
    - manager: $1K-$5K - Manager approval
    - director: $5K-$25K - Director approval
    - vp: $25K-$50K - VP + Finance review
    - svp: $50K-$100K - SVP/CFO approval
    - executive: >$100K - CEO/Board approval
    """

    # Dict-based TIERS for test compatibility
    TIERS = {
        "auto_approve": {
            "tier": "auto_approve",
            "min_amount": 0,
            "max_amount": 1000,
            "approver_role": UserRole.REQUESTOR,
            "description": "Auto-approve",
            "sla_hours": 0,
        },
        "manager": {
            "tier": "manager",
            "min_amount": 1000,
            "max_amount": 5000,
            "approver_role": UserRole.MANAGER,
            "description": "Manager",
            "sla_hours": 24,
        },
        "director": {
            "tier": "director",
            "min_amount": 5000,
            "max_amount": 25000,
            "approver_role": UserRole.DIRECTOR,
            "description": "Director",
            "sla_hours": 48,
        },
        "vp": {
            "tier": "vp",
            "min_amount": 25000,
            "max_amount": 50000,
            "approver_role": UserRole.VP,
            "description": "VP + Finance",
            "sla_hours": 72,
        },
        "svp": {
            "tier": "svp",
            "min_amount": 50000,
            "max_amount": 100000,
            "approver_role": UserRole.CFO,
            "description": "SVP/CFO",
            "sla_hours": 120,
        },
        "executive": {
            "tier": "executive",
            "min_amount": 100000,
            "max_amount": float("inf"),
            "approver_role": UserRole.CEO,
            "description": "CEO/Board",
            "sla_hours": 168,
        },
    }

    # Department-specific overrides
    DEPARTMENT_OVERRIDES = {
        Department.IT: {
            "software_threshold_multiplier": 1.5,
            "hardware_requires_security_review_above": 10000,
            "auto_approve_vendors": ["Microsoft", "AWS", "Google", "Adobe"],
        },
        Department.MARKETING: {
            "advertising_requires_cmo_above": 25000,
            "event_requires_legal_above": 50000,
        },
        Department.LEGAL: {
            "outside_counsel_requires_gc": True,
            "settlement_requires_cfo": True,
            "settlement_requires_ceo_above": 100000,
        },
        Department.RD: {
            "prototype_expedited": True,
            "threshold_multiplier": 1.25,
        },
    }

    # Emergency approval limits (multiplier of normal limit)
    EMERGENCY_MULTIPLIER = 2.0

    @classmethod
    def get_tier(cls, amount: float) -> dict[str, Any]:
        """Get the approval tier for a given amount."""
        for tier_name, tier_info in cls.TIERS.items():
            if tier_info["min_amount"] <= amount < tier_info["max_amount"]:
                return tier_info
        return cls.TIERS["executive"]

    @classmethod
    def get_tier_for_department(
        cls,
        amount: float,
        department: Optional[Department] = None,
    ) -> dict[str, Any]:
        """
        Get the approval tier for a given amount and department.

        Args:
            amount: Transaction amount
            department: Requestor's department

        Returns:
            Tier configuration dict
        """
        # Base tier determination
        tier = cls.get_tier(amount)

        # Apply department multipliers if applicable
        if department and department in cls.DEPARTMENT_OVERRIDES:
            overrides = cls.DEPARTMENT_OVERRIDES[department]
            multiplier = overrides.get("threshold_multiplier", 1.0)
            if multiplier != 1.0:
                # Recalculate with multiplied amount
                effective_amount = amount / multiplier
                tier = cls.get_tier(effective_amount)

        return tier

    @classmethod
    def get_required_approvers(
        cls,
        amount: float,
        department: Optional[Department] = None,
        is_emergency: bool = False,
    ) -> list[dict]:
        """
        Get list of required approvers for an amount.

        Args:
            amount: Transaction amount
            department: Requestor's department
            is_emergency: Whether this is an emergency request

        Returns:
            List of approver requirements
        """
        tier = cls.get_tier(amount)
        approvers = []

        # Check auto-approve
        if tier["tier"] == "auto_approve" and not is_emergency:
            return [{"role": "auto", "reason": "Below auto-approve threshold"}]

        # Build approval chain up to required tier
        tier_order = ["manager", "director", "vp", "svp", "executive"]
        target_idx = tier_order.index(tier["tier"]) if tier["tier"] in tier_order else -1

        for i, tier_name in enumerate(tier_order):
            if i <= target_idx:
                t = cls.TIERS[tier_name]
                approvers.append({
                    "step": i + 1,
                    "role": t["approver_role"],
                    "description": t["description"],
                    "sla_hours": t["sla_hours"],
                })

        # Add department-specific requirements
        if department and department in cls.DEPARTMENT_OVERRIDES:
            overrides = cls.DEPARTMENT_OVERRIDES[department]
            approvers = cls._apply_department_overrides(
                approvers, amount, department, overrides
            )

        return approvers

    @classmethod
    def _apply_department_overrides(
        cls,
        approvers: list[dict],
        amount: float,
        department: Department,
        overrides: dict,
    ) -> list[dict]:
        """Apply department-specific approval overrides."""
        result = approvers.copy()

        # IT: Security review for hardware
        if department == Department.IT:
            if amount >= overrides.get("hardware_requires_security_review_above", float("inf")):
                result.append({
                    "step": len(result) + 1,
                    "role": "it_security",
                    "description": "IT Security Review",
                    "sla_hours": 48,
                })

        # Marketing: CMO for advertising
        if department == Department.MARKETING:
            if amount >= overrides.get("advertising_requires_cmo_above", float("inf")):
                result.append({
                    "step": len(result) + 1,
                    "role": "cmo",
                    "description": "CMO Approval (Advertising)",
                    "sla_hours": 48,
                })

        # Legal: General Counsel requirements
        if department == Department.LEGAL:
            if overrides.get("outside_counsel_requires_gc"):
                result.append({
                    "step": len(result) + 1,
                    "role": "general_counsel",
                    "description": "General Counsel Approval",
                    "sla_hours": 72,
                })

        return result


# ==============================================================================
# Standalone functions for test compatibility
# ==============================================================================


def get_required_approval_tier(amount: float) -> dict[str, Any]:
    """
    Get the required approval tier for a given amount.

    Args:
        amount: Transaction amount

    Returns:
        Dict with tier info including 'tier', 'min_amount', 'max_amount'
    """
    return ApprovalRules.get_tier(amount)


def get_approval_chain(
    amount: float,
    department: Optional[Department] = None,
    is_emergency: bool = False,
) -> list[dict]:
    """
    Convenience function to get approval chain.

    Args:
        amount: Transaction amount
        department: Requestor's department
        is_emergency: Whether emergency request

    Returns:
        List of required approvers
    """
    return ApprovalRules.get_required_approvers(amount, department, is_emergency)


def check_auto_approve(
    amount: float,
    vendor_approved: bool = True,
    vendor_name: Optional[str] = None,
    department: Optional[Department] = None,
) -> bool:
    """
    Check if a transaction qualifies for auto-approval.

    Args:
        amount: Transaction amount
        vendor_approved: Whether vendor is on approved list
        vendor_name: Vendor name (for department-specific auto-approve)
        department: Requestor's department

    Returns:
        True if auto-approve is allowed, False otherwise
    """
    # Check amount threshold
    if amount > settings.auto_approve_threshold:
        return False

    # Check vendor approval
    if not vendor_approved:
        return False

    # Check department-specific auto-approve vendors
    if department and vendor_name:
        overrides = ApprovalRules.DEPARTMENT_OVERRIDES.get(department, {})
        auto_vendors = overrides.get("auto_approve_vendors", [])
        if auto_vendors and vendor_name in auto_vendors:
            return True

    return True


def calculate_sla_deadline(tier: int, is_emergency: bool = False) -> int:
    """
    Calculate SLA deadline in hours for approval.

    Args:
        tier: Approval tier
        is_emergency: Whether emergency request

    Returns:
        Hours until SLA deadline
    """
    tier_names = ["auto_approve", "manager", "director", "vp", "svp", "executive"]
    tier_name = tier_names[min(tier, len(tier_names) - 1)]
    approval_tier = ApprovalRules.TIERS.get(tier_name, ApprovalRules.TIERS["executive"])
    sla = approval_tier["sla_hours"]

    # Emergency: halve the SLA time
    if is_emergency:
        sla = max(sla // 2, 2)

    return sla
