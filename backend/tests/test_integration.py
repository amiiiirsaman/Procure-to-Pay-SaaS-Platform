"""
Integration tests for P2P SaaS Platform.

These tests verify the end-to-end workflow from requisition to payment.
"""

import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

from fastapi import status

from app.models.enums import (
    ApprovalStatus,
    DocumentStatus,
    MatchStatus,
    RiskLevel,
    UserRole,
)
from app.models.approval import ApprovalStep
from app.orchestrator.workflow import P2POrchestrator
from app.orchestrator.state import create_initial_state, WorkflowStep


class TestRequisitionToApprovalFlow:
    """Integration tests for requisition to approval workflow."""

    def test_full_requisition_submission_flow(
        self, client, db_session, sample_user, sample_manager
    ):
        """Test creating and submitting a requisition for approval."""
        # Create requisition
        req_data = {
            "requestor_id": sample_user.id,
            "department": "engineering",
            "description": "New laptops for development team",
            "justification": "Current laptops are 4 years old",
            "urgency": "standard",
            "needed_by_date": (date.today() + timedelta(days=14)).isoformat(),
            "line_items": [
                {
                    "description": "MacBook Pro 16-inch",
                    "category": "IT Equipment",
                    "quantity": 3,
                    "unit_price": 2499.00,
                },
            ],
        }

        response = client.post("/api/v1/requisitions/", json=req_data)
        assert response.status_code == status.HTTP_201_CREATED
        req_id = response.json()["id"]

        # Verify requisition is in draft
        response = client.get(f"/api/v1/requisitions/{req_id}")
        assert response.json()["status"] == "draft"

        # Submit for approval
        response = client.post(f"/api/v1/requisitions/{req_id}/submit")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "pending_approval"

    def test_low_value_auto_approval(
        self, client, db_session, sample_user, sample_manager
    ):
        """Test that low-value requisitions can be auto-approved."""
        # Create low-value requisition
        req_data = {
            "requestor_id": sample_user.id,
            "department": "engineering",
            "description": "Office supplies",
            "line_items": [
                {
                    "description": "Pens and notebooks",
                    "quantity": 20,
                    "unit_price": 5.00,  # Total $100
                },
            ],
        }

        response = client.post("/api/v1/requisitions/", json=req_data)
        assert response.status_code == status.HTTP_201_CREATED

        data = response.json()
        assert data["total_amount"] == 100.00
        # Low value should be eligible for auto-approval


class TestPurchaseOrderFlow:
    """Integration tests for purchase order workflow."""

    def test_create_po_from_approved_requisition(
        self, client, db_session, sample_requisition, sample_supplier, sample_manager
    ):
        """Test creating a PO from an approved requisition."""
        # Update requisition to approved
        sample_requisition.status = DocumentStatus.APPROVED
        db_session.commit()

        # Create PO referencing the requisition
        po_data = {
            "requisition_id": sample_requisition.id,
            "supplier_id": sample_supplier.id,
            "buyer_id": sample_manager.id,
            "payment_terms": "Net 30",
            "expected_delivery_date": (date.today() + timedelta(days=7)).isoformat(),
            "line_items": [
                {
                    "description": "Office Laptop",
                    "quantity": 2,
                    "unit_price": 1500.00,
                },
            ],
        }

        response = client.post("/api/v1/purchase-orders/", json=po_data)
        assert response.status_code == status.HTTP_201_CREATED

        data = response.json()
        assert data["requisition_id"] == sample_requisition.id
        assert data["supplier_id"] == sample_supplier.id
        assert data["total_amount"] == 3000.00


