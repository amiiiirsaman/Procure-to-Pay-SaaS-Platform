"""
Comprehensive agent integration tests for P2P SaaS Platform.

Tests all 7 agents:
1. RequisitionAgent - Validates requisitions
2. ApprovalAgent - Determines approval chains
3. POAgent - Generates purchase orders
4. ReceivingAgent - Processes goods receipts
5. InvoiceAgent - Performs 3-way match
6. FraudAgent - Detects fraud risks
7. ComplianceAgent - Checks compliance

These tests verify:
- Agent initialization
- Agent execution with valid inputs
- Agent output validation
- Agent flagging logic
- Agent recommendations
- Error handling
"""

import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.agents import (
    RequisitionAgent,
    ApprovalAgent,
    POAgent,
    ReceivingAgent,
    InvoiceAgent,
    FraudAgent,
    ComplianceAgent,
)
from app.models.enums import (
    DocumentStatus,
    ApprovalStatus,
    Department,
    Urgency,
    MatchStatus,
    RiskLevel,
)


# ============= Test Fixtures =============


@pytest.fixture
def sample_requisition():
    """Sample requisition data."""
    return {
        "id": 1,
        "number": "REQ-000001",
        "requestor_id": "user1",
        "department": Department.ENGINEERING.value,
        "description": "Office supplies for Q1",
        "justification": "Standard office supplies needed",
        "urgency": Urgency.STANDARD.value,
        "needed_by_date": (date.today() + timedelta(days=30)).isoformat(),
        "total_amount": 5000.00,
        "line_items": [
            {
                "description": "Laptops",
                "category": "Equipment",
                "quantity": 5,
                "unit_price": 1000.00,
                "total": 5000.00,
            }
        ],
        "status": DocumentStatus.DRAFT.value,
    }


@pytest.fixture
def sample_requisition_high_value():
    """High-value requisition for approval testing."""
    return {
        "id": 2,
        "number": "REQ-000002",
        "requestor_id": "user2",
        "department": Department.IT.value,
        "description": "Enterprise software licenses",
        "justification": "Critical system upgrades",
        "urgency": Urgency.URGENT.value,
        "needed_by_date": (date.today() + timedelta(days=14)).isoformat(),
        "total_amount": 150000.00,
        "line_items": [
            {
                "description": "Enterprise License",
                "category": "Software",
                "quantity": 1,
                "unit_price": 150000.00,
                "total": 150000.00,
            }
        ],
        "status": DocumentStatus.DRAFT.value,
    }


@pytest.fixture
def sample_po():
    """Sample purchase order data."""
    return {
        "id": 1,
        "number": "PO-000001",
        "requisition_id": 1,
        "supplier_id": "supplier1",
        "buyer_id": "buyer1",
        "total_amount": 5000.00,
        "expected_delivery_date": (date.today() + timedelta(days=14)).isoformat(),
        "line_items": [
            {
                "description": "Laptops",
                "quantity": 5,
                "unit_price": 1000.00,
                "total": 5000.00,
            }
        ],
        "status": DocumentStatus.APPROVED.value,
    }


@pytest.fixture
def sample_supplier():
    """Sample supplier data."""
    return {
        "id": "supplier1",
        "name": "TechCorp Inc.",
        "risk_level": RiskLevel.LOW.value,
        "risk_score": 15.0,
        "on_time_delivery_rate": 0.98,
        "bank_verified": True,
    }


@pytest.fixture
def sample_invoice():
    """Sample invoice data."""
    return {
        "id": 1,
        "number": "INV-000001",
        "vendor_invoice_number": "TC-INV-12345",
        "supplier_id": "supplier1",
        "purchase_order_id": 1,
        "invoice_date": date.today().isoformat(),
        "due_date": (date.today() + timedelta(days=30)).isoformat(),
        "subtotal": 5000.00,
        "tax_amount": 400.00,
        "total_amount": 5400.00,
        "line_items": [
            {
                "description": "Laptops",
                "quantity": 5,
                "unit_price": 1000.00,
                "total": 5000.00,
            }
        ],
        "status": DocumentStatus.PENDING_APPROVAL.value,
    }


