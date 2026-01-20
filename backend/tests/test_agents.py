"""
Unit tests for AI agents.

These tests verify agent creation and method signatures with mock mode enabled.
"""

import json
from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.base_agent import BedrockAgent, MockBedrockAgent
from app.agents.requisition_agent import RequisitionAgent
from app.agents.approval_agent import ApprovalAgent
from app.agents.po_agent import POAgent
from app.agents.receiving_agent import ReceivingAgent
from app.agents.invoice_agent import InvoiceAgent
from app.agents.fraud_agent import FraudAgent
from app.agents.compliance_agent import ComplianceAgent


class TestBedrockAgent:
    """Tests for base BedrockAgent class."""

    def test_mock_agent_creation(self):
        """Test creating a mock agent."""
        agent = MockBedrockAgent(name="test-agent")
        assert agent.name == "test-agent"

    @pytest.mark.asyncio
    async def test_mock_agent_invoke(self):
        """Test mock agent invocation (async version)."""
        agent = MockBedrockAgent(name="test-agent")
        result = await agent.invoke("Test prompt")

        assert "response" in result
        assert result["response"] == "mock_response"

    @pytest.mark.asyncio
    async def test_mock_agent_with_callback(self):
        """Test mock agent with WebSocket callback."""
        mock_callback = AsyncMock()
        agent = MockBedrockAgent(
            name="test-agent",
            websocket_callback=mock_callback,
        )
        await agent.invoke("Test prompt")

        mock_callback.assert_called()


class TestRequisitionAgent:
    """Tests for RequisitionAgent."""

    def test_agent_creation(self):
        """Test requisition agent creation."""
        agent = RequisitionAgent(use_mock=True)
        assert agent.agent_name == "RequisitionAgent"
        assert agent.role == "Requisition Specialist"

    def test_validate_requisition(self):
        """Test requisition validation (sync method with mock)."""
        agent = RequisitionAgent(use_mock=True)

        requisition_data = {
            "id": 1,
            "number": "REQ-000001",
            "description": "Office supplies",
            "total_amount": 500.00,
            "line_items": [
                {"description": "Pens", "quantity": 100, "unit_price": 2.50},
                {"description": "Paper", "quantity": 10, "unit_price": 25.00},
            ],
        }

        result = agent.validate_requisition(requisition_data)

        # Mock returns standard response structure
        assert "status" in result
        assert result["status"] == "success"

    def test_suggest_products(self):
        """Test product suggestion method."""
        agent = RequisitionAgent(use_mock=True)

        result = agent.suggest_products(
            description="Laptop computer",
            category="IT Equipment",
            catalog=[{"id": "cat-001", "name": "Dell Laptop", "price": 1200}],
        )

        assert "status" in result
        assert result["status"] == "success"

    def test_check_duplicates(self):
        """Test duplicate requisition detection."""
        agent = RequisitionAgent(use_mock=True)

        requisition = {
            "description": "Office Laptop",
            "requestor_id": "user-001",
        }
        recent_requisitions = [
            {"id": 1, "description": "Laptop", "requestor_id": "user-001"},
        ]

        result = agent.check_duplicates(
            requisition=requisition,
            recent_requisitions=recent_requisitions,
        )

        assert "status" in result
        assert result["status"] == "success"


class TestApprovalAgent:
    """Tests for ApprovalAgent."""

    def test_agent_creation(self):
        """Test approval agent creation."""
        agent = ApprovalAgent(use_mock=True)
        assert agent.agent_name == "ApprovalAgent"
        assert agent.role == "Approval Workflow Manager"

    def test_determine_approval_chain(self):
        """Test approval chain determination."""
        agent = ApprovalAgent(use_mock=True)

        document = {
            "id": 1,
            "total_amount": 15000.00,
            "department": "engineering",
        }
        requestor = {"id": "user-001", "role": "engineer"}

        result = agent.determine_approval_chain(
            document=document,
            document_type="requisition",
            requestor=requestor,
            available_approvers=[],
        )

        assert "status" in result
        assert result["status"] == "success"

    def test_check_auto_approve(self):
        """Test auto-approval eligibility using internal method."""
        agent = ApprovalAgent(use_mock=True)

        # Low amount should be tier 1 (auto-approve)
        tier = agent._get_tier_for_amount(500.00)
        assert tier["tier"] == 1
        assert tier["description"] == "Auto-approve"

        # Higher amount should be higher tier
        tier = agent._get_tier_for_amount(50000.00)
        assert tier["tier"] >= 4

    def test_make_approval_decision(self):
        """Test approval decision making."""
        agent = ApprovalAgent(use_mock=True)

        document = {
            "id": 1,
            "total_amount": 10000.00,
            "description": "IT Equipment",
        }
        approver = {"id": "manager-001", "role": "manager"}

        result = agent.make_approval_decision(
            document=document,
            document_type="requisition",
            approver=approver,
        )

        assert "status" in result
        assert result["status"] == "success"