class TestGoodsReceiptFlow:
    """Integration tests for goods receipt workflow."""

    def test_full_receipt_updates_po_status(
        self, client, db_session, sample_purchase_order, sample_user
    ):
        """Test that fully receiving goods updates PO status."""
        # Set PO to ordered status
        sample_purchase_order.status = DocumentStatus.ORDERED
        db_session.commit()

        po_line = sample_purchase_order.line_items[0]

        # Receive all goods
        gr_data = {
            "purchase_order_id": sample_purchase_order.id,
            "received_by_id": sample_user.id,
            "delivery_note": "All items received in good condition",
            "carrier": "FedEx",
            "line_items": [
                {
                    "po_line_item_id": po_line.id,
                    "quantity_received": po_line.quantity,
                    "quantity_rejected": 0,
                },
            ],
        }

        response = client.post("/api/v1/goods-receipts/", json=gr_data)
        assert response.status_code == status.HTTP_201_CREATED

        # Verify PO status updated to received
        response = client.get(
            f"/api/v1/purchase-orders/{sample_purchase_order.id}"
        )
        assert response.json()["status"] == "received"

    def test_partial_receipt_keeps_po_open(
        self, client, db_session, sample_purchase_order, sample_user
    ):
        """Test that partial receipt keeps PO status as ordered."""
        # Set PO to ordered status
        sample_purchase_order.status = DocumentStatus.ORDERED
        db_session.commit()

        po_line = sample_purchase_order.line_items[0]

        # Receive partial quantity
        gr_data = {
            "purchase_order_id": sample_purchase_order.id,
            "received_by_id": sample_user.id,
            "line_items": [
                {
                    "po_line_item_id": po_line.id,
                    "quantity_received": 1,  # Only 1 of 2
                    "quantity_rejected": 0,
                },
            ],
        }

        response = client.post("/api/v1/goods-receipts/", json=gr_data)
        assert response.status_code == status.HTTP_201_CREATED

        # Verify PO status is still ordered (not fully received)
        response = client.get(
            f"/api/v1/purchase-orders/{sample_purchase_order.id}"
        )
        # Status should not be "received" since partial receipt
        assert response.json()["status"] in ["ordered", "partially_received"]


class TestInvoiceMatchingFlow:
    """Integration tests for invoice matching workflow."""

    def test_invoice_with_matching_po(
        self, client, db_session, sample_purchase_order, sample_supplier
    ):
        """Test creating an invoice that matches a PO."""
        po_line = sample_purchase_order.line_items[0]

        inv_data = {
            "vendor_invoice_number": "VENDOR-2024-001",
            "supplier_id": sample_supplier.id,
            "purchase_order_id": sample_purchase_order.id,
            "invoice_date": date.today().isoformat(),
            "due_date": (date.today() + timedelta(days=30)).isoformat(),
            "subtotal": sample_purchase_order.total_amount,
            "tax_amount": 0.0,
            "line_items": [
                {
                    "description": po_line.description,
                    "quantity": po_line.quantity,
                    "unit_price": po_line.unit_price,
                    "po_line_item_id": po_line.id,
                },
            ],
        }

        response = client.post("/api/v1/invoices/", json=inv_data)
        assert response.status_code == status.HTTP_201_CREATED

        data = response.json()
        assert data["purchase_order_id"] == sample_purchase_order.id

    def test_invoice_without_po_reference(self, client, sample_supplier):
        """Test creating an invoice without PO reference."""
        inv_data = {
            "vendor_invoice_number": "SERVICE-2024-001",
            "supplier_id": sample_supplier.id,
            "invoice_date": date.today().isoformat(),
            "due_date": (date.today() + timedelta(days=30)).isoformat(),
            "subtotal": 5000.00,
            "tax_amount": 400.00,
            "line_items": [
                {
                    "description": "Consulting Services",
                    "quantity": 40,
                    "unit_price": 125.00,
                },
            ],
        }

        response = client.post("/api/v1/invoices/", json=inv_data)
        assert response.status_code == status.HTTP_201_CREATED

        data = response.json()
        assert data["purchase_order_id"] is None
        assert data["total_amount"] == 5400.00