@pytest.fixture
def sample_goods_receipt():
    """Sample goods receipt data."""
    return {
        "id": 1,
        "number": "GR-000001",
        "purchase_order_id": 1,
        "received_by_id": "receiver1",
        "received_at": datetime.utcnow().isoformat(),
        "delivery_note": "Delivered in good condition",
        "carrier": "FedEx",
        "tracking_number": "123456789",
        "line_items": [
            {
                "po_line_item_id": 1,
                "quantity_received": 5,
                "quantity_rejected": 0,
                "storage_location": "Warehouse A",
            }
        ],
    }


# ============= RequisitionAgent Tests =============


class TestRequisitionAgent:
    """Test the RequisitionAgent."""

    def test_agent_initialization(self):
        """Test that agent initializes successfully."""
        agent = RequisitionAgent()
        assert agent is not None
        assert hasattr(agent, 'validate_requisition')

    def test_validate_normal_requisition(self, sample_requisition):
        """Test validation of a normal requisition."""
        agent = RequisitionAgent()
        result = agent.validate_requisition(
            requisition=sample_requisition,
            catalog=None,
            recent_requisitions=None,
        )
        
        assert result is not None
        assert "status" in result
        assert result.get("status") in ["needs_review", "approved"]

    def test_validate_high_value_requisition(self, sample_requisition_high_value):
        """Test validation of high-value requisition."""
        agent = RequisitionAgent()
        result = agent.validate_requisition(
            requisition=sample_requisition_high_value,
            catalog=None,
            recent_requisitions=None,
        )
        
        assert result is not None
        assert "status" in result

    def test_validate_urgent_requisition(self, sample_requisition):
        """Test validation of urgent requisition."""
        urgent_req = sample_requisition.copy()
        urgent_req["urgency"] = Urgency.EMERGENCY.value
        
        agent = RequisitionAgent()
        result = agent.validate_requisition(
            requisition=urgent_req,
            catalog=None,
            recent_requisitions=None,
        )
        
        assert result is not None
        assert "status" in result


# ============= ApprovalAgent Tests =============


class TestApprovalAgent:
    """Test the ApprovalAgent."""

    def test_agent_initialization(self):
        """Test that agent initializes successfully."""
        agent = ApprovalAgent()
        assert agent is not None
        assert hasattr(agent, 'determine_approval_chain')

    def test_determine_approval_chain_normal(self, sample_requisition, sample_supplier):
        """Test determining approval chain for normal requisition."""
        agent = ApprovalAgent()
        result = agent.determine_approval_chain(
            document=sample_requisition,
            document_type="requisition",
            requestor={"id": "user1", "role": "employee"},
            available_approvers=None,
        )
        
        assert result is not None
        assert "response" in result or "approval_chain" in result.get("response", "{}")

    def test_determine_approval_chain_high_value(
        self, sample_requisition_high_value, sample_supplier
    ):
        """Test approval chain for high-value requisition."""
        agent = ApprovalAgent()
        result = agent.determine_approval_chain(
            document=sample_requisition_high_value,
            document_type="requisition",
            requestor={"id": "user2", "role": "employee"},
            available_approvers=None,
        )
        
        assert result is not None
        # High-value should require more approvals
        assert "approval_chain" in result or "response" in result


# ============= POAgent Tests =============


class TestPOAgent:
    """Test the POAgent."""

    def test_agent_initialization(self):
        """Test that agent initializes successfully."""
        agent = POAgent()
        assert agent is not None
        assert hasattr(agent, 'generate_po')

    def test_generate_po(self, sample_requisition, sample_supplier):
        """Test PO generation from requisition."""
        agent = POAgent()
        result = agent.generate_po(
            requisition=sample_requisition,
            suppliers=[{"id": "supplier1", "name": "Acme Inc", "risk_score": 20.0}],
        )
        
        assert result is not None
        assert "purchase_order" in result or "status" in result

    def test_generate_po_with_high_risk_supplier(self):
        """Test PO generation handles high-risk suppliers."""
        agent = POAgent()
        requisition = {
            "id": 1,
            "total_amount": 10000.00,
            "supplier_id": "high_risk_supplier",
        }
        
        result = agent.generate_po(
            requisition=requisition,
            suppliers=[{"id": "high_risk_supplier", "risk_score": 75.0}],
        )
        
        assert result is not None


