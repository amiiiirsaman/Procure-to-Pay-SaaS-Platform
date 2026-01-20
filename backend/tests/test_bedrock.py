"""
Live tests for AWS Bedrock Nova Pro integration.

These tests connect to actual AWS Bedrock services using configured credentials.
They verify that the agents can:
1. Successfully connect to Bedrock
2. Send requests and receive valid responses
3. Parse JSON responses correctly
4. Handle various document types

Prerequisites:
- AWS credentials configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- Bedrock model access enabled in the AWS account
- Network connectivity to AWS Bedrock endpoints

Run with: pytest tests/test_bedrock.py -v --tb=short
Skip in CI with: pytest tests/test_bedrock.py -v --tb=short -m "not slow"
"""

import json
import os
import time
from datetime import date, datetime
from typing import Any

import pytest

from app.agents.base_agent import BedrockAgent
from app.agents.requisition_agent import RequisitionAgent
from app.agents.approval_agent import ApprovalAgent
from app.agents.po_agent import POAgent
from app.agents.receiving_agent import ReceivingAgent
from app.agents.invoice_agent import InvoiceAgent
from app.agents.fraud_agent import FraudAgent
from app.agents.compliance_agent import ComplianceAgent
from app.config import settings


# Skip all tests if AWS credentials are not configured
pytestmark = pytest.mark.skipif(
    not os.getenv("AWS_ACCESS_KEY_ID") and not os.path.exists(os.path.expanduser("~/.aws/credentials")),
    reason="AWS credentials not configured"
)


class TestBedrockConnection:
    """Tests for basic Bedrock connectivity."""

    @pytest.mark.slow
    def test_bedrock_client_initialization(self):
        """Test that Bedrock client can be initialized."""
        agent = RequisitionAgent(use_mock=False)
        assert agent.bedrock is not None
        assert agent.model_id == settings.bedrock_model_id

    @pytest.mark.slow
    def test_bedrock_model_available(self):
        """Test that the configured model is accessible."""
        import boto3
        
        client = boto3.client("bedrock", region_name=settings.aws_region)
        
        # List foundation models to verify access
        response = client.list_foundation_models()
        model_ids = [m["modelId"] for m in response.get("modelSummaries", [])]
        
        # Check if our model (or a variant) is available
        assert any("nova" in mid.lower() for mid in model_ids), (
            f"Nova model not found. Available models: {model_ids[:10]}..."
        )


class TestRequisitionAgentLive:
    """Live tests for RequisitionAgent."""

    @pytest.mark.slow
    def test_validate_requisition_live(self):
        """Test requisition validation with live Bedrock."""
        agent = RequisitionAgent(use_mock=False)

        requisition = {
            "id": "REQ-TEST-001",
            "number": "REQ-000001",
            "description": "Office supplies for Q1 2024",
            "requestor": "John Doe",
            "department": "Engineering",
            "total_amount": 500.00,
            "line_items": [
                {
                    "description": "Ballpoint Pens (box of 100)",
                    "quantity": 5,
                    "unit_price": 25.00,
                    "category": "Office Supplies",
                },
                {
                    "description": "A4 Paper (ream)",
                    "quantity": 20,
                    "unit_price": 12.50,
                    "category": "Office Supplies",
                },
            ],
        }

        result = agent.validate_requisition(requisition)

        # Verify response structure
        assert "status" in result, f"Response missing 'status': {result}"
        assert result.get("status") in ["success", "valid", "invalid", "needs_review", "error"]
        
        # Log for debugging
        print(f"\nValidation result: {json.dumps(result, indent=2, default=str)}")

    @pytest.mark.slow
    def test_suggest_products_live(self):
        """Test product suggestion with live Bedrock."""
        agent = RequisitionAgent(use_mock=False)

        catalog = [
            {"id": "PROD-001", "name": "Dell Latitude 5540", "category": "Laptops", "price": 1299.00},
            {"id": "PROD-002", "name": "HP EliteBook 840", "category": "Laptops", "price": 1199.00},
            {"id": "PROD-003", "name": "Lenovo ThinkPad T14", "category": "Laptops", "price": 1149.00},
            {"id": "PROD-004", "name": "Apple MacBook Pro 14", "category": "Laptops", "price": 1999.00},
        ]

        result = agent.suggest_products(
            description="Business laptop for software development",
            category="Laptops",
            catalog=catalog,
        )

        assert "status" in result
        print(f"\nProduct suggestions: {json.dumps(result, indent=2, default=str)}")