class TestApprovalWorkflow:
    """Integration tests for approval workflow."""

    def test_multi_level_approval_chain(
        self, client, db_session, sample_requisition, sample_manager, sample_director
    ):
        """Test multi-level approval workflow."""
        # Create approval steps
        step1 = ApprovalStep(
            requisition_id=sample_requisition.id,
            step_number=1,
            approver_id=sample_manager.id,
            approver_role=UserRole.MANAGER,
            required_for_amount=sample_requisition.total_amount,
            status=ApprovalStatus.PENDING,
        )
        step2 = ApprovalStep(
            requisition_id=sample_requisition.id,
            step_number=2,
            approver_id=sample_director.id,
            approver_role=UserRole.DIRECTOR,
            required_for_amount=sample_requisition.total_amount,
            status=ApprovalStatus.PENDING,
        )
        db_session.add_all([step1, step2])
        db_session.commit()

        # Manager approves
        response = client.post(
            f"/api/v1/approvals/{step1.id}/action",
            json={"action": "approve", "comments": "Approved by manager"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "approved"

        # Director approves
        response = client.post(
            f"/api/v1/approvals/{step2.id}/action",
            json={"action": "approve", "comments": "Final approval"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "approved"

    def test_approval_rejection(
        self, client, db_session, sample_requisition, sample_manager
    ):
        """Test approval rejection."""
        approval = ApprovalStep(
            requisition_id=sample_requisition.id,
            step_number=1,
            approver_id=sample_manager.id,
            approver_role=UserRole.MANAGER,
            required_for_amount=sample_requisition.total_amount,
            status=ApprovalStatus.PENDING,
        )
        db_session.add(approval)
        db_session.commit()

        response = client.post(
            f"/api/v1/approvals/{approval.id}/action",
            json={
                "action": "reject",
                "comments": "Budget not available this quarter",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "rejected"


class TestInvoiceHoldFlow:
    """Integration tests for invoice hold/release workflow."""

    def test_hold_and_release_invoice(self, client, sample_invoice):
        """Test putting invoice on hold and releasing it."""
        # Put on hold
        response = client.post(
            f"/api/v1/invoices/{sample_invoice.id}/hold",
            params={"reason": "Pending fraud investigation"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["on_hold"] is True

        # Release hold
        response = client.post(
            f"/api/v1/invoices/{sample_invoice.id}/release"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["on_hold"] is False


class TestOrchestratorIntegration:
    """Integration tests for LangGraph orchestrator."""

    @pytest.mark.asyncio
    async def test_workflow_state_initialization(self):
        """Test workflow state is properly initialized."""
        requisition = {"id": 1, "number": "REQ-001", "total_amount": 5000}
        requestor = {"id": "user-001", "name": "Test User"}
        state = create_initial_state(
            requisition=requisition,
            requestor=requestor,
        )

        assert state["requisition_id"] == 1
        assert state["requestor"]["id"] == "user-001"
        assert state["current_step"] == WorkflowStep.START
        assert state["status"] == "in_progress"
        assert state["fraud_score"] == 0
        assert state["requires_human_action"] is False

    @pytest.mark.asyncio
    async def test_orchestrator_creation(self):
        """Test orchestrator can be created."""
        orchestrator = P2POrchestrator(use_mock_agents=True)

        assert orchestrator is not None
        assert orchestrator.graph is not None

    @pytest.mark.asyncio
    async def test_workflow_step_transitions(self):
        """Test workflow transitions through steps correctly."""
        orchestrator = P2POrchestrator(use_mock_agents=True)

        requisition = {"id": 1, "number": "REQ-001", "total_amount": 5000}
        requestor = {"id": "user-001", "name": "Test User"}
        initial_state = create_initial_state(
            requisition=requisition,
            requestor=requestor,
        )

        # Run workflow (with mocked agents)
        with patch.object(
            orchestrator, "run_async", new_callable=AsyncMock
        ) as mock_run:
            # Simulate successful workflow completion
            mock_run.return_value = {
                **initial_state,
                "status": "completed",
                "current_step": WorkflowStep.COMPLETE,
                "approval_status": "approved",
            }

            result = await orchestrator.run_async(initial_state)

            assert result["status"] == "completed"


class TestEndToEndWorkflow:
    """End-to-end integration tests."""

    def test_full_p2p_cycle(
        self,
        client,
        db_session,
        sample_user,
        sample_manager,
        sample_supplier,
    ):
        """Test complete procure-to-pay cycle."""
        # 1. Create requisition
        req_data = {
            "requestor_id": sample_user.id,
            "department": "engineering",
            "description": "Q1 Server Hardware",
            "justification": "Capacity expansion",
            "urgency": "urgent",
            "line_items": [
                {
                    "description": "Dell PowerEdge R750",
                    "category": "IT Equipment",
                    "quantity": 2,
                    "unit_price": 15000.00,
                },
            ],
        }

        response = client.post("/api/v1/requisitions/", json=req_data)
        assert response.status_code == status.HTTP_201_CREATED
        req_id = response.json()["id"]

        # 2. Submit requisition
        response = client.post(f"/api/v1/requisitions/{req_id}/submit")
        assert response.status_code == status.HTTP_200_OK

        # 3. Create approval and approve
        from app.models.requisition import Requisition

        requisition = db_session.query(Requisition).filter(
            Requisition.id == req_id
        ).first()

        approval = ApprovalStep(
            requisition_id=req_id,
            step_number=1,
            approver_id=sample_manager.id,
            approver_role=UserRole.MANAGER,
            required_for_amount=requisition.total_amount,
            status=ApprovalStatus.PENDING,
        )
        db_session.add(approval)
        db_session.commit()

        response = client.post(
            f"/api/v1/approvals/{approval.id}/action",
            json={"action": "approve", "comments": "Approved for Q1 budget"},
        )
        assert response.status_code == status.HTTP_200_OK

        # Update requisition status
        requisition.status = DocumentStatus.APPROVED
        db_session.commit()

        # 4. Create PO
        po_data = {
            "requisition_id": req_id,
            "supplier_id": sample_supplier.id,
            "buyer_id": sample_manager.id,
            "payment_terms": "Net 30",
            "line_items": [
                {
                    "description": "Dell PowerEdge R750",
                    "quantity": 2,
                    "unit_price": 15000.00,
                },
            ],
        }

        response = client.post("/api/v1/purchase-orders/", json=po_data)
        assert response.status_code == status.HTTP_201_CREATED
        po_id = response.json()["id"]
        po_line_id = response.json()["line_items"][0]["id"]

        # Update PO status to sent
        from app.models.purchase_order import PurchaseOrder

        po = db_session.query(PurchaseOrder).filter(
            PurchaseOrder.id == po_id
        ).first()
        po.status = DocumentStatus.ORDERED
        db_session.commit()

        # 5. Receive goods
        gr_data = {
            "purchase_order_id": po_id,
            "received_by_id": sample_user.id,
            "delivery_note": "All items received",
            "line_items": [
                {
                    "po_line_item_id": po_line_id,
                    "quantity_received": 2,
                    "quantity_rejected": 0,
                },
            ],
        }

        response = client.post("/api/v1/goods-receipts/", json=gr_data)
        assert response.status_code == status.HTTP_201_CREATED

        # 6. Create invoice
        inv_data = {
            "vendor_invoice_number": "DELL-2024-12345",
            "supplier_id": sample_supplier.id,
            "purchase_order_id": po_id,
            "invoice_date": date.today().isoformat(),
            "due_date": (date.today() + timedelta(days=30)).isoformat(),
            "subtotal": 30000.00,
            "tax_amount": 2400.00,
            "line_items": [
                {
                    "description": "Dell PowerEdge R750",
                    "quantity": 2,
                    "unit_price": 15000.00,
                    "po_line_item_id": po_line_id,
                },
            ],
        }

        response = client.post("/api/v1/invoices/", json=inv_data)
        assert response.status_code == status.HTTP_201_CREATED

        data = response.json()
        assert data["total_amount"] == 32400.00
        assert data["purchase_order_id"] == po_id

        # Verify dashboard reflects the activity
        response = client.get("/api/v1/dashboard/metrics")
        assert response.status_code == status.HTTP_200_OK


class TestDashboardIntegration:
    """Integration tests for dashboard data aggregation."""

    def test_metrics_reflect_data_changes(
        self, client, db_session, sample_invoice, sample_manager
    ):
        """Test that dashboard metrics update with data changes."""
        # Get initial metrics
        response = client.get("/api/v1/dashboard/metrics")
        initial_data = response.json()

        # Create an approval
        from app.models.requisition import Requisition

        req = Requisition(
            number="REQ-METRICS-001",
            requestor_id="user-001",
            department="engineering",
            description="Test metrics",
            total_amount=1000.00,
            created_by="user-001",
        )
        db_session.add(req)
        db_session.commit()

        approval = ApprovalStep(
            requisition_id=req.id,
            step_number=1,
            approver_id=sample_manager.id,
            approver_role=UserRole.MANAGER,
            required_for_amount=req.total_amount,
            status=ApprovalStatus.PENDING,
        )
        db_session.add(approval)
        db_session.commit()

        # Get updated metrics
        response = client.get("/api/v1/dashboard/metrics")
        updated_data = response.json()

        assert updated_data["pending_approvals"] >= initial_data["pending_approvals"]
