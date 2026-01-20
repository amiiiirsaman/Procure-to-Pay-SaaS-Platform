"""
Unit tests for business rules modules.
"""

from datetime import date, datetime, timedelta

import pytest

from app.models.enums import (
    Department,
    DocumentStatus,
    MatchStatus,
    RiskLevel,
    UserRole,
)
from app.rules.approval_rules import (
    ApprovalRules,
    get_required_approval_tier,
    get_approval_chain,
    check_auto_approve,
)
from app.rules.fraud_rules import (
    FraudRules,
    check_fraud_indicators,
    calculate_fraud_score,
    detect_duplicate_invoice,
    detect_split_transactions,
    detect_round_dollar_pattern,
)
from app.rules.compliance_rules import (
    ComplianceRules,
    validate_separation_of_duties,
    validate_three_way_match,
    get_documentation_requirements,
    check_pre_payment_compliance,
)


class TestApprovalRules:
    """Tests for approval rules."""

    def test_auto_approve_threshold(self):
        """Test auto-approval for amounts under threshold."""
        assert check_auto_approve(500.00) is True
        assert check_auto_approve(1000.00) is True
        assert check_auto_approve(1000.01) is False
        assert check_auto_approve(5000.00) is False

    def test_approval_tier_determination(self):
        """Test correct approval tier is determined by amount."""
        # Under $1,000 - auto approve
        tier = get_required_approval_tier(500.00)
        assert tier["tier"] == "auto_approve"

        # $1,001 - $5,000 - manager
        tier = get_required_approval_tier(3000.00)
        assert tier["tier"] == "manager"
        assert tier["max_amount"] == 5000

        # $5,001 - $25,000 - director
        tier = get_required_approval_tier(15000.00)
        assert tier["tier"] == "director"
        assert tier["max_amount"] == 25000

        # $25,001 - $50,000 - VP
        tier = get_required_approval_tier(40000.00)
        assert tier["tier"] == "vp"
        assert tier["max_amount"] == 50000

        # $50,001 - $100,000 - SVP
        tier = get_required_approval_tier(75000.00)
        assert tier["tier"] == "svp"
        assert tier["max_amount"] == 100000

        # Over $100,000 - executive
        tier = get_required_approval_tier(150000.00)
        assert tier["tier"] == "executive"
        assert tier["max_amount"] == float("inf")

    def test_approval_chain_generation(self):
        """Test approval chain is generated correctly."""
        # Small amount - single approver
        chain = get_approval_chain(3000.00, Department.ENGINEERING)
        assert len(chain) == 1
        assert chain[0]["role"] == UserRole.MANAGER

        # Medium amount - two approvers
        chain = get_approval_chain(15000.00, Department.ENGINEERING)
        assert len(chain) == 2
        assert chain[0]["role"] == UserRole.MANAGER
        assert chain[1]["role"] == UserRole.DIRECTOR

        # Large amount - multiple approvers
        chain = get_approval_chain(75000.00, Department.ENGINEERING)
        assert len(chain) >= 3

    def test_department_override(self):
        """Test department-specific approval overrides."""
        # Finance department typically has higher thresholds
        rules = ApprovalRules()
        finance_tier = rules.get_tier_for_department(3000.00, Department.FINANCE)
        eng_tier = rules.get_tier_for_department(3000.00, Department.ENGINEERING)

        # Both should have same tier at this level
        assert finance_tier["tier"] == eng_tier["tier"]