class TestApprovalAgentLive:
    """Live tests for ApprovalAgent."""

    @pytest.mark.slow
    def test_determine_approval_chain_live(self):
        """Test approval chain determination with live Bedrock."""
        agent = ApprovalAgent(use_mock=False)

        document = {
            "id": "REQ-TEST-001",
            "total_amount": 15000.00,
            "department": "Engineering",
            "category": "IT Equipment",
            "description": "Development workstations",
        }
        requestor = {
            "id": "user-001",
            "name": "John Doe",
            "role": "engineer",
            "department": "Engineering",
            "manager_id": "manager-001",
        }
        approvers = [
            {"id": "manager-001", "name": "Jane Smith", "role": "manager", "approval_limit": 10000},
            {"id": "director-001", "name": "Bob Johnson", "role": "director", "approval_limit": 50000},
        ]

        result = agent.determine_approval_chain(
            document=document,
            document_type="requisition",
            requestor=requestor,
            available_approvers=approvers,
        )

        assert "status" in result
        print(f"\nApproval chain: {json.dumps(result, indent=2, default=str)}")


class TestFraudAgentLive:
    """Live tests for FraudAgent."""

    @pytest.mark.slow
    def test_analyze_transaction_live(self):
        """Test fraud analysis with live Bedrock."""
        agent = FraudAgent(use_mock=False)

        # Suspicious transaction - multiple red flags
        transaction = {
            "id": "INV-TEST-001",
            "vendor_invoice_number": "ROUND-5000",  # Suspicious round number
            "supplier_id": "sup-001",
            "total_amount": 4999.00,  # Just below approval threshold
            "invoice_date": date.today().isoformat(),
            "payment_requested": "immediate",  # Rush payment flag
        }
        vendor = {
            "id": "sup-001",
            "name": "Quick Parts LLC",
            "is_new": True,  # New vendor
            "address": "P.O. Box 12345",  # PO Box only
            "bank_recently_changed": True,  # Bank change
            "days_since_creation": 30,
        }

        result = agent.analyze_transaction(
            transaction=transaction,
            vendor=vendor,
            transaction_history=[
                {"amount": 4998.00, "date": date.today().isoformat()},
                {"amount": 4997.00, "date": date.today().isoformat()},
            ],  # Pattern of split transactions
        )

        assert "status" in result
        print(f"\nFraud analysis: {json.dumps(result, indent=2, default=str)}")


class TestComplianceAgentLive:
    """Live tests for ComplianceAgent."""

    @pytest.mark.slow
    def test_check_compliance_live(self):
        """Test compliance check with live Bedrock."""
        agent = ComplianceAgent(use_mock=False)

        transaction = {
            "id": "INV-TEST-001",
            "total_amount": 25000.00,
            "category": "Professional Services",
            "description": "Consulting services for Q1",
        }
        actors = {
            "requestor": {"id": "user-001", "name": "John Doe", "role": "requestor"},
            "approver": {"id": "manager-001", "name": "Jane Smith", "role": "manager"},
            "buyer": {"id": "buyer-001", "name": "Mike Wilson", "role": "buyer"},
        }
        documents = [
            {"type": "invoice", "present": True},
            {"type": "purchase_order", "present": True},
            {"type": "contract", "present": False},  # Missing contract
            {"type": "quotes", "present": False},  # Missing quotes
        ]

        result = agent.check_compliance(
            transaction=transaction,
            transaction_type="invoice",
            actors=actors,
            documents=documents,
        )

        assert "status" in result
        print(f"\nCompliance check: {json.dumps(result, indent=2, default=str)}")


class TestInvoiceAgentLive:
    """Live tests for InvoiceAgent."""

    @pytest.mark.slow
    def test_process_invoice_live(self):
        """Test invoice processing with live Bedrock."""
        agent = InvoiceAgent(use_mock=False)

        invoice = {
            "id": "INV-TEST-001",
            "vendor_invoice_number": "VENDOR-2024-0001",
            "supplier_id": "sup-001",
            "supplier_name": "Office Pro Supplies",
            "total_amount": 1050.00,  # Slight variance from PO
            "line_items": [
                {"description": "Laptops", "quantity": 10, "unit_price": 105.00},  # Price variance
            ],
        }
        purchase_order = {
            "id": "PO-TEST-001",
            "number": "PO-2024-0001",
            "supplier_id": "sup-001",
            "total_amount": 1000.00,
            "line_items": [
                {"description": "Laptops", "quantity": 10, "unit_price": 100.00},
            ],
        }
        goods_receipts = [
            {
                "id": "GR-001",
                "po_id": "PO-TEST-001",
                "line_items": [
                    {"quantity_received": 10, "quantity_rejected": 0},
                ],
            },
        ]

        result = agent.process_invoice(
            invoice=invoice,
            purchase_order=purchase_order,
            goods_receipts=goods_receipts,
        )

        assert "status" in result
        print(f"\nInvoice processing: {json.dumps(result, indent=2, default=str)}")