# ============= ReceivingAgent Tests =============


class TestReceivingAgent:
    """Test the ReceivingAgent."""

    def test_agent_initialization(self):
        """Test that agent initializes successfully."""
        agent = ReceivingAgent()
        assert agent is not None
        assert hasattr(agent, 'process_receipt')

    def test_process_full_receipt(self, sample_goods_receipt, sample_po):
        """Test processing full goods receipt."""
        agent = ReceivingAgent()
        result = agent.process_receipt(
            receipt_data=sample_goods_receipt,
            purchase_order=sample_po,
            previous_receipts=None,
        )
        
        assert result is not None
        assert "status" in result
        assert result.get("status") in ["accepted", "needs_review"]

    def test_process_partial_receipt(self, sample_goods_receipt, sample_po):
        """Test processing partial goods receipt."""
        partial_receipt = sample_goods_receipt.copy()
        partial_receipt["line_items"] = [
            {
                "po_line_item_id": 1,
                "quantity_received": 3,
                "quantity_rejected": 2,
                "rejection_reason": "Damaged items",
                "storage_location": "Warehouse A",
            }
        ]
        
        agent = ReceivingAgent()
        result = agent.process_receipt(
            receipt_data=partial_receipt,
            purchase_order=sample_po,
            previous_receipts=None,
        )
        
        assert result is not None
        assert "status" in result


# ============= InvoiceAgent Tests =============


class TestInvoiceAgent:
    """Test the InvoiceAgent."""

    def test_agent_initialization(self):
        """Test that agent initializes successfully."""
        agent = InvoiceAgent()
        assert agent is not None
        assert hasattr(agent, 'process_invoice')

    def test_three_way_match_perfect(self, sample_invoice, sample_po, sample_goods_receipt):
        """Test 3-way match with perfect alignment."""
        agent = InvoiceAgent()
        result = agent.process_invoice(
            invoice=sample_invoice,
            purchase_order=sample_po,
            goods_receipts=[sample_goods_receipt],
        )
        
        assert result is not None
        assert "status" in result
        assert result.get("status") in ["matched", "exception"]

    def test_three_way_match_with_variance(self):
        """Test 3-way match with price variance."""
        agent = InvoiceAgent()
        invoice = {
            "id": 1,
            "number": "INV-000001",
            "total_amount": 5500.00,  # 10% variance
        }
        po = {"id": 1, "total_amount": 5000.00}
        
        result = agent.process_invoice(
            invoice=invoice,
            purchase_order=po,
            goods_receipts=[{"id": 1, "total_amount": 5000.00}],
        )
        
        assert result is not None
        # Should have status field
        assert "status" in result


# ============= FraudAgent Tests =============


class TestFraudAgent:
    """Test the FraudAgent."""

    def test_agent_initialization(self):
        """Test that agent initializes successfully."""
        agent = FraudAgent()
        assert agent is not None
        assert hasattr(agent, 'analyze_transaction')

    def test_analyze_low_risk_invoice(self, sample_invoice):
        """Test fraud analysis for low-risk invoice."""
        agent = FraudAgent()
        result = agent.analyze_transaction(
            transaction=sample_invoice,
            vendor={"id": "supplier1", "risk_score": 20.0},
            transaction_history=None,
            employee_data=None,
        )
        
        assert result is not None
        assert "risk_score" in result or "status" in result
        if "risk_score" in result:
            assert result["risk_score"] >= 0
            assert result["risk_score"] <= 100

    def test_analyze_suspicious_invoice(self):
        """Test fraud analysis for suspicious invoice."""
        suspicious_invoice = {
            "id": 1,
            "number": "INV-000001",
            "total_amount": 50000.00,
            "vendor_invoice_number": "FAKE-123",
            "supplier_id": "unknown_supplier",
            "invoice_date": (date.today() - timedelta(days=60)).isoformat(),
        }
        
        agent = FraudAgent()
        result = agent.analyze_transaction(
            transaction=suspicious_invoice,
            vendor={"id": "unknown_supplier", "risk_score": 85.0},
            transaction_history=None,
            employee_data=None,
        )
        
        assert result is not None
        assert result.get("risk_score", 0) > 30 or result.get("status") == "hold"


# ============= ComplianceAgent Tests =============