class TestFraudRules:
    """Tests for fraud detection rules."""

    def test_duplicate_invoice_detection(self):
        """Test duplicate invoice detection."""
        existing_invoices = [
            {
                "vendor_invoice_number": "INV-001",
                "supplier_id": "SUP-001",
                "total_amount": 1000.00,
                "invoice_date": date.today() - timedelta(days=5),
            },
            {
                "vendor_invoice_number": "INV-002",
                "supplier_id": "SUP-001",
                "total_amount": 2000.00,
                "invoice_date": date.today() - timedelta(days=10),
            },
        ]

        # Exact duplicate
        is_duplicate = detect_duplicate_invoice(
            vendor_invoice_number="INV-001",
            supplier_id="SUP-001",
            existing_invoices=existing_invoices,
        )
        assert is_duplicate is True

        # Not a duplicate
        is_duplicate = detect_duplicate_invoice(
            vendor_invoice_number="INV-003",
            supplier_id="SUP-001",
            existing_invoices=existing_invoices,
        )
        assert is_duplicate is False

    def test_split_transaction_detection(self):
        """Test split transaction detection."""
        recent_invoices = [
            {
                "supplier_id": "SUP-001",
                "total_amount": 4500.00,
                "created_at": datetime.utcnow() - timedelta(hours=2),
            },
            {
                "supplier_id": "SUP-001",
                "total_amount": 4500.00,
                "created_at": datetime.utcnow() - timedelta(hours=1),
            },
        ]

        # New invoice that would be under $5K threshold but total exceeds
        is_split = detect_split_transactions(
            supplier_id="SUP-001",
            amount=4500.00,
            recent_invoices=recent_invoices,
            threshold=5000.00,
            time_window_hours=24,
        )
        assert is_split is True

        # Different supplier - not split
        is_split = detect_split_transactions(
            supplier_id="SUP-002",
            amount=4500.00,
            recent_invoices=recent_invoices,
            threshold=5000.00,
            time_window_hours=24,
        )
        assert is_split is False

    def test_round_dollar_pattern(self):
        """Test round dollar amount detection."""
        # Round dollar amounts are suspicious
        assert detect_round_dollar_pattern(10000.00) is True
        assert detect_round_dollar_pattern(5000.00) is True
        assert detect_round_dollar_pattern(25000.00) is True

        # Non-round amounts are normal
        assert detect_round_dollar_pattern(10234.56) is False
        assert detect_round_dollar_pattern(5123.45) is False

        # Very round but small - not suspicious
        assert detect_round_dollar_pattern(100.00) is False

    def test_fraud_indicator_check(self):
        """Test comprehensive fraud indicator check."""
        invoice_data = {
            "vendor_invoice_number": "ROUND-1000",
            "supplier_id": "NEW-SUPPLIER",
            "total_amount": 10000.00,
            "invoice_date": date.today(),
            "is_new_supplier": True,
            "rush_payment_requested": True,
        }

        indicators = check_fraud_indicators(invoice_data)

        assert len(indicators) > 0
        indicator_types = [i["type"] for i in indicators]
        assert "round_dollar" in indicator_types
        assert "new_supplier" in indicator_types
        assert "rush_payment" in indicator_types

    def test_fraud_score_calculation(self):
        """Test fraud score calculation."""
        # Low risk invoice
        low_risk = {
            "total_amount": 1234.56,
            "is_new_supplier": False,
            "rush_payment_requested": False,
            "vendor_invoice_number": "NORMAL-001",
        }
        score = calculate_fraud_score(low_risk, [])
        assert score < 30

        # High risk invoice
        high_risk = {
            "total_amount": 10000.00,
            "is_new_supplier": True,
            "rush_payment_requested": True,
            "vendor_invoice_number": "SUSPICIOUS-001",
        }
        indicators = check_fraud_indicators(high_risk)
        score = calculate_fraud_score(high_risk, indicators)
        assert score >= 50