class TestPOAgentLive:
    """Live tests for POAgent."""

    @pytest.mark.slow
    def test_generate_po_live(self):
        """Test PO generation with live Bedrock."""
        agent = POAgent(use_mock=False)

        requisition = {
            "id": "REQ-TEST-001",
            "number": "REQ-2024-0001",
            "department": "Engineering",
            "requestor": "John Doe",
            "total_amount": 15000.00,
            "line_items": [
                {
                    "description": "Development Workstation",
                    "quantity": 5,
                    "unit_price": 3000.00,
                    "category": "IT Equipment",
                },
            ],
        }
        suppliers = [
            {
                "id": "sup-001",
                "name": "Dell Technologies",
                "lead_time_days": 7,
                "performance_rating": 4.5,
                "contract_pricing": {"Development Workstation": 2800.00},
            },
            {
                "id": "sup-002",
                "name": "HP Inc",
                "lead_time_days": 10,
                "performance_rating": 4.2,
                "contract_pricing": {"Development Workstation": 2900.00},
            },
        ]

        result = agent.generate_po(
            requisition=requisition,
            suppliers=suppliers,
        )

        assert "status" in result
        print(f"\nPO generation: {json.dumps(result, indent=2, default=str)}")


class TestReceivingAgentLive:
    """Live tests for ReceivingAgent."""

    @pytest.mark.slow
    def test_process_receipt_live(self):
        """Test receipt processing with live Bedrock."""
        agent = ReceivingAgent(use_mock=False)

        receipt_data = {
            "id": "GR-TEST-001",
            "receipt_date": date.today().isoformat(),
            "carrier": "FedEx",
            "tracking_number": "1234567890",
            "line_items": [
                {"po_line_item_id": 1, "quantity_received": 8, "condition": "good"},  # Under-delivery
                {"po_line_item_id": 2, "quantity_received": 10, "condition": "good"},  # Exact
            ],
        }
        purchase_order = {
            "id": "PO-TEST-001",
            "number": "PO-2024-0001",
            "supplier": "Dell Technologies",
            "line_items": [
                {"id": 1, "description": "Laptops", "quantity": 10},
                {"id": 2, "description": "Monitors", "quantity": 10},
            ],
        }

        result = agent.process_receipt(
            receipt_data=receipt_data,
            purchase_order=purchase_order,
        )

        assert "status" in result
        print(f"\nReceipt processing: {json.dumps(result, indent=2, default=str)}")


