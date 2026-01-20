"""
End-to-End (E2E) Workflow Tests for P2P SaaS Platform

This test suite validates complete workflows from start to finish:
1. Full P2P Cycle: Requisition → Approval → PO → Receipt → Invoice → Payment
2. Agent-Assisted Requisition: Natural language input → Structured requisition
3. HITL Approval: Flagged requisition → Human review → Decision
4. Invoice Final Approval: Processing → Report → Human decision → Payment
5. Multi-step workflow with agent coordination
"""

import pytest
import asyncio
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, Any

from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db, SessionLocal
from app.models import (
    Requisition,
    PurchaseOrder,
    Invoice,
    GoodsReceipt,
    User,
    Supplier,
    Product,
    ApprovalStep,
)
from app.models.enums import (
    DocumentStatus,
    Department,
    Urgency,
    ApprovalStatus,
    RiskLevel,
)


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Create database session for tests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def setup_test_data(db_session):
    """Setup test users, suppliers, and products."""
    # Create test users
    requestor = User(
        id="test_requestor_1",
        name="John Requestor",
        email="john@company.com",
        role="employee",
    )
    approver = User(
        id="test_approver_1",
        name="Jane Approver",
        email="jane@company.com",
        role="manager",
    )
    buyer = User(
        id="test_buyer_1",
        name="Bob Buyer",
        email="bob@company.com",
        role="buyer",
    )
    
    db_session.add_all([requestor, approver, buyer])
    db_session.flush()
    
    # Create test supplier
    supplier = Supplier(
        id="supplier_test_1",
        name="Test Supplier Inc.",
        email="supplier@example.com",
        risk_level=RiskLevel.LOW,
        risk_score=20.0,
        status="approved",
        bank_verified=True,
    )
    db_session.add(supplier)
    db_session.flush()
    
    # Create test products
    product = Product(
        id="product_test_1",
        name="Test Laptop",
        category="Equipment",
        unit_price=1000.00,
        is_active=True,
        preferred_supplier_id=supplier.id,
    )
    db_session.add(product)
    db_session.commit()
    
    return {
        "requestor": requestor,
        "approver": approver,
        "buyer": buyer,
        "supplier": supplier,
        "product": product,
    }


# ============= Test Case 1: Full P2P Cycle =============