class TestComplianceRules:
    """Tests for compliance rules."""

    def test_separation_of_duties(self):
        """Test separation of duties validation."""
        # Same person cannot create and approve
        is_valid = validate_separation_of_duties(
            requestor_id="user-001",
            approver_id="user-001",
            action="approve_requisition",
        )
        assert is_valid is False

        # Different people is valid
        is_valid = validate_separation_of_duties(
            requestor_id="user-001",
            approver_id="manager-001",
            action="approve_requisition",
        )
        assert is_valid is True

    def test_three_way_match_validation(self):
        """Test 3-way match validation."""
        po_data = {
            "line_items": [
                {"quantity": 10, "unit_price": 100.00},
                {"quantity": 5, "unit_price": 200.00},
            ],
            "total_amount": 2000.00,
        }

        gr_data = {
            "line_items": [
                {"quantity_received": 10},
                {"quantity_received": 5},
            ],
        }

        invoice_data = {
            "line_items": [
                {"quantity": 10, "unit_price": 100.00},
                {"quantity": 5, "unit_price": 200.00},
            ],
            "total_amount": 2000.00,
        }

        # Perfect match
        result = validate_three_way_match(po_data, gr_data, invoice_data)
        assert result["is_matched"] is True
        assert result["quantity_variance"] == 0
        assert result["price_variance"] == 0

        # Quantity mismatch
        gr_data_short = {
            "line_items": [
                {"quantity_received": 8},  # 2 short
                {"quantity_received": 5},
            ],
        }
        result = validate_three_way_match(po_data, gr_data_short, invoice_data)
        assert result["is_matched"] is False
        assert result["quantity_variance"] != 0

    def test_documentation_requirements(self):
        """Test documentation tier requirements."""
        # Low tier - minimal docs
        docs = get_documentation_requirements(500.00)
        assert "quote" not in docs["required"]
        assert docs["tier"] == "minimal"

        # Medium tier - standard docs
        docs = get_documentation_requirements(15000.00)
        assert "quote" in docs["required"]
        assert docs["tier"] == "standard"

        # High tier - extensive docs
        docs = get_documentation_requirements(75000.00)
        assert "competitive_bids" in docs["required"]
        assert docs["tier"] == "extensive"

        # Very high tier - full audit trail
        docs = get_documentation_requirements(150000.00)
        assert "board_approval" in docs["required"]
        assert docs["tier"] == "full_audit"

    def test_pre_payment_compliance_check(self):
        """Test pre-payment compliance validation."""
        # Compliant invoice
        compliant_invoice = {
            "status": DocumentStatus.APPROVED,
            "match_status": MatchStatus.MATCHED,
            "fraud_score": 10,
            "on_hold": False,
            "has_all_approvals": True,
        }
        result = check_pre_payment_compliance(compliant_invoice)
        assert result["can_pay"] is True
        assert len(result["blockers"]) == 0

        # Non-compliant invoice
        non_compliant_invoice = {
            "status": DocumentStatus.PENDING_APPROVAL,
            "match_status": MatchStatus.EXCEPTION,
            "fraud_score": 75,
            "on_hold": True,
            "has_all_approvals": False,
        }
        result = check_pre_payment_compliance(non_compliant_invoice)
        assert result["can_pay"] is False
        assert len(result["blockers"]) > 0
        assert "not_approved" in result["blockers"]
        assert "on_hold" in result["blockers"]
        assert "high_fraud_score" in result["blockers"]


class TestApprovalRulesClass:
    """Tests for ApprovalRules class methods."""

    def test_rules_singleton_pattern(self):
        """Test that rules maintain consistency."""
        rules1 = ApprovalRules()
        rules2 = ApprovalRules()

        assert rules1.TIERS == rules2.TIERS

    def test_tier_boundaries(self):
        """Test tier boundaries are correct."""
        rules = ApprovalRules()

        # Verify tier ordering - start from auto_approve max
        prev_max = rules.TIERS["auto_approve"]["max_amount"]
        for tier_name, tier_config in rules.TIERS.items():
            if tier_name == "auto_approve":
                continue
            assert tier_config["min_amount"] == prev_max
            prev_max = tier_config["max_amount"]


class TestFraudRulesClass:
    """Tests for FraudRules class methods."""

    def test_fraud_rules_configuration(self):
        """Test fraud rules are properly configured."""
        rules = FraudRules()

        # Should have standard fraud rules
        assert "duplicate_invoice" in rules.RULES
        assert "round_dollar" in rules.RULES
        assert "split_transaction" in rules.RULES
        assert "new_supplier" in rules.RULES

        # Each rule should have weight and description
        for rule_name, rule_config in rules.RULES.items():
            assert "weight" in rule_config
            assert "description" in rule_config
            assert 0 < rule_config["weight"] <= 100


class TestComplianceRulesClass:
    """Tests for ComplianceRules class methods."""

    def test_sod_matrix_completeness(self):
        """Test SOD matrix covers all key actions."""
        rules = ComplianceRules()

        key_actions = [
            "create_requisition",
            "approve_requisition",
            "create_po",
            "receive_goods",
            "process_invoice",
            "approve_payment",
        ]

        for action in key_actions:
            assert action in rules.SOD_MATRIX

    def test_documentation_tiers_ordering(self):
        """Test documentation tiers are properly ordered."""
        rules = ComplianceRules()

        prev_min = 0
        for tier_name, tier_config in rules.DOCUMENTATION_TIERS.items():
            assert tier_config["min_amount"] >= prev_min
            prev_min = tier_config["min_amount"]