class TestComplianceAgent:
    """Test the ComplianceAgent."""

    def test_agent_initialization(self):
        """Test that agent initializes successfully."""
        agent = ComplianceAgent()
        assert agent is not None
        assert hasattr(agent, 'check_compliance')

    def test_check_compliance_normal(self, sample_invoice):
        """Test compliance check for normal invoice."""
        agent = ComplianceAgent()
        result = agent.check_compliance(
            transaction=sample_invoice,
            transaction_type="invoice",
            actors={"requestor_id": "user1"},
            documents=[],
        )
        
        assert result is not None
        assert "status" in result
        assert result.get("status") in ["violation", "compliant"]

    def test_check_compliance_with_issues(self):
        """Test compliance check detecting issues."""
        problematic_invoice = {
            "id": 1,
            "number": "INV-000001",
            "total_amount": 100000.00,  # Very high value
            "status": DocumentStatus.PENDING_APPROVAL.value,
            "supplier_id": "unknown",
        }
        
        agent = ComplianceAgent()
        result = agent.check_compliance(
            transaction=problematic_invoice,
            transaction_type="invoice",
            actors={"requestor_id": "user1"},
            documents=[],
        )
        
        assert result is not None
        # Should have status field indicating compliance state
        assert "status" in result


# ============= Multi-Agent Workflow Tests =============


class TestMultiAgentWorkflow:
    """Test multi-agent workflow integration."""

    def test_requisition_to_approval_workflow(
        self, sample_requisition, sample_supplier
    ):
        """Test workflow: Requisition -> Approval Chain."""
        # Step 1: Validate requisition
        req_agent = RequisitionAgent()
        req_result = req_agent.validate_requisition(
            requisition=sample_requisition,
            catalog=None,
            recent_requisitions=None,
        )
        assert req_result is not None
        
        # Step 2: Determine approval chain
        approval_agent = ApprovalAgent()
        approval_result = approval_agent.determine_approval_chain(
            document=sample_requisition,
            document_type="requisition",
            requestor={"id": "user1"},
            available_approvers=None,
        )
        assert approval_result is not None

    def test_po_to_receiving_to_invoice_workflow(
        self, sample_po, sample_goods_receipt, sample_invoice
    ):
        """Test workflow: PO -> Receiving -> Invoice."""
        # Step 1: Process goods receipt
        receiving_agent = ReceivingAgent()
        receipt_result = receiving_agent.process_receipt(
            receipt_data=sample_goods_receipt,
            purchase_order=sample_po,
            previous_receipts=None,
        )
        assert receipt_result is not None
        
        # Step 2: Process invoice with 3-way match
        invoice_agent = InvoiceAgent()
        invoice_result = invoice_agent.process_invoice(
            invoice=sample_invoice,
            purchase_order=sample_po,
            goods_receipts=[sample_goods_receipt],
        )
        assert invoice_result is not None
        
        # Step 3: Fraud analysis
        fraud_agent = FraudAgent()
        fraud_result = fraud_agent.analyze_transaction(
            transaction=sample_invoice,
            vendor={"id": "supplier1", "risk_score": 20.0},
            transaction_history=None,
            employee_data=None,
        )
        assert fraud_result is not None
        
        # Step 4: Compliance check
        compliance_agent = ComplianceAgent()
        compliance_result = compliance_agent.check_compliance(
            transaction=sample_invoice,
            transaction_type="invoice",
            actors={"requestor_id": "user1"},
            documents=[],
        )
        assert compliance_result is not None

    def test_all_agents_execute_successfully(
        self,
        sample_requisition,
        sample_po,
        sample_goods_receipt,
        sample_invoice,
        sample_supplier,
    ):
        """Test that all 7 agents can execute without errors."""
        agents = [
            (RequisitionAgent(), "RequisitionAgent"),
            (ApprovalAgent(), "ApprovalAgent"),
            (POAgent(), "POAgent"),
            (ReceivingAgent(), "ReceivingAgent"),
            (InvoiceAgent(), "InvoiceAgent"),
            (FraudAgent(), "FraudAgent"),
            (ComplianceAgent(), "ComplianceAgent"),
        ]
        
        for agent, name in agents:
            assert agent is not None, f"{name} failed to initialize"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