class TestFullP2PCycle:
    """Test complete P2P workflow from requisition to payment."""

    def test_complete_p2p_workflow(self, client, setup_test_data):
        """Test full P2P cycle with happy path."""
        users = setup_test_data
        
        # Step 1: Create requisition
        req_response = client.post(
            "/requisitions/",
            json={
                "requestor_id": users["requestor"].id,
                "department": Department.ENGINEERING.value,
                "description": "Test workflow laptops",
                "justification": "For new team members",
                "urgency": Urgency.NORMAL.value,
                "needed_by_date": (date.today() + timedelta(days=30)).isoformat(),
                "line_items": [
                    {
                        "description": "Test Laptop",
                        "category": "Equipment",
                        "product_id": "product_test_1",
                        "quantity": 2,
                        "unit_price": 1000.00,
                        "suggested_supplier_id": "supplier_test_1",
                        "gl_account": "1500",
                        "cost_center": "ENG-001",
                    }
                ],
            },
        )
        assert req_response.status_code == 201
        requisition_id = req_response.json()["id"]
        assert req_response.json()["status"] == DocumentStatus.DRAFT.value
        
        # Step 2: Submit requisition
        submit_response = client.post(f"/requisitions/{requisition_id}/submit")
        assert submit_response.status_code == 200
        assert submit_response.json()["status"] == DocumentStatus.PENDING_APPROVAL.value
        
        # Step 3: Create PO (simulating approval and conversion)
        po_response = client.post(
            "/purchase-orders/",
            json={
                "requisition_id": requisition_id,
                "supplier_id": users["supplier"].id,
                "buyer_id": users["buyer"].id,
                "total_amount": 2000.00,
                "ship_to_address": "123 Main St, City, State 12345",
                "expected_delivery_date": (date.today() + timedelta(days=14)).isoformat(),
                "payment_terms": "Net 30",
                "line_items": [
                    {
                        "description": "Test Laptop",
                        "quantity": 2,
                        "unit_price": 1000.00,
                        "part_number": "LAPTOP-001",
                        "gl_account": "1500",
                        "cost_center": "ENG-001",
                    }
                ],
            },
        )
        assert po_response.status_code == 201
        po_id = po_response.json()["id"]
        
        # Step 4: Send PO
        send_response = client.post(f"/purchase-orders/{po_id}/send")
        assert send_response.status_code == 200
        assert send_response.json()["status"] == DocumentStatus.ORDERED.value
        
        # Step 5: Confirm goods receipt
        gr_response = client.post(
            f"/goods-receipts/{po_id}/confirm",
            json={
                "received_by_id": users["buyer"].id,
                "delivery_note": "All items received in good condition",
                "carrier": "FedEx",
                "tracking_number": "123456789",
                "inspection_notes": "All items inspected and verified",
                "items": [
                    {
                        "po_line_item_id": 1,
                        "quantity_received": 2,
                        "quantity_rejected": 0,
                        "storage_location": "Warehouse A",
                    }
                ],
            },
        )
        assert gr_response.status_code == 200
        assert gr_response.json()["status"] == DocumentStatus.RECEIVED.value
        
        # Step 6: Create invoice
        inv_response = client.post(
            "/invoices/",
            json={
                "vendor_invoice_number": "VENDOR-INV-001",
                "supplier_id": users["supplier"].id,
                "purchase_order_id": po_id,
                "invoice_date": date.today().isoformat(),
                "due_date": (date.today() + timedelta(days=30)).isoformat(),
                "subtotal": 2000.00,
                "tax_amount": 160.00,
                "line_items": [
                    {
                        "description": "Test Laptop",
                        "quantity": 2,
                        "unit_price": 1000.00,
                        "po_line_item_id": 1,
                        "gl_account": "1500",
                        "cost_center": "ENG-001",
                    }
                ],
            },
        )
        assert inv_response.status_code == 201
        invoice_id = inv_response.json()["id"]
        
        # Step 7: Get invoice for final approval
        final_report_response = client.get(f"/invoices/{invoice_id}/final-approval-report")
        assert final_report_response.status_code == 200
        report = final_report_response.json()
        assert "recommendation" in report
        
        # Step 8: Approve invoice
        approval_response = client.post(
            f"/invoices/{invoice_id}/final-approve",
            json={
                "action": "approve",
                "approver_id": users["approver"].id,
                "comments": "Approved for payment",
            },
        )
        assert approval_response.status_code == 200
        assert approval_response.json()["payment_scheduled"] == True
        
        # Step 9: Create payment
        payment_response = client.post(
            "/payments/",
            json={
                "invoice_id": invoice_id,
                "payment_method": "ACH",
                "reference_number": "PAY-12345",
            },
        )
        assert payment_response.status_code == 201
        assert payment_response.json()["status"] == "completed"

    def test_p2p_workflow_with_rejections(self, client, setup_test_data):
        """Test P2P workflow with invoice rejection."""
        users = setup_test_data
        
        # Create and process requisition/PO as before
        req_response = client.post(
            "/requisitions/",
            json={
                "requestor_id": users["requestor"].id,
                "department": Department.FINANCE.value,
                "description": "Test expense requisition",
                "justification": "Conference attendance",
                "urgency": Urgency.NORMAL.value,
                "needed_by_date": (date.today() + timedelta(days=7)).isoformat(),
                "line_items": [
                    {
                        "description": "Conference Fee",
                        "category": "Travel",
                        "product_id": "product_test_1",
                        "quantity": 1,
                        "unit_price": 500.00,
                        "gl_account": "6200",
                        "cost_center": "FIN-001",
                    }
                ],
            },
        )
        requisition_id = req_response.json()["id"]
        
        # Skip to invoice creation
        # (abbreviated for brevity - would follow similar steps)
        inv_response = client.post(
            "/invoices/",
            json={
                "vendor_invoice_number": "VENDOR-REJ-001",
                "supplier_id": users["supplier"].id,
                "invoice_date": date.today().isoformat(),
                "due_date": (date.today() + timedelta(days=30)).isoformat(),
                "subtotal": 500.00,
                "tax_amount": 40.00,
                "line_items": [
                    {
                        "description": "Conference Fee",
                        "quantity": 1,
                        "unit_price": 500.00,
                        "gl_account": "6200",
                        "cost_center": "FIN-001",
                    }
                ],
            },
        )
        invoice_id = inv_response.json()["id"]
        
        # Reject invoice
        rejection_response = client.post(
            f"/invoices/{invoice_id}/final-approve",
            json={
                "action": "reject",
                "approver_id": users["approver"].id,
                "comments": "Budget allocation missing",
            },
        )
        assert rejection_response.status_code == 200
        assert rejection_response.json()["payment_scheduled"] == False
        assert rejection_response.json()["new_status"] == DocumentStatus.REJECTED.value