class TestPOAgent:
    """Tests for POAgent."""

    def test_agent_creation(self):
        """Test PO agent creation."""
        agent = POAgent(use_mock=True)
        assert agent.agent_name == "POAgent"
        assert agent.role == "Purchase Order Specialist"

    def test_generate_po(self):
        """Test PO generation from requisition."""
        agent = POAgent(use_mock=True)

        requisition = {
            "id": 1,
            "number": "REQ-000001",
            "line_items": [
                {
                    "description": "Laptops",
                    "quantity": 5,
                    "unit_price": 1500.00,
                },
            ],
            "total_amount": 7500.00,
        }
        suppliers = [
            {"id": "sup-001", "name": "Dell", "rating": 4.5},
            {"id": "sup-002", "name": "HP", "rating": 4.2},
        ]

        result = agent.generate_po(
            requisition=requisition,
            suppliers=suppliers,
        )

        assert "status" in result
        assert result["status"] == "success"

    def test_consolidate_requisitions(self):
        """Test requisition consolidation into single PO."""
        agent = POAgent(use_mock=True)

        pending_requisitions = [
            {
                "id": 1,
                "suggested_supplier_id": "supplier-001",
                "total_amount": 1000.00,
            },
            {
                "id": 2,
                "suggested_supplier_id": "supplier-001",
                "total_amount": 2000.00,
            },
        ]
        suppliers = [{"id": "supplier-001", "name": "Vendor A"}]

        result = agent.consolidate_requisitions(
            pending_requisitions=pending_requisitions,
            suppliers=suppliers,
        )

        assert "status" in result
        assert result["status"] == "success"

    def test_select_supplier(self):
        """Test supplier selection logic."""
        agent = POAgent(use_mock=True)

        line_items = [{"description": "Laptops", "quantity": 5}]
        available_suppliers = [
            {"id": "sup-001", "name": "Dell", "performance_score": 0.9},
            {"id": "sup-002", "name": "HP", "performance_score": 0.85},
        ]

        result = agent.select_supplier(
            line_items=line_items,
            available_suppliers=available_suppliers,
        )

        assert "status" in result
        assert result["status"] == "success"


class TestReceivingAgent:
    """Tests for ReceivingAgent."""

    def test_agent_creation(self):
        """Test receiving agent creation."""
        agent = ReceivingAgent(use_mock=True)
        assert agent.agent_name == "ReceivingAgent"
        assert agent.role == "Goods Receipt Specialist"

    def test_process_receipt(self):
        """Test goods receipt processing."""
        agent = ReceivingAgent(use_mock=True)

        receipt_data = {
            "line_items": [
                {"po_line_item_id": 1, "quantity_received": 10},
            ],
        }
        purchase_order = {
            "id": 1,
            "number": "PO-000001",
            "line_items": [
                {"id": 1, "quantity": 10, "description": "Laptops"},
            ],
        }

        result = agent.process_receipt(
            receipt_data=receipt_data,
            purchase_order=purchase_order,
        )

        assert "status" in result
        assert result["status"] == "success"

    def test_handle_discrepancy(self):
        """Test discrepancy handling."""
        agent = ReceivingAgent(use_mock=True)

        result = agent.handle_discrepancy(
            discrepancy_type="under_delivery",
            receipt_line={"quantity_received": 8},
            po_line={"quantity": 10},
        )

        assert "status" in result
        assert result["status"] == "success"

    def test_verify_delivery(self):
        """Test delivery verification."""
        agent = ReceivingAgent(use_mock=True)

        delivery_info = {
            "carrier": "UPS",
            "tracking_number": "1Z999AA10123456784",
        }
        expected_po = {
            "id": 1,
            "supplier_id": "sup-001",
        }

        result = agent.verify_delivery(
            delivery_info=delivery_info,
            expected_po=expected_po,
        )

        assert "status" in result
        assert result["status"] == "success"


