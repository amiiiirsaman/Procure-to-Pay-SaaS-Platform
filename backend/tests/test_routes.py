"""
Unit tests for FastAPI routes.
"""

from datetime import date, timedelta

import pytest
from fastapi import status


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_check(self, client):
        """Test health check returns healthy status."""
        response = client.get("/health")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "p2p-saas-platform"


class TestUserRoutes:
    """Tests for user endpoints."""

    def test_create_user(self, client):
        """Test creating a new user."""
        user_data = {
            "id": "new-user-001",
            "email": "newuser@example.com",
            "name": "New User",
            "department": "engineering",
            "role": "requestor",
        }

        response = client.post("/api/v1/users/", json=user_data)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["id"] == "new-user-001"
        assert data["email"] == "newuser@example.com"

    def test_create_duplicate_user(self, client, sample_user):
        """Test creating a duplicate user fails."""
        user_data = {
            "id": sample_user.id,
            "email": "another@example.com",
            "name": "Another User",
            "department": "engineering",
            "role": "requestor",
        }

        response = client.post("/api/v1/users/", json=user_data)

        assert response.status_code == status.HTTP_409_CONFLICT

    def test_list_users(self, client, sample_user, sample_manager):
        """Test listing users."""
        response = client.get("/api/v1/users/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 2

    def test_get_user(self, client, sample_user):
        """Test getting a specific user."""
        response = client.get(f"/api/v1/users/{sample_user.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == sample_user.id
        assert data["name"] == sample_user.name

    def test_get_nonexistent_user(self, client):
        """Test getting a nonexistent user returns 404."""
        response = client.get("/api/v1/users/nonexistent-id")

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestSupplierRoutes:
    """Tests for supplier endpoints."""

    def test_create_supplier(self, client):
        """Test creating a new supplier."""
        supplier_data = {
            "id": "new-supplier-001",
            "name": "New Supplier Inc",
            "tax_id": "98-7654321",
            "contact_name": "Contact Person",
            "contact_email": "contact@supplier.com",
            "payment_terms": "Net 30",
        }

        response = client.post("/api/v1/suppliers/", json=supplier_data)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["id"] == "new-supplier-001"
        assert data["name"] == "New Supplier Inc"

    def test_list_suppliers(self, client, sample_supplier):
        """Test listing suppliers."""
        response = client.get("/api/v1/suppliers/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1

    def test_get_supplier(self, client, sample_supplier):
        """Test getting a specific supplier."""
        response = client.get(f"/api/v1/suppliers/{sample_supplier.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == sample_supplier.id
        assert data["name"] == sample_supplier.name


class TestProductRoutes:
    """Tests for product endpoints."""

    def test_create_product(self, client, sample_supplier):
        """Test creating a new product."""
        product_data = {
            "id": "new-product-001",
            "name": "New Product",
            "category": "Office Supplies",
            "unit_price": 29.99,
            "currency": "USD",
        }

        response = client.post("/api/v1/products/", json=product_data)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["id"] == "new-product-001"
        assert data["unit_price"] == 29.99

    def test_list_products_by_category(self, client, sample_product):
        """Test listing products filtered by category."""
        response = client.get(
            "/api/v1/products/",
            params={"category": "IT Equipment"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert all(p["category"] == "IT Equipment" for p in data)


class TestRequisitionRoutes:
    """Tests for requisition endpoints."""

    def test_create_requisition(self, client, sample_user):
        """Test creating a new requisition."""
        req_data = {
            "requestor_id": sample_user.id,
            "department": "engineering",
            "description": "Test requisition",
            "justification": "Test justification",
            "urgency": "standard",
            "line_items": [
                {
                    "description": "Test Item",
                    "quantity": 5,
                    "unit_price": 100.00,
                },
            ],
        }

        response = client.post("/api/v1/requisitions/", json=req_data)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["requestor_id"] == sample_user.id
        assert data["total_amount"] == 500.00
        assert data["status"] == "draft"
        assert len(data["line_items"]) == 1

    def test_create_requisition_no_line_items(self, client, sample_user):
        """Test creating requisition without line items fails."""
        req_data = {
            "requestor_id": sample_user.id,
            "department": "engineering",
            "description": "Empty requisition",
            "line_items": [],
        }

        response = client.post("/api/v1/requisitions/", json=req_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_list_requisitions_paginated(self, client, sample_requisition):
        """Test listing requisitions with pagination."""
        response = client.get(
            "/api/v1/requisitions/",
            params={"page": 1, "page_size": 10},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data

    def test_get_requisition(self, client, sample_requisition):
        """Test getting a specific requisition."""
        response = client.get(f"/api/v1/requisitions/{sample_requisition.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == sample_requisition.id
        assert data["number"] == sample_requisition.number

    def test_submit_requisition(self, client, sample_requisition):
        """Test submitting a requisition for approval."""
        response = client.post(
            f"/api/v1/requisitions/{sample_requisition.id}/submit"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "pending_approval"

    def test_submit_non_draft_requisition(
        self, client, db_session, sample_requisition
    ):
        """Test submitting non-draft requisition fails."""
        from app.models.enums import DocumentStatus

        sample_requisition.status = DocumentStatus.PENDING_APPROVAL
        db_session.commit()

        response = client.post(
            f"/api/v1/requisitions/{sample_requisition.id}/submit"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestPurchaseOrderRoutes:
    """Tests for purchase order endpoints."""

    def test_create_purchase_order(
        self, client, sample_supplier, sample_manager
    ):
        """Test creating a new purchase order."""
        po_data = {
            "supplier_id": sample_supplier.id,
            "buyer_id": sample_manager.id,
            "payment_terms": "Net 30",
            "line_items": [
                {
                    "description": "Test Item",
                    "quantity": 10,
                    "unit_price": 50.00,
                },
            ],
        }

        response = client.post("/api/v1/purchase-orders/", json=po_data)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["supplier_id"] == sample_supplier.id
        assert data["total_amount"] == 500.00

    def test_create_po_invalid_supplier(self, client, sample_manager):
        """Test creating PO with invalid supplier fails."""
        po_data = {
            "supplier_id": "nonexistent-supplier",
            "buyer_id": sample_manager.id,
            "line_items": [
                {
                    "description": "Test Item",
                    "quantity": 10,
                    "unit_price": 50.00,
                },
            ],
        }

        response = client.post("/api/v1/purchase-orders/", json=po_data)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_list_purchase_orders(self, client, sample_purchase_order):
        """Test listing purchase orders."""
        response = client.get("/api/v1/purchase-orders/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert len(data["items"]) >= 1

    def test_get_purchase_order(self, client, sample_purchase_order):
        """Test getting a specific PO."""
        response = client.get(
            f"/api/v1/purchase-orders/{sample_purchase_order.id}"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == sample_purchase_order.id


class TestGoodsReceiptRoutes:
    """Tests for goods receipt endpoints."""

    def test_create_goods_receipt(
        self, client, db_session, sample_purchase_order, sample_user
    ):
        """Test creating a goods receipt."""
        from app.models.enums import DocumentStatus

        sample_purchase_order.status = DocumentStatus.ORDERED
        db_session.commit()

        po_line = sample_purchase_order.line_items[0]

        gr_data = {
            "purchase_order_id": sample_purchase_order.id,
            "received_by_id": sample_user.id,
            "delivery_note": "Delivered in good condition",
            "line_items": [
                {
                    "po_line_item_id": po_line.id,
                    "quantity_received": 2,
                    "quantity_rejected": 0,
                },
            ],
        }

        response = client.post("/api/v1/goods-receipts/", json=gr_data)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["purchase_order_id"] == sample_purchase_order.id

    def test_list_goods_receipts(self, client):
        """Test listing goods receipts."""
        response = client.get("/api/v1/goods-receipts/")

        assert response.status_code == status.HTTP_200_OK


class TestInvoiceRoutes:
    """Tests for invoice endpoints."""

    def test_create_invoice(self, client, sample_supplier):
        """Test creating a new invoice."""
        inv_data = {
            "vendor_invoice_number": "TEST-INV-001",
            "supplier_id": sample_supplier.id,
            "invoice_date": date.today().isoformat(),
            "due_date": (date.today() + timedelta(days=30)).isoformat(),
            "subtotal": 1000.00,
            "tax_amount": 80.00,
            "line_items": [
                {
                    "description": "Test Service",
                    "quantity": 10,
                    "unit_price": 100.00,
                },
            ],
        }

        response = client.post("/api/v1/invoices/", json=inv_data)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["total_amount"] == 1080.00
        assert data["vendor_invoice_number"] == "TEST-INV-001"

    def test_list_invoices_with_filters(self, client, sample_invoice):
        """Test listing invoices with filters."""
        response = client.get(
            "/api/v1/invoices/",
            params={"status_filter": "pending_approval"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data

    def test_put_invoice_on_hold(self, client, sample_invoice):
        """Test putting invoice on hold."""
        response = client.post(
            f"/api/v1/invoices/{sample_invoice.id}/hold",
            params={"reason": "Pending investigation"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["on_hold"] is True

    def test_release_invoice_hold(self, client, db_session, sample_invoice):
        """Test releasing invoice from hold."""
        sample_invoice.on_hold = True
        sample_invoice.hold_reason = "Test hold"
        db_session.commit()

        response = client.post(
            f"/api/v1/invoices/{sample_invoice.id}/release"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["on_hold"] is False


class TestApprovalRoutes:
    """Tests for approval endpoints."""

    def test_get_pending_approvals(
        self, client, db_session, sample_requisition, sample_manager
    ):
        """Test getting pending approvals for an approver."""
        from app.models.approval import ApprovalStep
        from app.models.enums import ApprovalStatus, UserRole

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

        response = client.get(
            "/api/v1/approvals/pending",
            params={"approver_id": sample_manager.id},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1

    def test_process_approval(
        self, client, db_session, sample_requisition, sample_manager
    ):
        """Test processing an approval action."""
        from app.models.approval import ApprovalStep
        from app.models.enums import ApprovalStatus, UserRole

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
                "action": "approve",
                "comments": "Approved via test",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "approved"


class TestDashboardRoutes:
    """Tests for dashboard endpoints."""

    def test_get_dashboard_metrics(self, client):
        """Test getting dashboard metrics."""
        response = client.get("/api/v1/dashboard/metrics")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "pending_approvals" in data
        assert "open_pos" in data
        assert "pending_invoices" in data
        assert "fraud_alerts" in data

    def test_get_spend_by_category(self, client):
        """Test getting spend by category."""
        response = client.get(
            "/api/v1/dashboard/spend-by-category",
            params={"days": 30},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_get_spend_by_vendor(self, client):
        """Test getting spend by vendor."""
        response = client.get(
            "/api/v1/dashboard/spend-by-vendor",
            params={"days": 30, "limit": 10},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