class TestEndToEndWorkflow:
    """End-to-end workflow tests with live Bedrock."""

    @pytest.mark.slow
    def test_full_p2p_workflow(self):
        """Test complete P2P workflow with all agents."""
        print("\n" + "=" * 60)
        print("Starting End-to-End P2P Workflow Test")
        print("=" * 60)

        # Step 1: Create and validate requisition
        print("\n--- Step 1: Requisition Validation ---")
        req_agent = RequisitionAgent(use_mock=False)
        requisition = {
            "id": "REQ-E2E-001",
            "description": "IT Equipment for new hires",
            "requestor": "John Doe",
            "department": "Engineering",
            "total_amount": 12000.00,
            "line_items": [
                {"description": "Laptop", "quantity": 4, "unit_price": 3000.00},
            ],
        }
        req_result = req_agent.validate_requisition(requisition)
        print(f"Requisition validation status: {req_result.get('status')}")
        time.sleep(1)  # Rate limiting

        # Step 2: Determine approval chain
        print("\n--- Step 2: Approval Routing ---")
        approval_agent = ApprovalAgent(use_mock=False)
        approval_result = approval_agent.determine_approval_chain(
            document=requisition,
            document_type="requisition",
            requestor={"id": "user-001", "role": "engineer"},
        )
        print(f"Approval determination status: {approval_result.get('status')}")
        time.sleep(1)

        # Step 3: Generate PO
        print("\n--- Step 3: PO Generation ---")
        po_agent = POAgent(use_mock=False)
        po_result = po_agent.generate_po(
            requisition=requisition,
            suppliers=[{"id": "sup-001", "name": "Dell", "rating": 4.5}],
        )
        print(f"PO generation status: {po_result.get('status')}")
        time.sleep(1)

        # Step 4: Process receipt
        print("\n--- Step 4: Goods Receipt ---")
        receiving_agent = ReceivingAgent(use_mock=False)
        receipt_result = receiving_agent.process_receipt(
            receipt_data={"line_items": [{"po_line_item_id": 1, "quantity_received": 4}]},
            purchase_order={"id": "PO-001", "line_items": [{"id": 1, "quantity": 4}]},
        )
        print(f"Receipt processing status: {receipt_result.get('status')}")
        time.sleep(1)

        # Step 5: Process invoice
        print("\n--- Step 5: Invoice Processing ---")
        invoice_agent = InvoiceAgent(use_mock=False)
        invoice = {
            "id": "INV-E2E-001",
            "vendor_invoice_number": "DELL-2024-001",
            "total_amount": 12000.00,
            "line_items": [{"quantity": 4, "unit_price": 3000.00}],
        }
        invoice_result = invoice_agent.process_invoice(
            invoice=invoice,
            purchase_order={"total_amount": 12000.00, "line_items": [{"quantity": 4, "unit_price": 3000.00}]},
            goods_receipts=[{"line_items": [{"quantity_received": 4}]}],
        )
        print(f"Invoice processing status: {invoice_result.get('status')}")
        time.sleep(1)

        # Step 6: Fraud check
        print("\n--- Step 6: Fraud Analysis ---")
        fraud_agent = FraudAgent(use_mock=False)
        fraud_result = fraud_agent.analyze_transaction(
            transaction=invoice,
            vendor={"id": "sup-001", "name": "Dell", "is_new": False},
        )
        print(f"Fraud analysis status: {fraud_result.get('status')}")
        time.sleep(1)

        # Step 7: Compliance check
        print("\n--- Step 7: Compliance Verification ---")
        compliance_agent = ComplianceAgent(use_mock=False)
        compliance_result = compliance_agent.check_compliance(
            transaction=invoice,
            transaction_type="invoice",
            actors={
                "requestor": {"id": "user-001", "role": "requestor"},
                "approver": {"id": "manager-001", "role": "manager"},
            },
            documents=[
                {"type": "invoice", "present": True},
                {"type": "purchase_order", "present": True},
                {"type": "goods_receipt", "present": True},
            ],
        )
        print(f"Compliance check status: {compliance_result.get('status')}")

        print("\n" + "=" * 60)
        print("End-to-End Workflow Complete")
        print("=" * 60)

        # All steps should complete without error
        assert all(
            r.get("status") not in ["error", None]
            for r in [req_result, approval_result, po_result, receipt_result, 
                      invoice_result, fraud_result, compliance_result]
        ), "One or more workflow steps failed"


class TestBedrockErrorHandling:
    """Tests for error handling with Bedrock."""

    @pytest.mark.slow
    def test_invalid_model_handling(self):
        """Test handling of invalid model ID."""
        # This should either work with a warning or fail gracefully
        agent = RequisitionAgent(use_mock=False)
        
        # Store original model
        original_model = agent.model_id
        
        try:
            # Try with invalid model (should fail gracefully)
            agent.model_id = "invalid-model-id"
            result = agent.validate_requisition({"description": "test"})
            
            # Should return error status, not crash
            assert result.get("status") == "error" or "error" in result
        except Exception as e:
            # Acceptable to raise exception for invalid model
            assert "model" in str(e).lower() or "not found" in str(e).lower()
        finally:
            agent.model_id = original_model

    @pytest.mark.slow
    def test_empty_prompt_handling(self):
        """Test handling of empty/minimal prompts."""
        agent = RequisitionAgent(use_mock=False)
        
        # Minimal data
        result = agent.validate_requisition({})
        
        # Should still return a response (maybe with warnings)
        assert "status" in result or "error" in result


class TestBedrockPerformance:
    """Performance tests for Bedrock integration."""

    @pytest.mark.slow
    def test_response_time(self):
        """Test that responses come back within acceptable time."""
        agent = RequisitionAgent(use_mock=False)
        
        requisition = {
            "description": "Test requisition",
            "total_amount": 100.00,
        }
        
        start_time = time.time()
        result = agent.validate_requisition(requisition)
        elapsed_time = time.time() - start_time
        
        print(f"\nResponse time: {elapsed_time:.2f} seconds")
        
        # Should respond within 30 seconds
        assert elapsed_time < 30, f"Response too slow: {elapsed_time:.2f}s"
        assert "status" in result