class TestInvoiceAgent:
    """Tests for InvoiceAgent."""

    def test_agent_creation(self):
        """Test invoice agent creation."""
        agent = InvoiceAgent(use_mock=True)
        assert agent.agent_name == "InvoiceAgent"
        assert agent.role == "Invoice Processing Specialist"

    def test_process_invoice(self):
        """Test invoice processing with 3-way match."""
        agent = InvoiceAgent(use_mock=True)

        invoice = {
            "id": 1,
            "vendor_invoice_number": "INV-001",
            "line_items": [
                {"quantity": 10, "unit_price": 100.00},
            ],
            "total_amount": 1000.00,
        }
        purchase_order = {
            "id": 1,
            "line_items": [
                {"quantity": 10, "unit_price": 100.00},
            ],
            "total_amount": 1000.00,
        }
        goods_receipts = [
            {"line_items": [{"quantity_received": 10}]},
        ]

        result = agent.process_invoice(
            invoice=invoice,
            purchase_order=purchase_order,
            goods_receipts=goods_receipts,
        )

        assert "status" in result
        assert result["status"] == "success"

    def test_three_way_match(self):
        """Test 3-way matching on a single line."""
        agent = InvoiceAgent(use_mock=True)

        invoice_line = {"quantity": 10, "unit_price": 100.00}
        po_line = {"quantity": 10, "unit_price": 100.00}
        gr_lines = [{"quantity_received": 10, "quantity_rejected": 0}]

        result = agent.three_way_match(
            invoice_line=invoice_line,
            po_line=po_line,
            gr_lines=gr_lines,
        )

        assert "status" in result
        assert result["status"] == "success"

    def test_calculate_payment(self):
        """Test payment calculation."""
        agent = InvoiceAgent(use_mock=True)

        invoice = {
            "id": 1,
            "total_amount": 10000.00,
            "payment_terms": "2/10 Net 30",
        }
        match_result = {
            "status": "matched",
            "approved_amount": 10000.00,
        }
        supplier = {
            "id": "sup-001",
            "name": "Test Supplier",
            "payment_terms": "2/10 Net 30",
        }

        result = agent.calculate_payment(
            invoice=invoice,
            match_result=match_result,
            supplier=supplier,
        )

        assert "status" in result
        assert result["status"] == "success"


class TestFraudAgent:
    """Tests for FraudAgent."""

    def test_agent_creation(self):
        """Test fraud agent creation."""
        agent = FraudAgent(use_mock=True)
        assert agent.agent_name == "FraudAgent"
        assert agent.role == "Fraud Detection Specialist"

    def test_fraud_rules_exist(self):
        """Test fraud rules are configured."""
        agent = FraudAgent(use_mock=True)

        assert "duplicate_invoice" in agent.FRAUD_RULES
        assert "round_dollar_anomaly" in agent.FRAUD_RULES
        assert "split_transaction" in agent.FRAUD_RULES

    def test_analyze_transaction(self):
        """Test transaction fraud analysis."""
        agent = FraudAgent(use_mock=True)

        transaction = {
            "id": 1,
            "vendor_invoice_number": "ROUND-10000",
            "supplier_id": "supplier-001",
            "total_amount": 10000.00,
            "invoice_date": date.today().isoformat(),
        }
        vendor = {
            "id": "supplier-001",
            "name": "Test Vendor",
            "is_new": False,
        }

        result = agent.analyze_transaction(
            transaction=transaction,
            vendor=vendor,
        )

        assert "status" in result
        assert result["status"] == "success"

    def test_check_duplicate_invoice(self):
        """Test duplicate invoice detection method."""
        agent = FraudAgent(use_mock=True)

        invoice = {
            "vendor_invoice_number": "INV-001",
            "supplier_id": "sup-001",
            "total_amount": 5000.00,
        }
        recent_invoices = [
            {"vendor_invoice_number": "INV-001", "total_amount": 5000.00},
        ]

        result = agent.check_duplicate_invoice(
            invoice=invoice,
            recent_invoices=recent_invoices,
        )

        assert "status" in result
        assert result["status"] == "success"

    def test_detect_split_transactions(self):
        """Test split transaction detection."""
        agent = FraudAgent(use_mock=True)

        recent_invoices = [
            {"amount": 4900.00, "date": date.today().isoformat()},
            {"amount": 4900.00, "date": date.today().isoformat()},
            {"amount": 4900.00, "date": date.today().isoformat()},
        ]

        result = agent.detect_split_transactions(
            vendor_id="supplier-001",
            recent_invoices=recent_invoices,
            approval_threshold=5000.00,
        )

        assert "status" in result
        assert result["status"] == "success"