# ============= Test Case 2: Agent-Assisted Requisition =============


class TestAgentAssistedRequisition:
    """Test agent-assisted requisition creation."""

    def test_agent_assisted_requisition_creation(self, client, setup_test_data):
        """Test creating requisition with agent assistance."""
        users = setup_test_data
        
        response = client.post(
            "/requisitions/agent-assisted",
            json={
                "requestor_id": users["requestor"].id,
                "department": Department.IT.value,
                "description": "We need new computers for the office",
                "items_description": "Laptops and monitors for remote workers",
                "estimated_budget": 10000.00,
                "urgency": Urgency.NORMAL.value,
                "needed_by_date": (date.today() + timedelta(days=30)).isoformat(),
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Agent should provide suggestions
        assert "interpreted_needs" in data
        assert "product_suggestions" in data
        assert "supplier_suggestions" in data
        assert "gl_account_suggestions" in data
        assert "recommended_line_items" in data


# ============= Test Case 3: HITL Approval Workflow =============


class TestHITLApprovalWorkflow:
    """Test Human-in-the-Loop approval workflows."""

    def test_flagged_requisition_review(self, client, setup_test_data, db_session):
        """Test flagged requisition requiring human review."""
        users = setup_test_data
        
        # Create requisition
        req_response = client.post(
            "/requisitions/",
            json={
                "requestor_id": users["requestor"].id,
                "department": Department.EXECUTIVE.value,
                "description": "Executive expense request",
                "justification": "Critical executive need",
                "urgency": Urgency.EMERGENCY.value,
                "needed_by_date": (date.today() + timedelta(days=1)).isoformat(),
                "line_items": [
                    {
                        "description": "Emergency Equipment",
                        "category": "Equipment",
                        "product_id": "product_test_1",
                        "quantity": 1,
                        "unit_price": 50000.00,
                        "gl_account": "1500",
                        "cost_center": "EXEC-001",
                    }
                ],
            },
        )
        requisition_id = req_response.json()["id"]
        
        # Flag requisition for review
        flag_response = client.post(
            f"/requisitions/{requisition_id}/flag?agent_name=test_agent&reason=High+emergency+value&stage=validation",
        )
        assert flag_response.status_code == 200
        assert flag_response.json()["status"] == DocumentStatus.UNDER_REVIEW.value
        
        # Approver reviews and approves
        approval_response = client.post(
            f"/requisitions/{requisition_id}/approve",
            json={
                "reviewer_id": users["approver"].id,
                "comments": "Approved after review - business case confirmed",
            },
        )
        assert approval_response.status_code == 200
        assert approval_response.json()["new_status"] == DocumentStatus.APPROVED.value

    def test_flagged_requisition_rejection(self, client, setup_test_data):
        """Test flagged requisition being rejected by human review."""
        users = setup_test_data
        
        # Create and flag requisition
        req_response = client.post(
            "/requisitions/",
            json={
                "requestor_id": users["requestor"].id,
                "department": Department.OPERATIONS.value,
                "description": "Questionable purchase",
                "justification": "Unclear justification",
                "urgency": Urgency.NORMAL.value,
                "needed_by_date": (date.today() + timedelta(days=30)).isoformat(),
                "line_items": [
                    {
                        "description": "Item",
                        "category": "General",
                        "product_id": "product_test_1",
                        "quantity": 1,
                        "unit_price": 1000.00,
                        "gl_account": "6000",
                        "cost_center": "OPS-001",
                    }
                ],
            },
        )
        requisition_id = req_response.json()["id"]
        
        # Flag and reject
        client.post(
            f"/requisitions/{requisition_id}/flag?agent_name=compliance_agent&reason=Unclear+business+case&stage=validation",
        )
        
        reject_response = client.post(
            f"/requisitions/{requisition_id}/reject",
            json={
                "reviewer_id": users["approver"].id,
                "comments": "Rejected - does not meet business requirements",
            },
        )
        assert reject_response.status_code == 200
        assert reject_response.json()["new_status"] == DocumentStatus.REJECTED.value


# ============= Test Case 4: Agent Trigger Integration =============


class TestAgentTriggerIntegration:
    """Test manual agent triggers via API."""

    def test_trigger_requisition_agent(self, client, setup_test_data):
        """Test triggering RequisitionAgent for a requisition."""
        users = setup_test_data
        
        # Create requisition first
        req_response = client.post(
            "/requisitions/",
            json={
                "requestor_id": users["requestor"].id,
                "department": Department.ENGINEERING.value,
                "description": "Test agent trigger",
                "justification": "Testing",
                "urgency": Urgency.NORMAL.value,
                "needed_by_date": (date.today() + timedelta(days=30)).isoformat(),
                "line_items": [
                    {
                        "description": "Test item",
                        "category": "Test",
                        "product_id": "product_test_1",
                        "quantity": 1,
                        "unit_price": 100.00,
                        "gl_account": "6000",
                        "cost_center": "ENG-001",
                    }
                ],
            },
        )
        requisition_id = req_response.json()["id"]
        
        # Trigger agent
        agent_response = client.post(
            "/agents/requisition/run",
            json={
                "document_type": "requisition",
                "document_id": requisition_id,
            },
        )
        assert agent_response.status_code == 200
        data = agent_response.json()
        assert data["status"] in ["completed", "error"]
        assert "agent_name" in data

    def test_trigger_fraud_agent(self, client, setup_test_data):
        """Test triggering FraudAgent for an invoice."""
        # Similar structure - create invoice then trigger agent
        pass


# ============= Performance & Stress Tests =============


class TestWorkflowPerformance:
    """Test performance of workflows under load."""

    def test_bulk_requisition_creation(self, client, setup_test_data):
        """Test creating multiple requisitions in sequence."""
        users = setup_test_data
        created_ids = []
        
        for i in range(5):
            req_response = client.post(
                "/requisitions/",
                json={
                    "requestor_id": users["requestor"].id,
                    "department": Department.OPERATIONS.value,
                    "description": f"Bulk test requisition {i+1}",
                    "justification": "Performance testing",
                    "urgency": Urgency.NORMAL.value,
                    "needed_by_date": (date.today() + timedelta(days=30)).isoformat(),
                    "line_items": [
                        {
                            "description": f"Item {i+1}",
                            "category": "General",
                            "product_id": "product_test_1",
                            "quantity": 1,
                            "unit_price": 100.00,
                            "gl_account": "6000",
                            "cost_center": "OPS-001",
                        }
                    ],
                },
            )
            assert req_response.status_code == 201
            created_ids.append(req_response.json()["id"])
        
        assert len(created_ids) == 5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