class TestComplianceAgent:
    """Tests for ComplianceAgent."""

    def test_agent_creation(self):
        """Test compliance agent creation."""
        agent = ComplianceAgent(use_mock=True)
        assert agent.agent_name == "ComplianceAgent"
        assert agent.role == "Compliance & Audit Specialist"

    def test_sod_matrix_exists(self):
        """Test separation of duties matrix is configured."""
        agent = ComplianceAgent(use_mock=True)

        assert "requestor" in agent.SOD_MATRIX
        assert "buyer" in agent.SOD_MATRIX
        assert "can" in agent.SOD_MATRIX["requestor"]
        assert "cannot" in agent.SOD_MATRIX["requestor"]

    def test_documentation_requirements_exist(self):
        """Test documentation requirements are configured."""
        agent = ComplianceAgent(use_mock=True)

        assert "tier_1" in agent.DOCUMENTATION_REQUIREMENTS
        assert "tier_5" in agent.DOCUMENTATION_REQUIREMENTS
        assert "required" in agent.DOCUMENTATION_REQUIREMENTS["tier_1"]

    def test_check_compliance(self):
        """Test comprehensive compliance check."""
        agent = ComplianceAgent(use_mock=True)

        transaction = {
            "id": 1,
            "total_amount": 50000.00,
            "description": "IT Equipment",
        }
        actors = {
            "requestor": {"id": "user-001", "role": "requestor"},
            "approver": {"id": "user-002", "role": "manager"},
        }
        documents = [
            {"type": "invoice"},
            {"type": "purchase_order"},
        ]

        result = agent.check_compliance(
            transaction=transaction,
            transaction_type="invoice",
            actors=actors,
            documents=documents,
        )

        assert "status" in result
        assert result["status"] == "success"

    def test_check_segregation_of_duties(self):
        """Test separation of duties check."""
        agent = ComplianceAgent(use_mock=True)

        user = {"id": "user-001", "role": "requestor"}
        transaction_history = [
            {"action": "create_requisition", "user_id": "user-001"},
        ]

        result = agent.check_segregation_of_duties(
            action="approve_requisition",
            user=user,
            transaction_history=transaction_history,
        )

        assert "status" in result
        assert result["status"] == "success"

    def test_validate_documentation(self):
        """Test documentation validation."""
        agent = ComplianceAgent(use_mock=True)

        transaction = {
            "id": 1,
            "total_amount": 50000.00,
        }
        available_documents = [
            {"type": "invoice"},
            {"type": "purchase_order"},
        ]

        result = agent.validate_documentation(
            transaction=transaction,
            available_documents=available_documents,
        )

        assert "status" in result
        assert result["status"] == "success"


class TestAgentIntegration:
    """Integration tests for agent interactions."""

    def test_all_agents_have_mock_mode(self):
        """Test all agents can be created in mock mode."""
        agents = [
            RequisitionAgent(use_mock=True),
            ApprovalAgent(use_mock=True),
            POAgent(use_mock=True),
            ReceivingAgent(use_mock=True),
            InvoiceAgent(use_mock=True),
            FraudAgent(use_mock=True),
            ComplianceAgent(use_mock=True),
        ]

        for agent in agents:
            assert agent.use_mock is True
            assert hasattr(agent, "invoke")
            assert hasattr(agent, "get_system_prompt")
            assert hasattr(agent, "get_responsibilities")

    def test_all_agents_return_responsibilities(self):
        """Test all agents return their responsibilities."""
        agents = [
            RequisitionAgent(use_mock=True),
            ApprovalAgent(use_mock=True),
            POAgent(use_mock=True),
            ReceivingAgent(use_mock=True),
            InvoiceAgent(use_mock=True),
            FraudAgent(use_mock=True),
            ComplianceAgent(use_mock=True),
        ]

        for agent in agents:
            responsibilities = agent.get_responsibilities()
            assert isinstance(responsibilities, list)
            assert len(responsibilities) > 0

    def test_all_agents_return_system_prompt(self):
        """Test all agents return a system prompt."""
        agents = [
            RequisitionAgent(use_mock=True),
            ApprovalAgent(use_mock=True),
            POAgent(use_mock=True),
            ReceivingAgent(use_mock=True),
            InvoiceAgent(use_mock=True),
            FraudAgent(use_mock=True),
            ComplianceAgent(use_mock=True),
        ]

        for agent in agents:
            prompt = agent.get_system_prompt()
            assert isinstance(prompt, str)
            assert len(prompt) > 100  # Should be substantial
